// ================= loop: camera, rendering, screens, boot =================
var cam = { x: 0, y: 0 };
var nightCanvas = makeCanvas(VW, VH);
var bottomInset = 0;
var heartT = 0, titleSel = 0, titleDiff = 1;

function updateCamera() {
  cam.x = clamp(Math.round(player.x - VW / 2), 0, MAP_W * TILE - VW);
  cam.y = clamp(Math.round(player.y - 8 - VH / 2), 0, MAP_H * TILE - VH);
  if (shake > 0) {
    cam.x += Math.round((hash2(Math.floor(performance.now() / 16), 1, 3) - 0.5) * 6 * Math.min(1, shake));
    cam.y += Math.round((hash2(Math.floor(performance.now() / 16), 2, 3) - 0.5) * 6 * Math.min(1, shake));
  }
}

function drawChar(g, spr, x, y, dir, moving, anim) {
  var img = charFrame(spr, dir, moving, anim);
  px(g, Math.round(x - cam.x) - 4, Math.round(y - cam.y) - 1, 8, 2, 'rgba(0,0,0,0.25)');
  g.drawImage(img, Math.round(x - cam.x) - 6, Math.round(y - cam.y) - img.height);
}
function drawSnail(g) {
  var sx = Math.round(snail.x - cam.x), sy = Math.round(snail.y - cam.y);
  var moving = snail.state === 'chase';
  var alt = moving && Math.floor(snail.anim * 2.5) % 2 === 1;
  var img = snail.facing < 0 ? (alt ? SPR.snailL2 : SPR.snailL) : (alt ? SPR.snailR2 : SPR.snailR);
  var deep = snailInDeep();
  if (deep) g.globalAlpha = 0.28;
  px(g, sx - 6, sy, 12, 2, 'rgba(0,0,0,0.22)');
  g.drawImage(img, sx - 7, sy - 9);
  g.globalAlpha = 1;
  var tnow = performance.now() / 1000;
  if (deep) for (var b = 0; b < 3; b++) { var ph = (tnow * 1.3 + b * 0.33) % 1; px(g, sx - 3 + b * 3, sy - 6 - Math.round(ph * 10), 2, 2, 'rgba(230,245,255,' + (1 - ph).toFixed(2) + ')'); }
  if (snail.state === 'salted') for (var s = 0; s < 6; s++) px(g, sx - 6 + Math.floor(hash2(s, Math.floor(tnow * 8), 1) * 13), sy - 10 + Math.floor(hash2(s, Math.floor(tnow * 8), 2) * 10), 1, 1, '#ffffff');
  if (snail.state === 'frozen') { g.globalAlpha = 0.75; g.drawImage(ART.ice, sx - 8, sy - 13); g.globalAlpha = 1; }
  if (snail.state === 'jarred') {
    px(g, sx - 10, sy - 16, 20, 1, '#9c6d43'); px(g, sx - 10, sy - 15, 20, 2, '#7d5533');
    px(g, sx - 10, sy - 13, 1, 14, 'rgba(200,236,248,0.9)'); px(g, sx + 9, sy - 13, 1, 14, 'rgba(200,236,248,0.9)');
    px(g, sx - 9, sy, 18, 1, 'rgba(200,236,248,0.9)'); px(g, sx - 9, sy - 13, 18, 13, 'rgba(200,236,248,0.18)'); px(g, sx - 7, sy - 11, 1, 6, '#ffffff');
  }
  if (snail.state === 'stopped' && Math.floor(tnow) % 2) drawText(g, 'z', sx + 6, sy - 18, CREAM);
}

function renderWorld(g, withActors) {
  g.drawImage(groundCanvas, cam.x, cam.y, VW, VH, 0, 0, VW, VH);
  var tnow = performance.now() / 1000, x0 = Math.floor(cam.x / TILE), y0 = Math.floor(cam.y / TILE);
  var tick = Math.floor(tnow * 1.5);
  for (var y = y0; y <= y0 + Math.ceil(VH / TILE); y++) for (var x = x0; x <= x0 + Math.ceil(VW / TILE); x++) {
    var t = getT(x, y);
    if ((t === T.WATER || t === T.DEEP) && hash2(x, y, tick) < 0.07) px(g, x * TILE - cam.x + 2 + Math.floor(hash2(x, y, tick + 1) * 9), y * TILE - cam.y + 5 + Math.floor(hash2(x, y, tick + 2) * 8), 4, 1, 'rgba(255,255,255,0.55)');
  }
  g.drawImage(trailCanvas, cam.x, cam.y, VW, VH, 0, 0, VW, VH);
  pickups.forEach(function (p) {
    if (!p.alive) return;
    var img = SPR.item[p.type], sx = Math.round(p.x - cam.x), sy = Math.round(p.y - cam.y);
    if (sx < -10 || sy < -10 || sx > VW + 10 || sy > VH + 10) return;
    g.drawImage(img, sx - Math.floor(img.width / 2), sy - img.height + Math.round(Math.sin(tnow * 3 + p.x) * 0.6));
  });
  var list = [];
  objects.forEach(function (o) {
    if (!o.alive) return;
    var ox = o.tx * TILE + o.ox, oy = o.ty * TILE + o.oy;
    if (ox > cam.x + VW || oy > cam.y + VH || ox + o.img.width < cam.x || oy + o.img.height < cam.y) return;
    list.push({ y: o.sortY, d: function () {
      g.drawImage(o.img, ox - cam.x, oy - cam.y);
      if (o.hp && o.maxHp && o.hp < o.maxHp) px(g, ox - cam.x + 2, oy - cam.y - 3, Math.round(12 * o.hp / o.maxHp), 2, '#e8c060');
    } });
  });
  if (G && (G.rocket || rocketFx > 0)) {
    var lift = rocketFx > 0 ? Math.pow(2.5 - rocketFx, 2) * 70 : 0;
    list.push({ y: PAD.cy + 8, d: function () {
      var rx = Math.round(PAD.cx - cam.x - 7), ry = Math.round(PAD.cy - cam.y - 34 - lift);
      g.drawImage(ART.rocket, rx, ry);
      if (rocketFx > 0) { px(g, rx + 4, ry + 38, 6, 6 + Math.floor(tnow * 20) % 4, '#ffb640'); px(g, rx + 5, ry + 38, 4, 3, '#fff0a0'); }
    } });
  }
  if (withActors) {
    Object.keys(NPCS).forEach(function (id) {
      var n = NPCS[id];
      if (!n.visible()) return;
      list.push({ y: n.y, d: function () { drawChar(g, n.spr, n.x, n.y, n.dir, n.moving, n.anim); } });
    });
    list.push({ y: player.y, d: function () { drawChar(g, SPR.player, player.x, player.y, player.dir, player.moving, player.anim); } });
  }
  if (snail.state !== 'orbit') list.push({ y: snail.y, d: function () { drawSnail(g); } });
  list.sort(function (a, b) { return a.y - b.y; });
  list.forEach(function (it) { it.d(); });
  if (fishing) {
    var bx = fishing.tx * TILE + 8 - cam.x, by = fishing.ty * TILE + 8 - cam.y + (fishing.bite > 0 ? 2 : Math.round(Math.sin(tnow * 3)));
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(player.x - cam.x + 0.5, player.y - cam.y - 12.5); g.lineTo(bx + 0.5, by + 0.5); g.stroke();
    px(g, bx - 1, by - 1, 3, 3, '#e04040'); px(g, bx - 1, by - 1, 3, 1, '#ffffff');
    if (fishing.bite > 0) drawText(g, '!', Math.round(player.x - cam.x) - 1, Math.round(player.y - cam.y) - 26, '#ffd23f', 1, INK);
  }
}

function renderNight(g, a) {
  if (a <= 0.01) return;
  var n = nightCanvas.getContext('2d');
  n.globalCompositeOperation = 'source-over';
  n.clearRect(0, 0, VW, VH);
  n.fillStyle = 'rgba(8,12,34,' + a.toFixed(3) + ')';
  n.fillRect(0, 0, VW, VH);
  n.globalCompositeOperation = 'destination-out';
  function light(x, y, r) {
    [[r, 0.18], [r * 0.84, 0.32], [r * 0.68, 0.5], [r * 0.52, 0.75], [r * 0.36, 1]].forEach(function (s) {
      n.fillStyle = 'rgba(0,0,0,' + s[1] + ')'; n.beginPath(); n.arc(Math.round(x), Math.round(y), s[0], 0, Math.PI * 2); n.fill();
    });
  }
  light(player.x - cam.x, player.y - cam.y - 8, 30);
  objects.forEach(function (o) { if (o.light) light(o.tx * TILE + 8 - cam.x, o.ty * TILE - 6 - cam.y, 38); });
  if (rocketFx > 0) light(PAD.cx - cam.x, PAD.cy - cam.y, 60);
  n.globalCompositeOperation = 'source-over';
  g.drawImage(nightCanvas, 0, 0);
  g.globalAlpha = Math.min(1, a * 0.9);
  g.drawImage(trailCanvas, cam.x, cam.y, VW, VH, 0, 0, VW, VH);
  g.globalAlpha = 1;
  if (snail.state === 'chase' && !snailInDeep()) {
    var ex = Math.round(snail.x - cam.x) + (snail.facing < 0 ? -7 : 5), ey = Math.round(snail.y - cam.y) - 7;
    px(g, ex, ey, 1, 1, '#fff6b0'); px(g, ex + 2, ey, 1, 1, '#fff6b0');
  }
}

// ---------- screens ----------
function menuRows(g, rows, sel, y, onPick) {
  rows.forEach(function (r, i) {
    var w = textW(r) + 20, x = Math.round((VW - w) / 2), ry = y + i * 14;
    if (i === sel) { darkBox(g, x, ry - 3, w, 13, 0.85); drawText(g, '>', x + 4, ry, '#e8c060'); }
    drawText(g, r, x + 12, ry, i === sel ? '#ffeec4' : '#c8b890');
    hitRect(x, ry - 3, w, 13, function () { onPick(i); });
  });
}
function titleRows() {
  var rows = ['New game', 'Snail speed: ' + DIFFS[titleDiff].name];
  var sc = saveSummary();
  if (sc.has) rows.push('Continue (day ' + sc.day + ')');
  rows.push(Snd.isMuted() ? 'Sound: off' : 'Sound: on');
  return rows;
}
var saveCache = { t: -1e9, has: false, day: '?' };
function saveSummary() {
  var now = performance.now();
  if (now - saveCache.t < 1500) return saveCache;
  saveCache.t = now; saveCache.has = hasSave(); saveCache.day = '?';
  if (saveCache.has) { try { saveCache.day = JSON.parse(localStorage.getItem(SAVE_KEY)).G.day; } catch (e) {} }
  return saveCache;
}
function titleAction(i) {
  var rows = titleRows(), r = rows[i];
  Snd.play('select');
  if (r === 'New game') newGame(titleDiff);
  else if (r.indexOf('Snail speed') === 0) titleDiff = (titleDiff + 1) % 3;
  else if (r.indexOf('Continue') === 0) { if (!loadSave()) toast('Could not load the save.'); }
  else Snd.toggleMute();
}
function updateTitle() {
  var n = titleRows().length;
  if (Input.hit('up')) { titleSel = (titleSel + n - 1) % n; Snd.play('blip'); }
  if (Input.hit('down')) { titleSel = (titleSel + 1) % n; Snd.play('blip'); }
  if ((Input.hit('left') || Input.hit('right')) && titleSel === 1) { titleDiff = (titleDiff + (Input.hit('left') ? 2 : 1)) % 3; Snd.play('blip'); }
  if (Input.hit('ok')) titleAction(titleSel);
}
function drawTitle(g) {
  var t = performance.now() / 1000;
  cam.x = Math.round(560 + Math.sin(t * 0.05) * 120); cam.y = Math.round(470 + Math.cos(t * 0.04) * 60);
  renderWorld(g, true);
  darkBox(g, 0, 0, VW, VH, 0.5);
  var s = VW < 300 ? 5 : 7, tw = textW('TRAIL', s), ty = Math.round(VH * 0.14);
  drawText(g, 'TRAIL', Math.round((VW - tw) / 2), ty, CREAM, s, '#2a2118');
  var sub = "Salt won't help.";
  drawText(g, sub, Math.round((VW - textW(sub)) / 2), ty + 7 * s + 8, '#d8ccae');
  var blurb = wrapText('An immortal snail follows you. It is slow. It never stops. If it touches you, you die.', Math.min(300, VW - 30), 1);
  blurb.forEach(function (l, i) { drawText(g, l, Math.round((VW - textW(l)) / 2), ty + 7 * s + 24 + i * 10, '#b8ac90'); });
  menuRows(g, titleRows(), titleSel, ty + 7 * s + 32 + blurb.length * 10, function (i) { titleSel = i; titleAction(i); });
  var help = 'WASD move   Shift run   E act   1-5 items   Q journal';
  if (VW >= 300) drawText(g, help, Math.round((VW - textW(help)) / 2), VH - 12, '#8a7e66');
}
function endRows() { return G.state === 'won' ? ['Keep walking', 'New game'] : (hasSave() ? ['Wake up again (last night)', 'New game'] : ['New game']); }
function endAction(i) {
  var r = endRows()[i];
  Snd.play('select');
  if (r === 'Keep walking') { G.state = 'play'; toast('The snail stays where it is. You are free. And broke.'); }
  else if (r === 'New game') { G.state = 'title'; titleSel = 0; }
  else if (!loadSave()) toast('Could not load the save.');
}
function updateEnd() {
  var n = endRows().length;
  if (Input.hit('up')) endInfo.sel = (endInfo.sel + n - 1) % n;
  if (Input.hit('down')) endInfo.sel = (endInfo.sel + 1) % n;
  if (Input.hit('ok')) endAction(endInfo.sel);
}
function drawEnd(g) {
  darkBox(g, 0, 0, VW, VH, G.state === 'won' ? 0.7 : 0.82);
  var y = Math.round(VH * 0.18);
  var lines = G.state === 'won'
    ? ['The snail stopped.', 'It looked at you for a long time. Then it went to sleep.', 'You are broke. You are free.']
    : [endInfo.msg, 'Day ' + G.day + '. The snail was always going to get there.'];
  var big = G.state === 'won' ? 'THE END' : 'GAME OVER';
  drawText(g, big, Math.round((VW - textW(big, 3)) / 2), y, G.state === 'won' ? '#e8c060' : DANGER, 3, INK);
  y += 32;
  lines.forEach(function (l) { wrapText(l, VW - 40, 1).forEach(function (w) { drawText(g, w, Math.round((VW - textW(w)) / 2), y, CREAM); y += 11; }); });
  y += 6;
  var st = 'Days ' + G.day + '   Quests ' + G.stats.quests + '   Walked ' + fmt(G.stats.walked * METERS_PER_TILE) + ' m   Spent ' + fmt(G.stats.spent) + ' g';
  wrapText(st, VW - 40, 1).forEach(function (w) { drawText(g, w, Math.round((VW - textW(w)) / 2), y, '#b8ac90'); y += 11; });
  menuRows(g, endRows(), endInfo.sel, y + 12, function (i) { endInfo.sel = i; endAction(i); });
}
function drawTransition(g) {
  var tr = transition, t = tr.t;
  var a = t < 0.6 ? t / 0.6 : t > 2.4 ? (3 - t) / 0.6 : 1;
  px(g, 0, 0, VW, VH, 'rgba(5,7,15,' + clamp(a, 0, 1).toFixed(3) + ')');
  if (t < 0.5 || t > 2.5) return;
  var dtext = 'DAY ' + tr.day;
  drawText(g, dtext, Math.round((VW - textW(dtext, 3)) / 2), Math.round(VH / 2) - 30, CREAM, 3);
  if (tr.passedOut) { var po = 'You passed out.'; drawText(g, po, Math.round((VW - textW(po)) / 2), Math.round(VH / 2) - 44, '#b8ac90'); }
  if (tr.from !== null) {
    var shown = tr.to === null ? tr.from : Math.round(lerp(tr.from, tr.to, clamp((t - 0.9) / 1.1, 0, 1)));
    var mtxt = fmt(shown) + ' m';
    g.drawImage(SPR.snailIcon, Math.round(VW / 2 - textW(mtxt) / 2) - 13, Math.round(VH / 2) + 3);
    drawText(g, mtxt, Math.round((VW - textW(mtxt)) / 2), Math.round(VH / 2) + 2, tr.dead ? DANGER : '#e8c060');
  }
}

// ---------- update ----------
function updatePlay(dt) {
  G.time += dt * MIN_PER_SEC;
  updatePlayer(dt);
  updateSnail(dt);
  if (G.state !== 'play' && G.state !== 'fishing') return;
  updateNpcs(dt);
  updatePickups();
  if (G.main === 15 && snail.deepT > 5) { toast('Bubbles. Then the bubbles come closer.'); advance(16); }
  checkQuestProgress();
  if (G.time >= DAY_LEN) { toast('You passed out.'); doSleep(6, true); return; }
}
function update(dt) {
  if (Input.hit('mute') && G) { toast(Snd.toggleMute() ? 'Sound off' : 'Sound on'); }
  if (shake > 0) shake -= dt;
  if (rocketFx > 0) rocketFx -= dt;
  ui.toasts.forEach(function (t) { t.t -= dt; });
  ui.toasts = ui.toasts.filter(function (t) { return t.t > 0; });
  var st = G ? G.state : 'title';
  if (st === 'title') { updateTitle(); return; }
  if (st === 'play') {
    updatePlay(dt);
    if (G.state !== 'play') return;
    ui.prompt = findInteraction();
    if (Input.hit('ok') && ui.prompt) { ui.prompt.fn(); return; }
    var slot = Input.num();
    if (slot) useSlot(slot);
    if (Input.hit('journal')) { G.state = 'journal'; Snd.play('select'); }
    else if (Input.hit('back')) { G.state = 'journal'; }
  } else if (st === 'fishing') { updatePlay(dt); if (G.state === 'fishing') updateFishing(dt); }
  else if (st === 'dialog') updateDialog(dt);
  else if (st === 'choice') updateChoice();
  else if (st === 'shop') updateShop();
  else if (st === 'journal') { if (Input.hit('journal') || Input.hit('back') || Input.hit('ok')) G.state = 'play'; }
  else if (st === 'sleeping') updateTransition(dt);
  else if (st === 'dead' || st === 'won') updateEnd();

  var live = G.state === 'play' || G.state === 'fishing';
  var d = snailDistTiles();
  Snd.tense(live && snail.state === 'chase' && d < 12);
  Snd.mode(nightAlpha(G.time) > 0.3 ? 'night' : 'day');
  if (live && snail.state === 'chase' && d < 12) {
    heartT -= dt;
    if (heartT <= 0) { Snd.play('heart'); heartT = 0.45 + d / 12 * 0.9; }
  }
}

// ---------- render ----------
function render() {
  uiHits = [];
  ctx.imageSmoothingEnabled = false;
  if (!G || G.state === 'title') {
    if (!G) G = freshState(1), G.state = 'title';
    drawTitle(ctx);
    drawToastsOnly();
    return;
  }
  updateCamera();
  renderWorld(ctx, true);
  renderNight(ctx, nightAlpha(G.time));
  drawDanger(ctx);
  drawSnailPointer(ctx);
  drawHud(ctx);
  if (G.state === 'dialog' && ui.dialog) { var d = ui.dialog; drawDialogBox(ctx, d.npc, d.pages, d.page, d.chars); }
  if (G.state === 'choice' && ui.choice) drawChoice(ctx);
  if (G.state === 'shop' && ui.shop) drawShop(ctx);
  if (G.state === 'journal') drawJournal(ctx);
  if (G.state === 'sleeping' && transition) drawTransition(ctx);
  if (G.state === 'dead' || G.state === 'won') drawEnd(ctx);
}
function drawToastsOnly() {
  var ty = VH - 20;
  ui.toasts.forEach(function (t) { var tw = textW(t.msg) + 12; darkBox(ctx, Math.round((VW - tw) / 2), ty, tw, 13, 0.8); drawText(ctx, t.msg, Math.round((VW - tw) / 2) + 6, ty + 3, CREAM); ty -= 15; });
}

// ---------- boot ----------
function resize() {
  var w = window.innerWidth || 0, h = window.innerHeight || 0;
  if (w < 50 || h < 50) { w = 1280; h = 720; }
  if (h > w * 1.15) { VW = 240; VH = clamp(Math.round(240 * h / w), 240, 420); }
  else { VH = 216; VW = clamp(Math.round(216 * w / h), 300, 420); }
  cvs.width = VW; cvs.height = VH;
  nightCanvas.width = VW; nightCanvas.height = VH;
  var scale = Math.min(w / VW, h / VH);
  if (scale >= 2) scale = Math.floor(scale);
  cvs.style.width = Math.round(VW * scale) + 'px';
  cvs.style.height = Math.round(VH * scale) + 'px';
  bottomInset = document.getElementById('touch').hidden ? 0 : Math.ceil(150 / scale);
}
window.addEventListener('resize', resize);

var last = 0;
function frame(now) {
  var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
  last = now;
  try { update(dt); render(); } catch (e) { console.error(e); }
  Input.endFrame();
  requestAnimationFrame(frame);
}

generateWorld();
indexObjects();
setupNpcs();
G = freshState(1); G.state = 'title';
resetActors();
spawnPickups();
resize();
cvs.focus();
try {
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
    window.claude.hot.snapshot(function () { return G && G.state !== 'title' ? { save: serialize() } : {}; });
  }
  var boot = function (data) { if (data && data.save) { try { applySave(data.save); } catch (e) {} } requestAnimationFrame(frame); };
  if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
  else boot(window.claude && window.claude.hot ? window.claude.hot.data : null);
} catch (e) { requestAnimationFrame(frame); }

// debug handle for testing from the console
window.__trail = {
  get G() { return G; }, player: player, snail: snail, NPCS: NPCS, objects: objects,
  talk: talk, useSlot: useSlot, doSleep: doSleep, advance: advance, newGame: newGame, launchRocket: launchRocket,
  findInteraction: findInteraction, pickups: function () { return pickups; },
  press: function (k) { pressed[k] = true; }, hold: function (k, v) { keys[k] = v; },
  step: function (n, dt) { for (var i = 0; i < (n || 1); i++) { update(dt || 1 / 60); render(); Input.endFrame(); } return G.state; }
};
