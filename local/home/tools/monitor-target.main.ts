import BaseScript from "../bases/module.base-script"

export async function main(ns: NS) {
  const script = new MonitorTarget(ns)
  await script.run()
}

export function autocomplete(data: AutocompleteData) {
  return MonitorTarget.autocomplete(data, MonitorTarget.agrsSchem)
}

type AgrsSchem = typeof BaseScript.baseArgs

class MonitorTarget extends BaseScript {
  static agrsSchem: AgrsSchem = [
    ['target', '']
  ]

  constructor(ns: NS) {
    super(ns, MonitorTarget.agrsSchem)
    this.logs.enable(true)
    ns.ui.openTail()
  }

  async run(ns = this.ns, logs = this.logs): Promise<void> {
    const { target } = this.flags as { target: string }

    if (!target || target == '') return logs.info(this.help)

    try {
      while (true) {
        const server = ns.getServer(target)
        ns.clearLog()

        logs.info(`Money: ${this.nformat(server.moneyAvailable!)} / ${this.nformat(server.moneyMax!)}`)
        logs.info(`Sec: +${(server.hackDifficulty! - server.minDifficulty!).toFixed(3)}`)
        logs.info(`Hack: ${Math.ceil(ns.hackAnalyzeThreads(target, server.moneyMax!))} Time: ${this.tformat(ns.getHackTime(target))}`)
        logs.info(`Grow: ${Math.ceil(ns.growthAnalyze(target, server.moneyMax! / server.moneyAvailable!))} Time: ${this.tformat(ns.getGrowTime(target))}`)
        logs.info(`Weaken: ${Math.ceil((server.hackDifficulty! - server.minDifficulty!) / ns.weakenAnalyze(1))} Time: ${this.tformat(ns.getWeakenTime(target))}`)

        await ns.sleep(200)
      }
    } catch (error) {
      ns.ui.openTail()
      logs.error(`ERROR: ${error}`)
    } finally {
      logs.success(`${ns.getScriptName()} Run done`)
    }
  }

  nformat(data: number): string {
    return this.ns.format.number(data)
  }
  tformat(data: number): string {
    return this.ns.format.time(data)
  }

  get help() {
    return [
      `use run ${this.ns.getScriptName()} --target n00dles`
    ].join('\n')
  }
  static autocompleteExtra(data: AutocompleteData): string[] {
    return data.servers
  }
}