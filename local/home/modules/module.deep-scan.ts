/** module deep-scan */

export default class DeepScanModule {
  private ns: NS
  constructor(ns: NS) {
    this.ns = ns
  }

  private async deepScan(): Promise<string[]> {
    // --- BFS scan + root ---
    const listSvrs: string[] = []
    const visited = new Set<string>()
    const queue = ['home']
    visited.add('home')

    while (queue.length > 0) {
      const host = queue.shift()!
      if (host !== 'home') listSvrs.push(host)
      // scan neighbors
      let neighbors = this.ns.scan(host) ?? []
      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          visited.add(nb)
          queue.push(nb)
        }
      }
      await this.ns.sleep(10)
    }
    return listSvrs
  }

  private async get_hosts_ok(danh_sach_cac_server?: string[]): Promise<string[]> {
    const danh_sach_host_ok: string[] = []
    danh_sach_cac_server = !danh_sach_cac_server ? await this.deepScan() : danh_sach_cac_server

    for (const host of danh_sach_cac_server) {
      if (!this.ns.hasRootAccess(host)) continue;
      if (this.ns.getServerMaxRam(host) <= 0) continue
      danh_sach_host_ok.push(host)
    }
    return danh_sach_host_ok.sort((a, b) => this.ns.getServerMaxRam(b) - this.ns.getServerMaxRam(a))
  }

  private async get_server_hack_ok(): Promise<string[]> {
    const cur_lvl_hk = this.ns.getHackingLevel()
    const danh_sach_hack_ok: string[] = []
    const danh_sach_cac_server: string[] = await this.deepScan()

    for (const host of danh_sach_cac_server) {
      if (this.ns.getServerRequiredHackingLevel(host) > cur_lvl_hk) continue
      if (!this.ns.hasRootAccess(host)) continue;
      if (this.ns.getServerMaxMoney(host) <= 0) continue
      danh_sach_hack_ok.push(host)
    }
    return danh_sach_hack_ok
  }

  async getServersToHack(): Promise<string[]> { return await this.get_server_hack_ok() }
  async getServersWithRoot(): Promise<string[]> { return await this.get_hosts_ok() }
  async getAllServers(): Promise<string[]> { return await this.deepScan() }
}