import BaseScript from '../bases/module.base-script'
import CooldownManager from '../modules/module.cool-down'
import Target_Module from './module.target-hack'

export async function main(ns: NS) {
  const script = new Target_Script(ns)
  await script.run(ns)
}

export function autocomplete(data: AutocompleteData) {
  // gọi static autocomplete() từ BaseScript
  return Target_Script.autocomplete(data, Target_Script.argsSchema)
}

class Target_Script extends BaseScript {
  /**@param argsSchema flags riêng của script con */
  static argsSchema: [string, string | number | boolean | string[]][] = [
    ['target', 'all'], ['host', 'all'],
    ['rate', 0.1], ['limittime', 60000],
    ['h', false],
  ]

  constructor(ns: NS) {
    super(ns, Target_Script.argsSchema)
    this.utils = new Target_Module(ns, this.logs)
    this.cdManager = new CooldownManager()
  }

  /** @param utils Module tiện ích hack */
  private utils: Target_Module
  /** @param cdManager Quản lý thời gian chờ giữa các target */
  private cdManager: CooldownManager

  async run(ns: NS = this.ns, logs = this.logs) {

    var { target, rate, h: sp, host, limittime } = this.flags as {
      target: string, rate: number, h: boolean, host: string, limittime: number
    }

    if (!target || target == '') {
      return logs.error(`[target] is [${target}]\n use: run ... --target <server name | all>`)
    }
    if (limittime <= 0 || !limittime) limittime = 60000
    if (rate > 0.95) rate = 0.95

    const launch_delay = this.utils.isLaunchDelay
    var targets: string[] = [], hosts: string[] = []

    var old_time = {
      time_host: 0,   // Delay get host
      time_target: 0, // Delay get target
      time_copy: 0    // Delay copy
    }

    while (true) {
      const now = (Date.now() / 1000)
      /** Lấy danh sách hosts */
      if (now - old_time.time_host > 20) {
        hosts = await this.utils.getHost(host, sp)
        logs.debug(JSON.stringify(hosts, null, 2))
        old_time.time_host = now
      }
      /** Triển khai các script con */
      if (now - old_time.time_copy > 20) {
        this.utils.copyScripts(hosts)
        old_time.time_copy = now
      }
      /** Lấy danh sách targets */
      if (now - old_time.time_target > 60) {
        targets = await this.utils.getTargets(target)
        old_time.time_target = now
      }

      for (const st of targets) {
        // if (st == 'foodnstuff') continue
        const server = this.utils.checkOut(st)
        if (!server) continue

        if (this.cdManager.isOnCooldown(server.hostname)) continue

        /** Batches setup */
        var batches = await this.utils.getBatch(server.hostname, rate)
        if (!batches) continue
        if (!batches.normalization && batches.timeWeaken > limittime) continue
        if (batches.normalization && batches.timeWeaken > limittime * 2) continue

        if (this.debug) {
          logs.debug(`[${server.hostname}] Server: ${JSON.stringify(server, null, 2)}`)
          logs.debug(`[${server.hostname}] Batches: ${JSON.stringify(batches, null, 2)}`)
        }

        /** log info */
        const logMsg: string[] = [
          `[BATT-Target] [${batches.hostname}]`,
          `[BATT-Threads] H=${batches.hackThreads} WH=${batches.weakenHackThreads} G=${batches.growThreads} WG=${batches.weakenGrowThreads}`
        ]

        var checkRun = false
        // Chiển khai tấn công
        for (const text of logMsg) {
          batches.normalization ? logs.warn(text) : logs.info(text)
        }

        const runOk = await this.utils.sendBatch(batches, hosts)
        if (runOk) { checkRun = true }

        checkRun // Xác nhận chạy
          ? logs.success(`[EXEC-Done] [${batches.hostname}]`)
          : logs.warn(`[EXEC-Fail] [${batches.hostname}]`)

        // Đặt thời gian chờ cho target
        if (checkRun) {
          const now = Date.now()
          const value = batches.normalization
            ? now + (batches.endtime + launch_delay * 4)
            : now + launch_delay + 500
          this.cdManager.setCooldown(server.hostname, value)
        }

        if (this.debug) break
      }
      await ns.sleep(200)
    }
  }

  // --- autocomplete thêm giá trị gợi ý riêng cho target
  static autocompleteExtra(data: AutocompleteData) {
    return data.servers
  }
}