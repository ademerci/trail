// ================= actions: interaction, fishing, mining, sleep, death, save =================
var objIndex = {};
function indexObjects() {
  objIndex = {};
  objects.forEach(function (o) {
    for (var y = o.ty; y < o.ty + o.fh; y++) for (var x = o.tx; x < o.tx + o.fw; x++) objIndex[y * MAP_W + x] = o;
  });
}
var DOORS = { cottage: 'bed', store: 'hilde', glass: 'greta', smithy: 'bram', workshop: 'otto', library: 'ines' };
var DOOR_LABEL = { cottage: 'Go to bed', store: 'Enter the shop', glass: 'Knock', smithy: 'Knock', workshop: 'Knock', library: 'Enter the library' };

function findInteraction() {
  var best = null, bd = 24;
  Object.keys(NPCS).forEach(function (id) {
    var n = NPCS[id];
    if (!n.visible()) return;
    var d = dist(n.x, n.y, player.x, player.y);
    if (d < bd) { bd = d; best = { label: 'Talk to ' + n.name, fn: function () { talk(id); } }; }
  });
  if (best) return best;
  var keysB = Object.keys(BUILDINGS);
  for (var i = 0; i < keysB.length; i++) {
    var b = BUILDINGS[keysB[i]], dr = doorOf(b);
    if (dist(dr.x, dr.y, player.x, player.y) < 14) {
      var target = DOORS[keysB[i]];
      return { label: DOOR_LABEL[keysB[i]], fn: target === 'bed' ? function () { askSleep('bed'); } : function () { talk(target); } };
    }
  }
  if (G.rocket && G.main >= 19) {
    var dp = dist(PAD.cx, PAD.cy, player.x, player.y) / TILE;
    var onPad = snail.state === 'chase' && dist(PAD.cx, PAD.cy, snail.x, snail.y) < 1.7 * TILE;
    if (onPad && dp < 12) return { label: 'Launch the rocket', fn: launchRocket };
    if (dp < 3) return { label: 'Check the rocket', fn: function () { toast('Ready. It needs a passenger on the pad.'); } };
  }
  var f = frontTile(), o = objIndex[f.y * MAP_W + f.x];
  if (o && o.alive && (o.kind === 'crystal' || o.kind === 'ice')) {
    return { label: G.tools.pickaxe ? 'Mine' : 'Needs a pickaxe', fn: function () { mine(o); } };
  }
  if (o && o.kind === 'well') return { label: 'Look into the well', fn: function () { toast('A well. The snail could climb out of it.'); } };
  if (o && o.kind === 'sign') return { label: 'Read the sign', fn: function () { toast('East: Mossbury. West: nothing. Everywhere: the snail.'); } };
  var ft = getT(f.x, f.y);
  if (G.tools.rod && (ft === T.WATER || ft === T.DEEP)) return { label: 'Fish', fn: startFishing };
  return null;
}

function mine(o) {
  if (!G.tools.pickaxe) { nope('Bram sells pickaxes.'); return; }
  o.hp--; Snd.play('hit'); shake = 0.12;
  if (o.hp > 0) return;
  o.alive = false; rebuildSolid();
  var item = o.kind === 'crystal' ? 'crystal' : 'ice';
  G.inv[item]++;
  Snd.play('pickup'); toast('+1 ' + ITEM_NAMES[item]);
  checkQuestProgress();
}

// ---------- fishing ----------
var fishing = null;
function startFishing() {
  var f = frontTile();
  fishing = { tx: f.x, ty: f.y, t: 1.4 + hash2(Math.floor(G.time * 10), G.day, 7) * 3, bite: 0 };
  G.state = 'fishing';
  Snd.play('cast');
}
function updateFishing(dt) {
  if (Input.hit('back') || Math.abs(Input.x()) + Math.abs(Input.y()) > 0.5) { fishing = null; G.state = 'play'; return; }
  if (fishing.bite > 0) {
    fishing.bite -= dt;
    if (Input.hit('ok') || pressed.__tap) {
      G.inv.fish++; Snd.play('pickup'); toast('+1 Fish');
      fishing = null; G.state = 'play'; checkQuestProgress(); return;
    }
    if (fishing.bite <= 0) { toast('It got away.'); fishing = null; G.state = 'play'; }
    return;
  }
  fishing.t -= dt;
  if (Input.hit('ok')) { toast('Too early. Nothing there.'); fishing = null; G.state = 'play'; return; }
  if (fishing.t <= 0) { fishing.bite = 0.85; Snd.play('bite'); }
}

// ---------- sleep ----------
var transition = null;
function askSleep(kind) {
  if (G.time < 720) { nope('Too early to sleep. After 18:00.'); return; }
  var hours = Math.min(10, (1440 - G.time) / 60);
  var adv = hours * DIFFS[G.diff].night;
  var m = snailMeters(), am = Math.round(adv * METERS_PER_TILE);
  var chasing = snail.state === 'chase';
  var where = kind === 'tent' ? 'Pitch the tent here and sleep?' : 'Sleep until morning?';
  if (chasing && adv >= snailDistTiles() - 0.7) {
    openChoice(null, 'It is ' + fmt(m) + ' m away. Tonight it moves about ' + fmt(am) + ' m. If you sleep here, you will not wake up.',
      [{ label: 'Sleep anyway', fn: function () { doSleep(hours, false); } }, { label: 'Keep going', fn: function () {} }]);
  } else {
    openChoice(null, where + ' Tonight the snail moves about ' + fmt(am) + ' m. It is ' + (chasing ? fmt(m) + ' m away.' : 'busy right now.'),
      [{ label: 'Sleep', fn: function () { doSleep(hours, false); } }, { label: 'Not yet', fn: function () {} }]);
  }
}
function doSleep(hours, passedOut) {
  var before = snail.state === 'chase' ? snailMeters() : null;
  if (snail.state !== 'chase' && snail.state !== 'stopped') { snail.t = 0; snailRecovers(); }
  var dead = false;
  if (snail.state === 'chase') {
    var left = moveSnailToward(player.x, player.y - 3, hours * DIFFS[G.diff].night * TILE);
    if (left < 9) dead = true;
  }
  G.day++;
  G.time = passedOut ? 120 : 0;
  player.stamina = 100; player.fed = 0;
  spawnPickups(); respawnNodes();
  transition = { t: 0, day: G.day, from: before, to: snail.state === 'chase' ? snailMeters() : null, passedOut: passedOut, dead: dead };
  G.state = 'sleeping';
  Snd.play('sleep');
  if (!dead) save();
}
function updateTransition(dt) {
  transition.t += dt;
  if (transition.t >= 3) {
    var tr = transition;
    transition = null;
    if (tr.dead) die('It found you in your sleep.');
    else { G.state = 'play'; toast('Day ' + tr.day + '. Pickups and rocks are back.'); }
  }
}

// ---------- death and the end ----------
var endInfo = null;
function die(msg) {
  if (G.state === 'dead') return;
  G.state = 'dead';
  endInfo = { msg: msg, sel: 0 };
  Snd.play('death');
  shake = 0.4;
}
function winGame() {
  snail.state = 'stopped';
  pay(1000000);
  G.main = 24;
  G.state = 'won';
  endInfo = { sel: 0 };
  Snd.play('win');
  save();
}

// ---------- save ----------
var SAVE_KEY = 'trail-save-v1';
function serialize() {
  return {
    G: G,
    player: { x: player.x, y: player.y, dir: player.dir },
    snail: { x: snail.x, y: snail.y, state: snail.state, t: snail.t, facing: snail.facing, pts: snail.pts },
    nodes: objects.filter(function (o) { return o.kind === 'crystal' || o.kind === 'ice'; }).map(function (o) { return [o.alive ? 1 : 0, o.hp]; })
  };
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(serialize())); } catch (e) {}
}
function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
function applySave(s) {
  G = Object.assign(freshState(s.G.diff), s.G);
  G.inv = Object.assign(freshState(0).inv, s.G.inv);
  G.tools = Object.assign(freshState(0).tools, s.G.tools);
  G.side = Object.assign(freshState(0).side, s.G.side);
  G.state = 'play';
  player.x = s.player.x; player.y = s.player.y; player.dir = s.player.dir || 'down'; player.stamina = 100; player.fed = 0;
  snail.x = s.snail.x; snail.y = s.snail.y; snail.state = s.snail.state; snail.t = s.snail.t; snail.facing = s.snail.facing || 1;
  snail.pts = s.snail.pts || []; snail.sx = snail.x; snail.sy = snail.y; snail.deepT = 0;
  redrawTrail();
  var nodes = objects.filter(function (o) { return o.kind === 'crystal' || o.kind === 'ice'; });
  (s.nodes || []).forEach(function (n, i) { if (nodes[i]) { nodes[i].alive = !!n[0]; nodes[i].hp = n[1]; } });
  rebuildSolid();
  spawnPickups();
  ui.toasts = []; ui.dialog = null; ui.choice = null; ui.shop = null;
}
function loadSave() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    applySave(JSON.parse(raw));
    return true;
  } catch (e) { return false; }
}
function newGame(diff) {
  G = freshState(diff);
  resetActors();
  respawnNodes();
  spawnPickups();
  ui.toasts = []; ui.dialog = null; ui.choice = null; ui.shop = null;
  NPCS.pip.x = NPCS.pip.hx; NPCS.pip.y = NPCS.pip.hy;
  openDialog(null, [
    'You took the deal. 1,000,000 gold.',
    'And a snail. It is immortal. It always knows where you are. If it ever touches you, you die.',
    'It is slow. It is already on its way.',
    'Marta in the village square knows the old story. Start there.'
  ]);
}
