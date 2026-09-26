// ================= ui: panels, dialogue, menus, hud =================
var INK = '#1a1410', CREAM = '#f5e9c8', PARCH = '#f6dea8', BARK = '#5a3a1a', BROWN = '#3b2314', RUST = '#9a5a2a', DANGER = '#e0503c';
var ui = { dialog: null, choice: null, shop: null, toasts: [], prompt: null, sel: 0 };
var shake = 0, rocketFx = 0;

function panel(g, x, y, w, h) {
  px(g, x + 2, y + 2, w, h, 'rgba(10,8,6,0.35)');
  px(g, x, y, w, h, BARK); px(g, x + 2, y + 2, w - 4, h - 4, PARCH);
  px(g, x + 2, y + 2, w - 4, 1, '#ffeec4'); px(g, x + 2, y + 2, 1, h - 4, '#ffeec4');
  px(g, x + 2, y + h - 3, w - 4, 1, '#d9a860'); px(g, x + w - 3, y + 2, 1, h - 4, '#d9a860');
}
function darkBox(g, x, y, w, h, a) { px(g, x, y, w, h, 'rgba(26,20,16,' + (a || 0.78) + ')'); }
function hitRect(x, y, w, h, fn) { uiHits.push({ x: x, y: y, w: w, h: h, fn: fn }); }

function toast(msg) {
  ui.toasts.push({ msg: msg, t: 3.6 });
  if (ui.toasts.length > 3) ui.toasts.shift();
}

// ---------- dialogue ----------
function openDialog(npc, lines, after) {
  var pages = [], w = Math.min(VW - 16, 368) - 58;
  lines.forEach(function (l) {
    if (!l) return;
    var wrapped = wrapText(l, w, 1);
    for (var i = 0; i < wrapped.length; i += 4) pages.push(wrapped.slice(i, i + 4));
  });
  ui.dialog = { npc: npc, pages: pages, page: 0, chars: 0, after: after || null };
  G.state = 'dialog';
}
function pageLen(p) { return p.reduce(function (a, l) { return a + l.length; }, 0); }
function updateDialog(dt) {
  var d = ui.dialog, p = d.pages[d.page];
  var before = Math.floor(d.chars);
  d.chars += dt * 48;
  if (Math.floor(d.chars / 3) !== Math.floor(before / 3) && d.chars < pageLen(p)) Snd.play('blip');
  if (Input.hit('ok') || pressed.__tap) {
    if (d.chars < pageLen(p)) d.chars = 999;
    else if (d.page < d.pages.length - 1) { d.page++; d.chars = 0; Snd.play('select'); }
    else {
      ui.dialog = null;
      if (G.state === 'dialog') G.state = 'play';
      if (d.after) d.after();
    }
  }
}
function drawDialogBox(g, npc, pages, page, chars) {
  var w = Math.min(VW - 16, 368), x = Math.round((VW - w) / 2), h = 60, y = VH - h - 6 - bottomInset;
  panel(g, x, y, w, h);
  px(g, x + 7, y + 8, 38, 38, '#7a4a1e'); px(g, x + 8, y + 9, 36, 36, '#b9d9a0');
  if (npc) g.drawImage(npc.portrait, x + 10, y + 11, 32, 32); else g.drawImage(SPR.snailR, x + 12, y + 17, 28, 20);
  drawText(g, npc ? npc.name : '', x + 8, y + 48, RUST);
  var left = chars, tx = x + 52, ty = y + 8;
  (pages[page] || []).forEach(function (line, i) {
    var s = line.slice(0, Math.max(0, left));
    left -= line.length;
    drawText(g, s, tx, ty + i * 11, BROWN);
  });
  if (chars >= pageLen(pages[page] || []) && Math.floor(performance.now() / 400) % 2) {
    px(g, x + w - 12, y + h - 10, 5, 1, BARK); px(g, x + w - 11, y + h - 9, 3, 1, BARK); px(g, x + w - 10, y + h - 8, 1, 1, BARK);
  }
  hitRect(0, 0, VW, VH, function () { pressed.__a = true; });
}

// ---------- choices ----------
function openChoice(npc, text, options) {
  ui.choice = { npc: npc, text: text, options: options, sel: 0 };
  G.state = 'choice';
}
function updateChoice() {
  var c = ui.choice;
  if (Input.hit('up')) { c.sel = (c.sel + c.options.length - 1) % c.options.length; Snd.play('blip'); }
  if (Input.hit('down')) { c.sel = (c.sel + 1) % c.options.length; Snd.play('blip'); }
  if (Input.hit('back')) { c.sel = c.options.length - 1; pick(); return; }
  if (Input.hit('ok')) pick();
  function pick() { var o = c.options[c.sel]; ui.choice = null; G.state = 'play'; Snd.play('select'); o.fn(); }
}
function drawChoice(g) {
  var c = ui.choice, w = Math.min(VW - 16, 368), lines = wrapText(c.text, w - 20, 1);
  var h = 16 + lines.length * 10 + c.options.length * 12, x = Math.round((VW - w) / 2), y = VH - h - 6 - bottomInset;
  panel(g, x, y, w, h);
  lines.forEach(function (l, i) { drawText(g, l, x + 10, y + 8 + i * 10, BROWN); });
  c.options.forEach(function (o, i) {
    var oy = y + 12 + lines.length * 10 + i * 12;
    if (i === c.sel) { px(g, x + 8, oy - 2, w - 16, 11, '#ecc98a'); drawText(g, '>', x + 11, oy, BARK); }
    drawText(g, o.label, x + 20, oy, BROWN);
    hitRect(x + 8, oy - 2, w - 16, 11, (function (k) { return function () { c.sel = k; pressed.__a = true; }; })(i));
  });
}

// ---------- shop ----------
function openShop(who) { ui.shop = { who: who, sel: 0 }; G.state = 'shop'; Snd.play('door'); }
function updateShop() {
  var s = ui.shop, items = shopItems(s.who), n = items.length + 1;
  s.sel = Math.min(s.sel, n - 1);
  if (Input.hit('up')) { s.sel = (s.sel + n - 1) % n; Snd.play('blip'); }
  if (Input.hit('down')) { s.sel = (s.sel + 1) % n; Snd.play('blip'); }
  if (Input.hit('back')) { ui.shop = null; G.state = 'play'; return; }
  if (Input.hit('ok')) {
    if (s.sel === items.length) { ui.shop = null; G.state = 'play'; return; }
    shopBuy(s.who, items[s.sel]);
  }
}
function drawShop(g) {
  var s = ui.shop, items = shopItems(s.who), w = Math.min(VW - 16, 300);
  var greet = wrapText(SHOP_GREETING[s.who], w - 20, 1);
  var h = 30 + greet.length * 10 + (items.length + 1) * 12, x = Math.round((VW - w) / 2), y = Math.max(4, Math.round((VH - h) / 2) - 10);
  panel(g, x, y, w, h);
  greet.forEach(function (l, i) { drawText(g, l, x + 10, y + 8 + i * 10, BROWN); });
  var gy = y + 10 + greet.length * 10;
  drawText(g, 'Your gold: ' + fmt(G.gold) + ' g', x + 10, gy, RUST);
  items.concat([{ label: 'Leave', price: null }]).forEach(function (it, i) {
    var oy = gy + 14 + i * 12;
    if (i === s.sel) { px(g, x + 8, oy - 2, w - 16, 11, '#ecc98a'); drawText(g, '>', x + 11, oy, BARK); }
    drawText(g, it.label, x + 20, oy, BROWN);
    if (it.price !== null) {
      var ptxt = it.price < 0 ? '+' + fmt(-it.price) + ' g' : fmt(it.price) + ' g';
      drawText(g, ptxt, x + w - 12 - textW(ptxt), oy, it.price < 0 ? '#2f7a3a' : (G.gold < it.price ? '#b04030' : BROWN));
    }
    hitRect(x + 8, oy - 2, w - 16, 11, (function (k) { return function () { s.sel = k; pressed.__a = true; }; })(i));
  });
}

// ---------- journal ----------
function drawJournal(g) {
  var w = Math.min(VW - 12, 372), h = Math.min(VH - 12, 204), x = Math.round((VW - w) / 2), y = Math.round((VH - h) / 2);
  panel(g, x, y, w, h);
  drawText(g, 'JOURNAL', x + 10, y + 8, RUST);
  drawText(g, 'Day ' + G.day + '   ' + DIFFS[G.diff].name, x + w - 10 - textW('Day ' + G.day + '   ' + DIFFS[G.diff].name), y + 8, RUST);
  var cy = y + 22;
  drawText(g, 'Main quest, step ' + Math.min(G.main + 1, 24) + ' of 24', x + 10, cy, BARK); cy += 10;
  wrapText(G.main < 24 ? MAIN[G.main] : 'Done. The snail stopped.', w - 20, 1).forEach(function (l) { drawText(g, l, x + 10, cy, BROWN); cy += 10; });
  if (G.main === 22) { drawText(g, fmt(G.gold) + ' / 1,000,000 g', x + 10, cy, BROWN); cy += 10; }
  cy += 4;
  drawText(g, 'Side quests', x + 10, cy, BARK); cy += 10;
  var any = false;
  Object.keys(SIDE).forEach(function (k) {
    if (G.side[k] === 0) return;
    any = true;
    var q = SIDE[k], done = G.side[k] === 2;
    drawText(g, (done ? 'done  ' : (G.inv[q.need] || 0) + '/' + q.n + '  ') + q.text, x + 10, cy, done ? '#8a7a60' : BROWN); cy += 10;
  });
  if (!any) { drawText(g, 'None yet. People in the village have work.', x + 10, cy, '#8a7a60'); cy += 10; }
  cy += 4;
  drawText(g, 'Bag', x + 10, cy, BARK); cy += 10;
  var bag = [];
  Object.keys(ITEM_NAMES).forEach(function (k) { if (G.inv[k]) bag.push(ITEM_NAMES[k] + ' ' + G.inv[k]); });
  ['pickaxe', 'rod', 'boots', 'tent'].forEach(function (t) { if (G.tools[t]) bag.push({ pickaxe: 'Pickaxe', rod: 'Fishing rod', boots: 'Running shoes', tent: 'Tent' }[t]); });
  wrapText(bag.length ? bag.join(', ') : 'Empty. You have gold, though.', w - 20, 1).slice(0, 3).forEach(function (l) { drawText(g, l, x + 10, cy, BROWN); cy += 10; });
  var help = 'Move WASD  Run Shift  Act E  Items 1-5  Mute M  Close Q';
  drawText(g, help, x + Math.round((w - textW(help)) / 2), y + h - 13, '#8a7a60');
  hitRect(0, 0, VW, VH, function () { pressed.q = true; });
}

// ---------- hud ----------
function drawHud(g) {
  var hw = 104, hx = VW - hw - 4, hy = 4;
  panel(g, hx, hy, hw, 44);
  drawText(g, 'DAY ' + G.day, hx + 8, hy + 7, BROWN);
  var ct = clockText(G.time);
  drawText(g, ct, hx + hw - 8 - textW(ct), hy + 7, G.time >= 1080 ? '#b04030' : BROWN);
  drawText(g, fmt(G.gold) + ' g', hx + 8, hy + 18, RUST);
  g.drawImage(SPR.snailIcon, hx + 8, hy + 30);
  var st = snail.state, label;
  if (st === 'orbit') label = 'in orbit'; else if (st === 'jarred') label = 'in a jar ' + Math.ceil(snail.t);
  else if (st === 'frozen') label = 'frozen ' + Math.ceil(snail.t); else if (st === 'stopped') label = 'stopped';
  else label = fmt(snailMeters()) + ' m';
  drawText(g, label, hx + 21, hy + 29, st === 'chase' && snailMeters() < 40 ? '#b04030' : BROWN);
  px(g, hx, hy + 47, hw, 5, BARK);
  px(g, hx + 1, hy + 48, Math.round((hw - 2) * player.stamina / 100), 3, player.fed > 0 ? '#e0a860' : '#6fbf5a');

  if (G.main < 24) {
    var qw = Math.min(160, VW - 122), lines = wrapText(MAIN[G.main], qw - 10, 1).slice(0, 3), qh = 14 + lines.length * 9;
    darkBox(g, 4, 4, qw, qh, 0.62);
    drawText(g, 'QUEST ' + (G.main + 1) + '/24', 9, 8, '#e8c060');
    lines.forEach(function (l, i) { drawText(g, l, 9, 18 + i * 9, CREAM); });
    hitRect(4, 4, qw, qh, function () { pressed.q = true; });
  }

  var slots = [['salt', G.inv.salt], ['jar', G.inv.jar], ['ice', G.inv.ice], ['bread', G.inv.bread], ['tent', G.tools.tent ? 1 : 0]];
  var sw = 20, total = slots.length * (sw + 2) - 2, sx = Math.round((VW - total) / 2), sy = VH - sw - 4 - bottomInset;
  slots.forEach(function (s, i) {
    var x = sx + i * (sw + 2), has = s[1] > 0;
    px(g, x, sy, sw, sw, BARK); px(g, x + 1, sy + 1, sw - 2, sw - 2, has ? PARCH : '#a89878');
    var ic = SPR.item[s[0]];
    g.globalAlpha = has ? 1 : 0.35;
    g.drawImage(ic, x + Math.round((sw - ic.width) / 2), sy + Math.round((sw - ic.height) / 2) + 1);
    g.globalAlpha = 1;
    drawText(g, String(i + 1), x + 2, sy + 2, has ? RUST : '#7a6a50');
    if (s[0] !== 'tent' && has) { var n = String(s[1]); drawText(g, n, x + sw - 2 - textW(n), sy + sw - 9, BROWN); }
    hitRect(x, sy, sw, sw, (function (k) { return function () { pressed.__slot = k; }; })(i + 1));
  });

  if (ui.prompt && G.state === 'play') {
    var p = 'E  ' + ui.prompt.label, pw = textW(p) + 12, ppx = Math.round((VW - pw) / 2), ppy = sy - 16;
    darkBox(g, ppx, ppy, pw, 12, 0.75);
    drawText(g, 'E', ppx + 6, ppy + 3, '#e8c060');
    drawText(g, ui.prompt.label, ppx + 6 + textW('E  '), ppy + 3, CREAM);
    hitRect(ppx, ppy, pw, 12, function () { pressed.__a = true; });
  }

  var ty = 56;
  ui.toasts.forEach(function (t) {
    var tw = textW(t.msg) + 12, tx = Math.round((VW - tw) / 2);
    g.globalAlpha = clamp(t.t / 0.5, 0, 1);
    darkBox(g, tx, ty, tw, 13, 0.8);
    drawText(g, t.msg, tx + 6, ty + 3, CREAM);
    g.globalAlpha = 1;
    ty += 15;
  });
}

// arrow at the screen edge while the snail is off screen
function drawSnailPointer(g) {
  if (snail.state === 'orbit' || snail.state === 'stopped') return;
  var sx = snail.x - cam.x, sy = snail.y - cam.y;
  if (sx > -4 && sx < VW + 4 && sy > -4 && sy < VH + 4) return;
  var cx = VW / 2, cy = VH / 2, dx = sx - cx, dy = sy - cy;
  var k = Math.min((VW / 2 - 14) / Math.abs(dx || 0.001), (VH / 2 - 14) / Math.abs(dy || 0.001));
  var ax = Math.round(cx + dx * k), ay = Math.round(cy + dy * k);
  darkBox(g, ax - 11, ay - 7, 22, 14, 0.7);
  g.drawImage(SPR.snailIcon, ax - 4, ay - 3);
  var ang = Math.atan2(dy, dx), tipx = Math.round(ax + Math.cos(ang) * 13), tipy = Math.round(ay + Math.sin(ang) * 10);
  px(g, tipx - 1, tipy - 1, 3, 3, snailMeters() < 40 ? DANGER : '#e8c060');
}

function drawDanger(g) {
  if (snail.state !== 'chase') return;
  var d = snailDistTiles();
  if (d > 6) return;
  var a = (1 - d / 6) * (0.35 + 0.25 * Math.sin(performance.now() / 150));
  g.fillStyle = 'rgba(160,30,20,' + a.toFixed(3) + ')';
  g.fillRect(0, 0, VW, 6); g.fillRect(0, VH - 6, VW, 6); g.fillRect(0, 0, 6, VH); g.fillRect(VW - 6, 0, 6, VH);
}
