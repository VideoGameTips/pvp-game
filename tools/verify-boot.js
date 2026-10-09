#!/usr/bin/env node
// Does public/game.js actually RUN?
//
// node --check only parses. The crash this was written for parsed perfectly and
// then threw at line 12652 on load — a `let` read before its declaration — so
// evaluation stopped there and the remaining 15,000 lines never executed. The
// page came up, the canvas drew, and nothing worked. Every check we had passed.
//
// This evaluates the real file against stub DOM/WebGL/socket objects and reports
// the first thing that throws, with the line. It cannot prove the game is fun;
// it proves the script reaches the end.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GAME = path.join(__dirname, '..', 'public', 'game.js');
const src = fs.readFileSync(GAME, 'utf8');
const THREE = require('../public/three.min.js');

const noop = () => {};
const el = () => new Proxy({
  style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  children: [], childNodes: [], value: '', textContent: '', innerHTML: '', innerText: '',
  appendChild: x => x, removeChild: noop, insertBefore: x => x, remove: noop,
  addEventListener: noop, removeEventListener: noop, setAttribute: noop, getAttribute: () => null,
  querySelector: () => el(), querySelectorAll: () => [], getContext: () => ctx2d(),
  focus: noop, blur: noop, click: noop, play: () => Promise.resolve(), pause: noop,
  getBoundingClientRect: () => ({ x:0, y:0, width: 1920, height: 1080, top:0, left:0, right:1920, bottom:1080 }),
  requestPointerLock: noop, width: 1920, height: 1080,
}, { get: (t, k) => (k in t ? t[k] : (typeof k === 'string' && k.startsWith('on') ? null : undefined)),
     set: (t, k, v) => { t[k] = v; return true; } });

const ctx2d = () => new Proxy({}, { get: () => (() => ctx2d()) });

const doc = {
  createElement: () => el(), createElementNS: () => el(),
  getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
  addEventListener: noop, removeEventListener: noop, exitPointerLock: noop,
  body: el(), head: el(), documentElement: el(), pointerLockElement: null,
  readyState: 'complete', cookie: '', hidden: false, activeElement: el(),
};

// Boot as a PLAYER, not as a fresh browser. The crash this was written for only
// fired when a gun skin was equipped: ownsSkin() short-circuits on a falsy id,
// so an empty profile never reached the variable that was not ready yet. Testing
// with nothing equipped is testing the one case that worked.
const store = {
  pvp_gun_stat_skins: JSON.stringify({ ak20: 'ak20_midnight_oil', sg8: 'sg8_confetti' }),
  pvp_melee_skins: JSON.stringify({ knife: 'knife_dental_floss' }),
  pvp_model_skins: JSON.stringify({ ak20: 'aug' }),
  pvp_skin: 'default',
};
const storage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); },
                  removeItem: k => { delete store[k]; }, clear: () => {}, key: () => null, length: 0 };

const sock = new Proxy({ on: noop, emit: noop, connect: noop, disconnect: noop, id: 'stub', connected: true },
                       { get: (t, k) => (k in t ? t[k] : noop) });

const G = global;
G.document = doc; G.localStorage = storage; G.sessionStorage = storage;
G.navigator = { userAgent: 'node', platform: 'node', language: 'en', maxTouchPoints: 0,
                clipboard: { writeText: () => Promise.resolve() }, mediaDevices: {} };
G.location = { href: 'http://localhost:3001/', origin: 'http://localhost:3001',
               protocol: 'http:', host: 'localhost:3001', hostname: 'localhost',
               port: '3001', pathname: '/', search: '', hash: '', reload: noop, assign: noop };
G.io = () => sock;
G.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
G.requestAnimationFrame = () => 1; G.cancelAnimationFrame = noop;
G.performance = G.performance || { now: () => 0 };
G.Image = function () { return el(); };
G.Audio = function () { return el(); };
G.AudioContext = function () { return null; };
G.alert = noop; G.prompt = () => null; G.confirm = () => true;
G.matchMedia = () => ({ matches: false, addEventListener: noop, addListener: noop });
G.devicePixelRatio = 1; G.innerWidth = 1920; G.innerHeight = 1080;
G.screen = { width: 1920, height: 1080 };
G.getComputedStyle = () => ({ getPropertyValue: () => '' });
G.WebGLRenderingContext = function () {};
// Timers become no-ops: the game schedules loops and reconnects we do not want
// running, and a boot check only cares that evaluation reaches the end.
G.setTimeout = () => 0; G.clearTimeout = noop;
G.setInterval = () => 0; G.clearInterval = noop;
G.addEventListener = noop; G.removeEventListener = noop; G.dispatchEvent = noop;
G.scrollTo = noop; G.open = () => el(); G.close = noop; G.focus = noop; G.blur = noop;
G.window = G;
G.THREE = THREE;
// A headless WebGL context is not worth stubbing faithfully; the renderer is
// not what we are testing.
THREE.WebGLRenderer = function () {
  return new Proxy({ domElement: el(), shadowMap: {}, capabilities: { isWebGL2: true },
                     info: { render: {}, memory: {} }, setSize: noop, setPixelRatio: noop,
                     render: noop, setAnimationLoop: noop, getContext: () => ctx2d() },
                   { get: (t, k) => (k in t ? t[k] : noop) });
};

// index.html loads equipment-models.js before game.js, and game.js depends on
// what it defines. Load the page's scripts in the page's order.
let ok = true;
const mapWarnings = [];
const originalWarn = console.warn;
console.warn = (...args) => {
  if (/^\[(bespoke|theme)\]/.test(String(args[0]))) mapWarnings.push(args.map(String).join(' '));
  originalWarn(...args);
};
try {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'equipment-models.js'), 'utf8'),
                      { filename: 'public/equipment-models.js' });
} catch (e) {
  ok = false;
  console.log('BOOT FAILED in equipment-models.js\n   ' + e.name + ': ' + e.message);
}
try {
  if (ok) vm.runInThisContext(src, { filename: 'public/game.js' });
} catch (e) {
  ok = false;
  const stack = (e.stack || '').split('\n');
  const site = stack.find(l => l.includes('public/game.js')) || stack[1] || '';
  console.log('BOOT FAILED\n');
  console.log('   ' + e.name + ': ' + e.message);
  if (site) console.log('   at' + site.replace(/^\s*at/, ''));
  console.log('\n   Everything after that line never ran, and node --check still passes:');
  console.log('   this is a runtime failure during module evaluation, not a syntax error.');
}

if (ok && process.argv.includes('--maps')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], names = Object.keys(_BESPOKE);
    for (const rot of [-0.35, 0.35, Math.PI / 4]) {
      const rect = { x: 7, z: -11, w: 38, d: 8, rot };
      const x = rect.x + 16 * Math.cos(rot), z = rect.z - 16 * Math.sin(rot);
      if (!_pointInRotRect(x, z, rect)) issues.push('rotated safe island disagrees with its visible footprint');
    }
    const blocked = (name, x, z) => MAP_COLLIDERS[name].some(b =>
      b.max.y > 0.6 && b.min.y < 1.8 && x > b.min.x - 0.45 && x < b.max.x + 0.45 && z > b.min.z - 0.45 && z < b.max.z + 0.45);
    for (const name of names) {
      const b = MAP_BOUNDS[name], s = MAP_SPAWNS[name], g = MAP_GROUPS[name];
      if (!b || !s || !g || !MAP_COLLIDERS[name].length) { issues.push(name + ': incomplete map'); continue; }
      if (name !== 'volcano' && !g.userData.identityRefined) issues.push(name + ': identity pass did not finish');
      for (const col of MAP_COLLIDERS[name]) if (![col.min.x, col.min.y, col.min.z, col.max.x, col.max.y, col.max.z].every(Number.isFinite)) issues.push(name + ': invalid collider');
      for (const [team, r] of Object.entries(s)) {
        if (r.x0 < -b.halfX || r.x1 > b.halfX || r.z0 < -b.halfZ || r.z1 > b.halfZ) issues.push(name + ': ' + team + ' spawn outside bounds');
        let free = 0;
        for (let ix = 0; ix < 9; ix++) for (let iz = 0; iz < 5; iz++) {
          const x = r.x0 + (r.x1 - r.x0) * (ix + 0.5) / 9, z = r.z0 + (r.z1 - r.z0) * (iz + 0.5) / 5;
          if (!blocked(name, x, z)) free++;
        }
        if (free < 45) issues.push(name + ': obstructed ' + team + ' spawn (' + free + '/45 clear)');
      }
    }
    // The rebuilt outdoor maps must offer a continuous ground route between spawn clearings.
    for (const name of ['forest', 'desert', 'tundra']) {
      const s = MAP_SPAWNS[name], b = MAP_BOUNDS[name], start = [0, Math.round((s.ally.z0 + s.ally.z1) / 4)], target = Math.round((s.enemy.z0 + s.enemy.z1) / 4);
      const queue = [start], seen = new Set([start.join(',')]); let reached = false;
      for (let head = 0; head < queue.length; head++) {
        const [x, z] = queue[head]; if (z === target) { reached = true; break; }
        for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = x + dx, nz = z + dz, key = nx + ',' + nz;
          if (seen.has(key) || Math.abs(nx * 2) >= b.halfX - 1 || Math.abs(nz * 2) >= b.halfZ - 1 || blocked(name, nx * 2, nz * 2)) continue;
          seen.add(key); queue.push([nx, nz]);
        }
      }
      if (!reached) issues.push(name + ': no ground route between spawns');
    }
    console.log('map checks: ' + names.length + ' themed layouts, spawn clearances, bounds and outdoor routes');
    return issues;
  })()`);
  issues.push(...mapWarnings);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.env.MAP_REVIEW_DIR) {
  fs.mkdirSync(process.env.MAP_REVIEW_DIR, { recursive: true });
  for (const name of ['forest', 'desert', 'tundra', 'refinery', 'space', 'volcano']) {
    const json = vm.runInThisContext('MAP_GROUPS[' + JSON.stringify(name) + '].toJSON()');
    fs.writeFileSync(path.join(process.env.MAP_REVIEW_DIR, name + '.json'), JSON.stringify(json));
  }
}

if (ok) {
  const late = ['currentUser', 'RELOAD_KEYS', 'WEAPONS', 'weaponModels', 'BASIC_GUN_STAT_SKINS'];
  const missing = late.filter(n => {
    try { return vm.runInThisContext('typeof ' + n) === 'undefined'; } catch (e) { return true; }
  });
  if (missing.length) {
    ok = false;
    console.log('BOOT INCOMPLETE — never declared: ' + missing.join(', '));
  } else {
    console.log('boot OK — game.js evaluated to the end; every late declaration exists');
  }
}
process.exit(ok ? 0 : 1);
