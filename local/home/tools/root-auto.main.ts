import BaseScript from "../bases/module.base-script";

export async function main(ns: NS) {
  const script = new RootAutoScript(ns);
  await script.run();
}

export function autocomplete(data: AutocompleteData) {
  return RootAutoScript.autocomplete(data, RootAutoScript.argsSchema);
}

class RootAutoScript extends BaseScript {
  static argsSchema: [string, string | number | boolean | string[]][] = [
    ["start", "home"],       // server bắt đầu scan
    ["run", false],          // nếu true thì copy & chạy payload khi root được server
    ["payload", "hack.ts"],  // tên file payload để copy/run
    ["threads", Infinity],   // threads tối đa cho payload mỗi server
    ["depth", Infinity],     // giới hạn depth (infinite nếu không truyền)
    ["excludeHome", true],   // có exclude 'home' (không nuke home) hay không
    ["payloadArgs", "--target {host} --percent 0.05"],     // args cho các script con
    ["verbose", false],      // in log chi tiết
    ["help", false],         // in help và exit
  ];

  constructor(ns: NS) {
    super(ns, RootAutoScript.argsSchema);
  }

  async run(ns: NS = this.ns, logs = this.logs): Promise<void> {
    const { start, run, payload, threads, depth, excludeHome, payloadArgs, verbose, help } = this.flags as {
      start: string,
      run: boolean,
      payload: string,
      threads: number,
      depth: number,
      excludeHome: boolean,
      payloadArgs: string,
      verbose: boolean,
      help: boolean
    };

    if (help) {
      // in help bằng tprint để hiện rõ cho user, đồng thời in vào log
      logs.toTerminal(true)
      logs.info(helpIn());
      logs.toTerminal(false)
      logs.success("autoRoot: displayed help and exiting.");
      return;
    }

    // Chuẩn hoá payloadArgs: một chuỗi, ví dụ "--target {host} --percent 0.1"
    const rawPayloadArgs = String(payloadArgs || "").trim(); // chuỗi hoặc ""
    // Tách thành mảng theo space (đơn giản). Nếu cần args phức tạp có quotes, có thể write parser.
    const globalPayloadArgTokens = rawPayloadArgs.length > 0 ? rawPayloadArgs.split(/\s+/) : [];

    // Một chút normalize (ns.flags có thể parse số, boolean; đảm bảo depth là number hoặc Infinity)
    let maxDepth: number;
    if (depth === Infinity) maxDepth = Infinity;
    else maxDepth = Number(depth) || Infinity;

    const startHost: string = start || "home";
    const runPayload: boolean = run;
    const payloadThreads: number = Math.max(0, Math.floor(threads || 1));

    if (verbose) {
      logs.toTerminal(true)
      logs.info(`autoRoot flags: start=${startHost} run=${runPayload} payload=${payload} threads=${payloadThreads} depth=${maxDepth} excludeHome=${excludeHome}`)
      logs.toTerminal(false)
    }

    // --- BFS scan + root ---
    const visited = new Set<string>();
    const parent = new Map<string, string | null>();
    const queue: { host: string; depth: number }[] = [{ host: startHost, depth: 0 }];
    visited.add(startHost);

    const pservs = ns.getPurchasedServers()
    if (pservs) for (const pserv of pservs) visited.add(pserv)

    parent.set(startHost, null);

    const results: { host: string; depth: number; rootedBefore: boolean; rootedAfter: boolean; opened?: number; required?: number; reason?: string }[] = [];

    while (queue.length > 0) {
      const { host, depth } = queue.shift()!;
      if (depth > maxDepth) continue;

      const hadRoot = ns.hasRootAccess(host);
      const rootRes = this.attemptRoot(host, excludeHome);

      if (verbose) logs.info(`Processed ${host} depth=${depth} hadRoot=${hadRoot} => ${rootRes.reason}`);

      results.push({
        host,
        depth,
        rootedBefore: hadRoot,
        rootedAfter: ns.hasRootAccess(host),
        opened: rootRes.openedPorts,
        required: rootRes.required,
        reason: rootRes.reason,
      });

      // Nếu root thành công và user muốn chạy payload
      if (rootRes.success && runPayload && host !== "home") {
        try {
          if (!ns.fileExists(payload, "home")) {
            logs.info(`Payload ${payload} not found on home; skipping exec on ${host}`);
          } else {
            ns.scp(payload, host);

            const ramPerThread = ns.getScriptRam(payload, host);
            const serverRam = ns.getServerMaxRam(host);
            const maxThreads = ramPerThread > 0 && serverRam > 0 ? Math.floor(serverRam / ramPerThread) : 0;
            const threadsToRun = Math.max(0, Math.min(payloadThreads, maxThreads));

            if (threadsToRun > 0) {
              ns.killall(host)
              const resolvedArgs = globalPayloadArgTokens.map(tok => tok.replace("{host}", host));
              const pid = ns.exec(payload, host, threadsToRun, ...resolvedArgs);
              if (pid > 0) logs.info(`Started ${payload} on ${host} with ${threadsToRun} threads (pid=${pid}) args=${JSON.stringify(resolvedArgs)}`);
              else logs.warn(`Failed to start ${payload} on ${host} (maybe not enough RAM)`);
            } else {
              // ns.tprint(`ERROR Not enough RAM on ${host} to run ${payload}`);
            }
          }
        } catch (e) {
          logs.toTerminal(true)
          logs.error(`copying/executing payload on ${host}: ${String(e)}`);
          logs.toTerminal(false)
        } finally {
          logs.success(`${ns.getScriptName()} Run done`)
        }
      }

      // scan neighbors
      let neighbors: string[] = [];
      try { neighbors = ns.scan(host); } catch { neighbors = []; }
      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          visited.add(nb);
          parent.set(nb, host);
          queue.push({ host: nb, depth: depth + 1 });
        }
      }
    }

    // --- Tóm tắt ---
    const total = results.length;
    const newlyRooted = results.filter(r => !r.rootedBefore && r.rootedAfter).length;
    const totalRootedBefore = results.filter(r => r.rootedBefore).length;
    ns.tprint(`INFO autoRoot summary: scanned=${total} rootedBefore=${totalRootedBefore} newlyRooted=${newlyRooted}`);

    if (verbose) {
      for (const r of results) {
        ns.tprint(`INFO ${r.host} depth=${r.depth} wasRoot=${r.rootedBefore} nowRoot=${r.rootedAfter} (${r.opened}/${r.required}) reason=${r.reason}`);
      }
    }
  }

  private attemptRoot(host: string, excludeHome: boolean): { success: boolean; openedPorts: number; required: number; reason?: string } {
    const required = this.ns.getServerNumPortsRequired(host);
    if (this.ns.hasRootAccess(host)) return { success: true, openedPorts: Infinity, required, reason: "alreadyRoot" };
    if (host === "home" && excludeHome) return { success: false, openedPorts: 0, required, reason: "home-excluded" };

    const opened = this.tryOpenPorts(host);
    if (opened >= required) {
      try {
        this.ns.nuke(host);
        if (this.ns.hasRootAccess(host)) return { success: true, openedPorts: opened, required, reason: "nuked" };
        return { success: false, openedPorts: opened, required, reason: "nuke-failed" };
      } catch (e) {
        return { success: false, openedPorts: opened, required, reason: `nuke-exception:${String(e)}` };
      }
    } else {
      return { success: false, openedPorts: opened, required, reason: `not-enough-ports:${opened}/${required}` };
    }
  }

  private tryOpenPorts(host: string): number {
    let opened = 0;
    try { if (this.fileExistsOnHome("BruteSSH.exe")) { this.ns.brutessh(host); opened++; } } catch { }
    try { if (this.fileExistsOnHome("FTPCrack.exe")) { this.ns.ftpcrack(host); opened++; } } catch { }
    try { if (this.fileExistsOnHome("relaySMTP.exe")) { this.ns.relaysmtp(host); opened++; } } catch { }
    try { if (this.fileExistsOnHome("HTTPWorm.exe")) { this.ns.httpworm(host); opened++; } } catch { }
    try { if (this.fileExistsOnHome("SQLInject.exe")) { this.ns.sqlinject(host); opened++; } } catch { }
    return opened;
  }

  // --- helpers ---
  private fileExistsOnHome(filename: string): boolean {
    return this.ns.fileExists(filename, "home");
  }

  static autocompleteExtra(data: AutocompleteData) {
    return data.servers;
  }
}



function helpIn() {
  // --- Nếu yêu cầu help thì in hướng dẫn và exit ---
  return [
    "autoRoot - script tự động chiếm quyền root cho Bitburner",
    "",
    "Usage:",
    "  run autoRoot.js [--start <host>] [--run] [--payload <file>] [--threads <n>] [--depth <n>] [--excludeHome <true|false>] [--verbose <true|false>]",
    "",
    "Flags (ns.flags):",
    "  --start <host>        Server bắt đầu scan (mặc định: home)",
    "  --run                 Nếu có thì copy & exec payload khi server bị root",
    "  --payload <file>      Tên file payload để copy/run (mặc định: hack.js)",
    "  --threads <n>         Số threads tối đa dùng khi exec payload (mỗi server) (mặc định: 1)",
    "  --depth <n>           Giới hạn depth khi scan (mặc định: Infinity)",
    "  --excludeHome <bool>  Có exclude 'home' (true/false). Mặc định true (không nuke home).",
    "  --verbose <bool>      Bật logging chi tiết (true/false). Mặc định false.",
    "  --help                In help này và exit",
    "",
    "Examples:",
    "  run autoRoot.js",
    "  run autoRoot.js --start n00dles --depth 3",
    "  run autoRoot.js --run --payload hack.js --threads 2 --verbose true",
    "  run autoRoot.js --excludeHome false    # cho phép nuke home (hãy cẩn thận!)",
    "",
    "Notes:",
    "  - Các chương trình mở port (BruteSSH.exe, FTPCrack.exe, relaySMTP.exe, HTTPWorm.exe, SQLInject.exe)",
    "    được giả định nằm trên 'home'. Script sẽ chỉ gọi API tương ứng nếu file .exe tồn tại trên home.",
    "  - Script dùng BFS để scan (tìm theo khoảng cách gần nhất trước).",
    "",
  ].join("\n");
}