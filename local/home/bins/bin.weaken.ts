export async function main(ns: NS) {
  const target = ns.args[0] as string
  const startTime = ns.args[1] as number || 0
  const debug = ns.args[2] as boolean || false

  if (!target) return

  const delayStart = Math.max(0, startTime - Date.now())
  await ns.weaken(target, { additionalMsec: delayStart })
  if (debug) ns.tprint(`Weaken: Done : ${ns.format.time(delayStart)}`)
}


export function autocomplete(data: AutocompleteData, args: ScriptArg[]) {
  return [...data.servers]
}
