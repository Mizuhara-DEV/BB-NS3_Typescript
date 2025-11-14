import BaseScript from "../bases/module.base-script";

export async function main(ns: NS) {
  const script = new BackdoorScript(ns)
  await script.run()
}

export function autocomplete(data: AutocompleteData) {
  return BackdoorScript.autocomplete(data, BackdoorScript.agrsSchem)
}

type AgrsSchem = typeof BaseScript.baseArgs

class BackdoorScript extends BaseScript {
  static agrsSchem: AgrsSchem = [
    ['host', '']
  ]
  private backdoor_list: string[] = ['CSEC', 'avmnite-02h', 'I.I.I.I', 'run4theh111z', 'w0r1d_d43m0n']

  constructor(ns: NS) {
    super(ns, BackdoorScript.agrsSchem)
  }

  async run(ns = this.ns, logs = this.logs): Promise<void> {
    const { host } = this.flags as { host: string }

    var targets = [host]
    if (host.toLowerCase() === 'all') { targets = this.backdoor_list }

    try {
      const player = ns.getPlayer()

      for (const target of targets) {
        const server = ns.getServer(target)

        if (server.backdoorInstalled! || server.requiredHackingSkill! > player.skills.hacking) continue

        const route: string[] = []
        this.recursiveScan('', 'home', target, route)

        if (!server.backdoorInstalled! && server.requiredHackingSkill! <= player.skills.hacking) {
          if (ns.singularity) {
            for (const host of route) {
              ns.singularity.connect(host)
            }

            await ns.singularity.installBackdoor()
            ns.singularity.connect('home');

            this.logs.success(`[Backdoor] ${target}`)
          } else {
            this.logs.info(`connect ${route.join('; connect ')}; backdoor`)
          }
        }
      }
    } catch (error) {
      if (this.debug) {
        logs.enable(true)
        logs.error(`ERROR: ${error}`)
      }
    } finally {
      logs.success(`${ns.getScriptName()} Run done`)
    }
  }

  private recursiveScan(parent: string, server: string, target: string, route: string[], ns: NS = this.ns) {
    if (this.debug) {
      this.logs.debug(`\nparent ${parent}`)
      this.logs.debug(`server ${server}`)
      this.logs.debug(`target ${target}`)
    }

    const children = ns.scan(server)
    for (let child of children) {
      if (parent == child) {
        continue
      }
      if (child == target) {
        route.unshift(child)
        route.unshift(server)
        return true
      }
      if (this.recursiveScan(server, child, target, route)) {
        route.unshift(server)
        return true
      }
    }
  }

  static autocompleteExtra(data: AutocompleteData): string[] {
    return data.servers
  }
}