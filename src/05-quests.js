// ================= quests, dialogue, shops =================
var MAIN = [
  'Talk to Marta in the village square.',
  "Buy salt at Hilde's shop.",
  'Throw salt at the snail. Press 1 when it is close.',
  'Tell Marta what happened.',
  'Ask Greta the glassblower for a jar.',
  'Bring Greta 10 sand from the beach and 60,000 g.',
  'Trap the snail. Press 2 when it is close.',
  'Wait.',
  'Tell Marta about the jar.',
  'Buy a pickaxe from Bram the smith.',
  'Mine old ice in the snowy peaks (northeast).',
  'Freeze the snail. Press 3 when it is close.',
  'Wait for it to thaw.',
  'Tell Marta it thawed.',
  'Talk to Oskar at the end of the pier (south).',
  'Stand on the pier. Let the snail walk into the deep sea.',
  'Talk to Oskar.',
  "Visit Otto's workshop, east of the village.",
  'Bring Otto 5 scrap (ruins), 3 crystals (mountains) and 250,000 g.',
  'Lure the snail onto the launch pad. Press E near the pad.',
  'Wait.',
  'Ask Ines at the old library (ruins, east) about the contract.',
  'Have 1,000,000 g again.',
  'Go to the crossroads (far northwest) between 22:00 and 2:00.'
];
var SIDE = {
  mush: { who: 'Marta', need: 'mushroom', n: 5, pay: 40000, text: '5 mushrooms for Marta (forest, west)' },
  shell: { who: 'Hilde', need: 'shell', n: 8, pay: 35000, text: '8 shells for Hilde (beach)' },
  fish: { who: 'Oskar', need: 'fish', n: 3, pay: 45000, text: '3 fish for Oskar' },
  cryst: { who: 'Bram', need: 'crystal', n: 6, pay: 80000, text: '6 crystals for Bram (mountains)' },
  berry: { who: 'Ansel', need: 'berry', n: 10, pay: 30000, text: '10 berries for Ansel (meadows)' },
  ball: { who: 'Pip', need: 'ball', n: 1, pay: 20000, text: "Pip's ball (somewhere near the south of the forest)" }
};
var PLURAL = { mushroom: 'mushrooms', berry: 'berries', shell: 'shells', fish: 'fish', crystal: 'crystals', scrap: 'pieces of scrap' };
var SELL = { mushroom: 1500, berry: 600, shell: 1200, fish: 3000, crystal: 12000, scrap: 800 };

function advance(to) {
  if (G.main >= to) return;
  G.main = to;
  G.stats.quests++;
  Snd.play('coin');
  toast('Quest: ' + MAIN[to]);
}
function pay(n) { G.gold -= n; G.stats.spent += n; }
function earn(n) { G.gold += n; G.stats.earned += n; Snd.play('coin'); }
function checkQuestProgress() {
  if (G.main === 1 && G.inv.salt > 0) advance(2);
  if (G.main === 9 && G.tools.pickaxe) advance(10);
  if (G.main === 10 && G.inv.ice > 0) advance(11);
  if (G.main === 22 && G.gold >= 1000000) advance(23);
}

// offer or finish a side quest; returns lines to append, or null
function sideTalk(key, offerLines) {
  var q = SIDE[key], st = G.side[key];
  if (st === 0) { G.side[key] = 1; if (key === 'ball') spawnPickups(); return offerLines.concat(['(Side quest: ' + q.text + ', ' + fmt(q.pay) + ' g)']); }
  if (st === 1 && G.inv[q.need] >= q.n) {
    G.inv[q.need] -= q.n; G.side[key] = 2; G.stats.quests++; earn(q.pay);
    return ['That is all of them. Here, ' + fmt(q.pay) + ' g.'];
  }
  if (st === 1) return ['Still waiting on ' + q.text.split(' for ')[0].replace("Pip's ball (somewhere near the south of the forest)", 'my ball') + '. You have ' + (G.inv[q.need] || 0) + '.'];
  return null;
}

function talk(id) {
  var n = NPCS[id], L = [];
  function say(lines, after) { openDialog(n, lines, after); }
  switch (id) {
    case 'marta':
      if (G.main === 0) {
        advance(1);
        return say(['So you are the one with the million. And the snail.',
          'Everyone in Mossbury knows the story. It is slow. It never stops. If it touches you, that is the end of it.',
          'My grandmother said there are 247 steps to be rid of it. She was bad at counting.',
          'Start with salt. Hilde sells it. Throw it when the snail is close. Very close.'].concat(sideTalk('mush', ['And if you pass through the forest, bring me five mushrooms.'])));
      }
      if (G.main === 3) { advance(4); return say(['It did not care, did it.', 'Then we trap it. Greta can blow glass big enough for a snail. Her shop is west of the square.']); }
      if (G.main === 8) { advance(9); return say(['Somebody opened it. Of course somebody opened it.', 'Then freeze it. Bram the smith sells pickaxes, and there is old ice up in the peaks. Northeast, past the cliffs.']); }
      if (G.main === 13) { advance(14); return say(['Thawed. Yes. Ice does that.', 'Oskar says the sea takes everything. He fishes at the end of the pier. South.']); }
      L = sideTalk('mush', []) || [];
      if (G.main >= 21) L.push('Twenty-four steps? My grandmother would be furious.');
      else if (G.main < 3) L.push('Salt. Hilde. Very close.');
      else L.push('Keep moving. That is the whole trick.');
      return say(L);
    case 'hilde':
      if (G.side.shell === 0 && G.main >= 1) return say(sideTalk('shell', ['Before you buy anything: I need shells for the shop window. Eight of them.']), function () { openShop('hilde'); });
      var sh = G.side.shell === 1 && G.inv.shell >= 8 ? sideTalk('shell', []) : null;
      if (sh) return say(sh, function () { openShop('hilde'); });
      return openShop('hilde');
    case 'greta':
      if (G.main < 4) return say(['Glass. Mostly bottles. Come back when you need something big.']);
      if (G.main === 4) { advance(5); return say(['A jar big enough for a snail. I can do that.', 'I need ten sand from the beach, and the furnace costs 60,000 g to run that hot.']); }
      if (G.main === 5) {
        if (G.inv.sand >= 10 && G.gold >= 60000) {
          G.inv.sand -= 10; pay(60000); G.inv.jar += 1; advance(6); Snd.play('jar');
          return say(['Here. One big jar. Do not drop it.', 'Get close, then press 2.']);
        }
        return say(['Ten sand and 60,000 g. You have ' + G.inv.sand + ' sand and ' + fmt(G.gold) + ' g.']);
      }
      return openShop('greta');
    case 'bram':
      if (G.main < 9 && !G.tools.pickaxe) return say(['I make pickaxes. You do not need a pickaxe.', 'Yet.']);
      if (!G.tools.pickaxe) return openShop('bram');
      L = sideTalk('cryst', ['The pickaxe also cuts crystal. I pay well for it. Six, and I pay 80,000 g.']) || ['Hit rocks. Not people.'];
      return say(L);
    case 'pip':
      if (G.main === 7 || G.main === 8) return say(['I opened the jar.', 'It looked sad.']);
      L = sideTalk('ball', ['I lost my ball near the south end of the forest. I would go myself, but the snail.', 'I have 20,000 g saved. It is all my money.']);
      return say(L || ['Is it true it follows you everywhere? Even to the toilet?']);
    case 'oskar':
      if (G.main === 14) {
        G.tools.rod = true; advance(15);
        return say(['The sea takes everything. Boats, rings, my brother.', 'Stand out here at the end of the pier. The snail will come straight for you. The water is deep.',
          'Here, take my old rod while you wait. Face the water and press E to fish.']);
      }
      if (G.main === 15) return say(['Stay out here. Let it come.']);
      if (G.main === 16) { advance(17); return say(['It walked on the bottom. I saw the bubbles.', 'Otto, east of the village, built a rocket once. Ask him.']); }
      if (G.tools.rod) { L = sideTalk('fish', ['If you catch three fish, I buy them. 45,000 g.']) || ['Face the water, press E, wait for the bite, press E again.']; return say(L); }
      return say(['Fish are biting. The snail is not a fish.']);
    case 'ansel':
      L = sideTalk('berry', ['Forty years in this forest. The snail came through twice. I moved twice.', 'Bring me ten berries for jam and I pay 30,000 g. They grow in the open meadows.']);
      return say(L || ['The trees do not stop it. Nothing stops it. The trees just watch.']);
    case 'otto':
      if (G.main < 17) return say(['I am building a rocket. Nobody asked for a rocket.']);
      if (G.main === 17) { advance(18); return say(['Someone asked for a rocket!', 'I need five scrap from the old ruins, three crystals from the mountains for the guidance, and 250,000 g for fuel.', 'Then we put your snail on the pad north of here and send it to space.']); }
      if (G.main === 18) {
        if (G.inv.scrap >= 5 && G.inv.crystal >= 3 && G.gold >= 250000) {
          G.inv.scrap -= 5; G.inv.crystal -= 3; pay(250000); G.rocket = true; advance(19);
          return say(['It is ready. The rocket is on the pad, north of the workshop.', 'Stand so the snail crawls onto the pad. Then press E near it.']);
        }
        return say(['Five scrap, three crystals, 250,000 g. You have ' + G.inv.scrap + ' scrap, ' + G.inv.crystal + ' crystals and ' + fmt(G.gold) + ' g.']);
      }
      if (G.main === 19) return say(['Pad is north. Snail on pad. E. Space.']);
      if (G.main === 20) return say(['Gravity. I forgot about gravity.']);
      if (G.main === 21 || G.main > 21) return say(['Ines at the old library reads old things. Maybe the snail came with a contract.']);
      return say(['Rockets are hard.']);
    case 'ines':
      if (G.main < 21) return say(['This is a library. There is a snail outside, I assume.']);
      if (G.main === 21) {
        advance(22);
        return say(['The contract. Yes, there is always a contract.', 'Here. "The snail does not follow the holder. The snail follows the money."',
          '"It stops when the full sum is returned to the one who gave it, at the crossroads, between the tenth hour of the night and the second."',
          'The full sum. One million. You have ' + fmt(G.gold) + ' g.', 'Also, it is twenty-four steps, not 247. Marta\'s grandmother added a seven.']);
      }
      return say(['The full sum. At the crossroads. At night. Contracts are very specific.']);
    case 'stranger':
      if (G.gold < 1000000) return say(['...', 'You are ' + fmt(1000000 - G.gold) + ' g short. Count again.']);
      return say(['A million. All of it.', 'Most people spend it and keep running.'], function () { winGame(); });
  }
}

// ---------- shops ----------
function shopItems(who) {
  if (who === 'hilde') {
    var list = [
      { label: 'Salt (3 throws)', price: 25000, buy: function () { G.inv.salt += 3; checkQuestProgress(); } },
      { label: 'Bread (run without tiring)', price: 2000, buy: function () { G.inv.bread += 1; } }
    ];
    if (!G.tools.tent) list.push({ label: 'Tent (sleep anywhere)', price: 60000, buy: function () { G.tools.tent = true; } });
    if (!G.tools.boots) list.push({ label: 'Running shoes', price: 120000, buy: function () { G.tools.boots = true; } });
    Object.keys(SELL).forEach(function (k) {
      if (G.inv[k] > 0) list.push({ label: 'Sell ' + G.inv[k] + ' ' + (G.inv[k] === 1 ? ITEM_NAMES[k].toLowerCase() : PLURAL[k]), price: -SELL[k] * G.inv[k], sell: k });
    });
    return list;
  }
  if (who === 'bram') return [{ label: 'Pickaxe', price: 90000, buy: function () { G.tools.pickaxe = true; checkQuestProgress(); } }];
  if (who === 'greta') return [{ label: 'Big jar (needs 10 sand)', price: 40000, need: { sand: 10 }, buy: function () { G.inv.sand -= 10; G.inv.jar += 1; } }];
  return [];
}
function shopBuy(who, item) {
  if (item.sell) {
    earn(-item.price);
    G.inv[item.sell] = 0;
    toast('Sold for ' + fmt(-item.price) + ' g');
    checkQuestProgress();
    return;
  }
  if (G.gold < item.price) { Snd.play('error'); toast('Not enough gold.'); return; }
  if (item.need && G.inv.sand < item.need.sand) { Snd.play('error'); toast('You need 10 sand.'); return; }
  pay(item.price); item.buy(); Snd.play('coin');
  toast('Bought: ' + item.label);
}
var SHOP_GREETING = {
  hilde: "Hilde's shop. The salt is artisanal. That is why it costs that much.",
  bram: 'A pickaxe. Good steel. 90,000 g, because you have it.',
  greta: 'Another jar? 40,000 g and ten sand.'
};

// ---------- using items on the snail ----------
function useSlot(i) {
  var d = snailDistTiles();
  if (i === 1) {
    if (!G.inv.salt) return nope('No salt. Hilde sells it.');
    if (snail.state !== 'chase') return nope('The snail is busy.');
    if (d > 3) return nope('Too far. It has to be close. That is the problem.');
    G.inv.salt--; Snd.play('salt'); snail.state = 'salted'; snail.t = 4;
    toast('The snail looks seasoned. Nothing else.');
    if (G.main === 2) advance(3);
  } else if (i === 2) {
    if (!G.inv.jar) return nope('No jar. Greta can make one.');
    if (snail.state !== 'chase') return nope('The snail is busy.');
    if (d > 2.5) return nope('Closer. The jar has to go over it.');
    G.inv.jar--; Snd.play('jar'); snail.state = 'jarred'; snail.t = 60;
    toast('Got it. The snail is in the jar.');
    if (G.main === 6) advance(7);
  } else if (i === 3) {
    if (!G.inv.ice) return nope('No ice. It is in the peaks, and you need a pickaxe.');
    if (snail.state !== 'chase') return nope('The snail is busy.');
    if (d > 3) return nope('Too far. The ice has to touch it.');
    G.inv.ice--; Snd.play('freeze'); snail.state = 'frozen'; snail.t = 40;
    toast('Frozen solid.');
    if (G.main === 11) advance(12);
  } else if (i === 4) {
    if (!G.inv.bread) return nope('No bread. Hilde sells it.');
    G.inv.bread--; player.stamina = 100; player.fed = 45; Snd.play('pickup');
    toast('Bread. You can run for a while without tiring.');
  } else if (i === 5) {
    if (!G.tools.tent) return nope('No tent. Hilde sells one.');
    askSleep('tent');
  }
}
function nope(msg) { Snd.play('error'); toast(msg); }
function snailRecovers() {
  var was = snail.state;
  snail.state = 'chase';
  if (was === 'jarred') { toast('Somebody opened the jar. It was Pip.'); if (G.main === 7) advance(8); }
  if (was === 'frozen') { toast('It thawed.'); if (G.main === 12) advance(13); }
  if (was === 'orbit') {
    var a = G.time * 1.7, r = 9 * TILE;
    snail.x = clamp(player.x + Math.cos(a) * r, 8, MAP_W * TILE - 8);
    snail.y = clamp(player.y + Math.sin(a) * r, 8, MAP_H * TILE - 8);
    snail.sx = snail.x; snail.sy = snail.y;
    Snd.play('crash'); shake = 0.6;
    toast('It came back down. Closer.');
    if (G.main === 20) advance(21);
  }
}
function launchRocket() {
  snail.state = 'orbit'; snail.t = 90; G.rocket = false;
  Snd.play('rocket'); shake = 1.2;
  toast('It is in orbit.');
  rocketFx = 2.5;
  if (G.main === 19) advance(20);
}
