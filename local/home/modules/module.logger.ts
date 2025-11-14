// module.logger.ts
// Quản lý toàn bộ log cho Bitburner script
// Dùng ANSI để đổi màu text theo label (nếu client hỗ trợ)

export enum LogLevel {
  DEBUG = 1,
  INFO = 2,
  SUCCESS = 3,
  WARN = 4,
  ERROR = 5,
}

interface LogConfig {
  enabled: boolean;       // bật tắc log
  minLevel: LogLevel;     // set cấp độ thấp nhất được print
  useTerminal: boolean;   // true = tprint(), false = print()
  showTimestamp: boolean; // bật tắc hiện mốc thời gian
  useColor: boolean;      // bật đổi màu log
  debug: boolean;         // bật tắc debug
  writeFile: boolean;     // bật ghi file
  filePath: string;       // đường dẫn file log
}

// Mã màu ANSI cho từng mức log
// Giải thích: \x1b[38;2;R;G;Bm = đổi màu chữ, \x1b[0m = reset
const LogColors: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "\x1b[38;2;156;163;175m",  // gray
  [LogLevel.INFO]: "\x1b[38;2;6;182;212m",     // cyan
  [LogLevel.SUCCESS]: "\x1b[38;2;16;185;129m", // green
  [LogLevel.WARN]: "\x1b[38;2;245;158;11m",    // orange
  [LogLevel.ERROR]: "\x1b[38;2;239;68;68m",    // red
}

enum colors {
  reset = "\x1b[0m",
}

export class Logger {
  private ns: NS
  private config: LogConfig

  constructor(ns: NS, config?: Partial<LogConfig>) {
    this.ns = ns
    this.config = {
      enabled: true,
      minLevel: LogLevel.DEBUG,
      useTerminal: false,
      showTimestamp: true,
      useColor: true,
      debug: false,
      writeFile: false,
      filePath: "logs/base.logger.txt",
      ...config,
    }
  }

  private formatLog(level: string, msg: any, color?: string): string {
    const time = this.config.showTimestamp ? `[${new Date().toLocaleTimeString()}] ` : ''
    // Thêm màu ANSI nếu bật
    if (this.config.useColor && color) {
      return `${color}${time}${msg}${colors.reset}`
    }

    const label = this.config.useColor ? `[${level}] ` : ''
    return `${time}${label}${msg}`
  }

  private formatWire(level: string, msg: any): string {
    const time = this.config.showTimestamp ? `[${new Date().toLocaleTimeString()}]` : ''
    return `${time}[${level}] => ${msg}`
  }

  private out(level: LogLevel, label: string, msg: any, ...args: any[]): void {
    if (!this.config.enabled) return
    if (level < this.config.minLevel) return

    var color = LogColors[level]
    const fullMsg = this.formatLog(label, msg, color)
    const formatted = args.length > 0 ? `${fullMsg} ${args.join(" ")}` : fullMsg
    // Hiển thị trên màn hình
    if (this.config.useTerminal) this.ns.tprint(formatted)
    else this.ns.print(formatted)
    // Ghi file (không chứa mã màu)
    if (this.config.writeFile && this.config.filePath) {
      const fullMsg = this.formatWire(label, msg)
      const plainLine = args.length > 0 ? `${fullMsg} ${args.join(" ")}\n` : fullMsg + '\n'
      this.ns.write(this.config.filePath, plainLine, "a")
    }
  }

  debug(msg: any, ...args: any[]) { this.out(LogLevel.DEBUG, "DEBUG", msg, ...args) }
  info(msg: any, ...args: any[]) { this.out(LogLevel.INFO, "INFO", msg, ...args) }
  success(msg: any, ...args: any[]) { this.out(LogLevel.SUCCESS, "SUCCESS", msg, ...args) }
  warn(msg: any, ...args: any[]) { this.out(LogLevel.WARN, "WARN", msg, ...args) }
  error(msg: any, ...args: any[]) { this.out(LogLevel.ERROR, "ERROR", msg, ...args) }

  // các tiện ích cấu hình
  setDebug(v: boolean) { this.config.debug = v }
  enable(v: boolean) { this.config.enabled = v }
  setLevel(lv: LogLevel) { this.config.minLevel = lv }
  toTerminal(v: boolean) { this.config.useTerminal = v }
  showTime(v: boolean) { this.config.showTimestamp = v }
  color(v: boolean) { this.config.useColor = v }
  setFile(path: string, enable = true) { this.config.filePath = path; this.config.writeFile = enable }

  // lấy cấu hình
  get isDebug() { return this.config.debug }
  get isLogLevel() { const logLevel: Record<number, string> = { 1: 'debug', 2: 'info', 3: 'success', 4: 'warn', 5: 'error' }; return logLevel[this.config.minLevel] }
}