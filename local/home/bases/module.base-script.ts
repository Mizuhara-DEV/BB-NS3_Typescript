// module.base-script.ts
import { Logger, LogLevel } from '../modules/module.logger'

export default abstract class BaseScript {
  ns: NS
  logs: Logger
  flags: Record<string, any>
  /**@param debug biến gỡ lỗi */
  debug: boolean
  static baseArgs: [string, string | number | boolean | string[]][] = [
    ['loglevel', 'info'],
    ['l', false], ['d', false], ['time', false], ['terminal', false]
  ]

  constructor(ns: NS, extraArgs: [string, string | number | boolean | string[]][] = []) {
    ns.disableLog('ALL')
    ns.clearLog()
    this.ns = ns

    // --- merge base args + extra args của script con
    const argsSchema = [...BaseScript.baseArgs, ...extraArgs]
    this.flags = ns.flags(argsSchema)

    const { loglevel, l: logEnabled, d: debug, time: showtime, terminal } = this.flags as {
      loglevel: string, l: boolean, d: boolean, time: boolean, terminal: boolean
    }

    const logMap: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      succ: LogLevel.SUCCESS,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
    }

    // --- setup logger
    this.logs = new Logger(ns, {
      enabled: logEnabled,
      showTimestamp: showtime,
      useTerminal: terminal,
      debug: debug
    })

    !debug ? this.logs.setLevel(logMap[loglevel] ?? LogLevel.INFO) : this.logs.setLevel(logMap['debug'] ?? LogLevel.DEBUG)
    this.debug = debug

    if (logEnabled && !terminal) {
      ns.clearLog()
      ns.ui.openTail()
    }

    if (debug) this.logs.info(`BaseScript | level=${this.logs.isLogLevel} | tail=${logEnabled} | time=${showtime}`)
  }

  /** Mỗi script con phải override run() */
  abstract run(): Promise<void>

  /** Hàm này script con có thể override để thêm autocomplete riêng */
  static autocompleteExtra?(data: AutocompleteData): string[]

  /** Tự động ghép autocomplete base + extra */
  static autocomplete(data: AutocompleteData, extraArgs: [string, any][] = []) {
    const merged = [...BaseScript.baseArgs, ...extraArgs]
    data.flags(merged)
    const extras = this.autocompleteExtra ? this.autocompleteExtra(data) : []
    return [...data.scripts, ...extras]
  }
}