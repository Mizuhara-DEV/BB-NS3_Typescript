import DeepScanModule from '../modules/module.deep-scan'
import { type Logger } from '../modules/module.logger'

/**@public */
export interface Batch {
  hostname: string;
  normalization: boolean;
  hackThreads: number;
  growThreads: number;
  weakenHackThreads: number;
  weakenGrowThreads: number;
  totalThreads: number;
  endtime: number;
  timeHack: number;
  timeGrow: number;
  timeWeaken: number;
  createAt: number;
}

export interface Configs {
  stagger: number
  launch_delay: number
  maxram: number
  debug: boolean
}

export default class Target_Module {
  private ns: NS
  private logs: Logger
  private configs: Configs
  private DeepScanModule: DeepScanModule
  private scrips_path = {
    hack: "bins/bin.hack.ts",
    grow: "bins/bin.grow.ts",
    weaken: "bins/bin.weaken.ts"
  }
  private scrips_ram: {
    hack: number
    grow: number
    weaken: number
  }

  constructor(ns: NS, logs: Logger, configs?: Partial<Configs>) {
    this.ns = ns
    this.logs = logs
    this.DeepScanModule = new DeepScanModule(ns)
    this.scrips_ram = {
      hack: ns.getScriptRam(this.scrips_path.hack),
      grow: ns.getScriptRam(this.scrips_path.grow),
      weaken: ns.getScriptRam(this.scrips_path.weaken)
    }
    this.configs = {
      stagger: 400,
      launch_delay: 400,
      maxram: Math.max(...Object.values(this.scrips_ram) as number[]),
      debug: logs.isDebug || false,
      ...configs
    }
  }


  /** Kiểm tra chuẩn hóa và thiết lập các luồn cho đợt tấn công */
  private async setupBatThreads(target: string, rate: number, ns = this.ns): Promise<Batch> {
    // --- Thông tin server --- //
    var server = ns.getServer(target)
    const player = ns.getPlayer()
    const formulasAPI = this.check_Formulas()
    var moneyAvailable = server.moneyAvailable!
    const moneyMax = server.moneyMax!
    var hackDifficulty = server.hackDifficulty!
    const minDifficulty = server.minDifficulty!

    // --- Khởi tạo biến cục bộ --- //
    var [hack_Threads, grow_Threads, weakenH_Threads, weakenG_Threads] = [0, 0, 0, 0]
    const valueWeaken = ns.weakenAnalyze(1)
    const times = this.timesWGH(target, formulasAPI)
    const timemax = Math.max(...Object.values(times) as number[])

    /** Kiểm tra normalize **/
    if (hackDifficulty > minDifficulty + 5 || moneyAvailable < moneyMax * 0.9) {
      grow_Threads += Math.max(1, Math.ceil(ns.growthAnalyze(target, moneyMax / moneyAvailable)))

      if (grow_Threads > 0) {
        hackDifficulty += grow_Threads * 0.004
      }

      weakenG_Threads += Math.max(1, Math.ceil((hackDifficulty - minDifficulty) / valueWeaken))

      return {
        hostname: target,
        normalization: true,
        hackThreads: hack_Threads,
        growThreads: grow_Threads,
        weakenHackThreads: weakenH_Threads,
        weakenGrowThreads: weakenG_Threads,
        totalThreads: hack_Threads + grow_Threads + weakenH_Threads + weakenG_Threads,
        endtime: timemax,
        timeHack: times.th,
        timeGrow: times.tg,
        timeWeaken: times.tw,
        createAt: Date.now()
      }
    }
    /** Thiết lập HWGW */
    // --- Hack threads --- //
    hack_Threads += Math.max(1, Math.floor(ns.hackAnalyzeThreads(target, (moneyAvailable * rate))))
    if (!isFinite(hack_Threads)) hack_Threads = 1

    // --- Grow threads --- //
    const safeMoney = Math.max(1, moneyAvailable - (moneyAvailable * rate))
    const growRatio = moneyMax / safeMoney
    grow_Threads += Math.max(1, Math.ceil(ns.growthAnalyze(target, growRatio)))
    if (!isFinite(grow_Threads)) grow_Threads = 1

    // --- Weaken threads --- //
    if ((hack_Threads || grow_Threads) > 0) {
      // -- Weaken Hack -- //
      const security_Hack = hack_Threads * 0.002
      weakenH_Threads += Math.max(1, Math.ceil(security_Hack / valueWeaken))

      // -- Weaken Grow -- //
      const security_Grow = grow_Threads * 0.004
      weakenG_Threads += Math.max(1, Math.ceil(security_Grow / valueWeaken))
    }
    return {
      hostname: target,
      normalization: false,
      hackThreads: hack_Threads,
      growThreads: grow_Threads,
      weakenHackThreads: weakenH_Threads,
      weakenGrowThreads: weakenG_Threads,
      totalThreads: hack_Threads + grow_Threads + weakenH_Threads + weakenG_Threads,
      endtime: timemax,
      timeHack: times.th,
      timeGrow: times.tg,
      timeWeaken: times.tw,
      createAt: Date.now()
    }
  }


  /** Kiểm tra Batch và chiển khai */
  private async attackBatch(batches: Batch, hosts: string[]): Promise<boolean> {
    if (!batches) return false
    // check threads trên hosts //
    const totalThreads = batches.totalThreads
    const totalServerThreads = await this.getfreeThreadsServer(this.configs.maxram, hosts)
    if (this.configs.debug) this.logs.error(`check 1 ${totalServerThreads}`)
    if (totalThreads > totalServerThreads) return false

    // Thoản mản điều kiện bắt đầu triển khai scripts //
    const execOK = await this.execAllocList(hosts, batches)
    if (!execOK) return false

    return true
  }


  /** Hàm Triển khai trính */
  private async execAllocList(hosts: string[], batches: Batch, ns = this.ns): Promise<boolean> {
    // Khởi tạo biến cục bộ và kiểm tra lại các host //
    if (!batches) return false
    var batch_Threads = batches.totalThreads
    const target = batches.hostname
    const totalServerThreads = await this.getfreeThreadsServer(this.configs.maxram, hosts)
    if (this.configs.debug) this.logs.error(`check 2 ${totalServerThreads}`)
    if (batch_Threads > totalServerThreads) return false

    // threads cần cho từng script //
    var tHack = batches.hackThreads
    var tGrow = batches.growThreads
    var tWeakH = batches.weakenHackThreads
    var tWeakG = batches.weakenGrowThreads

    // times (ms) //
    const th = batches.timeHack
    const tg = batches.timeGrow
    const tw = batches.timeWeaken

    // chọn một finish timeline: ta chọn baseFinish = now + maxExecTime + LAUNCH_DELAY //
    const now = Date.now()
    const baseFinish = now + tw + this.configs.launch_delay

    // Muốn các finish theo thứ tự: hack -> weakenH -> grow -> weakenG //
    // Ta đặt finish times theo offsets:
    const finishHack = baseFinish - this.configs.stagger * 3
    const finishWeakH = baseFinish - this.configs.stagger * 2
    const finishGrow = baseFinish - this.configs.stagger
    const finishWeakG = baseFinish

    // Tính start times = finish - execTime //
    const startHack = Math.max(0, finishHack - th)
    const startWeakH = Math.max(0, finishWeakH - tw)
    const startGrow = Math.max(0, finishGrow - tg)
    const startWeakG = Math.max(0, finishWeakG - tw)
    if (this.configs.debug) {
      this.logs.debug(`[${target}] - startHack: ${ns.format.time(Math.max(0, startHack - Date.now()))}`)
      this.logs.debug(`[${target}] - startWeakH: ${ns.format.time(Math.max(0, startWeakH - Date.now()))}`)
      this.logs.debug(`[${target}] - startGrow: ${ns.format.time(Math.max(0, startGrow - Date.now()))}`)
      this.logs.debug(`[${target}] - startWeakG: ${ns.format.time(Math.max(0, startWeakG - Date.now()))}`)
      return false
    }
    var i = 0
    // Loop chạy các sripts cho đến khi hoàn thành //
    while (batch_Threads > 0) {
      for (const host of hosts) {
        if (this.getFreeRamServer(host) <= 0) continue

        if (tHack > 0) {
          const threadsHost = await this.getfreeThreadsServer(this.scrips_ram.hack, [host])
          if (threadsHost <= 0) continue
          const use_Threads = Math.min(threadsHost, tHack)
          const runOK = ns.exec(this.scrips_path.hack, host, use_Threads, ...[target, startHack, this.configs.debug])
          if (runOK <= 0) continue
          tHack -= use_Threads
          batch_Threads -= use_Threads
        }

        if (tWeakH > 0) {
          const threadsHost = await this.getfreeThreadsServer(this.scrips_ram.weaken, [host])
          if (threadsHost <= 0) continue
          const use_Threads = Math.min(threadsHost, tWeakH)
          const runOK = ns.exec(this.scrips_path.weaken, host, use_Threads, ...[target, startWeakH, this.configs.debug])
          if (runOK <= 0) continue
          tWeakH -= use_Threads
          batch_Threads -= use_Threads
        }

        if (tGrow > 0) {
          const threadsHost = await this.getfreeThreadsServer(this.scrips_ram.grow, [host])
          if (threadsHost <= 0) continue
          const use_Threads = Math.min(threadsHost, tGrow)
          const runOK = ns.exec(this.scrips_path.grow, host, use_Threads, ...[target, startGrow, this.configs.debug])
          if (runOK <= 0) continue
          tGrow -= use_Threads
          batch_Threads -= use_Threads
        }

        if (tWeakG > 0) {
          const threadsHost = await this.getfreeThreadsServer(this.scrips_ram.weaken, [host])
          if (threadsHost <= 0) continue
          const use_Threads = Math.min(threadsHost, tWeakG)
          const runOK = ns.exec(this.scrips_path.weaken, host, use_Threads, ...[target, startWeakG, this.configs.debug])
          if (runOK <= 0) continue
          tWeakG -= use_Threads
          batch_Threads -= use_Threads
        }

        if (batch_Threads <= 0) break
      }
      i++
      await ns.sleep(10)
    }

    if (this.configs.debug) {
      this.logs.error(`again exec ${i}`)
      this.logs.error(`hosts exec ${hosts.length}`)
    }

    return true
  }


  /** Lấy free Ram host */
  private getFreeRamServer(host: string, ns = this.ns): number {
    if (host === 'home') {
      return Math.max(0, ((ns.getServerMaxRam(host) - 32) - ns.getServerUsedRam(host)))
    }

    return Math.max(0, (ns.getServerMaxRam(host) - ns.getServerUsedRam(host)))
  }


  /** Lấy threads host hoặc hosts*/
  private async getfreeThreadsServer(scriptRam: number, hosts: string[]): Promise<number> {
    if (scriptRam <= 0) throw new Error(`getfreeThreadsServer: scriptRam: ${scriptRam} ==> phải lớn hơn 0`)
    var freeThreads = 0
    for (const host of hosts) {
      const free = this.getFreeRamServer(host)
      if (free <= 0) continue
      freeThreads += Math.floor(free / scriptRam)
    }
    return freeThreads
  }


  /** Lấy thời gian thực thi của hàm hack, grow, weaken */
  private timesWGH(target: string, formulasAPI?: boolean, ns = this.ns) {
    if (formulasAPI) {
      const server = ns.getServer(target)
      const player = ns.getPlayer()
      return {
        th: ns.formulas.hacking.hackTime(server, player),
        tg: ns.formulas.hacking.growTime(server, player),
        tw: ns.formulas.hacking.weakenTime(server, player)
      }
    }
    return {
      th: ns.getHackTime(target),
      tg: ns.getGrowTime(target),
      tw: ns.getWeakenTime(target)
    }
  }


  /** Kiểm tra target có đủ điều kiện không */
  private check_target(target: string, ns = this.ns) {
    const server = ns.getServer(target)
    if (!server) {
      ns.tprint(`❌ Không tìm thấy server: ${target}`)
      return null
    }
    if (!server.hasAdminRights) {
      ns.tprint(`⚠️ Chưa có quyền admin trên ${target}`)
      return null
    }
    if (server.moneyMax! <= 0) {
      ns.tprint(`⚠️ ${target} Không có tiền để hack`)
      return null
    }
    return server
  }


  /** Lấy danh sách các host có thể dùng */
  private async get_hosts(prefix: string, sp: boolean = false, ns = this.ns) {
    var hosts: string[] = []
    this.logs.info(`[GET-HOSTS]`)

    if (prefix.toLowerCase() === 'all') {
      hosts = await this.DeepScanModule.getServersWithRoot()
    } else if (prefix.toLowerCase() === 'pserv') {
      hosts = ns.getPurchasedServers()
    } else {
      hosts = [prefix]
    }

    if (hosts.length <= 0) hosts.push('home')
    if (sp && !hosts.includes('home')) hosts.push('home')

    this.logs.success(`[GET-HOSTS] ${hosts.length} host`)
    return hosts
  }


  /** Chiển khai script con */
  private copy_script(hosts: string[], ns = this.ns) {
    if (this.configs.debug) this.logs.info(`[COPY-SCRIPT]`)

    for (const host of hosts) {
      if (host === 'home') continue
      ns.scp(Object.values(this.scrips_path) as string[], host)
    }

    if (this.configs.debug) this.logs.success(`[COPY-SCRIPT] ${hosts.length} host`)
  }


  /** Lấy danh sách các target có thể hack */
  private async get_targets(prefix: string, ns = this.ns) {
    var servers: string[] = []
    this.logs.info(`[GET-TARGETS]`)

    if ((prefix).toLowerCase() === 'all') {
      servers = (await this.DeepScanModule.getServersToHack()).filter((h) => h !== 'foodnstuff')
    } else {
      servers = [prefix]
    }

    this.logs.success(`[GET-TARGETS] ${servers.length} server`)
    return servers
  }


  /** Kiểm tra API Formulas */
  private check_Formulas(ns = this.ns): boolean {
    return ns.fileExists('Formulas.exe', 'home')
  }


  async sendBatch(batch: Batch, hosts: string[]) { return this.attackBatch(batch, hosts) }
  /** Lấy danh sách các host có thể dùng */
  async getHost(prefix: string, h: boolean = false) { return await this.get_hosts(prefix, h) }
  /** Lấy danh sách các target có thể hack */
  async getTargets(prefix: string) { return await this.get_targets(prefix) }
  /** Kiểm tra chuẩn hóa và thiết lập các luồn cho đợt tấn công */
  async getBatch(server: string, rate: number = 0.01) { return this.setupBatThreads(server, rate) }
  /** Kiểm tra target */
  checkOut(target: string) { return this.check_target(target) }
  /** Chiển khai script con */
  copyScripts(hosts: string[]) { return this.copy_script(hosts) }

  get isLaunchDelay() { return this.configs.launch_delay }
  get isStagger() { return this.configs.stagger }
  get isRams() { return this.scrips_ram }
  get isPath() { return this.scrips_path }
}