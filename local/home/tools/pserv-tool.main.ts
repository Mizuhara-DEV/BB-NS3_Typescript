import BaseScript from "../bases/module.base-script"
import { Colors } from "../modules/module.colors";


export async function main(ns: NS) {
  const script = new Pserv_Tool(ns)
  await script.run()
}

export function autocomplete(data: AutocompleteData) {
  // gọi static autocomplete() từ BaseScript
  return Pserv_Tool.autocomplete(data, Pserv_Tool.argsSchema)
}

class Pserv_Tool extends BaseScript {
  static argsSchema: [string, string | number | boolean | string[]][] = [
    ['v', 1], ['r', 2], ['prefix', 'Pserv'],
    ['a', false], ['u', false], ['b', false], ['h', false], ['sort', false]
  ];

  constructor(ns: NS) {
    super(ns, Pserv_Tool.argsSchema);
  }

  async run(ns: NS = this.ns): Promise<void> {
    var { v: value, r: amountRam, prefix: base_name, a: all, b: buy, u: upgrade, h: help, sort } = this.flags as {
      v: number, r: number, prefix: string,
      a: boolean, b: boolean, u: boolean, h: boolean, sort: boolean
    }
    if (upgrade && buy) buy = false

    if (amountRam > 20) { amountRam = 20 }
    var ram = 2 ** amountRam

    const price_pserv = ns.getPurchasedServerCost(ram)
    if (!isFinite(price_pserv)) { return this.logs.error(`Price is not ${price_pserv}`) }

    if (help) {
      this.logs.info(`--- Cách dùng tool và lệnh ---`)
      this.logs.info(`  -v    [-v <number>] số lượng host`)
      this.logs.info(`  -r    [-r <number>] số ram muốn <mua/nân cấp> host`)
      this.logs.info(`  -n    [-n <string>] prefix name host default <pserv>`)
      this.logs.info(`  -b    xác nhận mua host`)
      this.logs.info(`  -u    xác nhận nân cấp host`)
      this.logs.info(`  -a    <mua/nân cấp> tất cả host`)
      this.logs.info(`  -h    hiển thị cách dùng này`)
      return
    }

    var limit: number = 0
    var pservs_name = ns.getPurchasedServers()

    const list_name_pserv = this.getListNamePserv(base_name, ram)

    function check_limit() {
      if (all) {
        if (buy) {
          limit = 25 - pservs_name.length
        } else {
          const pserv_ok: string[] = []
          for (const host of pservs_name) {
            if (ram <= ns.getServerMaxRam(host)) continue
            pserv_ok.push(host)
          }
          pservs_name = pserv_ok
          limit = pserv_ok.length
        }
      } else limit = value
    }

    check_limit()

    if (sort && !buy && !upgrade) {
      this.sortPservs(base_name)
      return
    }

    this.logs.info(`Price (one/all(${limit})): ${Colors.Yellow}$${ns.format.number(price_pserv)} / ${Colors.Yellow}$${ns.format.number(price_pserv * limit)}`)
    this.logs.info(`Ram : ${ns.format.ram(ram)}`)

    if (buy) {
      if (limit <= 0) { return this.logs.warn(`Đã mua tối đa 25 host`) }
      for (var num = 0; num < limit; num++) {
        const money = ns.getPlayer().money
        if (money < price_pserv) break

        const name = list_name_pserv[num]

        if (this.buyPserv(name, ram)) {
          this.logs.success(`[BUY] [${name}] Price: ${Colors.Yellow}$${ns.format.number(price_pserv)}`)
        } else {
          this.logs.error(`[BUY] [${name}] Price: ${Colors.Yellow}$${ns.format.number(price_pserv)}`)
        }
      }
      return
    }

    if (upgrade) {
      if (limit <= 0) { return this.logs.warn(`Không có host đủ điều kiện nân cấp`) }
      var num: number = 0
      for (const host of pservs_name) {
        const money = ns.getPlayer().money
        if (money < price_pserv) break

        const name = list_name_pserv[num]
        if (host === name) continue

        const rename = (host !== name && name) ? `->[${name}]` : ''

        if (this.upgradePserv(host, ram)) {
          num++
          this.logs.success(`[UPGRADE] [${host}]${rename} Price: ${Colors.Yellow}$${ns.format.number(price_pserv)}`)
        } else {
          this.logs.error(`[UPGRADE] [${host}]${rename} Price: ${Colors.Yellow}$${ns.format.number(price_pserv)}`)
        }
        if (limit <= num) break
      }
      return
    }
    return
  }

  private buyPserv(name_pserv: string, ram: number, ns: NS = this.ns): string | null {
    if (this.debug) { return name_pserv }
    const buy_name = ns.purchaseServer(name_pserv, ram)
    if (buy_name.length <= 0) return null
    return buy_name
  }

  private upgradePserv(old_name: string, ram: number, ns: NS = this.ns): boolean {
    if (this.debug) { return true }
    const upgrade_ok = ns.upgradePurchasedServer(old_name, ram)
    if (!upgrade_ok) return false
    return true
  }

  private sortPservs(base_name: string, ns = this.ns) {
    const pservs = ns.getPurchasedServers()
    const hosts: string[] = []
    var i = 1
    for (var i = 0; i < pservs.length; i++) {
      const host = pservs[i]
      const name = `${base_name}-${i + 1}-T`
      ns.renamePurchasedServer(host, name)
      hosts.push(name)
    }
    for (var i = 0; i < pservs.length; i++) {
      const host = hosts[i]
      const name = `${base_name}-${i + 1}`
      ns.renamePurchasedServer(host, name)
    }
  }

  private getListNamePserv(base_name: string, ram: number, limit: number = 25, ns: NS = this.ns): string[] {
    const list_name_pserv: string[] = []
    const pserv_names = ns.getPurchasedServers()
    for (var num = 0; num < limit; num++) {
      const name = `${base_name}-${num + 1}` // -${num + 1}
      if (pserv_names.includes(name)) continue
      list_name_pserv.push(name)
    }
    return list_name_pserv
  }

  static autocompleteExtra(data: AutocompleteData): string[] {
    return data.servers;
  }
}