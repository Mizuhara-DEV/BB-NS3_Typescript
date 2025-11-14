/**  module cool-down */
// Simple in-memory cooldown manager for targets (keeps map target -> expireTimestamp ms)

export default class CooldownManager {
  private cooldowns: Map<string, number>

  constructor() {
    this.cooldowns = new Map()
  }

  /** Đặt cooldown cho target (expireAt là timestamp ms) */
  public setCooldown(target: string, expireAt: number): void {
    if (!target) return
    if (expireAt <= Date.now()) {
      this.cooldowns.delete(target)
      return
    }
    this.cooldowns.set(target, expireAt)
  }

  /**
   * Kiểm tra target còn đang cooldown không.
   * Trả về true nếu vẫn còn (expire > now).
   */
  public isOnCooldown(target: string): boolean {
    const t = this.cooldowns.get(target)
    if (!t) return false
    if (t <= Date.now()) {
      this.cooldowns.delete(target)
      return false
    }
    return true
  }

  /** Lấy thời gian còn lại của cooldown (ms). Trả về 0 nếu không còn. */
  public getCooldownRemaining(target: string): number {
    const t = this.cooldowns.get(target)
    if (!t) return 0
    const remain = t - Date.now()
    if (remain <= 0) {
      this.cooldowns.delete(target)
      return 0
    }
    return remain
  }

  /**
   * Xóa cooldown cho target (manual clear).
   */
  public clearCooldown(target: string): void {
    this.cooldowns.delete(target)
  }

  /**
   * Dọn map, xóa các target đã hết hạn (gọi định kỳ nếu bạn muốn).
   */
  private cleanupExpired(): void {
    const now = Date.now()
    for (const [k, v] of this.cooldowns.entries()) {
      if (v <= now) this.cooldowns.delete(k)
    }
  }

  /**
   * (Optional) trả về snapshot cho debug
   */
  private listCooldowns(): { target: string, expiresInMs: number }[] {
    const now = Date.now()
    const out: { target: string, expiresInMs: number }[] = []
    for (const [k, v] of this.cooldowns.entries()) {
      const rem = v - now
      if (rem > 0) out.push({ target: k, expiresInMs: rem })
      else this.cooldowns.delete(k)
    }
    return out
  }

  get lists(): { target: string, expiresInMs: number }[] { return this.listCooldowns() }
  get cleanup() { return this.cleanupExpired.bind(this) }
}