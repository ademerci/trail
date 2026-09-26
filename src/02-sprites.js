// ================= sprites =================
var BODY_FRONT = [
  '...HHHHHH...',
  '..HHHHHHHH..',
  '..HHHHHHHH..',
  '..HkkkkkkH..',
  '..kkekkekk..',
  '..kkkkkkkk..',
  '...kkkkkk...',
  '..tttttttt..',
  '.ttTttttTtt.',
  '.kkTttttTkk.',
  '.kkttttttkk.',
  '...tttttt...',
  '...pppppp...'
];
var BODY_BACK = [
  '...HHHHHH...',
  '..HHHHHHHH..',
  '..HHHHHHHH..',
  '..HHHHHHHH..',
  '..HHHHHHHH..',
  '..kHHHHHHk..',
  '...kkkkkk...',
  '..tttttttt..',
  '.ttttttTttt.',
  '.kkttttTtkk.',
  '.kkttttttkk.',
  '...tttttt...',
  '...pppppp...'
];
var BODY_SIDE = [
  '...HHHHHH...',
  '..HHHHHHHH..',
  '..HHHHHHHH..',
  '..HHHkkkkk..',
  '..HHkkkekk..',
  '..HHkkkkkk..',
  '...kkkkkk...',
  '...tttttt...',
  '..ttTttttt..',
  '..ttTtttkk..',
  '..tttttt....',
  '...tttttt...',
  '...pppppp...'
];
var LEGS = {
  front: [['...pp..pp...', '...pp..pp...', '...ss..ss...'],
          ['...pp..pp...', '...ss..pp...', '.......ss...'],
          ['...pp..pp...', '...pp..ss...', '...ss.......']],
  side:  [['...pppppp...', '...pp..pp...', '...ss..ss...'],
          ['..pp....pp..', '..pp....pp..', '.ss......ss.'],
          ['....pppp....', '....pppp....', '....ssss....']]
};

// hair styles change the head rows of all three views
function styled(rows, style, view) {
  rows = rows.slice();
  function set(r, s) { rows[r] = s; }
  if (style === 'long' && view !== 'back') {
    set(3, view === 'side' ? '..HHHkkkkk..' : '.HHkkkkkkHH.');
    set(4, view === 'side' ? '.HHHkkkekk..' : '.HkkekkekkH.');
    set(5, view === 'side' ? '.HHHkkkkkk..' : '.HkkkkkkkkH.');
    set(6, view === 'side' ? '.HH.kkkkk...' : '.H.kkkkkk.H.');
  }
  if (style === 'long' && view === 'back') {
    set(5, '..HHHHHHHH..'); set(6, '..HHHHHHHH..');
  }
  if (style === 'bald') {
    set(0, '............'); set(1, '...kkkkkk...'); set(2, '..kkkkkkkk..');
    if (view === 'front') set(3, '..kkkkkkkk..');
    if (view === 'back') { set(3, '..kkkkkkkk..'); set(4, '..kkkkkkkk..'); set(5, '..kkkkkkkk..'); }
    if (view === 'side') { set(3, '..kkkkkkkk..'); set(4, '..kkkkkekk..'); set(5, '..kkkkkkkk..'); }
  }
  if (style === 'beard' && view !== 'back') {
    set(5, view === 'side' ? '..HHkkBBBB..' : '..kBBBBBBk..');
    set(6, view === 'side' ? '...kBBBBB...' : '...BBBBBB...');
  }
  if (style === 'hat') {
    set(0, '...XXXXXX...'); set(1, '...XXXXXX...'); set(2, '.XXXXXXXXXX.');
    if (view === 'front') set(3, '..kkkkkkkk..');
  }
  return rows;
}

function buildCharacter(pal, style, kid) {
  var p = Object.assign({ e: '#222222', s: '#2a2422', B: pal.H, X: '#1d1b22' }, pal);
  var out = {};
  ['front', 'back', 'side'].forEach(function (view) {
    var base = view === 'front' ? BODY_FRONT : view === 'back' ? BODY_BACK : BODY_SIDE;
    var head = styled(base, style, view);
    var legs = LEGS[view === 'side' ? 'side' : 'front'];
    out[view] = legs.map(function (l) {
      var rows = head.concat(l);
      if (kid) rows = rows.filter(function (r, i) { return i !== 2 && i !== 11 && i !== 13; });
      return spriteFromRows(rows, p);
    });
  });
  out.sideL = out.side.map(flipX);
  out.h = kid ? 13 : 16;
  return out;
}

// 16x16 portraits for the dialogue box
function buildPortrait(pal, style) {
  var rows = [
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '..HHHHHHHHHHHH..',
    '..HHkkkkkkkkHH..',
    '..HkkkkkkkkkkH..',
    '..kkkeekkeekkk..',
    '..kkkeekkeekkk..',
    '..kkkkkkkkkkkk..',
    '...kkkkkkkkkk...',
    '...kkkkwwkkkk...',
    '...kkkkkkkkkk...',
    '....kkrrrrkk....',
    '....kkkkkkkk....',
    '.....tttttt.....',
    '....tttttttt....',
    '...tttttttttt...'
  ];
  if (style === 'long') for (var i = 3; i <= 12; i++) rows[i] = '.H' + rows[i].slice(2, 14) + 'H.';
  if (style === 'bald') {
    rows[0] = '................'; rows[1] = '.....kkkkkk.....'; rows[2] = '...kkkkkkkkkk...';
    rows[3] = '..kkkkkkkkkkkk..'; rows[4] = '..kkkkkkkkkkkk..';
  }
  if (style === 'beard') {
    rows[9] = '...kBBBwwBBBk...'; rows[10] = '...BBBBBBBBBB...'; rows[11] = '....BBrrrrBB....'; rows[12] = '.....BBBBBB.....';
  }
  if (style === 'hat') {
    rows[0] = '....XXXXXXXX....'; rows[1] = '....XXXXXXXX....'; rows[2] = '.XXXXXXXXXXXXXX.';
    rows[3] = '..kkkkkkkkkkkk..'; rows[5] = '..kkkXXkkXXkkk..'; rows[6] = '..kkkkkkkkkkkk..';
  }
  var p = Object.assign({ e: '#222222', w: '#d9a98a', r: '#b86a5a', B: pal.H, X: '#1d1b22' }, pal);
  return spriteFromRows(rows, p);
}

var SPR = {};
SPR.player = buildCharacter({ H: '#6b3f20', k: '#f1c9a5', t: '#3a72c4', T: '#2c5799', p: '#2f2f4f' }, 'short');
SPR.playerPortrait = buildPortrait({ H: '#6b3f20', k: '#f1c9a5', t: '#3a72c4' }, 'short');

var SNAIL_ROWS = [
  '...sssss......',
  '..sSSSSSs.....',
  '.sSShhhSSs.e.e',
  '.sShssshSs.b.b',
  '.sShsSshSs.b.b',
  '.sShsssShs.b.b',
  '.sSShhhSSsbbbb',
  '..sSSSSSsbbbbb',
  '...bbbbbbbbbb.',
  '....dddddddd..'
];
var SNAIL_PAL = { s: '#d9853b', S: '#8a4b1f', h: '#f2b46b', b: '#b9d86c', d: '#7fa03f', e: '#222222' };
SPR.snailR = spriteFromRows(SNAIL_ROWS, SNAIL_PAL);
SPR.snailR2 = spriteFromRows(SNAIL_ROWS.map(function (r, i) { return i >= 8 ? '.' + r.slice(0, r.length - 1) : r; }), SNAIL_PAL);
SPR.snailL = flipX(SPR.snailR);
SPR.snailL2 = flipX(SPR.snailR2);
SPR.snailIcon = spriteFromRows(['..ssss...', '.sSSSSs..', '.sShhSs.e', '.sSSSSs.b', '..bbbbbbb', '...ddddd.'], SNAIL_PAL);

// items: world pickups and hotbar icons share these
SPR.item = {
  mushroom: spriteFromRows(['..rrrr..', '.rwrrwr.', 'rrrrrrrr', '.rrwrrr.', '...ss...', '...ss...', '..ssss..'], { r: '#c8483c', w: '#ffffff', s: '#efe4c8' }),
  berry: spriteFromRows(['...gg...', '..g..g..', '.pp..pp.', 'pPpp.pPp', '.pp.pp..', '...pPpp.', '....pp..'], { g: '#3f7a32', p: '#7b3fb0', P: '#b58ae0' }),
  shell: spriteFromRows(['...pp...', '..pPPp..', '.pPpPPp.', 'pPpPpPPp', 'pppppppp', '.p.p.p..'], { p: '#f0a8a0', P: '#fce0d8' }),
  sand: spriteFromRows(['....yy......', '..yyYyyy....', '.yyyyyYyyy..', 'yyYyyyyyyyyy'], { y: '#d8c080', Y: '#f2e2b0' }),
  scrap: spriteFromRows(['.mm.....', 'mMmm.m..', '.mmMmmm.', '..mmMmm.', '.m.mmm..', '....m...'], { m: '#7a7f8a', M: '#b8bec8' }),
  crystal: spriteFromRows(['...c....', '..cCc.c.', '..cCccC.', '.cCccCc.', '.cccCcc.', '..cccc..'], { c: '#4fc3d8', C: '#c8f4ff' }),
  ice: spriteFromRows(['.iiiiii.', 'iIIiiiIi', 'iIiiiiii', 'iiiiIiii', 'iiiiiiIi', '.iiiiii.'], { i: '#9ad6f2', I: '#e8faff' }),
  fish: spriteFromRows(['........', '.ffff..f', 'fFffffff', 'fefffff.', '.ffff..f'], { f: '#6a8fb0', F: '#a8c8e0', e: '#222222' }),
  ball: spriteFromRows(['.rrr.', 'rwwrr', 'rrrrr', 'rrwrr', '.rrr.'], { r: '#e04040', w: '#ffffff' }),
  salt: spriteFromRows(['..bbbb..', '.bwwwwb.', '.bwwwwb.', 'bwwSwwwb', 'bwwwwwwb', 'bwwwwwwb', '.bbbbbb.'], { b: '#8a7a60', w: '#f4f0e8', S: '#c8c0b0' }),
  jar: spriteFromRows(['..cccc..', '..kkkk..', '.g....g.', 'g.wg...g', 'g.w....g', 'g......g', '.gggggg.'], { c: '#9c6d43', k: '#7d5533', g: '#a8d8e8', w: '#ffffff' }),
  bread: spriteFromRows(['..bbbb..', '.bBBBBb.', 'bBbBBbBb', 'bbbbbbbb', '.bbbbbb.'], { b: '#b8783a', B: '#e0a860' }),
  tent: spriteFromRows(['....o....', '...oOo...', '..oOOOo..', '.oOOdOOo.', 'oOOOdOOOo', 'ooooooooo'], { o: '#4f7a3a', O: '#6f9a4a', d: '#2a3a20' })
};
