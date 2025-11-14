export async function main(ns: NS) {
  /*
      Original script by: u/I_hate_you_wasTaken, (https://www.reddit.com/r/Bitburner/comments/10urhbn/custom_overview_stats_but_better/)
      
      UPDATE 2/25/2023: 

      After the v2.2.2 release was released on 2/21/2023, the findPlayer() method used in the original script for 'globalThis.webpackJsonp.push()' and payload_id, stopped working.
      
      I refactored the script to use ns.getPlayer() and ns.gang.getGangInformation() as well as other methods to build out the previous and some new data fot the HUD. 
      
      The HUD now also shows the following:    
          • City
          • Location
          • Faction
          • Gang Respect
          • Gang Income
          • Scripts Income $/sec
          • Script Experience XP/sec
          • Karma
          • Kills
          • Active Servers

      This hs been tested on v2.2.2 (d3f9554a), and it is working/stable.    
      - u/DukeNukemDad    
  */

  ns.disableLog("ALL");
  // ns.clearLog();
  ns.ui.openTail();

  const args = ns.flags([["help", false]]);
  if (args.help) {
    ns.tprint("This script will enhance your HUD (Heads up Display) with custom statistics.");
    ns.tprint(`Usage: run ${ns.getScriptName()}`);
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()}`);
    return;
  }

  const doc = eval('document');
  const removeByClassName = (sel: string) => doc.querySelectorAll(sel).forEach((el: { remove: () => any; }) => el.remove());
  const colorByClassName = (sel: string, col: string) => doc.querySelectorAll(sel).forEach((el: { style: { color: string; }; }) => el.style.color = col);
  const hook0 = doc.getElementById('overview-extra-hook-0');
  const hook1 = doc.getElementById('overview-extra-hook-1');

  var allServers = [
    "n00dles", "foodnstuff", "sigma-cosmetics", "joesguns", "hong-fang-tea", "harakiri-sushi", "iron-gym", "darkweb",
    "zer0", "max-hardware", "nectar-net", "CSEC", "phantasy", "silver-helix", "omega-net", "neo-net", "netlink",
    "the-hub", "computek", "johnson-ortho", "crush-fitness", "avmnite-02h", "rothman-uni", "syscore", "summit-uni",
    "catalyst", "I.I.I.I", "zb-institute", "aevum-police", "rho-construction", "lexo-corp", "alpha-ent",
    "millenium-fitness", "snap-fitness", "aerocorp", "global-pharm", "galactic-cyber", "omnia", "deltaone",
    "unitalife", "icarus", "univ-energy", "solaris", "zeus-med", "defcomm", "taiyang-digital", "nova-med", "zb-def",
    "infocomm", "titan-labs", "applied-energetics", "run4theh111z", "microdyne", "fulcrumtech", "helios", "vitalife",
    "stormtech", "kuai-gong", ".", "omnitek", "4sigma", "nwo", "powerhouse-fitness", "b-and-a", "clarkinc", "blade",
    "megacorp", "ecorp", "The-Cave", "fulcrumassets"
  ]

  var allServerInRam = [
    "n00dles", "foodnstuff", "sigma-cosmetics", "joesguns", "hong-fang-tea", "harakiri-sushi",
    "iron-gym", "zer0", "max-hardware", "nectar-net", "CSEC", "phantasy", "silver-helix", "omega-net",
    "neo-net", "netlink", "the-hub", "avmnite-02h", "rothman-uni", "summit-uni", "catalyst", "I.I.I.I",
    "zb-institute", "aevum-police", "rho-construction", "lexo-corp", "alpha-ent", "millenium-fitness",
    "global-pharm", "omnia", "unitalife", "univ-energy", "solaris", "titan-labs", "run4theh111z",
    "microdyne", "fulcrumtech", "helios", "vitalife", ".", "omnitek", "powerhouse-fitness", "blade"
  ]
  var pservs: string[] = [];

  var theme = ns.ui.getTheme()

  while (true) {

    try {

      let player = ns.getPlayer();

      var gangInfo = null;
      var gangFaction = '';
      var gangIncome = '';
      var gangRespect = '';

      let gangAPI = false;
      try {
        if (ns.gang.getGangInformation() != null) {
          gangAPI = true;
        }
      } catch {
        ns.print("gangAPI: " + false);
      }

      if (gangAPI != false) {
        gangInfo = ns.gang.getGangInformation();
        gangFaction = gangInfo.faction;
        gangIncome = ns.format.number(ns.gang.getGangInformation().moneyGainRate * 5, 3);  // A tick is every 200ms. To get the actual money/sec, multiple moneyGainRate by 5.
        gangRespect = ns.format.number(ns.gang.getGangInformation().respect, 3);
      }

      var playerCity = player.city; // city
      var playerLocation = player.location; // location
      var playerKills = player.numPeopleKilled; // numPeopleKilled
      var playerKarma = ns.format.number(ns.heart.break(), 3);

      let purchased_servers = ns.getPurchasedServers(); // get every bought server if exists, else just create our blank array and add home to it.
      if (pservs.length < 25) {
        // ns.tprint('ping')
        pservs = purchased_servers;
        for (const h of pservs) {
          if (allServerInRam.includes(h)) continue
          allServerInRam.push(h);
        }
      }

      purchased_servers.push("home"); // add home to the array.
      let cumulative = 0;
      for (let pserv of purchased_servers) {
        let gains = 0;
        for (var script of ns.ps(pserv)) {
          var s = ns.getRunningScript(script.pid)
          if (s!.onlineRunningTime > 0) gains += s!.onlineMoneyMade / s!.onlineRunningTime
        }
        cumulative += gains;
      }

      var scriptIncome = ns.format.number(cumulative, 3); // $/sec
      var scriptXP = ns.format.number(ns.getTotalScriptExpGain(), 3); // xp/sec
      var activatePserv = allServerInRam.filter((h: string) => ns.getServerUsedRam(h) > 1)

      // End paramaters, begin CSS: 

      removeByClassName('.HUD_el');
      var theme = ns.ui.getTheme();
      removeByClassName('.HUD_sep');

      hook0.insertAdjacentHTML('beforebegin', `<hr class="HUD_sep HUD_el">`);
      hook1.insertAdjacentHTML('beforebegin', `<hr class="HUD_sep HUD_el">`);

      // playerCity
      hook0.insertAdjacentHTML('beforeend', `<element class="HUD_GN_C HUD_el" title="The name of the City you are currently in.">City </element><br class="HUD_el">`)
      colorByClassName(".HUD_GN_C", theme['cha'])
      hook1.insertAdjacentHTML('beforeend', `<element class="HUD_GN_C HUD_el">${playerCity + '<br class="HUD_el">'}</element>`)
      colorByClassName(".HUD_GN_C", theme['cha'])

      // playerLocation
      hook0.insertAdjacentHTML('beforeend', `<element class="HUD_GN_L HUD_el" title="Your current location inside the city.">Location </element><br class="HUD_el">`)
      colorByClassName(".HUD_GN_L", theme['cha'])
      hook1.insertAdjacentHTML('beforeend', `<element class="HUD_GN_L HUD_el">${playerLocation + '<br class="HUD_el">'}</element>`)
      colorByClassName(".HUD_GN_L", theme['cha'])

      hook0.insertAdjacentHTML('beforeend', `<element class="HUD_ACTIVATE_S HUD_el" title="Tổng số Máy chủ đang được sữ dụng.">Server Acti </element><br class="HUD_el">`)
      colorByClassName(".HUD_ACTIVATE_S", theme['int'])
      hook1.insertAdjacentHTML('beforeend', `<element class="HUD_ACTIVATE_S HUD_el">${activatePserv.length + '/' + allServerInRam.filter((h) => ns.hasRootAccess(h)).length + '<br class="HUD_el">'}</element>`)
      colorByClassName(".HUD_ACTIVATE_S", theme['int'])

      if (gangInfo != null) {
        // gangFaction
        hook0.insertAdjacentHTML('beforeend', `<element class="HUD_GN_F HUD_el" title="The name of your gang faction.">Faction </element><br class="HUD_el">`)
        colorByClassName(".HUD_GN_F", theme['int'])
        hook1.insertAdjacentHTML('beforeend', `<element class="HUD_GN_F HUD_el">${gangFaction + '<br class="HUD_el">'}</element>`)
        colorByClassName(".HUD_GN_F", theme['int'])

        // gangRespect
        hook0.insertAdjacentHTML('beforeend', `<element class="HUD_GN_R HUD_el" title="The respect of your gang.">Gang Respect</element><br class="HUD_el">`)
        colorByClassName(".HUD_GN_R", theme['int'])
        hook1.insertAdjacentHTML('beforeend', `<element class="HUD_GN_R HUD_el">${gangRespect + '<br class="HUD_el">'}</element>`)
        colorByClassName(".HUD_GN_R", theme['int'])

        // gangIncome
        hook0.insertAdjacentHTML('beforeend', `<element class="HUD_GN_I HUD_el" title="The income of your gang.">Gang Income </element><br class="HUD_el">`)
        colorByClassName(".HUD_GN_I", theme['int'])
        hook1.insertAdjacentHTML('beforeend', `<element class="HUD_GN HUD_el">${"$" + gangIncome + '<br class="HUD_el">'}</element>`)
        colorByClassName(".HUD_GN", theme['int'])
      }

      // scriptIncome
      hook0.insertAdjacentHTML('beforeend', `<element class="HUD_ScrInc_H HUD_el" title="Money Gain from Scripts per Second.">ScrInc</element>`)
      colorByClassName(".HUD_ScrInc_H", theme['money'])
      hook1.insertAdjacentHTML('beforeend', `<element class="HUD_ScrInc HUD_el">${"$" + scriptIncome}</element>`)
      colorByClassName(".HUD_ScrInc", theme['money'])

      // scriptXP
      hook0.insertAdjacentHTML('beforeend', `<element class="HUD_ScrExp_H HUD_el" title="XP Gain from Scripts per Second."><br>ScrExp &nbsp;&nbsp;&nbsp;</element>`)
      colorByClassName(".HUD_ScrExp_H", theme['hack'])
      hook1.insertAdjacentHTML('beforeend', `<element class="HUD_ScrExp HUD_el"><br>${scriptXP}</element>`)
      colorByClassName(".HUD_ScrExp", theme['hack'])

      // playerKarma
      hook0.insertAdjacentHTML('beforeend', `<element class="HUD_Karma_H HUD_el" title="Your karma."><br>Karma &nbsp;&nbsp;&nbsp;</element>`)
      colorByClassName(".HUD_Karma_H", theme['hp'])
      hook1.insertAdjacentHTML('beforeend', `<element class="HUD_Karma HUD_el"><br>${playerKarma}</element>`)
      colorByClassName(".HUD_Karma", theme['hp'])


      removeByClassName('.HUD_Kills_H')

      // playerKills
      hook0.insertAdjacentHTML('beforeend', `<element class="HUD_Kills_H HUD_el" title="Your kill count, increases every successful homicide."><br>Kills &nbsp;&nbsp;&nbsp;</element>`)
      colorByClassName(".HUD_Kills_H", theme['hp'])
      removeByClassName('.HUD_Kills')
      hook1.insertAdjacentHTML('beforeend', `<element class="HUD_Kills HUD_el"><br>${playerKills}</element>`)
      colorByClassName(".HUD_Kills", theme['hp'])

      var theme = ns.ui.getTheme()

    } catch (err) {
      ns.print("ERROR: Update Skipped: " + String(err));
    }

    ns.atExit(function () { removeByClassName('.HUD_el'); })
    await ns.sleep(500);
  }
}