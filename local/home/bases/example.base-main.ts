// scripts/example.ts
import BaseScript from '../bases/module.base-script'

export async function main(ns: NS) {
  const script = new ExampleScript(ns)
  await script.run(ns)
}

export function autocomplete(data: AutocompleteData) {
  // gọi static autocomplete() từ BaseScript
  return ExampleScript.autocomplete(data, ExampleScript.argsSchema)
}

class ExampleScript extends BaseScript {
  // --- flags riêng của script con
  static argsSchema: [string, string | number | boolean | string[]][] = [
    ['target', 'n00dles'], ['repeat', 1],
  ]

  constructor(ns: NS) {
    super(ns, ExampleScript.argsSchema)
  }

  async run(ns: NS = this.ns, logs = this.logs) {
    const { target, repeat } = this.flags as {
      target: string, repeat: number
    }

    try {
      const player = ns.getPlayer()

    } catch (error) {
      logs.error(`${error}`)
      logs.error(`Script ${ns.getScriptName()} run fail! ❎`)
      ns.ui.openTail()
    }
    logs.success(`Script ${ns.getScriptName()} run done! ✅`)
  }

  // --- autocomplete thêm giá trị gợi ý riêng cho target
  static autocompleteExtra(data: AutocompleteData) {
    return data.servers
  }
}