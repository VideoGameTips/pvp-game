#!/usr/bin/env node
// Headless checks over every weapon in public/game.js.
//
// This lived in a temp directory for three rounds of work and was wiped by a
// disk cleanup, taking with it the only thing that had caught a magazine
// hanging off the bottom of the screen, a stock mounted half its own width to
// the left, and 866 reload keyframes pushing guns out of frame. It belongs in
// the repository.
//
//   node tools/verify-weapons.js            all checks, non-zero exit on failure
//   node tools/verify-weapons.js --verbose   per-weapon numbers, not just faults
//
// Nothing here needs a browser: the builders are plain geometry, so they are
// lifted out of game.js and run against the same three.min.js the page uses.

const THREE = require('../public/three.min.js');
const fs = require('fs');
const path = require('path');

const GAME = path.join(__dirname, '..', 'public', 'game.js');
const src = fs.readFileSync(GAME, 'utf8');
const VERBOSE = process.argv.includes('--verbose');

// ── Lifting code out of game.js ────────────────────────────────────────────
// game.js is one big script meant for a <script> tag, so there is nothing to
// require. Each helper is found by its declaration and sliced out by counting
// braces, which is enough for the flat top-level style the file is written in.
function blockAt(re) {
  const m = src.match(re);
  if (!m) return null;
  let i = m.index, depth = 0, k = src.indexOf('{', i);
  // Skip the parameter list before counting. A default argument writes its own
  // braces -- `function f(root, opts = {})` -- and starting the count there
  // matched the empty object and returned a 40-character "function".
  if (src.startsWith('function', i)) {
    let pk = src.indexOf('(', i), d = 0;
    while (pk < src.length) {
      if (src[pk] === '(') d++;
      else if (src[pk] === ')') { d--; if (!d) break; }
      pk++;
    }
    k = src.indexOf('{', pk);
  }
  while (k < src.length) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (!depth) break; }
    k++;
  }
  return src.slice(i, k + 1);
}
const fnBlock = n => blockAt(new RegExp('^function ' + n + '\\(', 'm'));
const constBlock = n => { const b = blockAt(new RegExp('^const ' + n + ' = \\{', 'm')); return b && b + ';'; };

function load() {
  let code = '';
  for (const n of ['gpBox', 'gpCyl', 'gpPlate', 'gpPart', 'makeMuzzleFlash',
                   '_throwableHolder', '_gunDetails', '_makeViewHand',
                   '_localPartBoxes', 'attachViewHands', '_reloadPose',
                   '_meleeOffset', '_collarGeometry', 'blendProudSteps',
                   '_emoStroke', '_emoMats', '_legendMats', '_legendize',
                   '_mPivot', '_eqCrystalMats',
                   // builders that take arguments are not picked up by the build*() sweep below
                   'buildPixelGunModel', '_eqSegment']) {
    const b = fnBlock(n);
    if (b) code += b + '\n';
  }
  code += src.match(/^const _COLLAR_AXES = .*$/m)[0] + '\n';
  code += src.match(/^const EMO_FACE = .*$/m)[0] + '\n';
  code += constBlock('GUN_MATS') + '\n';
  code += src.match(/^const VM_SKIN_MAT = .*$/m)[0] + '\n';
  // The shipped viewmodels are scaled as a group; measure what ships, not the
  // unscaled builder output.
  code += src.match(/^const VM_GUN_SCALE = .*$/m)[0] + '\n';
  code += src.match(/^const _VM_TAN = .*$/m)[0] + '\n';
  code += src.match(/^const VM_MIN_Z = .*$/m)[0] + '\n';
  code += src.match(/^const VM_MAX_Z = .*$/m)[0] + '\n';
  code += fnBlock('fitRestDistance') + '\n';
  // K spans more than one line, so match through its closing "}, o);".
  code += src.match(/^const K = [\s\S]*?\}, o\);/m)[0] + '\n';
  code += src.match(/^const _RELOAD_REST = .*$/m)[0] + '\n';
  code += constBlock('RELOAD_KEYS') + '\n';
  code += src.match(/^const _RELOAD_DEFAULT = [\s\S]*?\];/m)[0] + '\n';
  code += src.match(/^const INSPECT_DEFAULT = [\s\S]*?\];/m)[0] + '\n';
  code += fnBlock('inspectOpenPose') + '\nconst _inspectOpenCache = {};\n';
  code += src.match(/^const RP = .*$/m)[0] + '\n';
  code += constBlock('RELOAD_PROPS') + '\n';
  code += fnBlock('_fxS') + '\n' + fnBlock('_fxR') + '\n';
  code += constBlock('_RK') + '\n';
  code += src.match(/^const _emoReload = [\s\S]*?'ding'\);/m)[0] + '\n';
  code += constBlock('SKIN_FX') + '\n';
  code += fnBlock('assemblyBeats') + '\nconst _asmBeatCache = {};\n';
  code += fnBlock('prepViewModel') + '\n';
  // Model skins replace a weapon outright, so they must satisfy everything a
  // weapon does. The table is rewritten without its build closures, which the
  // sandbox resolves back to the real builders by name.
  const ms = src.match(/^const MODEL_SKINS = \[[\s\S]*?\n\];/m);
  if (ms) code += ms[0].replace(/build: (\w+)/g, "build: $1") + '\n';
  else code += 'const MODEL_SKINS = [];\n';
  // Melee skins replace the whole object too, and melee viewmodels are built
  // differently from guns: no scaling, no hands, just a group parked at the
  // melee rest position. They get their own table and their own comparison.
  const mms = src.match(/^const MELEE_MODEL_SKINS = \[[\s\S]*?\n\];/m);
  code += (mms ? mms[0] : "const MELEE_MODEL_SKINS = [];") + "\n";
  for (const m of src.matchAll(/^function (build\w+)\(\)/gm)) {
    const b = fnBlock(m[1]);
    if (b) code += b + '\n';
  }
  // The weapon table pairs each builder with the id the reload tables key on.
  // Each melee row becomes a thunk keyed by its MELEE_ITEMS id, so a stock
  // model that cannot be built in here (the handcrafted ones need a module we
  // do not load) is skipped rather than taking the whole run down.
  const mmBody = src.match(/const meleeModels = \[([\s\S]*?)\n\];/)[1].replace(/\/\/[^\n]*/g, "");
  const mItems = src.match(/^const MELEE_ITEMS = \[[\s\S]*?\n\];/m)[0];
  const mIds = [...mItems.matchAll(/^  \{ id: '([\w]+)'/gm)].map(m => m[1]);
  code += "const handcraftedMelee = () => { throw new Error('handcrafted'); };\n";
  code += "const _meleeThunks = [" + mmBody.replace(/(\w+)\(([^)]*)\)/g, "() => $1($2)") + "];\n";
  code += "const meleeStock = {}; " + JSON.stringify(mIds)
        + ".forEach((id, i) => { if (_meleeThunks[i]) meleeStock[id] = _meleeThunks[i]; });\n";
  const tbl = src.match(/const weaponModels = \[([\s\S]*?)\n\];/)[1];
  const rows = tbl.split('\n')
    .filter(r => r.includes('//') && r.split('//')[0].includes('('))
    .map(r => ({ id: r.split('//')[1].trim(), fn: r.split('//')[0].trim().split('(')[0] }));
  code += 'return { RELOAD_KEYS, RELOAD_PROPS, _RELOAD_DEFAULT, _reloadPose, attachViewHands,'
        + ' VM_GUN_SCALE, fitRestDistance, INSPECT_DEFAULT, inspectOpenPose, assemblyBeats,'
        + ' MODEL_SKINS, prepViewModel, MELEE_MODEL_SKINS, meleeStock, blendProudSteps, SKIN_FX,'
        + ' builders: ' + JSON.stringify(rows.map(r => r.fn)) + '.map(n => eval(n)) };';
  return { api: new Function('THREE', code)(THREE), rows };
}

const { api, rows } = load();
const problems = [];

// ── 0. The parallel arrays must line up, index for index ──────────────────
// WEAPONS[] and weaponModels[] are matched by POSITION (CLAUDE.md gotcha #2),
// and nothing in the game notices when they drift — every weapon after the
// break simply holds the wrong gun. A regex edit of mine deleted eleven weapon
// objects and this harness still reported "99/99 build", because it was
// counting model rows and never looked at the weapon table at all.
{
  const tbl = require('fs').readFileSync(GAME, 'utf8');
  const wm = tbl.match(/const WEAPONS = \[[\s\S]*?\n\];/);
  if (!wm) problems.push('WEAPONS'.padEnd(20) + 'table not found');
  else {
    const WEAPONS = new Function('return ' + wm[0].replace('const WEAPONS = ', '') + ';')();
    if (WEAPONS.length !== rows.length) {
      problems.push('PARALLEL ARRAYS'.padEnd(20) + 'WEAPONS has ' + WEAPONS.length
        + ' entries but weaponModels has ' + rows.length + ' — every weapon past the'
        + ' first gap holds the wrong model');
    }
    const n = Math.min(WEAPONS.length, rows.length);
    const drift = [];
    for (let i = 0; i < n; i++) if (WEAPONS[i].id !== rows[i].id) drift.push(i + ': ' + WEAPONS[i].id + ' vs ' + rows[i].id);
    if (drift.length) problems.push('PARALLEL ARRAYS'.padEnd(20) + drift.length
      + ' index mismatch(es), first at ' + drift[0]);
  }
}
let inspectReport = null;
let audioReport = null;
let modelSkinReport = null;
let meleeSkinReport = null;
let proudReport = null;
let collarCount = 0;
const loadsFirst = [];   // loaded before ejecting: right for some mechanisms, worth an eye
const fail = (w, msg) => problems.push(w.padEnd(20) + msg);

// ── The camera the player actually looks through ───────────────────────────
// Taken from game.js rather than assumed: a wrong frustum here would report
// clean while the gun hangs off the screen.
const FOV = Number(src.match(/new THREE\.PerspectiveCamera\((\d+)/)[1]);
const NEAR = 0.05, ASPECT = 16 / 9;
const TAN = Math.tan((FOV / 2) * Math.PI / 180);
const REST_POS = { x: 0.12, y: -0.1, z: -0.25 };
const inView = p => {
  if (-p.z <= NEAR) return false;              // behind the eye: a stock belongs there
  const hh = -p.z * TAN;
  return Math.abs(p.y) <= hh && Math.abs(p.x) <= hh * ASPECT;
};

const built = rows.map((r, i) => {
  try {
    const g = api.builders[i]();
    g.scale.setScalar(api.VM_GUN_SCALE);
    g.position.set(REST_POS.x, REST_POS.y, REST_POS.z);
    api.fitRestDistance(g);                    // the rest distance the gun actually ships at
    api.attachViewHands(g);
    return g;
  } catch (e) { fail(r.id, 'failed to build: ' + e.message); return null; }
});

// ── 1. Geometry is finite and hands are on the gun ─────────────────────────
let handed = 0;
built.forEach((g, i) => {
  if (!g) return;
  const id = rows[i].id;
  g.position.set(REST_POS.x, REST_POS.y, REST_POS.z);
  g.rotation.set(0, 0, 0);
  g.updateMatrixWorld(true);
  let hands = 0, bad = 0;
  g.traverse(o => {
    if (!o.isMesh) return;
    if (o.userData.vmHand) hands++;
    const b = new THREE.Box3().setFromObject(o);
    if (![b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite)) bad++;
  });
  if (bad) fail(id, bad + ' part(s) with non-finite geometry');
  if (hands) handed++;
});

// ── 2. How much of each weapon is inside the view ──────────────────────────
function visibility(g, pose) {
  const home = g._homePos || REST_POS;
  g.position.set(home.x + pose.px, home.y + pose.py, home.z + pose.pz);
  g.rotation.set(pose.rx, pose.ry, pose.rz);
  g.updateMatrixWorld(true);
  let tot = 0, vis = 0;
  g.traverse(o => {
    if (!o.isMesh || o.userData.vmHand) return;
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    tot++; if (inView(c)) vis++;
  });
  return tot ? (vis / tot) * 100 : 100;
}
const REST_POSE = { px:0, py:0, pz:0, rx:0, ry:0, rz:0 };
const vis = [];
built.forEach((g, i) => {
  if (!g) return;
  const id = rows[i].id;
  const track = api.RELOAD_KEYS[id] || api._RELOAD_DEFAULT;
  let worst = visibility(g, REST_POSE), at = 0;
  for (let s = 1; s <= 20; s++) {
    const t = s / 21, v = visibility(g, api._reloadPose(track, t));
    if (v < worst) { worst = v; at = t; }
  }
  vis.push({ id, rest: visibility(g, REST_POSE), worst, at });
});

// ── 3. Profile plates centred on the barrel axis ───────────────────────────
// gpPlate extrudes along x into [-width, 0] and then translates by x + width/2,
// so only x = 0 centres it. Passing -width/2 leaves the part half its own
// width off to one side, which is how the AK's stock and both handguards ended
// up mounted to the left of the barrel.
built.forEach((g, i) => {
  if (!g) return;
  g.position.set(0, 0, 0); g.updateMatrixWorld(true);
  let worst = 0;
  g.traverse(o => {
    if (!o.isMesh || o.geometry.type !== 'ExtrudeGeometry' || o.userData.vmHand) return;
    const b = new THREE.Box3().setFromObject(o);
    const cx = (b.min.x + b.max.x) / 2;
    if (Math.abs(cx) > Math.abs(worst)) worst = cx;
  });
  if (Math.abs(worst) > 0.004) fail(rows[i].id, 'profile plate off-centre by ' + worst.toFixed(4));
});

// ── 4. Reload tracks are well formed ───────────────────────────────────────
const CH = ['px','py','pz','rx','ry','rz','hx','hy','hz','hr','ax','ay','az','arx','ary','arz','av'];
Object.entries(api.RELOAD_KEYS).forEach(([id, track]) => {
  let last = -1;
  track.forEach((k, n) => {
    if (!(k.t > 0 && k.t < 1)) fail(id, 'keyframe ' + n + ' at t=' + k.t + ' is outside (0,1)');
    if (k.t <= last) fail(id, 'keyframe ' + n + ' at t=' + k.t + ' is out of order');
    last = k.t;
    CH.forEach(c => { if (!Number.isFinite(k[c])) fail(id, 'keyframe ' + n + ' channel ' + c + ' is not finite'); });
  });
  // The gun must be back where it started, or it drifts a little every reload.
  const a = api._reloadPose(track, 0), b = api._reloadPose(track, 1);
  CH.forEach(c => {
    const restVal = c === 'av' ? 1 : 0;
    if (Math.abs(a[c] - restVal) > 1e-6) fail(id, 'starts away from rest on ' + c);
    if (Math.abs(b[c] - restVal) > 1e-6) fail(id, 'ends away from rest on ' + c);
  });
});

// ── 5. Prop events sit inside the reload ──────────────────────────────────
// Only the unambiguous things fail here. I tried to also assert "the empty
// comes out before the fresh one goes in" and it does not generalise: a twin
// rifle swaps two magazines back to back, a bolt gun throws the chambered
// round clear at the END, and a Mauser stripper clip is pushed in and only
// then flicked away. Reload mechanisms genuinely differ, so the ordering is
// reported for a human to glance at rather than treated as a fault.
Object.entries(api.RELOAD_PROPS).forEach(([id, evs]) => {
  // The dispatcher fires events off a 30-bit mask, so anything past 30 is
  // silently dropped at runtime.
  if (evs.length > 30) fail(id, evs.length + ' prop events; the dispatcher only fires the first 30');
  const kinds = {};
  evs.forEach((e, n) => {
    if (!(e.t >= 0 && e.t <= 1)) fail(id, 'prop ' + n + ' at t=' + e.t + ' is outside the reload');
    if (!(e.n >= 1)) fail(id, 'prop ' + n + ' spawns ' + e.n + ' items');
    const k = kinds[e.k] || (kinds[e.k] = { eject: [], arrive: [] });
    k[e.m === 'arrive' ? 'arrive' : 'eject'].push(e.t);
  });
  Object.entries(kinds).forEach(([kind, k]) => {
    if (!k.eject.length || !k.arrive.length) return;   // only loads, or only ejects
    if (Math.min(...k.eject) > Math.min(...k.arrive))
      loadsFirst.push(id.padEnd(20) + 'fits a ' + kind + ' at t=' + Math.min(...k.arrive)
             + ', removes one at t=' + Math.min(...k.eject));
  });
});

// ── 5b. Inspect: the gun is being shown off, so it must stay in shot ──────
// It runs through the same pose machinery as a reload, so the same things can
// go wrong: drifting off rest, or swinging out of frame at the moment you are
// meant to be admiring it.
{
  const CH2 = ['px','py','pz','rx','ry','rz','hx','hy','hz','hr','ax','ay','az','arx','ary','arz','av'];
  const a0 = api._reloadPose(api.INSPECT_DEFAULT, 0), a1 = api._reloadPose(api.INSPECT_DEFAULT, 1);
  CH2.forEach(c => {
    const restVal = c === 'av' ? 1 : 0;
    if (Math.abs(a0[c] - restVal) > 1e-6) fail('INSPECT', 'starts away from rest on ' + c);
    if (Math.abs(a1[c] - restVal) > 1e-6) fail('INSPECT', 'ends away from rest on ' + c);
  });
  // The absolute figure is dominated by weapons that do not fit the view at
  // rest either, so what matters is whether the LOOK makes a gun worse than it
  // already is. A weapon that shows 65% standing still and 65% while you turn
  // it over has lost nothing to the animation.
  let opens = 0, worstLoss = 0, worstId = '', worstAbs = 101;
  built.forEach((g, i) => {
    if (!g) return;
    const id = rows[i].id;
    if (api.inspectOpenPose(id)) opens++;
    const atRest = visibility(g, REST_POSE);
    let low = 101;
    for (let sN = 0; sN <= 16; sN++) {
      const v = visibility(g, api._reloadPose(api.INSPECT_DEFAULT, sN / 16));
      if (v < low) low = v;
    }
    if (low < worstAbs) worstAbs = low;
    const loss = atRest - low;
    if (loss > worstLoss) { worstLoss = loss; worstId = id; }
  });
  inspectReport = { opens, worstLoss, worstId, worstAbs };
  if (worstLoss > 25) fail('INSPECT', 'the look costs ' + worstLoss.toFixed(0)
    + ' points of visibility on ' + worstId + ' — the gun leaves frame while you admire it');
}

// ── 5c. The reload you hear is the reload you see ─────────────────────────
// The audio is scheduled off RELOAD_PROPS and the assembly channels of
// RELOAD_KEYS, so a weapon whose reload is derived from neither falls back to a
// generic pair of clacks — which is the old problem in miniature, a sound that
// has nothing to do with what the gun is doing. Worth knowing how many.
{
  let derived = 0, generic = 0, beats = 0;
  const thin = [];
  Object.keys(api.RELOAD_KEYS).forEach(id => {
    const evs = api.RELOAD_PROPS[id] || [];
    const asm = api.assemblyBeats(id);
    const n = evs.length + (asm ? (asm.open !== null) + (asm.shut !== null) : 0);
    beats += n;
    if (n === 0) { generic++; thin.push(id); } else derived++;
  });
  audioReport = { derived, generic, beats, thin };
  if (generic > 0) fail('RELOAD AUDIO', generic + ' weapon(s) fall back to a generic sound: '
    + thin.slice(0, 6).join(', '));
}

// ── 5d. Model skins are whole weapons and must behave like one ────────────
// A skin that replaces the gun has to satisfy everything the gun did: finite
// geometry, hands that land on it, and enough of itself inside the view. It is
// not covered by the weapon table, so it is checked on its own.
{
  const out = [];
  (api.MODEL_SKINS || []).forEach(skin => {
    let g;
    try { g = api.prepViewModel(skin.build()); }
    catch (e) { fail(skin.id, 'model skin failed to build: ' + e.message); return; }
    g.updateMatrixWorld(true);
    let hands = 0, bad = 0;
    g.traverse(o => {
      if (!o.isMesh) return;
      if (o.userData.vmHand) { hands++; return; }
      const b = new THREE.Box3().setFromObject(o);
      if (![b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite)) bad++;
    });
    const base = built[rows.findIndex(r => r.id === skin.weapon)];
    const vis = visibility(g, REST_POSE);
    const baseVis = base ? visibility(base, REST_POSE) : 100;
    if (bad) fail(skin.id, bad + ' part(s) with non-finite geometry');
    if (!hands) fail(skin.id, 'no hands attached');
    if (vis < baseVis - 15) fail(skin.id, 'only ' + vis.toFixed(0)
      + '% in frame against the stock weapon\'s ' + baseVis.toFixed(0) + '%');
    // A skin that replaces a revolver has to index its cylinder the same way,
    // about its OWN axis. A dial that orbits the model origin instead of
    // spinning is the exact failure the stock check exists for.
    const cm = g._parts && g._parts.main;
    if (cm && cm._chambers) {
      const at = g.position.clone(), rot = g.rotation.clone();
      g.position.set(0, 0, 0); g.rotation.set(0, 0, 0);
      cm.rotation.set(0, 0, 0); g.updateMatrixWorld(true);
      const b4 = new THREE.Box3().setFromObject(cm).getCenter(new THREE.Vector3());
      cm.rotation.z = (Math.PI * 2) / cm._chambers; g.updateMatrixWorld(true);
      const af = new THREE.Box3().setFromObject(cm).getCenter(new THREE.Vector3());
      cm.rotation.set(0, 0, 0);
      g.position.copy(at); g.rotation.copy(rot); g.updateMatrixWorld(true);
      const drift = b4.distanceTo(af);
      if (drift > 0.004) fail(skin.id, 'cylinder orbits instead of spinning (drift '
        + drift.toFixed(4) + ')');
    }
    // A skin with its own reload has to stay on screen through it, the same as
    // a gun does. Sampled across the whole track, worst point kept.
    let reloadWorst = null;
    const fxr = api.SKIN_FX && api.SKIN_FX[skin.id] && api.SKIN_FX[skin.id].reload;
    if (fxr) {
      reloadWorst = 100;
      for (let t = 0; t <= 1.0001; t += 0.02)
        reloadWorst = Math.min(reloadWorst, visibility(g, api._reloadPose(fxr.keys, t)));
      visibility(g, REST_POSE);
      if (reloadWorst < 50) fail(skin.id, 'its reload swings it off screen: '
        + reloadWorst.toFixed(0) + '% in frame at the worst point');
    }
    out.push({ id: skin.id, weapon: skin.weapon, vis, baseVis, hands, reloadWorst });
  });
  modelSkinReport = out;
}

// ── 5e. Melee model skins ─────────────────────────────────────────────────
// A melee skin is not scaled and gets no hands, so the gun checks do not apply.
// What does apply: finite geometry, and enough of the object inside the view
// once the swing code parks it at MELEE_REST_POS.
{
  const MREST = { x: 0.10, y: -0.12, z: -0.20 };
  const meleeVis = g => {
    g.position.set(MREST.x, MREST.y, MREST.z);
    g.rotation.set(0, 0, 0);
    g.updateMatrixWorld(true);
    let tot = 0, vis = 0;
    g.traverse(o => {
      if (!o.isMesh) return;
      const b = new THREE.Box3().setFromObject(o);
      const c = [[b.min.x, b.min.y, b.min.z], [b.max.x, b.min.y, b.min.z], [b.min.x, b.max.y, b.min.z],
                 [b.max.x, b.max.y, b.min.z], [b.min.x, b.min.y, b.max.z], [b.max.x, b.min.y, b.max.z],
                 [b.min.x, b.max.y, b.max.z], [b.max.x, b.max.y, b.max.z]];
      c.forEach(([x, y, z]) => { tot++; if (inView({ x, y, z })) vis++; });
    });
    return tot ? (vis / tot) * 100 : 0;
  };
  const out = [];
  (api.MELEE_MODEL_SKINS || []).forEach(skin => {
    let g;
    try { g = skin.build(); }
    catch (e) { fail(skin.id, 'melee skin failed to build: ' + e.message); return; }
    g.updateMatrixWorld(true);
    let bad = 0, parts = 0;
    g.traverse(o => {
      if (!o.isMesh) return;
      parts++;
      const b = new THREE.Box3().setFromObject(o);
      if (![b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite)) bad++;
    });
    if (bad) fail(skin.id, bad + ' part(s) with non-finite geometry');
    if (!parts) fail(skin.id, 'melee skin builds nothing visible');
    const vis = meleeVis(g);
    let baseVis = null;
    const mk = (api.meleeStock || {})[skin.melee];
    if (mk) { try { baseVis = meleeVis(mk()); } catch (e) {} }
    // Melee viewmodels deliberately hang low — the stock knife measures 43% and
    // the stock bat 50% — so the gun table's 80% floor is meaningless here. The
    // absolute floor only catches an object that has fallen off the screen; the
    // comparison against the weapon it replaces is what actually matters.
    if (vis < 30) fail(skin.id, 'only ' + vis.toFixed(0) + '% of it is inside the view');
    if (baseVis !== null && vis < baseVis - 20) fail(skin.id, 'only ' + vis.toFixed(0)
      + '% in frame against the stock melee\'s ' + baseVis.toFixed(0) + '%');
    out.push({ id: skin.id, melee: skin.melee, vis, baseVis, parts });
  });
  meleeSkinReport = out;
}

// ── 5f. Attachments that stand proud of the part they sit on ──────────────
// The complaint that started this: a squared block poking out of the AK's
// tapered stock, read as a bulge. The shape of that defect is general — a part
// sitting mostly INSIDE a bigger part's footprint but stepping past its surface
// in one direction, with nothing blending the step. This finds them by measuring
// it rather than by eye.
function proudSteps(g, minStep = 0.012) {
  const parts = [];
  g.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(g.matrixWorld).invert();
  g.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    // Measured exactly the way the shipped blend pass measures: each part's own
    // geometry in the model's space. setFromObject would fold a part's collar
    // into the part's own box and report a different gun than the one blended.
    if (o.userData.vmHand || o.userData.blendCollar) return;
    if (o.material && o.material.transparent) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone()
      .applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld));
    const sz = b.getSize(new THREE.Vector3());
    if (!Number.isFinite(sz.x + sz.y + sz.z)) return;
    parts.push({ o, b, sz, vol: sz.x * sz.y * sz.z });
  });
  const AX = ['x', 'y', 'z'];
  const out = [];
  for (const a of parts) for (const b of parts) {
    // A thin plate standing proud is a rib, a fin or a sight rail — it is meant
    // to stand off the surface, and a fillet round a 6 mm plate reads as a
    // flange. Only chunky parts can be lumps.
    if (Math.min(a.sz.x, a.sz.y, a.sz.z) < 0.011) continue;
    // Parts of a similar size are a STACK, not an attachment: the AK magazine is
    // five near-equal boxes following the banana curve, and every joint in it
    // looks like a step to a naive test. An attachment is small on big.
    if (a === b || b.vol < a.vol * 2.5) continue;
    // How much of a's extent falls inside b's, per axis.
    const inside = AX.map(k => {
      const lo = Math.max(a.b.min[k], b.b.min[k]), hi = Math.min(a.b.max[k], b.b.max[k]);
      return a.sz[k] > 1e-9 ? Math.max(0, hi - lo) / a.sz[k] : 1;
    });
    for (let i = 0; i < 3; i++) {
      const k = AX[i], o1 = inside[(i + 1) % 3], o2 = inside[(i + 2) % 3];
      if (o1 < 0.55 || o2 < 0.55) continue;         // not seated on it
      const over = Math.max(a.b.max[k] - b.b.max[k], b.b.min[k] - a.b.min[k]);
      if (over < minStep || over > 0.060) continue;
      // A limb is a part that protrudes along its OWN longest axis: a barrel out
      // of a receiver, a magazine out of a magwell. Those are meant to stick out.
      // A lump protrudes sideways, across its short axis, which is what reads as
      // a bulge. That one distinction is what separates the defect from the gun.
      const longest = Math.max(a.sz.x, a.sz.y, a.sz.z);
      if (a.sz[k] >= longest - 1e-9) continue;
      if (inside[i] < 0.35) continue;
      out.push({ step: over, axis: k, cover: Math.min(o1, o2), part: a });
    }
  }
  return out.sort((x, y) => y.step - x.step);
}
{
  const rows = [];
  built.forEach((g, i) => {
    if (!g) return;
    g.position.set(0, 0, 0); g.rotation.set(0, 0, 0);
    // Run the shipped blend pass, then measure: a step that came out of it with
    // a collar on it is a fitting, and only what it could not reach is a defect.
    try { api.blendProudSteps(g); } catch (e) { fail(rows_id(i), 'blend pass threw: ' + e.message); }
    const st = proudSteps(g);
    // A collar is a fitting, not a feature: it may never grow into one. Anything
    // that got through the axis maths wrong would show up here as a slab.
    let collars = 0;
    g.traverse(o => {
      if (!o.userData || !o.userData.blendCollar) return;
      collars++;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const cs = o.geometry.boundingBox.getSize(new THREE.Vector3());
      if (![cs.x, cs.y, cs.z].every(Number.isFinite))
        fail(rows_id(i), 'blend collar with non-finite geometry');
      else if (Math.max(cs.x, cs.y, cs.z) > 0.12 || Math.min(cs.x, cs.y, cs.z) > 0.022)
        fail(rows_id(i), 'blend collar is a slab, not a fitting ('
          + [cs.x, cs.y, cs.z].map(v => (v * 1000).toFixed(0)).join('x') + 'mm)');
    });
    collarCount += collars;
    const raw = st.filter(x => !x.part.o.userData.blended);
    if (st.length) rows.push({ id: rows_id(i), n: st.length, raw: raw.length,
      worst: (raw[0] || st[0]).step, axis: (raw[0] || st[0]).axis, blended: st.length - raw.length });
    if (process.env.DBG && rows_id(i) === process.env.DBG) st.slice(0, 6).forEach(x => {
      const b = x.part.b, z = x.part.sz;
      console.log('  DBG ' + x.axis + ' step ' + (x.step*1000).toFixed(0) + 'mm  size '
        + [z.x,z.y,z.z].map(v=>v.toFixed(3)).join('x') + '  at y[' + b.min.y.toFixed(3) + ','
        + b.max.y.toFixed(3) + '] z[' + b.min.z.toFixed(3) + ',' + b.max.z.toFixed(3) + '] x['
        + b.min.x.toFixed(3) + ',' + b.max.x.toFixed(3) + ']');
    });
    g.position.set(REST_POS.x, REST_POS.y, REST_POS.z);
  });
  proudReport = rows.sort((a, b) => b.worst - a.worst);
}
function rows_id(i) { return rows[i].id; }

// ── 6. Tagged assemblies turn about their own axis ─────────────────────────
const cyl = [];
built.forEach((g, i) => {
  if (!g || !g._parts || !g._parts.main) return;
  const m = g._parts.main;
  if (!m._chambers) return;
  g.position.set(0, 0, 0);
  m.rotation.set(0, 0, 0); g.updateMatrixWorld(true);
  const before = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
  m.rotation.z = (Math.PI * 2) / m._chambers;
  g.updateMatrixWorld(true);
  const after = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
  m.rotation.set(0, 0, 0);
  const drift = before.distanceTo(after);
  cyl.push({ id: rows[i].id, chambers: m._chambers, drift });
  if (drift > 0.004) fail(rows[i].id, 'cylinder orbits instead of spinning (drift ' + drift.toFixed(4) + ')');
});

// ── Report ─────────────────────────────────────────────────────────────────
const n = built.filter(Boolean).length;
console.log('weapons built: ' + n + '/' + rows.length + '   with hands: ' + handed);
console.log('camera: ' + FOV + ' degrees vertical, near ' + NEAR + ', viewmodel at z ' + REST_POS.z);

vis.sort((a, b) => a.worst - b.worst);
const thin = vis.filter(v => v.worst < 80);
console.log('\nvisible inside the view (worst point of the reload):');
(VERBOSE ? vis : thin.slice(0, 12)).forEach(v =>
  console.log('   ' + v.id.padEnd(20) + 'rest ' + v.rest.toFixed(0).padStart(3) + '%   worst '
            + v.worst.toFixed(0).padStart(3) + '%  at t=' + v.at.toFixed(2)));
console.log('   under 80% at some point: ' + thin.length + '/' + vis.length);

if (inspectReport) {
  console.log('\ninspect: ' + inspectReport.opens + '/' + rows.length
    + ' weapons open something while being looked at');
  console.log('   most visibility any weapon LOSES to the look: '
    + inspectReport.worstLoss.toFixed(0) + ' points (' + inspectReport.worstId
    + ');  lowest any weapon reaches: ' + inspectReport.worstAbs.toFixed(0) + '%');
}

if (audioReport) {
  console.log('\nreload audio: ' + audioReport.beats + ' sound events across '
    + (audioReport.derived + audioReport.generic) + ' reloads ('
    + (audioReport.beats / Math.max(1, audioReport.derived + audioReport.generic)).toFixed(1)
    + ' each), all scheduled off the animation; ' + audioReport.generic + ' fall back to a generic pair');
}

if (modelSkinReport && modelSkinReport.length) {
  console.log('\nmodel skins (weapons that replace a weapon):');
  modelSkinReport.forEach(m => console.log('   ' + m.id.padEnd(10) + 'replaces ' + m.weapon.padEnd(10)
    + m.vis.toFixed(0) + '% in frame vs the stock ' + m.baseVis.toFixed(0) + '%, hands ' + m.hands
    + (m.reloadWorst === null ? '' : ', own reload worst ' + m.reloadWorst.toFixed(0) + '%')));
}

if (meleeSkinReport && meleeSkinReport.length) {
  console.log('\nmelee model skins (objects that replace a melee weapon):');
  meleeSkinReport.forEach(m => console.log('   ' + m.id.padEnd(22) + 'replaces ' + m.melee.padEnd(12)
    + m.vis.toFixed(0) + '% in frame vs the stock '
    + (m.baseVis === null ? 'n/a' : m.baseVis.toFixed(0) + '%') + ', ' + m.parts + ' parts'));
}

if (proudReport && proudReport.length) {
  const steps = proudReport.reduce((n, r) => n + r.n, 0);
  const blended = proudReport.reduce((n, r) => n + r.blended, 0);
  const left = proudReport.filter(r => r.raw > 0);
  console.log('\nattachments standing proud of the part they sit on: ' + steps + ' across '
    + proudReport.length + ' weapons, ' + blended + ' blended by the collar pass, '
    + (steps - blended) + ' left on ' + left.length + ' weapon(s); ' + collarCount + ' collars fitted');
  (VERBOSE ? left : left.slice(0, 14)).forEach(r =>
    console.log('   ' + r.id.padEnd(20) + r.raw + ' unblended of ' + r.n + ', worst '
      + (r.worst * 1000).toFixed(0).padStart(3) + 'mm on ' + r.axis));
}

if (cyl.length) {
  console.log('\nrevolving cylinders:');
  cyl.forEach(c => console.log('   ' + c.id.padEnd(20) + c.chambers + ' chambers, '
    + (360 / c.chambers).toFixed(0) + ' deg a shot, centre drift ' + c.drift.toFixed(4)));
}

if (loadsFirst.length) {
  console.log('\nloads before it ejects (correct for stripper clips and pump tubes,'
            + ' wrong for box magazines — check by eye):');
  loadsFirst.forEach(l => console.log('   ' + l));
}

console.log('\nPROBLEMS (' + problems.length + '):');
console.log(problems.length ? problems.map(p => '   ' + p).join('\n') : '   none');
process.exit(problems.length ? 1 : 0);
