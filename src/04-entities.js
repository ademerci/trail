// ================= entities: state, player, snail, npcs, pickups =================
var DIFFS = [
  { name: 'Cozy', speed: 5, night: 3 },
  { name: 'Normal', speed: 7, night: 4 },
  { name: 'Dread', speed: 10, night: 6 }
];
var DAY_LEN = 1200;          // game minutes from 6:00 to 2:00
var MIN_PER_SEC = 3.4;       // game minutes per real second
var METERS_PER_TILE = 5;

var G;
function freshState(diff) {
  return {
    state: 'play', day: 1, time: 0, gold: 1000000, diff: diff,
    inv: { mushroom: 0, berry: 0, shell: 0, sand: 0, scrap: 0, crystal: 0, ice: 0, fish: 0, ball: 0, salt: 0, jar: 0, bread: 0 },
    tools: { pickaxe: false, rod: false, boots: false, tent: false },
    main: 0,
    side: { mush: 0, shell: 0, fish: 0, cryst: 0, berry: 0, ball: 0 },
    flags: {},
    stats: { quests: 0, spent: 0, earned: 0, walked: 0 },
    rocket: false
  };
}

var player = { x: 0, y: 0, dir: 'down', moving: false, anim: 0, stamina: 100, rest: 0, fed: 0 };
var snail = { x: 0, y: 0, state: 'chase', t: 0, facing: 1, anim: 0, deepT: 0, sx: 0, sy: 0, pts: [] };

function resetActors() {
  player.x = 38 * TILE + 8; player.y = 36 * TILE + 4; player.dir = 'down'; player.stamina = 100; player.fed = 0;
  snail.x = 95 * TILE; snail.y = 66 * TILE; snail.state = 'chase'; snail.t = 0; snail.pts = []; snail.deepT = 0;
  snail.sx = snail.x; snail.sy = snail.y;
  trailCanvas.getContext('2d').clearRect(0, 0, trailCanvas.width, trailCanvas.height);
}

function snailDistTiles() { return dist(snail.x, snail.y, player.x, player.y - 3) / TILE; }
function snailMeters() { return Math.max(0, Math.round((snailDistTiles() - 0.5) * METERS_PER_TILE)); }
function hourOf(t) { return 6 + Math.floor(t / 60); }
function clockText(t) {
  var h = hourOf(t) % 24, m = Math.floor(t % 60 / 10) * 10;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}
function nightAlpha(t) {
  var h = 6 + t / 60;
  if (h < 17.5) return 0;
  if (h < 21) return (h - 17.5) / 3.5 * 0.68;
  return 0.68;
}

// ---------- player ----------
function blockedAt(x, y) {
  return isSolidPx(x - 5, y - 5) || isSolidPx(x + 4, y - 5) || isSolidPx(x - 5, y) || isSolidPx(x + 4, y);
}
function updatePlayer(dt) {
  var ix = Input.x(), iy = Input.y(), len = Math.sqrt(ix * ix + iy * iy);
  if (len > 1) { ix /= len; iy /= len; }
  var moving = len > 0.15;
  var running = moving && Input.run() && player.stamina > 1;
  var sp = 78 * (G.tools.boots ? 1.25 : 1) * (running ? 1.65 : 1);
  if (player.fed > 0) player.fed -= dt;
  if (running) {
    if (player.fed <= 0) player.stamina = Math.max(0, player.stamina - 26 * dt);
    player.rest = 0.7;
  } else {
    player.rest -= dt;
    if (player.rest <= 0) player.stamina = Math.min(100, player.stamina + 15 * dt);
  }
  var ox = player.x, oy = player.y;
  if (moving) {
    var nx = player.x + ix * sp * dt, ny = player.y + iy * sp * dt;
    if (!blockedAt(nx, player.y)) player.x = nx;
    if (!blockedAt(player.x, ny)) player.y = ny;
    player.x = clamp(player.x, 6, MAP_W * TILE - 6); player.y = clamp(player.y, 8, MAP_H * TILE - 2);
    if (Math.abs(ix) > Math.abs(iy)) player.dir = ix < 0 ? 'left' : 'right'; else player.dir = iy < 0 ? 'up' : 'down';
    player.anim += dt * (running ? 1.6 : 1);
  }
  player.moving = moving && (player.x !== ox || player.y !== oy);
  G.stats.walked += dist(ox, oy, player.x, player.y) / TILE;
}
function frontTile() {
  var fx = player.x, fy = player.y - 4;
  if (player.dir === 'left') fx -= 12; else if (player.dir === 'right') fx += 12; else if (player.dir === 'up') fy -= 12; else fy += 12;
  return { x: Math.floor(fx / TILE), y: Math.floor(fy / TILE) };
}
function charFrame(spr, dir, moving, anim) {
  var f = moving ? [0, 1, 0, 2][Math.floor(anim * 8) % 4] : 0;
  if (dir === 'up') return spr.back[f];
  if (dir === 'left') return spr.sideL[f];
  if (dir === 'right') return spr.side[f];
  return spr.front[f];
}

// ---------- snail ----------
function stampTrail(x, y) {
  var g = trailCanvas.getContext('2d');
  g.fillStyle = 'rgba(214,244,232,0.55)';
  g.fillRect(Math.round(x) - 3, Math.round(y) - 2, 6, 3);
  g.fillStyle = 'rgba(143,205,182,0.5)';
  g.fillRect(Math.round(x) - 3, Math.round(y) + 1, 6, 1);
  if (hash2(Math.round(x), Math.round(y), 3) < 0.3) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(Math.round(x) + (hash2(x | 0, 1, 1) < 0.5 ? -2 : 1), Math.round(y) - 1, 1, 1); }
}
function redrawTrail() {
  trailCanvas.getContext('2d').clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  for (var i = 0; i < snail.pts.length; i += 2) stampTrail(snail.pts[i], snail.pts[i + 1]);
}
function moveSnailToward(tx, ty, distPx) {
  var dx = tx - snail.x, dy = ty - snail.y, d = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.001) return 0;
  var step = Math.min(distPx, d);
  var n = Math.max(1, Math.ceil(step / 2));
  for (var i = 1; i <= n; i++) {
    snail.x += dx / d * step / n; snail.y += dy / d * step / n;
    if (dist(snail.x, snail.y, snail.sx, snail.sy) >= 2) {
      stampTrail(snail.x, snail.y);
      snail.sx = snail.x; snail.sy = snail.y;
      if (snail.pts.length < 60000) snail.pts.push(Math.round(snail.x), Math.round(snail.y));
    }
  }
  if (Math.abs(dx) > 0.5) snail.facing = dx < 0 ? -1 : 1;
  return d - step;
}
function snailInDeep() { return getT(Math.floor(snail.x / TILE), Math.floor(snail.y / TILE)) === T.DEEP; }
function updateSnail(dt) {
  if (snail.state === 'stopped') return;
  if (snail.state !== 'chase') {
    snail.t -= dt;
    if (snail.t <= 0) snailRecovers();
    return;
  }
  moveSnailToward(player.x, player.y - 3, DIFFS[G.diff].speed * dt);
  snail.anim += dt;
  if (snailInDeep()) {
    snail.deepT += dt;
    if (Math.floor(snail.anim * 3) !== Math.floor((snail.anim - dt) * 3)) Snd.play('bubble');
  } else snail.deepT = 0;
  if (dist(snail.x, snail.y, player.x, player.y - 3) < 9) die('It touched you.');
}

// ---------- npcs ----------
var NPCS = {};
function makeNpc(id, name, tx, ty, pal, style, opts) {
  opts = opts || {};
  var n = { id: id, name: name, x: tx * TILE, y: ty * TILE, hx: tx * TILE, hy: ty * TILE, dir: 'down', anim: 0, moving: false,
    spr: buildCharacter(pal, style, opts.kid), portrait: buildPortrait(pal, style), wander: opts.wander || 0, wt: 0, gx: 0, gy: 0,
    visible: opts.visible || function () { return true; } };
  NPCS[id] = n;
  return n;
}
function setupNpcs() {
  makeNpc('marta', 'Marta', 45.5, 42.6, { H: '#d8d8d8', k: '#f1c9a5', t: '#7b4c8e', T: '#5e3a6e', p: '#4a3450' }, 'long');
  makeNpc('hilde', 'Hilde', 51.6, 36.2, { H: '#c8783a', k: '#f4d0b0', t: '#3f7a8c', T: '#2c5a68', p: '#3b2f2a' }, 'long');
  makeNpc('greta', 'Greta', 36.2, 46.4, { H: '#2a2a2a', k: '#d8a07a', t: '#e8e0d0', T: '#b8b0a0', p: '#5a6a70' }, 'short');
  makeNpc('bram', 'Bram', 55.8, 46.2, { H: '#4a2a1a', k: '#e8b890', t: '#8a4a3a', T: '#6a3a2a', p: '#2f2f3a' }, 'beard');
  makeNpc('pip', 'Pip', 40.5, 46.5, { H: '#e8c040', k: '#f4d0b0', t: '#e05a40', T: '#b84430', p: '#3a5a8a' }, 'short', { kid: true, wander: 3 });
  makeNpc('oskar', 'Oskar', 51.4, 76.6, { H: '#b8b8b8', k: '#e0b090', t: '#e8c040', T: '#c8a030', p: '#3a4a6a' }, 'beard');
  makeNpc('ansel', 'Ansel', 14.5, 35, { H: '#5a4a2a', k: '#e0b090', t: '#4f7a3a', T: '#3a5a2a', p: '#4a3a2a' }, 'hat');
  makeNpc('otto', 'Otto', 69.8, 38.2, { H: '#e0e0e0', k: '#f1c9a5', t: '#c88a2a', T: '#9a6a1a', p: '#4a4038' }, 'bald');
  makeNpc('ines', 'Ines', 87.6, 49.4, { H: '#3a2a4a', k: '#c89070', t: '#5a6a4a', T: '#3f4c33', p: '#2a2a3a' }, 'long');
  makeNpc('stranger', 'The Stranger', 11.5, 10.2, { H: '#1d1b22', k: '#e8e0d8', t: '#1d1b22', T: '#000000', p: '#1d1b22' }, 'hat',
    { visible: function () { return G.main >= 22 && G.time >= 960; } });
}
function updateNpcs(dt) {
  Object.keys(NPCS).forEach(function (id) {
    var n = NPCS[id];
    n.moving = false;
    if (n.wander) {
      n.wt -= dt;
      if (n.wt <= 0) {
        n.wt = 2 + hash2(Math.floor(G.time), id.length, 5) * 3;
        n.gx = n.hx + (hash2(Math.floor(G.time * 7), 1, 6) - 0.5) * n.wander * 2 * TILE;
        n.gy = n.hy + (hash2(Math.floor(G.time * 7), 2, 6) - 0.5) * n.wander * 2 * TILE;
      }
      var dx = n.gx - n.x, dy = n.gy - n.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 2) {
        var nx = n.x + dx / d * 22 * dt, ny = n.y + dy / d * 22 * dt;
        if (!blockedAt(nx, ny)) { n.x = nx; n.y = ny; n.moving = true; n.anim += dt; }
        else n.wt = 0;
        n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      }
    }
    if (dist(n.x, n.y, player.x, player.y) < 40 && !n.moving) {
      var ax = player.x - n.x, ay = player.y - n.y;
      n.dir = Math.abs(ax) > Math.abs(ay) ? (ax < 0 ? 'left' : 'right') : (ay < 0 ? 'up' : 'down');
    }
  });
}

// ---------- pickups ----------
var pickups = [];
var ITEM_NAMES = { mushroom: 'Mushroom', berry: 'Berries', shell: 'Shell', sand: 'Sand', scrap: 'Scrap metal', crystal: 'Crystal', ice: 'Old ice', fish: 'Fish', ball: "Pip's ball", salt: 'Salt', jar: 'Big jar', bread: 'Bread' };
function spawnPickups() {
  pickups = [];
  var r = mulberry32(G.day * 977 + 13);
  function place(type, list, n) {
    for (var i = 0; i < n && list.length; i++) {
      var p = list[Math.floor(r() * list.length)];
      pickups.push({ type: type, x: p[0] * TILE + 4 + Math.floor(r() * 8), y: p[1] * TILE + 8 + Math.floor(r() * 5), alive: true });
    }
  }
  place('mushroom', spots.mushroom, 16);
  place('berry', spots.berry, 18);
  place('shell', spots.shell, 12);
  place('sand', spots.sand, 12);
  place('scrap', spots.scrap, 8);
  if (G.side.ball === 1 && !G.inv.ball) pickups.push({ type: 'ball', x: 22 * TILE + 8, y: 60 * TILE + 8, alive: true });
}
function updatePickups() {
  pickups.forEach(function (p) {
    if (!p.alive || dist(p.x, p.y, player.x, player.y - 2) > 10) return;
    p.alive = false;
    G.inv[p.type] = (G.inv[p.type] || 0) + 1;
    Snd.play('pickup');
    toast('+1 ' + ITEM_NAMES[p.type]);
    checkQuestProgress();
  });
}
function respawnNodes() {
  objects.forEach(function (o) { if (o.kind === 'crystal' || o.kind === 'ice') { o.alive = true; o.hp = o.maxHp; } });
  rebuildSolid();
}
