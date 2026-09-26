// ================= core: helpers, font, input, sound =================
var TILE = 16, MAP_W = 100, MAP_H = 80;
var VW = 384, VH = 216;
var cvs = document.getElementById('game');
var ctx = cvs.getContext('2d');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
function makeCanvas(w, h) {
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}
function fmt(n) { return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function hash2(x, y, s) {
  var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, sc, s) {
  var gx = x / sc, gy = y / sc, x0 = Math.floor(gx), y0 = Math.floor(gy);
  var fx = gx - x0, fy = gy - y0;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  var a = hash2(x0, y0, s), b = hash2(x0 + 1, y0, s), c = hash2(x0, y0 + 1, s), d = hash2(x0 + 1, y0 + 1, s);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

// ---------- sprites from strings ----------
function spriteFromRows(rows, pal) {
  var h = rows.length, w = 0;
  for (var i = 0; i < h; i++) w = Math.max(w, rows[i].length);
  var c = makeCanvas(w, h), g = c.getContext('2d');
  for (var y = 0; y < h; y++) for (var x = 0; x < rows[y].length; x++) {
    var col = pal[rows[y][x]];
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  return c;
}
function flipX(src) {
  var c = makeCanvas(src.width, src.height), g = c.getContext('2d');
  g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
  return c;
}

// ---------- 5x7 bitmap font ----------
var FONT = {
  'A': ['.###.','#...#','#...#','#####','#...#','#...#','#...#'], 'B': ['####.','#...#','#...#','####.','#...#','#...#','####.'],
  'C': ['.###.','#...#','#....','#....','#....','#...#','.###.'], 'D': ['###..','#..#.','#...#','#...#','#...#','#..#.','###..'],
  'E': ['#####','#....','#....','####.','#....','#....','#####'], 'F': ['#####','#....','#....','####.','#....','#....','#....'],
  'G': ['.###.','#...#','#....','#.###','#...#','#...#','.####'], 'H': ['#...#','#...#','#...#','#####','#...#','#...#','#...#'],
  'I': ['.###.','..#..','..#..','..#..','..#..','..#..','.###.'], 'J': ['..###','...#.','...#.','...#.','...#.','#..#.','.##..'],
  'K': ['#...#','#..#.','#.#..','##...','#.#..','#..#.','#...#'], 'L': ['#....','#....','#....','#....','#....','#....','#####'],
  'M': ['#...#','##.##','#.#.#','#.#.#','#...#','#...#','#...#'], 'N': ['#...#','#...#','##..#','#.#.#','#..##','#...#','#...#'],
  'O': ['.###.','#...#','#...#','#...#','#...#','#...#','.###.'], 'P': ['####.','#...#','#...#','####.','#....','#....','#....'],
  'Q': ['.###.','#...#','#...#','#...#','#.#.#','#..#.','.##.#'], 'R': ['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
  'S': ['.####','#....','#....','.###.','....#','....#','####.'], 'T': ['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
  'U': ['#...#','#...#','#...#','#...#','#...#','#...#','.###.'], 'V': ['#...#','#...#','#...#','#...#','#...#','.#.#.','..#..'],
  'W': ['#...#','#...#','#...#','#.#.#','#.#.#','#.#.#','.#.#.'], 'X': ['#...#','#...#','.#.#.','..#..','.#.#.','#...#','#...#'],
  'Y': ['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..'], 'Z': ['#####','....#','...#.','..#..','.#...','#....','#####'],
  '0': ['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.'], '1': ['..#..','.##..','..#..','..#..','..#..','..#..','.###.'],
  '2': ['.###.','#...#','....#','...#.','..#..','.#...','#####'], '3': ['#####','...#.','..#..','...#.','....#','#...#','.###.'],
  '4': ['...#.','..##.','.#.#.','#..#.','#####','...#.','...#.'], '5': ['#####','#....','####.','....#','....#','#...#','.###.'],
  '6': ['..##.','.#...','#....','####.','#...#','#...#','.###.'], '7': ['#####','....#','...#.','..#..','.#...','.#...','.#...'],
  '8': ['.###.','#...#','#...#','.###.','#...#','#...#','.###.'], '9': ['.###.','#...#','#...#','.####','....#','...#.','.##..'],
  'a': ['.....','.....','.###.','....#','.####','#...#','.####'], 'b': ['#....','#....','#.##.','##..#','#...#','#...#','####.'],
  'c': ['.....','.....','.###.','#....','#....','#...#','.###.'], 'd': ['....#','....#','.##.#','#..##','#...#','#...#','.####'],
  'e': ['.....','.....','.###.','#...#','#####','#....','.###.'], 'f': ['..##.','.#..#','.#...','###..','.#...','.#...','.#...'],
  'g': ['.....','.####','#...#','#...#','.####','....#','.###.'], 'h': ['#....','#....','#.##.','##..#','#...#','#...#','#...#'],
  'i': ['..#..','.....','.##..','..#..','..#..','..#..','.###.'], 'j': ['...#.','.....','..##.','...#.','...#.','#..#.','.##..'],
  'k': ['#....','#....','#..#.','#.#..','##...','#.#..','#..#.'], 'l': ['.##..','..#..','..#..','..#..','..#..','..#..','.###.'],
  'm': ['.....','.....','##.#.','#.#.#','#.#.#','#...#','#...#'], 'n': ['.....','.....','#.##.','##..#','#...#','#...#','#...#'],
  'o': ['.....','.....','.###.','#...#','#...#','#...#','.###.'], 'p': ['.....','####.','#...#','#...#','####.','#....','#....'],
  'q': ['.....','.####','#...#','#...#','.####','....#','....#'], 'r': ['.....','.....','#.##.','##..#','#....','#....','#....'],
  's': ['.....','.....','.####','#....','.###.','....#','####.'], 't': ['.#...','.#...','###..','.#...','.#...','.#..#','..##.'],
  'u': ['.....','.....','#...#','#...#','#...#','#..##','.##.#'], 'v': ['.....','.....','#...#','#...#','#...#','.#.#.','..#..'],
  'w': ['.....','.....','#...#','#...#','#.#.#','#.#.#','.#.#.'], 'x': ['.....','.....','#...#','.#.#.','..#..','.#.#.','#...#'],
  'y': ['.....','#...#','#...#','#...#','.####','....#','.###.'], 'z': ['.....','.....','#####','...#.','..#..','.#...','#####'],
  '.': ['.....','.....','.....','.....','.....','.##..','.##..'], ',': ['.....','.....','.....','.....','.##..','..#..','.#...'],
  "'": ['.##..','..#..','.#...','.....','.....','.....','.....'], '!': ['..#..','..#..','..#..','..#..','..#..','.....','..#..'],
  '?': ['.###.','#...#','....#','...#.','..#..','.....','..#..'], ':': ['.....','.##..','.##..','.....','.##..','.##..','.....'],
  ';': ['.....','.##..','.##..','.....','.##..','..#..','.#...'], '-': ['.....','.....','.....','#####','.....','.....','.....'],
  '/': ['.....','....#','...#.','..#..','.#...','#....','.....'], '(': ['..#..','.#...','#....','#....','#....','.#...','..#..'],
  ')': ['..#..','...#.','....#','....#','....#','...#.','..#..'], '+': ['.....','..#..','..#..','#####','..#..','..#..','.....'],
  '%': ['##...','##..#','...#.','..#..','.#...','#..##','...##'], '"': ['#.#..','#.#..','.....','.....','.....','.....','.....'],
  '>': ['#....','.#...','..#..','...#.','..#..','.#...','#....'], '<': ['...#.','..#..','.#...','#....','.#...','..#..','...#.'],
  '=': ['.....','.....','#####','.....','#####','.....','.....'], '*': ['.....','#.#.#','.###.','#####','.###.','#.#.#','.....'],
  '&': ['.##..','#..#.','#.#..','.#...','#.#.#','#..#.','.##.#'], '#': ['.#.#.','.#.#.','#####','.#.#.','#####','.#.#.','.#.#.'],
  '_': ['.....','.....','.....','.....','.....','.....','#####']
};
var GLYPHS = {}, fontAtlas = null, tintCache = {};
(function buildFont() {
  var chars = Object.keys(FONT);
  fontAtlas = makeCanvas(chars.length * 6, 7);
  var g = fontAtlas.getContext('2d');
  g.fillStyle = '#ffffff';
  chars.forEach(function (ch, i) {
    var rows = FONT[ch], c0 = 5, c1 = -1;
    for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++) if (rows[r][c] === '#') { c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
    if (c1 < 0) { c0 = 0; c1 = 2; }
    for (var r2 = 0; r2 < 7; r2++) for (var c2 = c0; c2 <= c1; c2++) if (rows[r2][c2] === '#') g.fillRect(i * 6 + c2 - c0, r2, 1, 1);
    GLYPHS[ch] = { sx: i * 6, w: c1 - c0 + 1 };
  });
})();
function tinted(color) {
  if (tintCache[color]) return tintCache[color];
  var c = makeCanvas(fontAtlas.width, 7), g = c.getContext('2d');
  g.drawImage(fontAtlas, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, 7);
  tintCache[color] = c;
  return c;
}
function textW(str, s) {
  s = s || 1;
  var w = 0;
  for (var i = 0; i < str.length; i++) {
    var ch = str[i];
    if (ch === ' ') { w += 3 * s; continue; }
    var gl = GLYPHS[ch] || GLYPHS['?'];
    w += (gl.w + 1) * s;
  }
  return Math.max(0, w - s);
}
function drawText(g, str, x, y, color, s, shadow) {
  s = s || 1;
  if (shadow) drawText(g, str, x + s, y + s, shadow, s);
  var atlas = tinted(color), cx = Math.round(x), cy = Math.round(y);
  for (var i = 0; i < str.length; i++) {
    var ch = str[i];
    if (ch === ' ') { cx += 3 * s; continue; }
    var gl = GLYPHS[ch] || GLYPHS['?'];
    g.drawImage(atlas, gl.sx, 0, gl.w, 7, cx, cy, gl.w * s, 7 * s);
    cx += (gl.w + 1) * s;
  }
  return cx;
}
function wrapText(str, maxW, s) {
  var out = [];
  str.split('\n').forEach(function (para) {
    var words = para.split(' '), line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (textW(t, s) > maxW && line) { out.push(line); line = w; } else line = t;
    });
    out.push(line);
  });
  return out;
}

// ---------- input ----------
var keys = {}, pressed = {};
var PREVENT = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, ' ': 1, Tab: 1 };
function normKey(k) { return k && k.length === 1 ? k.toLowerCase() : k; }
window.addEventListener('keydown', function (e) {
  var k = normKey(e.key);
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
  if (PREVENT[e.key]) e.preventDefault();
  Snd.unlock();
});
window.addEventListener('keyup', function (e) { keys[normKey(e.key)] = false; });
window.addEventListener('blur', function () { keys = {}; touch.vx = touch.vy = 0; touch.run = false; });

var touch = { vx: 0, vy: 0, run: false, lastDir: 0 };
var Input = {
  x: function () { var v = 0; if (keys.ArrowLeft || keys.a) v -= 1; if (keys.ArrowRight || keys.d) v += 1; return clamp(v + touch.vx, -1, 1); },
  y: function () { var v = 0; if (keys.ArrowUp || keys.w) v -= 1; if (keys.ArrowDown || keys.s) v += 1; return clamp(v + touch.vy, -1, 1); },
  run: function () { return !!(keys.Shift || touch.run); },
  hit: function (a) {
    var p = pressed;
    switch (a) {
      case 'ok': return !!(p.e || p[' '] || p.Enter || p.__a);
      case 'back': return !!(p.Escape || p.Backspace || p.__back);
      case 'up': return !!(p.ArrowUp || p.w || p.__up);
      case 'down': return !!(p.ArrowDown || p.s || p.__down);
      case 'left': return !!(p.ArrowLeft || p.a || p.__left);
      case 'right': return !!(p.ArrowRight || p.d || p.__right);
      case 'journal': return !!(p.q || p.Tab || p.__menu);
      case 'mute': return !!p.m;
    }
    return false;
  },
  num: function () { for (var i = 1; i <= 5; i++) if (pressed[String(i)]) return i; return pressed.__slot || 0; },
  endFrame: function () { pressed = {}; }
};

// touch controls (shown on coarse pointers)
(function setupTouch() {
  var coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}
  var pad = document.getElementById('touch');
  if (coarse) pad.hidden = false;
  var stick = document.getElementById('stick'), knob = document.getElementById('knob');
  var sid = null, cx = 0, cy = 0;
  function moveStick(e) {
    var dx = e.clientX - cx, dy = e.clientY - cy, d = Math.sqrt(dx * dx + dy * dy), m = 44;
    if (d > m) { dx = dx / d * m; dy = dy / d * m; }
    knob.style.left = (40 + dx) + 'px'; knob.style.top = (40 + dy) + 'px';
    touch.vx = Math.abs(dx) > 10 ? dx / m : 0;
    touch.vy = Math.abs(dy) > 10 ? dy / m : 0;
    var dir = 0;
    if (dy < -26) dir = 1; else if (dy > 26) dir = 2; else if (dx < -26) dir = 3; else if (dx > 26) dir = 4;
    if (dir && dir !== touch.lastDir) pressed[['', '__up', '__down', '__left', '__right'][dir]] = true;
    touch.lastDir = dir;
  }
  stick.addEventListener('pointerdown', function (e) {
    Snd.unlock(); sid = e.pointerId; stick.setPointerCapture(sid);
    var r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; moveStick(e);
  });
  stick.addEventListener('pointermove', function (e) { if (e.pointerId === sid) moveStick(e); });
  function endStick(e) { if (e.pointerId !== sid) return; sid = null; touch.vx = touch.vy = 0; touch.lastDir = 0; knob.style.left = '40px'; knob.style.top = '40px'; }
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);
  function btn(id, down, up) {
    var b = document.getElementById(id);
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); Snd.unlock(); down(); });
    if (up) { b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); }
  }
  btn('bA', function () { pressed.__a = true; });
  btn('bMenu', function () { pressed.__menu = true; });
  btn('bRun', function () { touch.run = true; }, function () { touch.run = false; });
})();

// clicks and taps on the canvas hit UI rectangles registered during the last frame
var uiHits = [];
cvs.addEventListener('pointerdown', function (e) {
  Snd.unlock();
  cvs.focus();
  var r = cvs.getBoundingClientRect();
  var x = (e.clientX - r.left) / r.width * VW, y = (e.clientY - r.top) / r.height * VH;
  for (var i = uiHits.length - 1; i >= 0; i--) {
    var h = uiHits[i];
    if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) { h.fn(); return; }
  }
  pressed.__tap = true;
});

// ---------- sound (all synthesized, nothing to download) ----------
var Snd = (function () {
  var ac = null, master = null, sfx = null, mus = null, muted = false, nbuf = null;
  var next = 0, step = 0, mode = 'day', tense = false;
  try { muted = localStorage.getItem('trail-muted') === '1'; } catch (e) {}
  function unlock() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; return; }
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    mus = ac.createGain(); mus.gain.value = 0.2; mus.connect(master);
    next = ac.currentTime + 0.15;
    setInterval(tick, 50);
  }
  function toneAt(t, f, d, type, v, f2, dest) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || sfx);
    o.start(t); o.stop(t + d + 0.03);
  }
  function tone(f, d, type, v, f2, delay) { if (ac && !muted) toneAt(ac.currentTime + (delay || 0), f, d, type, v, f2); }
  function noise(d, v, freq, f2, delay) {
    if (!ac || muted) return;
    if (!nbuf) {
      nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      var ch = nbuf.getChannelData(0), r = mulberry32(9);
      for (var i = 0; i < ch.length; i++) ch[i] = r() * 2 - 1;
    }
    var t = ac.currentTime + (delay || 0);
    var s = ac.createBufferSource(); s.buffer = nbuf; s.loop = true;
    var fl = ac.createBiquadFilter(); fl.type = 'lowpass';
    fl.frequency.setValueAtTime(freq, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
    var g = ac.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(sfx);
    s.start(t); s.stop(t + d + 0.05);
  }
  // gentle pentatonic loop; the night version is sparser and minor
  var DAY = {
    mel: [12, null, 9, null, 7, null, 9, null, 4, null, 7, null, 9, null, null, null,
          12, null, 14, null, 12, null, 9, null, 7, null, 4, null, 2, null, null, null],
    bass: [0, -3, -7, -5]
  };
  var NIGHT = {
    mel: [null, null, 4, null, null, null, 0, null, null, null, 2, null, -3, null, null, null,
          null, null, 7, null, null, null, 4, null, 2, null, null, null, 0, null, null, null],
    bass: [-3, -7, -5, -3]
  };
  function note(n) { return 261.63 * Math.pow(2, n / 12); }
  function tick() {
    if (!ac) return;
    if (muted) { next = ac.currentTime + 0.1; return; }
    var spb = 60 / 84 / 2;
    while (next < ac.currentTime + 0.25) {
      var seq = mode === 'night' ? NIGHT : DAY;
      var m = seq.mel[step % seq.mel.length];
      if (mode !== 'off') {
        if (m !== null && !tense) toneAt(next, note(m), 0.34, 'triangle', 0.06, null, mus);
        if (step % 8 === 0) toneAt(next, note(seq.bass[(step / 8 | 0) % seq.bass.length] - 24), 0.9, 'sine', tense ? 0.05 : 0.09, null, mus);
      }
      step = (step + 1) % 64;
      next += spb;
    }
  }
  var fx = {
    blip: function () { tone(740, 0.025, 'square', 0.025); },
    select: function () { tone(520, 0.05, 'square', 0.05); },
    pickup: function () { tone(660, 0.06, 'square', 0.06); tone(990, 0.09, 'square', 0.06, null, 0.06); },
    coin: function () { tone(988, 0.07, 'square', 0.06); tone(1319, 0.16, 'square', 0.06, null, 0.07); },
    error: function () { tone(180, 0.16, 'square', 0.06, 120); },
    salt: function () { noise(0.35, 0.25, 4000, 900); },
    jar: function () { tone(1760, 0.5, 'sine', 0.12); tone(2637, 0.35, 'sine', 0.06, null, 0.03); },
    freeze: function () { for (var i = 0; i < 6; i++) tone(2000 - i * 220, 0.12, 'triangle', 0.06, null, i * 0.05); },
    splash: function () { noise(0.6, 0.3, 1200, 200); },
    bubble: function () { tone(300, 0.08, 'sine', 0.08, 700); },
    rocket: function () { noise(2.6, 0.35, 300, 3000); tone(80, 2.4, 'sawtooth', 0.05, 400); },
    crash: function () { noise(0.9, 0.5, 900, 60); tone(70, 0.6, 'sine', 0.4, 30); },
    hit: function () { noise(0.08, 0.3, 2500); tone(220, 0.06, 'square', 0.05); },
    thud: function () { tone(90, 0.18, 'sine', 0.35, 40); },
    heart: function () { tone(62, 0.13, 'sine', 0.4, 38); tone(58, 0.13, 'sine', 0.28, 34, 0.2); },
    door: function () { tone(330, 0.06, 'square', 0.05); tone(247, 0.1, 'square', 0.05, null, 0.07); },
    cast: function () { noise(0.25, 0.15, 2000, 500); },
    bite: function () { tone(1200, 0.05, 'square', 0.07); tone(1500, 0.05, 'square', 0.07, null, 0.08); },
    sleep: function () { [7, 4, 0, -5].forEach(function (n, i) { tone(note(n), 0.5, 'triangle', 0.07, null, i * 0.28); }); },
    death: function () { [0, -1, -2, -3].forEach(function (n, i) { tone(note(n - 12), 0.7, 'triangle', 0.09, null, i * 0.45); }); },
    win: function () { [0, 4, 7, 12, 16, 19, 24].forEach(function (n, i) { tone(note(n), 0.6, 'triangle', 0.07, null, i * 0.16); }); }
  };
  return {
    unlock: unlock,
    play: function (n) { if (fx[n]) fx[n](); },
    mode: function (m) { mode = m; },
    tense: function (t) { tense = t; },
    toggleMute: function () {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.7;
      try { localStorage.setItem('trail-muted', muted ? '1' : '0'); } catch (e) {}
      return muted;
    },
    isMuted: function () { return muted; }
  };
})();
