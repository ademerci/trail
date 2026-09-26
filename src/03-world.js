// ================= world: tiles, generation, objects =================
var T = { GRASS: 0, FLOWER: 1, PATH: 2, SAND: 3, WATER: 4, DEEP: 5, CLIFF: 6, STONE: 7, SNOW: 8, FLOOR: 9, PIER: 10, FARM: 11, PAD: 12 };
var SOLID_TILE = {}; SOLID_TILE[T.WATER] = 1; SOLID_TILE[T.DEEP] = 1; SOLID_TILE[T.CLIFF] = 1;
var map = new Uint8Array(MAP_W * MAP_H);
var solid = new Uint8Array(MAP_W * MAP_H);
var reserved = new Uint8Array(MAP_W * MAP_H);
var objects = [];
var spots = { mushroom: [], berry: [], shell: [], sand: [], scrap: [] };
var groundCanvas = makeCanvas(MAP_W * TILE, MAP_H * TILE);
var trailCanvas = makeCanvas(MAP_W * TILE, MAP_H * TILE);

function inMap(x, y) { return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H; }
function getT(x, y) { return inMap(x, y) ? map[y * MAP_W + x] : T.DEEP; }
function setT(x, y, t) { if (inMap(x, y)) map[y * MAP_W + x] = t; }
function isSolidTile(x, y) { return !inMap(x, y) || solid[y * MAP_W + x] === 1; }
function isSolidPx(px, py) { return isSolidTile(Math.floor(px / TILE), Math.floor(py / TILE)); }
function shoreY(x) { return 64 + Math.round(Math.sin(x * 0.23) * 1.2 + Math.sin(x * 0.071 + 1) * 1.3); }
function mtnX(y) { return 70 + Math.round(Math.sin(y * 0.45) * 1.5); }
function mtnY(x) { return 30 + Math.round(Math.sin(x * 0.35) * 1.2); }
function inMountain(x, y) { return x >= mtnX(y) && y <= mtnY(x); }

var PATHS = [
  [[26, 38.5], [74, 38.5]],
  [[43.5, 20], [43.5, 61]],
  [[43.5, 22], [50, 19.5]],
  [[26, 38.5], [20, 30], [14, 20], [11, 9]],
  [[11, 9], [11, 1]], [[11, 9], [1, 9]], [[11, 9], [22, 6]],
  [[74, 38.5], [76.5, 31], [77, 22]],
  [[74, 38.5], [82, 44], [86, 49]],
  [[43.5, 60], [50.5, 63]],
  [[61.5, 38.5], [61.5, 30]]
];
function distToPaths(x, y) {
  var best = 99;
  PATHS.forEach(function (pl) {
    for (var i = 0; i < pl.length - 1; i++) {
      var a = pl[i], b = pl[i + 1], dx = b[0] - a[0], dy = b[1] - a[1];
      var t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy), 0, 1);
      best = Math.min(best, dist(x, y, a[0] + dx * t, a[1] + dy * t));
    }
  });
  return best;
}

// ---------- pixel drawing helpers ----------
function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function disc(g, cx, cy, rx, ry, c) {
  g.fillStyle = c;
  for (var dy = -ry; dy <= ry; dy++) {
    var hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) * (dy / (ry + 0.5)))));
    if (hw > 0) g.fillRect(cx - hw, cy + dy, hw * 2, 1);
  }
}

// ---------- object art ----------
var ART = {};
(function buildArt() {
  var c, g, r;
  c = makeCanvas(32, 36); g = c.getContext('2d');
  disc(g, 17, 32, 12, 3, 'rgba(20,40,20,0.35)');
  px(g, 13, 22, 6, 13, '#6e4a2a'); px(g, 16, 22, 3, 13, '#4f3320');
  disc(g, 16, 13, 14, 12, '#2f6f36'); disc(g, 13, 11, 11, 9, '#3f8f47'); disc(g, 11, 8, 6, 4, '#4fa257');
  r = mulberry32(4);
  for (var i = 0; i < 14; i++) px(g, 5 + Math.floor(r() * 20), 3 + Math.floor(r() * 18), 2, 1, i % 2 ? '#55a85a' : '#276030');
  ART.oak = c;
  c = makeCanvas(22, 34); g = c.getContext('2d');
  disc(g, 11, 31, 8, 2, 'rgba(20,40,20,0.35)');
  px(g, 9, 26, 4, 7, '#5e3d22');
  for (var y = 0; y < 27; y++) {
    var hw = Math.round((y % 9) * 0.9 + y * 0.25) + 1;
    px(g, 11 - hw, y, hw * 2, 1, y % 9 < 2 ? '#3c7a4a' : '#24583a');
    if (y % 9 > 3) px(g, 11 - hw, y, 2, 1, '#1b4430');
  }
  ART.pine = c;
  c = makeCanvas(16, 13); g = c.getContext('2d');
  disc(g, 8, 11, 7, 1, 'rgba(0,0,0,0.25)');
  disc(g, 8, 7, 7, 5, '#7c808a'); disc(g, 7, 6, 5, 3, '#9a9ea8'); px(g, 5, 4, 3, 1, '#b8bcc4'); px(g, 9, 9, 4, 1, '#5e626c');
  ART.rock = c;
  c = makeCanvas(16, 16); g = c.getContext('2d');
  disc(g, 8, 14, 7, 1, 'rgba(0,0,0,0.25)');
  disc(g, 8, 10, 7, 5, '#6e727c'); disc(g, 7, 9, 5, 3, '#8a8e98');
  [[4, 3, 3, 7], [8, 1, 3, 9], [11, 5, 2, 5]].forEach(function (s) { px(g, s[0], s[1], s[2], s[3], '#4fc3d8'); px(g, s[0], s[1], 1, s[3] - 1, '#c8f4ff'); });
  ART.crystal = c;
  c = makeCanvas(16, 16); g = c.getContext('2d');
  px(g, 1, 3, 14, 12, '#7cc4e4'); px(g, 1, 3, 14, 3, '#c8ecfa'); px(g, 2, 6, 2, 7, '#e8faff'); px(g, 11, 8, 3, 1, '#e8faff'); px(g, 1, 14, 14, 1, '#5aa0c4');
  ART.ice = c;
  c = makeCanvas(14, 30); g = c.getContext('2d');
  disc(g, 7, 28, 6, 1, 'rgba(0,0,0,0.25)');
  px(g, 2, 6, 10, 22, '#c8c0ae'); px(g, 2, 6, 3, 22, '#e0d8c6'); px(g, 10, 6, 2, 22, '#9c9484');
  px(g, 0, 26, 14, 3, '#a8a090'); px(g, 3, 3, 4, 3, '#c8c0ae'); px(g, 7, 5, 4, 1, '#c8c0ae'); px(g, 5, 14, 3, 2, '#6f9a4a');
  ART.pillar = c;
  c = makeCanvas(7, 26); g = c.getContext('2d');
  px(g, 3, 6, 1, 19, '#3a3530'); px(g, 1, 24, 5, 2, '#3a3530'); px(g, 1, 1, 5, 5, '#3a3530'); px(g, 2, 2, 3, 3, '#ffd766');
  ART.lamp = c;
  c = makeCanvas(16, 10); g = c.getContext('2d');
  px(g, 2, 0, 3, 10, '#7d5533'); px(g, 11, 0, 3, 10, '#7d5533'); px(g, 0, 2, 16, 2, '#b58b5c'); px(g, 0, 6, 16, 2, '#b58b5c');
  ART.fence = c;
  c = makeCanvas(20, 20); g = c.getContext('2d');
  px(g, 2, 8, 16, 10, '#8a8e98'); px(g, 2, 8, 16, 2, '#b8bcc4'); px(g, 5, 10, 10, 5, '#2b5f9e');
  px(g, 3, 0, 2, 9, '#6e4a2a'); px(g, 15, 0, 2, 9, '#6e4a2a'); px(g, 1, 0, 18, 2, '#9c3c31');
  ART.well = c;
  c = makeCanvas(14, 16); g = c.getContext('2d');
  px(g, 6, 5, 2, 11, '#6e4a2a'); px(g, 0, 1, 14, 6, '#b58b5c'); px(g, 0, 1, 14, 1, '#d8b080'); px(g, 2, 3, 10, 1, '#6e4a2a');
  ART.sign = c;
  c = makeCanvas(48, 48); g = c.getContext('2d');
  px(g, 0, 0, 48, 48, '#8a8f9a'); px(g, 2, 2, 44, 44, '#a0a6b0');
  for (var k = 0; k < 48; k += 6) { px(g, k, 0, 3, 2, '#e8c040'); px(g, k, 46, 3, 2, '#e8c040'); px(g, 0, k, 2, 3, '#e8c040'); px(g, 46, k, 2, 3, '#e8c040'); }
  disc(g, 24, 24, 12, 12, '#6e737c'); disc(g, 24, 24, 9, 9, '#8a8f9a');
  ART.pad = c;
  c = makeCanvas(14, 40); g = c.getContext('2d');
  px(g, 4, 4, 6, 30, '#e8e4dc'); px(g, 4, 4, 2, 30, '#ffffff'); px(g, 5, 0, 4, 4, '#c8483c'); px(g, 6, 12, 2, 3, '#4fc3d8');
  px(g, 0, 26, 4, 10, '#c8483c'); px(g, 10, 26, 4, 10, '#c8483c'); px(g, 5, 34, 4, 4, '#ffb640');
  ART.rocket = c;
})();

function drawBuilding(w, h, o) {
  var W = w * TILE, H = h * TILE + 14, c = makeCanvas(W, H), g = c.getContext('2d');
  var roofH = Math.round(H * 0.5);
  if (o.chimney) { px(g, W - 16, 0, 7, 12, '#707070'); px(g, W - 17, 0, 9, 2, '#8c8c8c'); }
  px(g, 3, roofH, W - 6, H - roofH - 1, o.wall);
  px(g, 3, roofH, 2, H - roofH - 1, o.trim); px(g, W - 5, roofH, 2, H - roofH - 1, o.trim);
  px(g, 3, H - 3, W - 6, 2, 'rgba(0,0,0,0.25)');
  for (var y = 4; y < roofH + 2; y++) {
    var inset = Math.max(0, Math.round((roofH + 2 - y) * 0.35) - 2);
    px(g, inset, y, W - inset * 2, 1, (y % 4 === 3) ? o.roofDark : o.roof);
  }
  px(g, 0, roofH + 1, W, 2, o.roofDark);
  var dx = Math.round(W / 2 - 5);
  px(g, dx - 1, H - 16, 12, 15, o.trim); px(g, dx, H - 15, 10, 14, o.door || '#6e4726'); px(g, dx + 7, H - 8, 1, 1, '#f0c860');
  var wy = roofH + 6;
  [10, W - 22].forEach(function (wx) {
    if (wx + 12 > dx - 2 && wx < dx + 12) return;
    px(g, wx, wy, 12, 9, o.trim); px(g, wx + 1, wy + 1, 10, 7, '#9ad6f2'); px(g, wx + 5, wy + 1, 1, 7, o.trim); px(g, wx + 1, wy + 4, 10, 1, o.trim);
  });
  if (o.sign) {
    px(g, dx - 8, roofH + 3, 26, 9, '#5a3a1a'); px(g, dx - 7, roofH + 4, 24, 7, '#f6dea8');
    drawText(g, o.sign, dx + 5 - Math.round(textW(o.sign) / 2), roofH + 4, '#5a3a1a');
  }
  return c;
}

// ---------- generation ----------
function addObject(kind, tx, ty, img, ox, oy, opts) {
  opts = opts || {};
  var o = { kind: kind, tx: tx, ty: ty, img: img, ox: ox, oy: oy, alive: true,
    fw: opts.fw || 1, fh: opts.fh || 1, sortY: (ty + (opts.fh || 1)) * TILE - 2, solid: opts.solid !== false, hp: opts.hp || 0 };
  for (var y = ty; y < ty + o.fh; y++) for (var x = tx; x < tx + o.fw; x++) if (inMap(x, y)) reserved[y * MAP_W + x] = 1;
  objects.push(o);
  return o;
}
function free(x, y) { return inMap(x, y) && !reserved[y * MAP_W + x] && !SOLID_TILE[getT(x, y)] && getT(x, y) !== T.PATH && getT(x, y) !== T.PIER && getT(x, y) !== T.PAD; }

var BUILDINGS = {
  cottage: { x: 36, y: 32, w: 4, h: 3, o: { wall: '#efe0bb', trim: '#7a5638', roof: '#b0483a', roofDark: '#8c362c', chimney: true } },
  store: { x: 46, y: 32, w: 5, h: 3, o: { wall: '#e8d8b0', trim: '#5a3a1a', roof: '#3f7a8c', roofDark: '#2c5a68', sign: 'SHOP' } },
  glass: { x: 31, y: 42, w: 4, h: 3, o: { wall: '#dfe8e8', trim: '#5a6a70', roof: '#7a5aa0', roofDark: '#5a3f7a', sign: 'GLASS' } },
  smithy: { x: 50, y: 42, w: 5, h: 3, o: { wall: '#a8a090', trim: '#4a4038', roof: '#4a4a52', roofDark: '#33333a', sign: 'SMITH', chimney: true } },
  workshop: { x: 64, y: 34, w: 5, h: 3, o: { wall: '#c8b890', trim: '#6a5030', roof: '#c88a2a', roofDark: '#9a6a1a', sign: 'OTTO' } },
  library: { x: 83, y: 44, w: 6, h: 4, o: { wall: '#c8c0ae', trim: '#7a7264', roof: '#5a6a4a', roofDark: '#3f4c33', sign: 'BOOKS' } }
};
function doorOf(b) { return { x: (b.x + b.w / 2) * TILE, y: (b.y + b.h) * TILE + 6 }; }
var PAD = { x: 60, y: 27, cx: 61.5 * TILE, cy: 28.5 * TILE };

function generateWorld() {
  var rng = mulberry32(2026);
  var x, y, i;
  for (y = 0; y < MAP_H; y++) for (x = 0; x < MAP_W; x++) setT(x, y, hash2(x, y, 11) < 0.05 ? T.FLOWER : T.GRASS);
  for (x = 0; x < MAP_W; x++) {
    var sy = shoreY(x);
    for (y = sy - 3; y < MAP_H; y++) setT(x, y, y <= sy ? T.SAND : y <= sy + 2 ? T.WATER : T.DEEP);
  }
  for (y = 0; y < MAP_H; y++) for (x = 0; x < MAP_W; x++) {
    var e = ((x - 56) / 9) * ((x - 56) / 9) + ((y - 13) / 5.5) * ((y - 13) / 5.5);
    if (e < 1) setT(x, y, T.WATER); else if (e < 1.5) setT(x, y, T.SAND);
  }
  for (y = 0; y < MAP_H; y++) for (x = 0; x < MAP_W; x++) {
    if (!inMountain(x, y)) continue;
    var edge = !inMountain(x - 1, y) || !inMountain(x, y + 1);
    var gap = (y >= mtnY(x) - 1 && x >= 75 && x <= 79) || (x <= mtnX(y) + 1 && y >= 8 && y <= 11);
    setT(x, y, edge && !gap ? T.CLIFF : (x >= 84 && y <= 11 ? T.SNOW : T.STONE));
  }
  for (y = 0; y < MAP_H; y++) for (x = 0; x < MAP_W; x++) {
    if (getT(x, y) === T.STONE && vnoise(x, y, 3, 5) > 0.78) setT(x, y, T.CLIFF);
    if (x >= 76 && x <= 95 && y >= 40 && y <= 57 && vnoise(x, y, 4, 7) > 0.42) setT(x, y, T.FLOOR);
  }
  for (y = 33; y <= 36; y++) for (x = 30; x <= 34; x++) setT(x, y, T.FARM);
  for (y = PAD.y; y < PAD.y + 3; y++) for (x = PAD.x; x < PAD.x + 3; x++) setT(x, y, T.PAD);
  PATHS.forEach(function (pl) {
    for (var s = 0; s < pl.length - 1; s++) {
      var a = pl[s], b = pl[s + 1], n = Math.ceil(dist(a[0], a[1], b[0], b[1]) * 4);
      for (var k = 0; k <= n; k++) {
        var qx = lerp(a[0], b[0], k / n), qy = lerp(a[1], b[1], k / n);
        for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
          if (ox * ox + oy * oy > 1.2) continue;
          var tx = Math.floor(qx + ox * 0.9), ty = Math.floor(qy + oy * 0.9), t = getT(tx, ty);
          if (t === T.WATER || t === T.DEEP || t === T.PAD) continue;
          setT(tx, ty, T.PATH);
        }
      }
    }
  });
  for (y = shoreY(50) - 1; y <= 76; y++) { setT(50, y, T.PIER); setT(51, y, T.PIER); }

  Object.keys(BUILDINGS).forEach(function (k) {
    var b = BUILDINGS[k];
    b.obj = addObject('building', b.x, b.y, drawBuilding(b.w, b.h, b.o), 0, -14, { fw: b.w, fh: b.h });
    b.obj.name = k;
    for (var yy = b.y - 1; yy <= b.y + b.h; yy++) for (var xx = b.x - 1; xx <= b.x + b.w; xx++) if (inMap(xx, yy)) reserved[yy * MAP_W + xx] = 1;
  });
  addObject('pad', PAD.x, PAD.y, ART.pad, 0, 0, { fw: 3, fh: 3, solid: false }).sortY = -1;
  addObject('well', 46, 40, ART.well, -2, -4);
  addObject('well', 8, 6, ART.well, -2, -4);
  addObject('sign', 13, 7, ART.sign, 1, 0);
  for (x = 30; x <= 35; x++) if (getT(x, 37) !== T.PATH) addObject('fence', x, 37, ART.fence, 0, 4);
  [[41, 36], [47, 36], [40, 41], [56, 41], [60, 36], [69, 41], [42, 57], [80, 42]].forEach(function (p) {
    if (free(p[0], p[1])) addObject('lamp', p[0], p[1], ART.lamp, 4, -10).light = true;
  });

  var clearings = [[14.5, 34.5, 5], [11, 9, 6], [22, 60, 3]];
  function inClearing(x, y) { return clearings.some(function (c) { return dist(x, y, c[0], c[1]) < c[2]; }); }
  for (y = 2; y < 62; y += 2) for (x = 1; x < 28; x += 2) {
    var tx = x + (hash2(x, y, 3) < 0.5 ? 0 : 1), ty = y + (hash2(x, y, 4) < 0.5 ? 0 : 1);
    var forestEdge = 23 + 3 * Math.sin(ty * 0.2);
    if (tx > forestEdge || inClearing(tx, ty) || distToPaths(tx + 0.5, ty + 0.5) < 2) continue;
    if (!free(tx, ty) || hash2(tx, ty, 5) > 0.72) continue;
    if (hash2(tx, ty, 6) < 0.55) addObject('tree', tx, ty, ART.pine, -3, -18); else addObject('tree', tx, ty, ART.oak, -8, -20);
  }
  for (y = 1; y < MAP_H; y++) for (x = 1; x < MAP_W - 1; x++) {
    var t = getT(x, y);
    if (t !== T.GRASS && t !== T.FLOWER) continue;
    if (x > 27 && x < 60 && y > 28 && y < 50) continue;
    if (!free(x, y) || distToPaths(x + 0.5, y + 0.5) < 2.2 || inClearing(x, y)) continue;
    if (hash2(x, y, 8) < 0.028) addObject('tree', x, y, hash2(x, y, 9) < 0.5 ? ART.pine : ART.oak, hash2(x, y, 9) < 0.5 ? -3 : -8, hash2(x, y, 9) < 0.5 ? -18 : -20);
    else if (hash2(x, y, 10) < 0.006) addObject('rock', x, y, ART.rock, 0, 3);
  }
  var stoneFree = [], snowFree = [];
  for (y = 0; y < MAP_H; y++) for (x = 0; x < MAP_W; x++) {
    if (!free(x, y) || distToPaths(x + 0.5, y + 0.5) < 1.6) continue;
    if (getT(x, y) === T.STONE) { if (hash2(x, y, 12) < 0.045) addObject('rock', x, y, ART.rock, 0, 3); else stoneFree.push([x, y]); }
    if (getT(x, y) === T.SNOW) snowFree.push([x, y]);
    if (getT(x, y) === T.FLOOR && hash2(x, y, 13) < 0.07) addObject('pillar', x, y, ART.pillar, 1, -14);
  }
  function pick(list, n, seed) {
    var r = mulberry32(seed), out = [], copy = list.slice();
    for (var j = 0; j < n && copy.length; j++) out.push(copy.splice(Math.floor(r() * copy.length), 1)[0]);
    return out;
  }
  pick(stoneFree.filter(function (p) { return p[1] > 12 && free(p[0], p[1]); }), 11, 21).forEach(function (p) {
    var o = addObject('crystal', p[0], p[1], ART.crystal, 0, 0, { hp: 3 }); o.maxHp = 3;
  });
  pick(snowFree.filter(function (p) { return free(p[0], p[1]); }), 8, 22).forEach(function (p) {
    var o = addObject('ice', p[0], p[1], ART.ice, 0, 0, { hp: 2 }); o.maxHp = 2;
  });

  for (y = 0; y < MAP_H; y++) for (x = 0; x < MAP_W; x++) {
    if (!free(x, y)) continue;
    var tt = getT(x, y);
    if ((tt === T.GRASS || tt === T.FLOWER) && x < 25 && y > 3 && y < 60) spots.mushroom.push([x, y]);
    else if ((tt === T.GRASS || tt === T.FLOWER) && !(x > 27 && x < 60 && y > 28 && y < 50) && !inMountain(x, y)) spots.berry.push([x, y]);
    if (tt === T.SAND && y > 50) { spots.shell.push([x, y]); spots.sand.push([x, y]); }
    if (tt === T.FLOOR) spots.scrap.push([x, y]);
  }
  rebuildSolid();
  renderGround();
}

function rebuildSolid() {
  for (var i = 0; i < map.length; i++) solid[i] = SOLID_TILE[map[i]] ? 1 : 0;
  objects.forEach(function (o) {
    if (!o.solid || !o.alive) return;
    for (var y = o.ty; y < o.ty + o.fh; y++) for (var x = o.tx; x < o.tx + o.fw; x++) if (inMap(x, y)) solid[y * MAP_W + x] = 1;
  });
}

// ---------- ground rendering (once) ----------
var TILE_COL = {};
TILE_COL[T.GRASS] = ['#55a043', '#3f8232', '#67b352'];
TILE_COL[T.FLOWER] = ['#55a043', '#3f8232', '#67b352'];
TILE_COL[T.PATH] = ['#d9b77c', '#c49a5e', '#e6c890'];
TILE_COL[T.SAND] = ['#e8d49a', '#d8c080', '#f4e4b4'];
TILE_COL[T.WATER] = ['#3d7cc4', '#346cb0', '#5b9de0'];
TILE_COL[T.DEEP] = ['#2b5f9e', '#24528a', '#3468a8'];
TILE_COL[T.CLIFF] = ['#6b6f7a', '#4a4d56', '#8a8f9a'];
TILE_COL[T.STONE] = ['#9a9486', '#8a8476', '#aaa496'];
TILE_COL[T.SNOW] = ['#eef4f8', '#d4e2ec', '#ffffff'];
TILE_COL[T.FLOOR] = ['#b8b0a0', '#9c9484', '#c8c0b0'];
TILE_COL[T.PIER] = ['#9c6d43', '#7d5533', '#b58b5c'];
TILE_COL[T.FARM] = ['#7a5230', '#5e3d22', '#8a6240'];
TILE_COL[T.PAD] = ['#8a8f9a', '#6e737c', '#a0a6b0'];

function renderGround() {
  var g = groundCanvas.getContext('2d');
  var FLOWERS = ['#fff6b0', '#ff9ec4', '#ffffff', '#ffd23f', '#b58ae0'];
  for (var y = 0; y < MAP_H; y++) for (var x = 0; x < MAP_W; x++) {
    var t = getT(x, y), c = TILE_COL[t], X = x * TILE, Y = y * TILE, r = mulberry32(x * 7919 + y * 104729);
    px(g, X, Y, TILE, TILE, c[0]);
    var n = t === T.CLIFF ? 0 : 6 + Math.floor(r() * 5);
    for (var i = 0; i < n; i++) {
      var sx = Math.floor(r() * 15), sy = Math.floor(r() * 15);
      if (t === T.GRASS || t === T.FLOWER) { px(g, X + sx, Y + sy, 1, 1, c[1]); px(g, X + sx + 1, Y + sy + 1, 1, 1, c[1]); if (i % 3 === 0) px(g, X + sx, Y + sy, 2, 1, c[2]); }
      else px(g, X + sx, Y + sy, i % 2 ? 2 : 1, 1, c[1 + (i % 2)]);
    }
    if (t === T.FLOWER) for (var f = 0; f < 3; f++) { var fx = 2 + Math.floor(r() * 12), fy = 2 + Math.floor(r() * 12); px(g, X + fx, Y + fy + 1, 1, 1, '#2f6b28'); px(g, X + fx, Y + fy, 1, 1, FLOWERS[Math.floor(r() * 5)]); }
    if (t === T.CLIFF) { px(g, X, Y, 16, 3, c[2]); px(g, X, Y + 12, 16, 4, c[1]); px(g, X + 3 + Math.floor(r() * 8), Y + 5, 1, 5, c[1]); }
    if (t === T.FLOOR) { px(g, X, Y + 7, 16, 1, c[1]); px(g, X + 7, Y, 1, 7, c[1]); px(g, X + 12, Y + 8, 1, 8, c[1]); if (r() < 0.3) px(g, X + 2, Y + 10, 3, 2, '#6f9a4a'); }
    if (t === T.PIER) { for (var k = 0; k < 16; k += 4) px(g, X, Y + k + 3, 16, 1, c[1]); px(g, X, Y, 1, 16, c[1]); }
    if (t === T.FARM) { for (var k2 = 2; k2 < 16; k2 += 5) { px(g, X, Y + k2, 16, 2, c[1]); px(g, X + 3, Y + k2 - 2, 2, 2, '#4f9a3e'); px(g, X + 10, Y + k2 - 2, 2, 2, '#4f9a3e'); } }
    if (t === T.PATH) {
      if (getT(x, y - 1) !== T.PATH && !SOLID_TILE[getT(x, y - 1)]) px(g, X, Y, 16, 1, '#b08d58');
      if (getT(x, y + 1) !== T.PATH && !SOLID_TILE[getT(x, y + 1)]) px(g, X, Y + 15, 16, 1, '#b08d58');
      if (getT(x - 1, y) !== T.PATH && !SOLID_TILE[getT(x - 1, y)]) px(g, X, Y, 1, 16, '#b08d58');
      if (getT(x + 1, y) !== T.PATH && !SOLID_TILE[getT(x + 1, y)]) px(g, X + 15, Y, 1, 16, '#b08d58');
    }
    if ((t === T.WATER || t === T.DEEP) && !SOLID_TILE[getT(x, y - 1)] && getT(x, y - 1) !== T.PIER) { px(g, X, Y, 16, 2, '#cfe8f4'); px(g, X, Y + 2, 16, 2, c[2]); }
    if (t === T.PIER && getT(x, y) === T.PIER && (getT(x - 1, y) === T.DEEP || getT(x - 1, y) === T.WATER)) px(g, X - 1, Y + 14, 1, 2, '#5e3d22');
  }
}
