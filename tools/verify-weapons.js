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
                   '_localPartBoxes', 'attachViewHands', '_reloadPose']) {
    const b = fnBlock(n);
    if (b) code += b + '\n';
  }
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
  for (const m of src.matchAll(/^function (build\w+)\(\)/gm)) {
    const b = fnBlock(m[1]);
    if (b) code += b + '\n';
  }
  // The weapon table pairs each builder with the id the reload tables key on.
  const tbl = src.match(/const weaponModels = \[([\s\S]*?)\n\];/)[1];
  const rows = tbl.split('\n')
    .filter(r => r.includes('//') && r.split('//')[0].includes('('))
    .map(r => ({ id: r.split('//')[1].trim(), fn: r.split('//')[0].trim().split('(')[0] }));
  code += 'return { RELOAD_KEYS, RELOAD_PROPS, _RELOAD_DEFAULT, _reloadPose, attachViewHands,'
        + ' VM_GUN_SCALE, fitRestDistance, INSPECT_DEFAULT, inspectOpenPose,'
        + ' builders: ' + JSON.stringify(rows.map(r => r.fn)) + '.map(n => eval(n)) };';
  return { api: new Function('THREE', code)(THREE), rows };
}

const { api, rows } = load();
const problems = [];
let inspectReport = null;
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
  let opens = 0, worstVis = 101, worstId = '';
  built.forEach((g, i) => {
    if (!g) return;
    const id = rows[i].id;
    if (api.inspectOpenPose(id)) opens++;
    for (let sN = 0; sN <= 12; sN++) {
      const t = sN / 12;
      const P = api._reloadPose(api.INSPECT_DEFAULT, t);
      const v = visibility(g, P);
      if (v < worstVis) { worstVis = v; worstId = id; }
    }
  });
  inspectReport = { opens, worstVis, worstId };
}

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
    + ' weapons open something while being looked at; worst visibility during the look '
    + inspectReport.worstVis.toFixed(0) + '% (' + inspectReport.worstId + ')');
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
