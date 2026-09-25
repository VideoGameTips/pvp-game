#!/usr/bin/env node
// Headless checks for the movement/collision code in public/game.js.
//
//   node tools/verify-collision.js
//   GAME_JS=some/copy.js node tools/verify-collision.js     (check another copy of game.js)
//
// Two things broke in play and nothing in the repository would have noticed:
//
//  1. A fast enough step carried the player past the middle of a wall, and the
//     shortest way out of the wall was then the FAR side -- so they simply
//     walked through it. moveWithWalls() moves in small steps to stop that.
//  2. Every collider is an axis-aligned Box3, so a wall turned 45 degrees got a
//     hitbox around its whole diagonal. turnedBoxColliders() approximates the
//     real outline with thin strips instead.
//
// Like verify-weapons.js this lifts the functions straight out of game.js and
// runs them against the same three.min.js the page uses. No browser needed.

const THREE = require('../public/three.min.js');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(process.env.GAME_JS || path.join(__dirname, '..', 'public', 'game.js'), 'utf8');

function fnBlock(name) {
  const m = src.match(new RegExp('^function ' + name + '\\(', 'm'));
  if (!m) throw new Error('cannot find function ' + name + ' in game.js');
  let pk = src.indexOf('(', m.index), d = 0;
  while (pk < src.length) { if (src[pk] === '(') d++; else if (src[pk] === ')') { d--; if (!d) break; } pk++; }
  let k = src.indexOf('{', pk), depth = 0;
  while (k < src.length) { if (src[k] === '{') depth++; else if (src[k] === '}') { depth--; if (!depth) break; } k++; }
  return src.slice(m.index, k + 1);
}
const line = re => { const m = src.match(re); if (!m) throw new Error('cannot find ' + re); return m[0]; };

const code = [
  line(/^const PLAYER_EYE_HEIGHT = .*$/m), line(/^const PLAYER_RADIUS = .*$/m),
  line(/^const TURNED_BOX_SLACK = .*$/m), line(/^const MAX_MOVE_STEP = .*$/m),
  fnBlock('playerFeetY'), fnBlock('resolveWallCollisions'), fnBlock('moveWithWalls'), fnBlock('turnedBoxColliders'),
  'return { resolveWallCollisions, moveWithWalls, turnedBoxColliders, PLAYER_RADIUS };',
].join('\n');

const camera = { position: new THREE.Vector3(0, 1.65, 0) };
const wallColliders = [];
const win = {};
const G = new Function('THREE', 'camera', 'wallColliders', 'window', code)(THREE, camera, wallColliders, win);

const problems = [];
const fail = m => problems.push(m);
let checks = 0;

// ── 1. Tunnelling ───────────────────────────────────────────────────────────
// A wall of each thickness, crossed at every speed a frame can plausibly carry
// (0.5 m/frame is a fast slide; 15 m is a blink). Plain single-step movement is
// run alongside as a control: it MUST get through somewhere, or this test could
// not have caught the original bug either.
let controlThrough = 0;
for (const thick of [0.5, 1.0, 1.2, 2.8]) {
  for (const step of [0.25, 0.5, 1, 2, 4, 8, 15]) {
    wallColliders.length = 0;
    wallColliders.push(new THREE.Box3(new THREE.Vector3(-20, 0, -thick / 2), new THREE.Vector3(20, 5, thick / 2)));
    const run = (mover) => {
      camera.position.set(0, 1.65, -8);
      const dir = new THREE.Vector3(0, 0, 1);
      for (let n = Math.ceil(20 / step); n > 0; n--) { mover(dir, step); G.resolveWallCollisions(); }
      return camera.position.z > thick / 2 + 0.1;       // came out on the far side
    };
    checks++;
    if (run(G.moveWithWalls)) fail(`tunnelled through a ${thick} m wall at ${step} m per frame`);
    if (run((d, s) => camera.position.addScaledVector(d, s))) controlThrough++;
  }
}
if (!controlThrough) fail('control never tunnelled: this test could not have caught the original bug');

// A wall turned 45 degrees, approached square-on to its face.
{
  const cx = 0, cz = 0, w = 16, d = 1.2, rot = Math.PI / 4;
  wallColliders.length = 0;
  wallColliders.push(...G.turnedBoxColliders(cx, 2.5, cz, w, 5, d, rot));
  const nrm = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));    // the wall's face normal
  for (const step of [0.5, 2, 6, 12]) {
    camera.position.set(-nrm.x * 6, 1.65, -nrm.z * 6);
    for (let n = 0; n < Math.ceil(16 / step); n++) { G.moveWithWalls(nrm, step); G.resolveWallCollisions(); }
    checks++;
    if (camera.position.x * nrm.x + camera.position.z * nrm.z > d / 2 + 0.1) fail(`walked through a 45-degree wall at ${step} m per frame`);
  }
}

// ── 2. Turned boxes get a hitbox that follows them ──────────────────────────
for (const [w, d, rot] of [[18, 4.5, Math.PI / 4], [14, 14, Math.PI / 4], [12, 4.5, Math.PI / 4], [8, 2.4, 0.15], [30, 3, 0.6], [6, 6, 1.1]]) {
  const boxes = G.turnedBoxColliders(3, 2, -4, w, 4, d, rot);
  const c = Math.cos(rot), s = Math.sin(rot);
  let inside = 0, covered = 0, area = 0;
  for (const b of boxes) area += (b.max.x - b.min.x) * (b.max.z - b.min.z);
  for (let lx = -w / 2 + 0.05; lx < w / 2; lx += 0.1) for (let lz = -d / 2 + 0.05; lz < d / 2; lz += 0.1) {
    const x = 3 + lx * c + lz * s, z = -4 - lx * s + lz * c;
    inside++;
    if (boxes.some(b => x >= b.min.x - 1e-6 && x <= b.max.x + 1e-6 && z >= b.min.z - 1e-6 && z <= b.max.z + 1e-6)) covered++;
  }
  checks++;
  if (covered !== inside) fail(`${w}x${d} wall turned ${rot.toFixed(2)}: ${inside - covered} of ${inside} sample points of the real wall have no hitbox`);
  // The old single box was up to 3x too big; strips should stay well under 1.6x.
  const ratio = area / (w * d);
  checks++;
  if (ratio > 1.6) fail(`${w}x${d} wall turned ${rot.toFixed(2)}: hitbox is ${ratio.toFixed(2)}x the wall's own area`);
  if (boxes.length > 48) fail(`${w}x${d} wall turned ${rot.toFixed(2)}: ${boxes.length} colliders (cap is 48)`);
}
// Square-on walls stay a single box.
checks++;
if (G.turnedBoxColliders(0, 2, 0, 10, 4, 2, 0).length !== 1) fail('an unturned wall should be one collider');
checks++;
if (G.turnedBoxColliders(0, 2, 0, 10, 4, 2, Math.PI / 2).length !== 1) fail('a wall turned a quarter turn should be one collider');

console.log(`verify-collision: ${checks} checks`);
console.log(`PROBLEMS (${problems.length}):`);
console.log(problems.length ? problems.map(p => '  ' + p).join('\n') : '   none');
process.exit(problems.length ? 1 : 0);
