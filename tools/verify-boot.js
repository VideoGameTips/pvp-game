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
  appendChild: x => x, prepend: x => x, append: x => x, removeChild: noop, insertBefore: x => x, remove: noop,
  addEventListener: noop, removeEventListener: noop, setAttribute: noop, getAttribute: () => null,
  querySelector: () => el(), querySelectorAll: () => [], getContext: () => ctx2d(),
  focus: noop, blur: noop, click: noop, play: () => Promise.resolve(), pause: noop,
  getBoundingClientRect: () => ({ x:0, y:0, width: 1920, height: 1080, top:0, left:0, right:1920, bottom:1080 }),
  requestPointerLock: noop, width: 1920, height: 1080,
  toDataURL: () => 'data:image/png;base64,test',
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
  if (/^\[(bespoke|theme|gimmick|look|upgrade)\]/.test(String(args[0]))) mapWarnings.push(args.map(String).join(' '));
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
    const issues = [], names = [...Object.keys(_BESPOKE), ...M4_TOWER_MAP_NAMES];
    // Maps are upgraded (stretched, decked, wall taken out, outskirts) the first time they are played; audit what is played.
    for (const n of names) { try { _upgradeMap(n); } catch (e) { issues.push(n + ': upgrade threw ' + e.message); } }
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
      if (_BESPOKE[name] && !g.userData.identityRefined) issues.push(name + ': identity pass did not finish');
      for (const col of MAP_COLLIDERS[name]) if (![col.min.x, col.min.y, col.min.z, col.max.x, col.max.y, col.max.z].every(Number.isFinite)) issues.push(name + ': invalid collider');
      const boundary = MAP_COLLIDERS[name].filter(c => c.min.y < 0.1 && c.max.y >= 12 && (Math.abs(c.min.x) > b.halfX - 4 || Math.abs(c.max.x) > b.halfX - 4 || Math.abs(c.min.z) > b.halfZ - 4 || Math.abs(c.max.z) > b.halfZ - 4));
      if (boundary.length < 4 && !MAP_VOID[name]) issues.push(name + ': missing high perimeter walls');   // (a void edge replaces the wall)
      const allies = mapSpawnSightlineSamples(s.ally), enemies = mapSpawnSightlineSamples(s.enemy);
      let visible = 0;
      for (const a of allies) for (const enemy of enemies) {
        const dir = enemy.clone().sub(a), distance = dir.length(), ray = new THREE.Ray(a, dir.normalize()), hit = new THREE.Vector3();
        if (!MAP_COLLIDERS[name].some(c => ray.intersectBox(c, hit) && hit.distanceTo(a) < distance)) visible++;
      }
      if (visible) issues.push(name + ': ' + visible + ' exposed starting sightlines');
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

if (ok && process.argv.includes('--props')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], props = mapDestructibles.filter(d => d.propId);
    const ids = new Set();
    for (const d of props) {
      if (ids.has(d.propId)) issues.push('duplicate prop: ' + d.propId);
      ids.add(d.propId);
      if (!MAP_COLLIDERS[d.mapName].includes(d.colliderRef)) issues.push('missing prop collider: ' + d.propId);
      for (const r of Object.values(MAP_SPAWNS[d.mapName])) {
        const dx = Math.max(r.x0 - d.mesh.position.x, 0, d.mesh.position.x - r.x1);
        const dz = Math.max(r.z0 - d.mesh.position.z, 0, d.mesh.position.z - r.z1);
        if (Math.hypot(dx, dz) < 7) issues.push('prop can blast a spawn: ' + d.propId);
      }
    }
    if (props.length < 20) issues.push('too few themed combat props');
    const saved = { spawnExplosion, spawnAbilityAOEFX, playSoundEvent, showDamageNumber, spawnHitParticle, showAnnouncement, emitHit, applyBotDamageToPlayer };
    let hits = 0, localHits = 0;
    try {
      spawnExplosion = spawnAbilityAOEFX = playSoundEvent = showDamageNumber = spawnHitParticle = showAnnouncement = () => {};
      emitHit = () => { hits++; }; applyBotDamageToPlayer = () => { localHits++; };
      activateMap('refinery');
      const a = props.find(d => d.mapName === 'refinery');
      if (!a) throw new Error('refinery has no explosives');
      if (!a.mesh.parent) issues.push('static merge swallowed explosive');
      const muzzle = a.mesh.position.clone().add(new THREE.Vector3(0, 0.8, -2));
      spawnLocalBullet(muzzle, new THREE.Vector3(0, 0, 1), 'prop-test', true, 200, 0xffffff, 0.01, 'ak20');
      updateBullets(0.02);
      // One AK20 round at point blank: whatever the AK20 hits for now, not a
      // number that goes stale every time it is rebalanced.
      if (a.hp !== a.maxHp - getClientWeaponDamage('ak20')) issues.push('actual bullet did not damage explosive (' + a.hp + ')');
      activateMap('refinery');
      damageDestructible(a, 25, { ownerId: myId });
      if (a.hp !== 35 || !a.mesh.visible) issues.push('nonfatal prop hit destroys it');
      damageDestructible(a, 35, { ownerId: myId });
      if (a.hp !== 0 || a.mesh.visible || wallColliders.includes(a.colliderRef)) issues.push('destroyed prop remains solid or visible');
      if (localHits) issues.push('own explosion damaged player');
      const dead = props.filter(d => d.mapName === 'refinery' && d.hp <= 0);
      if (dead.length < 2) issues.push('nearby barrels did not chain react');
      damageDestructible(a, 100, { ownerId: myId });
      activateMap('refinery');
      if (a.hp !== a.maxHp || !a.mesh.visible || !wallColliders.includes(a.colliderRef)) issues.push('reactivation did not restore prop');
      damageDestructible(a, 60, { remote: true, ownerId: 'opponent' });
      if (hits || localHits) issues.push('remote explosion duplicated damage');
      const oldCols = wallColliders.slice(); wallColliders.length = 0;
      const origin = new THREE.Vector3(0, 1, 0), near = new THREE.Vector3(1, 1, 0), far = new THREE.Vector3(6, 1, 0);
      if (!(mapBlastDamage(origin, near) > mapBlastDamage(origin, far)) || mapBlastDamage(origin, new THREE.Vector3(8, 1, 0)) !== 0) issues.push('blast falloff/range is wrong');
      wallColliders.push(new THREE.Box3(new THREE.Vector3(2, 0, -2), new THREE.Vector3(3, 4, 2)));
      if (mapBlastDamage(origin, far)) issues.push('blast passed through solid cover');
      wallColliders.length = 0; wallColliders.push(...oldCols);
      activateMap('blank');
    } finally {
      ({ spawnExplosion, spawnAbilityAOEFX, playSoundEvent, showDamageNumber, spawnHitParticle, showAnnouncement, emitHit, applyBotDamageToPlayer } = saved);
    }
    console.log('prop checks: ' + props.length + ' explosives on ' + new Set(props.map(d => d.mapName)).size + ' maps; damage, cover, chains, reset and merge');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--props')) {
  const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const begin = serverSource.indexOf("  socket.on('mapPropDestroyed',");
  const end = serverSource.indexOf("  socket.on('airBlast',", begin);
  let handler;
  const delivered = [], player = { matchId: 'prop-test-match', dead: false };
  vm.runInNewContext(serverSource.slice(begin, end), {
    players: { shooter: player }, socket: { id: 'shooter', on: (name, fn) => { if (name === 'mapPropDestroyed') handler = fn; } },
    emitToMatchExcept: (...args) => delivered.push(args),
  });
  handler({ mapName: 'refinery', propId: 'refinery:44.5:1' });
  handler({ mapName: 'refinery', propId: 'warehouse:44.5:1' });
  handler({ mapName: 'refinery', propId: 'refinery:not-a-position' });
  player.dead = true;
  handler({ mapName: 'refinery', propId: 'refinery:44.5:1' });
  player.dead = false;
  for (let i = 0; i < 40; i++) handler({ mapName: 'refinery', propId: 'refinery:44.5:1' });
  if (delivered.length !== 32 || delivered.some(([match, except, event, payload]) =>
    match !== 'prop-test-match' || except !== 'shooter' || event !== 'mapPropDestroyed' || payload.ownerId !== 'shooter')) {
    ok = false; console.log('prop relay failed validation, match scoping or rate limiting');
  } else console.log('prop relay: fractional coordinates, validation, dead-player guard and match scoping passed');
}


// Every map's own mechanic (GIM) and look (LOOK): builds, runs a minute of the frame update with bots about, and -- where the
// builder says where an actor has to stand (X.dbg) -- parks an actor there and waits for something to happen to it.
if (ok && process.argv.includes('--gimmicks')) {
  const rep = vm.runInThisContext(`(() => {
    const issues = [], notes = [];
    const names = Object.keys(GIM);
    const ps = playSoundEvent, hud = updateMatchHUD; playSoundEvent = function () {}; updateMatchHUD = function () {};
    myId = myId || 'me'; players[myId] = players[myId] || { hp: 100, dead: false };
    inLobby = false; countdownActive = false; isDead = false;
    try {
      for (const n of names) {
        try {
          _upgradeMap(n); activateMap(n);
          if (!_gimDone[n]) { issues.push(n + ': the gimmick never built'); continue; }
          const M = MAP_MECH[n]; M.reset();
          const b = MAP_BOT_BOUNDS[n] || MAP_BOUNDS[n], spot = () => [(Math.random() * 2 - 1) * (b.halfX - 8), (Math.random() * 2 - 1) * (b.halfZ - 8)];
          gameBots.length = 0;
          for (let k = 0; k < 16; k++) { const p = spot(); gameBots.push({ id: 'vb' + k, x: p[0], z: p[1], y: 0, yVel: 0, hp: 300, maxHp: 300, dead: false, isBot: true }); }
          for (let s = 0; s < 1200; s++) {                       // a minute at 20 Hz, everyone somewhere new every 1.5 s
            if (s % 30 === 0) { const p = spot(); camera.position.set(p[0], 1.65, p[1]); for (const bb of gameBots) { const q = spot(); bb.x = q[0]; bb.z = q[1]; bb.y = 0; bb.yVel = 0; } }
            for (const bb of gameBots) { bb.hp = 300; bb.dead = false; }
            players[myId].hp = 100; slamState = null; playerYVel = 0; isDead = false;   // a hazard that kills ends the player: stand them up again
            M.update(0.05); updateMapGimmicks(0.05);
          }
          const dbg = g_gimDbg[n];
          if (!dbg || !dbg.pts || !dbg.pts.length) { notes.push(n); continue; }
          let effects = 0, tests = 0;
          for (const p of (dbg.live ? [{ x: 0, z: 0 }] : dbg.pts.slice(0, 3))) {
            tests++; M.reset(); localBullets.length = 0; gameBots.length = 0;
            gameBots.push({ id: 'vt', x: p.x + 0.4, z: p.z, y: 0, yVel: 0, hp: 200, maxHp: 300, dead: false, isBot: true });
            let eff = false;
            for (let s = 0; s < 1400 && !eff; s++) {                // up to 70 s
              let q = p;
              if (dbg.live) { const L = dbg.live(); if (!L.length) { M.update(0.05); continue; } q = L[0]; gameBots[0].x = q.x + 0.4; gameBots[0].z = q.z; }
              camera.position.set(q.x, 1.65, q.z); players[myId].hp = 60; slamState = null; playerRootedUntil = 0; playerYVel = 0; isDead = false;
              const bx = gameBots[0]; bx.hp = Math.min(bx.hp, 200);
              if (dbg.poke && s % 40 === 5) dbg.poke();
              M.update(0.05); updateMapGimmicks(0.05);
              if (players[myId].hp !== 60 || slamState || playerRootedUntil > Date.now() || _gimSlowState.v < 1 || _playerInLowGrav || _gimRollNow() !== 0 ||
                  Math.hypot(camera.position.x - q.x, camera.position.z - q.z) > 1.0 || bx.hp !== 200 || bx.yVel > 0 || bx.dead || Math.hypot(bx.x - (q.x + 0.4), bx.z - q.z) > 0.6) eff = true;
            }
            if (eff) effects++;
          }
          if (!effects) issues.push(n + ': nothing happened to an actor standing where the gimmick says it works (' + tests + ' probes)');
        } catch (e) { issues.push(n + ': ' + e.message + ' @ ' + String((e.stack || '').split('\\n')[1] || '').trim()); }
      }
    } finally { playSoundEvent = ps; updateMatchHUD = hud; gameBots.length = 0; }
    const looks = Object.keys(LOOK).filter(n => !(MAP_GROUPS[n] && MAP_GROUPS[n]._upgraded)).length;
    return { issues, notes, count: names.length, looks: Object.keys(LOOK).length, unbuiltLooks: looks };
  })()`);
  if (rep.issues.length) { ok = false; console.log(rep.issues.join('\n')); }
  console.log('gimmicks: ' + rep.count + ' maps with their own mechanic, ' + rep.looks + ' with a prop pass; ' + (rep.notes.length ? 'no point-probe for ' + rep.notes.join(', ') : 'every one probed'));
}

if (ok && process.argv.includes('--wraps')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], originalMap = new THREE.Texture(), originalBump = new THREE.Texture();
    const model = new THREE.Group();
    const main = new THREE.Mesh(new THREE.BoxGeometry(.1, .06, .2), new THREE.MeshStandardMaterial({ color: 0x456789, map: originalMap, bumpMap: originalBump, roughness: .67, metalness: .8 }));
    main.material.userData.surfaceMap = true; model.add(main);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(.01, .01, .01), new THREE.MeshStandardMaterial({ color: 0x111111 })); model.add(sight);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(.01, .01, .01), new THREE.MeshBasicMaterial({ color: 0x55aaff })); model.add(lens);
    const locked = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), new THREE.MeshStandardMaterial({ color: 0xaa1122 })); locked.material.userData.skinLock = true; model.add(locked);
    const lockedMat = locked.material, geometry = main.geometry;
    for (const id of ['carbon', 'wood', 'fire', 'obsidian', 'ultraviolet', 'cyber']) {
      const skin = WEAPON_SKINS_BY_ID[id];
      if (!skin?.wrap) { issues.push(id + ': missing wrap'); continue; }
      applyWeaponSkin(model, skin);
      const surface = getWeaponWrapSurface(id);
      if (main.material.map !== surface.map || main.material.bumpMap !== surface.bumpMap) issues.push(id + ': wrap did not reach gun');
      if (getWeaponWrapSurface(id) !== surface) issues.push(id + ': texture cache missed');
      if (main.geometry !== geometry || locked.material !== lockedMat || lens.material.color.getHex() !== 0x55aaff || sight.material.map !== surface.map) issues.push(id + ': solid trim uncovered or protected surface altered');
      if (id === 'wood' && main.material.metalness !== 0) issues.push('wood reads as metal');
      if (id === 'fire' && !main.material.emissiveMap) issues.push('fire has no glow mask');
    }
    applyWeaponSkin(model, WEAPON_SKINS_BY_ID.woodland);
    if (main.material.map !== _wsTextures('woodland', 0).map || main.material.bumpMap !== originalBump) issues.push('legacy pattern did not replace wrap cleanly');
    applyWeaponSkin(model, WEAPON_SKINS_BY_ID.cyber);
    if (main.material.map !== getWeaponWrapSurface('cyber').map) issues.push('wrap did not replace legacy pattern');
    applyWeaponSkin(model, WEAPON_SKINS_BY_ID.default);
    if (main.material.map !== originalMap || main.material.bumpMap !== originalBump || main.material.color.getHex() !== 0x456789 || main.material.roughness !== .67 || main.material.metalness !== .8 || main.material.emissiveMap) issues.push('stock did not restore original material');
    const allSides = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0x555555 }), accent = new THREE.MeshStandardMaterial({ color: 0x777777 });
    const multi = new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1), [body, accent, new THREE.MeshStandardMaterial({ map: originalMap }), body, accent, new THREE.MeshStandardMaterial()]);
    allSides.add(multi); allSides._bodyMat = body; allSides._accentMat = accent;
    const shared = new THREE.BoxGeometry(.02,.1,.2); shared.deleteAttribute('uv');
    const noUV = new THREE.Mesh(shared, body), alsoNoUV = new THREE.Mesh(shared, body); allSides.add(noUV, alsoNoUV);
    const hand = new THREE.Group(); hand.userData.vmHand = true;
    const handMesh = new THREE.Mesh(shared, body); hand.add(handMesh); allSides.add(hand);
    const glass = new THREE.Mesh(shared, new THREE.MeshPhysicalMaterial({ transparent: true, opacity: .5, transmission: .8 })); allSides.add(glass);
    const glassMat = glass.material;
    const shape = new THREE.Shape(); shape.moveTo(0,0); shape.lineTo(.15,0); shape.lineTo(.15,.06); shape.lineTo(0,.06); shape.closePath();
    const extruded = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth:.015, bevelEnabled:false }), accent); allSides.add(extruded);
    const originalUV = extruded.geometry.attributes.uv.array.slice();
    applyWeaponSkin(allSides, WEAPON_SKINS_BY_ID.ultraviolet);
    const uvMap = getWeaponWrapSurface('ultraviolet').map;
    if (multi.material.some(m => m.map !== uvMap) || allSides._bodyMat.map !== uvMap || allSides._accentMat.map !== uvMap) issues.push('material slots, original maps or accent faces missed wrap');
    for (const mesh of [noUV, alsoNoUV, extruded]) {
      if (!mesh.geometry.attributes.uv || mesh.material.map !== uvMap) issues.push('shared or extruded face lacked wrap');
      const pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal, uv = mesh.geometry.attributes.uv;
      for (let k = 0; k + 2 < pos.count && !mesh.geometry.index; k += 3) {
        const area = Math.abs((uv.getX(k+1)-uv.getX(k))*(uv.getY(k+2)-uv.getY(k))-(uv.getX(k+2)-uv.getX(k))*(uv.getY(k+1)-uv.getY(k)));
        if (area < .00001) issues.push('extruded face sampled a single texture line');
      }
    }
    if (handMesh.material !== body || handMesh.geometry !== shared || shared.attributes.uv || glass.material !== glassMat || glass.geometry !== shared) issues.push('wrap leaked onto hand/glass or shared geometry');
    applyWeaponSkin(allSides, WEAPON_SKINS_BY_ID.default);
    if (noUV.geometry.attributes.uv || alsoNoUV.geometry.attributes.uv || extruded.geometry.attributes.uv.array.some((v,i) => v !== originalUV[i]) || multi.material[2].map !== originalMap) issues.push('stock UV or authored map restoration failed');
    const lateGeo = new THREE.BoxGeometry(.025,.03,.06); lateGeo.deleteAttribute('uv');
    const late = new THREE.Mesh(lateGeo, accent); allSides.add(late);
    const stableMat = multi.material[0];
    applyWeaponSkin(allSides, WEAPON_SKINS_BY_ID.ultraviolet);
    if (late.material.map !== uvMap || !late.geometry.attributes.uv || multi.material[0] !== stableMat) issues.push('late fittings missed wrap or existing materials recloned');
    applyWeaponSkin(allSides, WEAPON_SKINS_BY_ID.default);
    if (late.geometry.attributes.uv) issues.push('late fitting UV restoration failed');
    console.log('wrap checks: six finishes, every material slot, accent/trim coverage, projected faces, protected hands/lenses and stock restoration');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--secret-inspects')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    for (const [skinId, def] of Object.entries(SECRET_INSPECTS)) {
      const skin = MODEL_SKINS.find(s => s.id === skinId);
      if (!skin) { issues.push(skinId + ': missing skin'); continue; }
      const old = _activeModelSkin[skin.weapon];
      _activeModelSkin[skin.weapon] = skin;
      const key = skin.weapon + ':' + skinId;
      _secretInspectCounts.delete(key);
      const model = new THREE.Group();
      const rear = new THREE.Group(), front = new THREE.Group(), main = new THREE.Group();
      rear.add(new THREE.Mesh(new THREE.BoxGeometry(.02, .02, .02), new THREE.MeshStandardMaterial()));
      front.position.set(-.03, -.05, -.04); main._home = new THREE.Vector3(0, .02, -.03); main.position.copy(main._home);
      model.add(rear, front, main); model._homePos = model.position.clone();
      model._parts = { main };
      model._hands = { rear, front, rearHome: rear.position.clone(), frontHome: front.position.clone(), rearRot: rear.rotation.clone(), frontRot: front.rotation.clone(), single: def.kind === 'receipt', hideFront: false };
      const initialChildren = model.children.length;
      for (let n = 1; n <= def.every * 2; n++) {
        const run = secretInspectFor(skin.weapon);
        if (run.triggered !== (n % def.every === 0)) issues.push(skinId + ': wrong repeat threshold');
        model._secretInspect = run;
        const pose = { rx: 0, rz: 0, py: 0 };
        updateSecretInspect(model, .2, pose);
        if (run.triggered && (!run.group || run.group.children.length < 4 || run.group.scale.x <= 0)) issues.push(skinId + ': missing visible effect');
        if (run.triggered) {
          run.sounded = true; // Audio is unavailable in this headless WebGL harness.
          const track = SECRET_INSPECT_TRACKS[run.kind];
          if (!track || !track.some(k => Math.abs(k.hx) + Math.abs(k.hy) + Math.abs(k.hz) > .05)) issues.push(skinId + ': missing independent hand track');
          for (const t of [.45, .65, .9]) {
            const p = _reloadPose(track, t);
            main.position.set(main._home.x + p.ax, main._home.y + p.ay, main._home.z + p.az); main.rotation.set(p.arx, p.ary, p.arz);
            updateSecretInspect(model, t, p); finishSecretInspectPose(model, t, p);
            const hand = run.extraHand || front;
            if (t === .45 && hand.position.distanceTo(model._hands.frontHome) < .001) issues.push(skinId + ': hand did not act');
            if (run.kind === 'donut' && t === .65 && (main.position.distanceTo(main._home) < .05 || Math.abs(main.rotation.z) < Math.PI * 2)) issues.push('glazer did not remove and spin its real cylinder');
          }
          run.group.traverse(o => {
            if (![...o.position.toArray(), ...o.scale.toArray(), o.rotation.x, o.rotation.y, o.rotation.z].every(Number.isFinite)) issues.push(skinId + ': invalid animated transform');
          });
          if (run.kind === 'splash' && (run.balloon.visible || !run.group.children.some(o => o.userData.drop !== undefined && o.visible))) issues.push('balloon did not burst');
        }
        let disposed = 0, geometryCount = 0;
        if (run.group) run.group.traverse(o => { if (o.geometry) { geometryCount++; o.geometry.addEventListener('dispose', () => disposed++); } });
        clearSecretInspect(model, true);
        if (model.children.length !== initialChildren || model._secretInspect || disposed !== geometryCount) issues.push(skinId + ': leaked effect resources');
        if (!rear.position.equals(model._hands.rearHome) || !front.position.equals(model._hands.frontHome) || !main.position.equals(main._home)) issues.push(skinId + ': did not restore hands or cylinder');
      }
      const count = _secretInspectCounts.get(key);
      model._secretInspect = secretInspectFor(skin.weapon);
      clearSecretInspect(model);
      if (_secretInspectCounts.get(key) !== count) issues.push(skinId + ': interrupted inspect counted');
      _activeModelSkin[skin.weapon] = null;
      if (secretInspectFor(skin.weapon)) issues.push(skinId + ': stock triggered skin secret');
      _activeModelSkin[skin.weapon] = { ...skin, weapon: 'wrong_weapon' };
      if (secretInspectFor(skin.weapon)) issues.push(skinId + ': wrong weapon triggered secret');
      _activeModelSkin[skin.weapon] = old;
      _secretInspectCounts.delete(key);
    }
    const idx = WEAPONS.findIndex(w => w.id === 'pistol');
    const saved = { idx: currentWeaponIdx, model: weaponModels[idx], skin: _activeModelSkin.pistol, dead: isDead, reload: reloading, audio: getAudioCtx };
    try {
      currentWeaponIdx = idx; isDead = false; reloading = false; getAudioCtx = () => null;
      weaponModels[idx] = new THREE.Group();
      _activeModelSkin.pistol = MODEL_SKINS.find(s => s.id === 'pistol_blaster');
      const key = 'pistol:pistol_blaster'; _secretInspectCounts.set(key, 3);
      startInspect();
      const model = weaponModels[idx];
      if (!model._secretInspect?.triggered || model._reloadDur !== 3400) issues.push('secret animation did not start');
      model._reloadStart = Date.now() - 800; updateReloadAnim();
      if (!model._secretInspect?.group) issues.push('secret animation did not run through frame update');
      model._reloadStart = Date.now() - 4000; updateReloadAnim(); updateReloadAnim();
      if (_secretInspectCounts.get(key) !== 4 || model._inspectMode || model.children.length) issues.push('completed animation counted twice or failed cleanup');
      startInspect(); cancelInspect();
      if (_secretInspectCounts.get(key) !== 4 || model._inspectMode) issues.push('cancel counted inspection');
      _secretInspectCounts.delete(key);
    } finally {
      currentWeaponIdx = saved.idx; weaponModels[idx] = saved.model; _activeModelSkin.pistol = saved.skin;
      isDead = saved.dead; reloading = saved.reload; getAudioCtx = saved.audio;
    }
    const ri = WEAPONS.findIndex(w => w.id === 'revolver');
    const revolverSaved = { idx: currentWeaponIdx, model: weaponModels[ri], skin: _activeModelSkin.revolver, dead: isDead, reload: reloading, audio: getAudioCtx };
    try {
      currentWeaponIdx = ri; isDead = false; reloading = false; getAudioCtx = () => null;
      const model = prepViewModel(buildDonutRevolver(), 'revolver'); weaponModels[ri] = model;
      _activeModelSkin.revolver = MODEL_SKINS.find(s => s.id === 'revolver_donut');
      _secretInspectCounts.set('revolver:revolver_donut', 5);
      startInspect();
      const cylinder = model._parts.main, angles = [];
      for (const t of [.4, .5, .6]) {
        model._reloadStart = Date.now() - model._reloadDur * t;
        updateReloadAnim();
        const angle = cylinder.rotation.z;
        updateCylinders(1 / 60); // Same ordering as the live render loop.
        if (Math.abs(cylinder.rotation.z - angle) > .001) issues.push('live cylinder update overwrote secret spin');
        if (Math.abs(cylinder.rotation.x) < .3) issues.push('glazer spin lacked visible tilt');
        angles.push(cylinder.rotation.z);
      }
      if (angles[2] - angles[0] < Math.PI * 2) issues.push('glazer failed to visibly spin through a revolution');
      cancelInspect(); updateCylinders(1 / 60);
      if (!cylinder.position.equals(cylinder._home) || cylinder.rotation.x || cylinder.rotation.y || Math.abs(cylinder.rotation.z - (cylinder._spin || 0)) > .001) issues.push('glazer did not restore firing cylinder');
      _secretInspectCounts.delete('revolver:revolver_donut');
    } finally {
      currentWeaponIdx = revolverSaved.idx; weaponModels[ri] = revolverSaved.model; _activeModelSkin.revolver = revolverSaved.skin;
      isDead = revolverSaved.dead; reloading = revolverSaved.reload; getAudioCtx = revolverSaved.audio;
    }
    console.log('secret inspect checks: ' + Object.keys(SECRET_INSPECTS).length + ' skin/weapon pairs, live cylinder ordering, frame updates, cancellation and resource cleanup');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--combat-feedback')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], saved = { boxes: wallColliders.slice(), pos: camera.position.clone(), vel: playerYVel, slam: slamState, eye: window._crouchEye, armed: window._climbArmed, climbing: window._climbing, slide: window._slideUntil, ads: isADS, id: myId, match, turns: _killfeedTurnSamples.slice() };
    try {
      wallColliders.length = 0;
      const roof = new THREE.Box3(new THREE.Vector3(-8, 2.5, -8), new THREE.Vector3(8, 2.6, 8)); wallColliders.push(roof);
      window._crouchEye = 1.65; window._climbArmed = true;
      camera.position.set(0, 4, 0); playerYVel = 20; slamState = null;
      if (!resolvePlayerCeiling(1.8) || camera.position.y >= 2.5 - PLAYER_HEAD_CLEARANCE || playerYVel !== 0 || window._climbArmed) issues.push('standing jump failed swept ceiling contact');
      resolveWallCollisions();
      if (camera.position.x || camera.position.z || camera.position.y > 2.4) issues.push('roof still ejects player sideways');
      camera.position.set(0, 3, 0); slamState = { vel: 15, type: 'jump' };
      resolvePlayerCeiling(1.8);
      if (slamState.vel !== 0 || slamState.type !== 'fall') issues.push('slide/double jump did not stop at ceiling');
      window._crouchEye = .95; roof.min.y = 1.6; roof.max.y = 1.7;
      camera.position.set(0, 2, 0); slamState = null; resolvePlayerCeiling(1);
      resolveWallCollisions();
      if (camera.position.x || camera.position.z || camera.position.y > 1.42) issues.push('crouched ceiling contact failed');
      camera.position.set(10, 3, 10);
      if (resolvePlayerCeiling(1)) issues.push('non-overlapping roof blocked jump');
      camera.position.set(0, 4, 0);
      if (resolvePlayerCeiling(4.5)) issues.push('downward landing treated as ceiling');
      roof.min.y = 20; roof.max.y = 20.02; camera.position.set(0, 25, 0);
      if (!resolvePlayerCeiling(15)) issues.push('high thin ceiling tunneled');
      wallColliders.length = 0; window._crouchEye = 1.65; camera.position.set(0, 1.65, 0);
      isADS = false; myId = 'feedback-test'; _killfeedTurnSamples.length = 0;
      if (!killfeedShotTags('srx').includes('NO SCOPE') || killfeedTagMark('NO SCOPE')[0] !== '' || killfeedTagMark('NO SCOPE')[1] !== 'noscope') issues.push('no-scope symbol failed');
      isADS = true;
      if (killfeedShotTags('srx').includes('NO SCOPE')) issues.push('scoped shot labeled no scope');
      camera.position.y = 3;
      if (!killfeedShotTags('pistol').includes('AIR')) issues.push('air kill context missing');
      camera.position.y = 1.65; window._slideUntil = Date.now() + 1000;
      if (!killfeedShotTags('pistol').includes('SLIDE')) issues.push('slide kill context missing');
      noteKillInfo('feedback-target', myId, 'ak20', false);
      if (!killfeedShotTags('pistol', { targetId: 'feedback-target' }).includes('COMBO')) issues.push('weapon-switch combo missing');
      noteKillInfo('feedback-target', myId, 'pistol', false, { tags: ['COMBO'] });
      if (!killfeedShotTags('pistol', { targetId: 'feedback-target' }).includes('COMBO')) issues.push('same-weapon follow-up lost combo');
      match = {}; _killfeedChains.clear();
      if (killfeedChain('a', 'killer', 1000) !== 1 || killfeedChain('b', 'killer', 2000) !== 2 || killfeedChain('c', 'killer', 8001) !== 1) issues.push('multi-kill window wrong');
      killfeedChain('killer', null, 8100);
      if (killfeedChain('d', 'killer', 8200) !== 1 || killfeedChain('killer', 'killer', 8300) !== 0) issues.push('death/self-kill did not reset streak');
      if (!killfeedLaser('gatecrasher_beam') || !killfeedLaser('cyroclasm_laser') || !killfeedLaser('laser') || killfeedLaser('ak20') || killfeedLaser('taser')) issues.push('laser gag classification wrong');
      for (const [weapon, info, self, want] of [
        ['rpg', {}, false, 'boom'], ['freeze_gun', {}, false, 'ice'], ['taser', {}, false, 'electric'],
        ['flamethrower', {}, false, 'fire'], [null, { cause: 'fall' }, false, 'fall'],
        ['air_blaster', { cause: 'ringout' }, false, 'ringout'], ['rpg', {}, true, 'self'],
        ['pistol', { look: 'fart_cloud' }, false, 'fart'], ['vector', { look: 'bubble_shot' }, false, 'bubble'],
        ['rpg', { look: 'donut' }, false, 'donut'], ['rpg', { look: 'water_balloon' }, false, 'water'],
        ['sg8', { look: 'void' }, false, 'void'], ['frying_pan', {}, false, 'bonk'], ['throwing_knives', {}, false, 'thrown'],
        ['pistol', { look: 'beam' }, false, 'laser'], ['ak20', {}, false, null],
        [null, { cause: 'hazard', label: KILLFEED_HAZARDS.lava }, true, 'fire'],
      ]) if (killfeedGagKind(weapon, info, self) !== want) issues.push(String(weapon) + ': gag category wrong');
      for (const kind of Object.keys(KILLFEED_LOGOS)) {
        const url = killfeedLogoURL(kind), cached = _killfeedLogoCache.get(kind);
        if (!url.startsWith('data:image/png') || url !== killfeedLogoURL(kind) || cached.canvas.width !== 128 || cached.canvas.height !== 128) issues.push(kind + ': logo generation/cache broken');
      }
      if (killfeedLogoURL('unknown')) issues.push('unknown kill received a logo');
    } finally {
      wallColliders.splice(0, wallColliders.length, ...saved.boxes); camera.position.copy(saved.pos); playerYVel = saved.vel; slamState = saved.slam;
      window._crouchEye = saved.eye; window._climbArmed = saved.armed; window._climbing = saved.climbing; window._slideUntil = saved.slide;
      isADS = saved.ads; myId = saved.id; match = saved.match; _killfeedTurnSamples.splice(0, _killfeedTurnSamples.length, ...saved.turns);
      delete _killInfo['feedback-target']; _killfeedChains.clear(); _killfeedChainMatch = null;
    }
    console.log('combat feedback checks: swept ceilings, crouch, high roofs, no-scope symbols, position tags, combos, streak resets and laser classification');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--emotes')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], mesh = makePlayerMesh('Emote test', false, 'ally', 'default');
    try {
      if (keyBoundTo('emotes') !== 'KeyQ' || keyBoundTo('freecam') !== 'Digit0') issues.push('default controls wrong');
      for (const e of EMOTES) {
        animateCharacterMesh(mesh, .016, 0);
        const before = mesh._rig.armL.rotation.clone();
        poseEmote(mesh, e.id, .37);
        if (!mesh._emotePose || mesh._rig.armL.rotation.equals(before)) issues.push(e.id + ': no distinct pose');
        const root = mesh._emoteRoot, r = mesh._rig;
        for (const joint of [r.head, r.torso, r.pelvis, r.armL, r.armR, r.legL, r.legR]) {
          if (joint.parent !== root) issues.push(e.id + ': detached body turn');
        }
        if (e.id === 'take_l' && (r.legL.rotation.z >= 0 || r.legR.rotation.z <= 0)) issues.push('Take the L kicks inward');
        if (e.id === 'victory' && (r.armL.rotation.z >= 0 || r.armR.rotation.z <= 0)) issues.push('Victory arms raised inward');
        if (e.id === 'shuffle' && (Math.abs(root.rotation.y) < .01 || r.torso.rotation.y !== 0)) issues.push('Shuffle turns torso alone');
        restoreEmotePose(mesh);
        if (!mesh._rig.armL.rotation.equals(before) || mesh._emoteL?.visible) issues.push(e.id + ': restoration failed');
        if (root.rotation.x || root.rotation.y || root.rotation.z || root.position.lengthSq()) issues.push(e.id + ': whole-body turn not restored');
      }
    } finally { disposeBody(mesh); }
    console.log('emote checks: Q/0 bindings, four distinct joint poses, temporary fingers and pose restoration');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--emotes')) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const handler = src.match(/socket\.on\('move', \(data\) => \{([\s\S]*?)\n  \}\);/);
  if (!handler) throw new Error('move handler missing');
  const player = { dead: false }, box = { players: { tester: player }, socket: { id: 'tester' }, Date };
  const move = vm.runInNewContext('(data) => {' + handler[1] + '}', box);
  move({ x: 1, y: 1.65, z: 2, rotY: 0, rotX: 0, emote: 'take_l' });
  const until = player.emoteUntil;
  move({ emote: 'take_l' });
  if (player.emote !== 'take_l' || until !== player.emoteUntil) throw new Error('emote duration resets every position packet');
  move({ emote: '__proto__' });
  if (player.emote !== null || player.emoteUntil !== 0) throw new Error('invalid emote accepted');
  move({ emote: 'wave' }); player.dead = true; move({ emote: 'shuffle' });
  if (player.emote !== 'wave') throw new Error('dead player can start emotes');
  console.log('emote relay checks: valid IDs, fixed duration, cancellation and dead-player guard');
}

if (ok && process.argv.includes('--perspectives')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], saved = { gameStarted, isDead, isADS, reloading, reload: _reloadSt, mode: selectedModeConfig,
      pos: camera.position.clone(), quat: camera.quaternion.clone(), yaw: euler.clone(), boxes: wallColliders.slice(),
      dialogs: anyDialogOpen, loadout: isLoadoutOpen, social: SOCIAL_VIEW.mode, skin: mySkin };
    try {
      gameStarted = true; isDead = isADS = reloading = false; selectedModeConfig = null; SOCIAL_VIEW.mode = null;
      anyDialogOpen = isLoadoutOpen = () => false;
      camera.position.set(0,1.65,0); camera.quaternion.identity(); euler.set(0,0,0,'YXZ'); wallColliders.length = 0;
      if (keyBoundTo('perspective') !== 'Digit9') issues.push('perspective binding missing');
      PLAYER_VIEW.mode = 'third'; let c = updatePlayerView(.016);
      if (c === camera || c.position.z <= 0 || !PLAYER_VIEW.actor.visible) issues.push('third-person framing failed');
      PLAYER_VIEW.mode = 'second'; c = updatePlayerView(.016);
      if (c === camera || c.position.z >= 0 || !PLAYER_VIEW.actor.visible) issues.push('second-person framing failed');
      if (!camera.position.equals(new THREE.Vector3(0,1.65,0))) issues.push('perspective moved player');
      isADS = true;
      if (updatePlayerView(.016) !== camera || PLAYER_VIEW.actor.visible) issues.push('ADS fallback failed');
      isADS = false; reloading = true; _reloadSt = { start: Date.now() - 300, dur: 2000 };
      updatePlayerView(.016); reloading = false;
      SOCIAL_VIEW.mode = 'free';
      if (updatePlayerView(.016) !== camera || PLAYER_VIEW.actor.visible) issues.push('freecam duplicate body');
      SOCIAL_VIEW.mode = null; PLAYER_VIEW.mode = 'third';
      wallColliders.push(new THREE.Box3(new THREE.Vector3(-5,0,1), new THREE.Vector3(5,5,2)));
      c = updatePlayerView(.016);
      if (c !== camera && c.position.z >= 1) issues.push('camera crossed wall');
      PLAYER_VIEW.mode = 'first';
      if (updatePlayerView(.016) !== camera || PLAYER_VIEW.actor.visible) issues.push('first-person restoration failed');
    } finally {
      resetPlayerView(); gameStarted = saved.gameStarted; isDead = saved.isDead; isADS = saved.isADS; reloading = saved.reloading;
      _reloadSt = saved.reload; selectedModeConfig = saved.mode; SOCIAL_VIEW.mode = saved.social; mySkin = saved.skin;
      anyDialogOpen = saved.dialogs; isLoadoutOpen = saved.loadout; camera.position.copy(saved.pos); camera.quaternion.copy(saved.quat);
      euler.copy(saved.yaw); wallColliders.splice(0,wallColliders.length,...saved.boxes);
    }
    console.log('perspective checks: first/third/second cameras, fixed physical position, ADS, reload, freecam, wall avoidance and cleanup');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--steady-body')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    for (const bot of [false, true]) for (const armed of [false, true]) {
      const mesh = makePlayerMesh('Steady body test', bot, 'ally', 'default'), r = mesh._rig;
      r.holdsGun = armed;
      let low = Infinity, high = -Infinity;
      try {
        for (const airborne of [0, 1]) for (const crouch of [0, .5]) {
          for (let frame = 0; frame < 90; frame++) {
            mesh.position.z += .12;
            animateCharacterMesh(mesh, 1/60, crouch, 0, airborne, .4);
            for (const joint of [r.torso, r.head, r.pelvis]) {
              if (Math.abs(joint.rotation.y) > 1e-8 || Math.abs(joint.rotation.z) > 1e-8) issues.push('walking/jumping trunk oscillates');
            }
            low = Math.min(low, r.legL.rotation.x); high = Math.max(high, r.legL.rotation.x);
          }
        }
        if (high-low < .2) issues.push('leg movement lost');
        const aimedUp = r.head.rotation.x;
        r.aim = -.4; animateCharacterMesh(mesh, 1/60, .5, 0, 1, -.4);
        if (Math.abs(r.head.rotation.x - aimedUp) < .1) issues.push('aim pitch lost');
        flinchCharacter(mesh, 60, 1, 0); animateCharacterMesh(mesh, 1/60, 0);
        if (Math.abs(r.torso.rotation.z) < .001) issues.push('hit reaction lost');
        r.hitK = 0; animateCharacterMesh(mesh, 1/60, 0);
        if (r.head.rotation.y || r.head.rotation.z || r.torso.rotation.y || r.torso.rotation.z) issues.push('stale twist after hit');
      } finally { disposeBody(mesh); }
    }
    console.log('steady body checks: armed/unarmed players and bots, walking, crouching, jumping, leg motion, aim and hit recovery');
    return [...new Set(issues)];
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--chain-maul')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], v = (x,y,z) => new THREE.Vector3(x,y,z);
    const check = (condition, text) => { if (!condition) issues.push(text); };
    check(chainMaulHitZone(v(0,1,0),v(0,1,-4),v(0,1,-4),v(0,0,-4)) === 'head', 'ball contact must damage');
    check(chainMaulHitZone(v(0,1,0),v(0,1,-4),v(0,1,-4),v(0,0,-2)) === 'chain', 'mid-chain must only pull');
    check(!chainMaulHitZone(v(0,1,0),v(0,1,-4),v(0,1,-4),v(2,0,-2)), 'miss counted as hit');
    check(chainMaulHitZone(v(0,1,0),v(1,1,-4),v(-1,1,-4),v(0,0,-4)) === 'head', 'swept ball tunnels');
    const saved = { players, remoteMeshes, selectedMeleeIdx, activeSlot, isDead, gameStarted, countdownActive,
      inLobby, social: SOCIAL_VIEW.mode, camera: camera.position.clone(), quat: camera.quaternion.clone(),
      boxes: wallColliders.slice(), emitHit, resolveBot, friendlyFireBlocked, playSoundEvent, spawnHitParticle,
      swingDuration: meleeSwingDur, maulPosition: meleeModels[MELEE_ITEMS.findIndex(m => m.id === 'chain_hammer')].position.clone(),
      maulRotation: meleeModels[MELEE_ITEMS.findIndex(m => m.id === 'chain_hammer')].rotation.clone() };
    try {
      selectedMeleeIdx = MELEE_ITEMS.findIndex(m => m.id === 'chain_hammer');
      const item = MELEE_ITEMS[selectedMeleeIdx], model = meleeModels[selectedMeleeIdx];
      check(MELEE_ITEMS.length === meleeModels.length && meleeModels.length === MELEE_SWING_TYPES.length, 'melee arrays misaligned');
      check(item.damage === 85 && MELEE_SWING_SOUND[item.id] === 'heavy', 'stats/audio missing');
      activeSlot = 'melee'; isDead = false; gameStarted = true; countdownActive = false; inLobby = false; SOCIAL_VIEW.mode = null;
      camera.position.set(0,1.6,0); camera.quaternion.identity(); model.position.set(0,0,-.4); model.rotation.set(0,0,0);
      wallColliders.length = 0;
      let damage = 0, pulls = 0;
      emitHit = (pid,id,weapon,pos,hs,opts) => { damage += opts.damageOverride; };
      playSoundEvent = spawnHitParticle = () => {};
      const bot = { dead:false, kbVX:0, kbVZ:0, yVel:0 };
      resolveBot = () => { pulls++; return bot; };
      friendlyFireBlocked = () => false;
      const enemy = new THREE.Group(); enemy.position.set(0,0,-10.65);
      players = { target:{ dead:false } }; remoteMeshes = { target:enemy };
      meleeSwingDur = 720;
      const swing = () => { startChainMaulSwing(item); for(let i=0;i<100;i++) updateChainMaulSwing(.008); };
      swing(); check(damage === 85, 'head must deal exactly 85 once per swing');
      check(!chainMaulSwing && model._chain.visible, 'swing leaked cable or hid idle model');
      damage = 0; pulls = 0; enemy.position.set(0,0,-2);
      swing(); check(damage === 0 && pulls === 1 && bot.kbVZ > 0, 'chain must pull once toward player, without damage');
      friendlyFireBlocked = () => true; damage = 0; pulls = 0;
      swing(); check(!damage && !pulls, 'teammate hit');
      friendlyFireBlocked = () => false;
      wallColliders.push(new THREE.Box3(v(-10,0,-1.3),v(10,5,-1)));
      swing(); check(!damage && !pulls, 'wall allowed catch');
      wallColliders.length = 0; inLobby = true;
      swing(); check(!pulls, 'lobby allowed pull');
      startChainMaulSwing(item); isDead = true; updateChainMaulSwing(.01);
      check(!chainMaulSwing && model._chain.visible, 'death did not cancel');
    } finally {
      finishChainMaulSwing();
      const maul = meleeModels[MELEE_ITEMS.findIndex(m => m.id === 'chain_hammer')];
      maul.position.copy(saved.maulPosition); maul.rotation.copy(saved.maulRotation); meleeSwingDur = saved.swingDuration;
      players = saved.players; remoteMeshes = saved.remoteMeshes;
      selectedMeleeIdx = saved.selectedMeleeIdx; activeSlot = saved.activeSlot; isDead = saved.isDead;
      gameStarted = saved.gameStarted; countdownActive = saved.countdownActive; inLobby = saved.inLobby; SOCIAL_VIEW.mode = saved.social;
      camera.position.copy(saved.camera); camera.quaternion.copy(saved.quat); wallColliders.splice(0,wallColliders.length,...saved.boxes);
      emitHit = saved.emitHit; resolveBot = saved.resolveBot; friendlyFireBlocked = saved.friendlyFireBlocked;
      playSoundEvent = saved.playSoundEvent; spawnHitParticle = saved.spawnHitParticle;
    }
    console.log('chain maul checks: swept head/chain zones, damage, pulling, teammates, walls, lobby and cleanup');
    return issues;
  })()`);
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--modes')) {
  // The pure parts of the dice / roulette / rumble modes and of hit grading: pool ids really are
  // weapons, the die maps to tiers the way the page says, the bot re-rolls junk and keeps gold, and
  // every grade comes out of the thresholds it is documented to.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    for (const t of Object.keys(DICE_POOL)) for (const id of DICE_POOL[t]) if (!WEAPONS.some(w => w.id === id)) issues.push('dice pool: ' + t + ' has unknown weapon ' + id);
    const want = { 1: 'F', 2: 'D', 3: 'D', 4: 'C', 8: 'C', 9: 'B', 14: 'B', 15: 'A', 17: 'A', 18: 'S', 19: 'S', 20: 'SS' };
    for (const [v, t] of Object.entries(want)) if (diceTierOf(+v) !== t) issues.push('die ' + v + ' should be ' + t + ', got ' + diceTierOf(+v));
    const counts = {};
    for (let i = 0; i < 4000; i++) { const r = diceRollOnce(); counts[r.tier] = (counts[r.tier] || 0) + 1;
      if (!WEAPONS.some(w => w.id === r.weaponId)) { issues.push('roll gave unknown weapon ' + r.weaponId); break; } }
    if (!(counts.B > counts.SS * 3 && counts.SS > 0 && counts.F > 0)) issues.push('d20 tier spread looks wrong: ' + JSON.stringify(counts));
    const rate = (own, opp, used) => { let n = 0; for (let i = 0; i < 2000; i++) if (diceBotWantsReroll(own, opp, used)) n++; return n / 2000; };
    const F = { tier: 'F' }, C = { tier: 'C' }, B = { tier: 'B' }, A = { tier: 'A' }, SS = { tier: 'SS' };
    if (rate(F, B, 0) < 0.95) issues.push('bot should nearly always re-roll an F');
    if (rate(SS, B, 0) > 0.02) issues.push('bot should keep an SS');
    if (rate(A, B, 0) > 0.15) issues.push('bot should mostly keep an A');
    if (rate(B, SS, 0) < 0.4) issues.push('bot should gamble on a B when you rolled an SS');
    if (rate(F, SS, DICE_MAX_REROLLS) !== 0) issues.push('bot re-rolled past the limit');
    if (rate(C, C, 3) > rate(C, C, 0)) issues.push('re-roll appetite should fall as the price climbs');
    const g = (h, f, m) => gradeHit(h, f, m);
    const grades = [g(false, 1), g(false, 0.4), g(false, 0.7), g(true, 0.7, 0.2), g(true, 0.3, 0.2), g(true, 1, 0.2), g(true, 1, 0.05), g(true, 0.8, 0.05)];
    if (grades.join() !== 'yellow,white,yellow,orange,orange,red,blue,orange') issues.push('hit grades: ' + grades.join());
    for (const id of ['dice_duel', 'roulette', 'rocket_rumble']) {
      const c = GAME_MODE_CONFIGS[id];
      if (!c || c.type !== 'arcade' || !c.arcade) issues.push('mode config missing or wrong: ' + id);
    }
    return issues;
  })()`);
  const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  for (const id of ['dice_duel', 'roulette', 'rocket_rumble']) {
    if (!new RegExp("'" + id + "'\\s*:\\s*\\{\\s*ally").test(serverSrc)) issues.push('server has no team size for ' + id);
    if (!new RegExp("FRIENDLY_FIRE_FREE_FOR_ALL_MODES[\\s\\S]{0,400}'" + id + "'").test(serverSrc)) issues.push('server FFA list is missing ' + id);
  }
  console.log('mode checks: dice pool and tiers, bot re-roll judgement, hit grades, mode wiring');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--wraps')) {
  // The contract wraps: every one has a contract, a look and a pattern that paints without throwing, and the
  // contracts count the way the picker says they do (weapon kills, headshots, tags, a life, a streak) and do not
  // count where they should not (the range, an echoed kill).
  const issues = vm.runInThisContext(`(() => {
    const issues = [], seen = new Set();
    for (const c of CONTRACTS) {
      if (seen.has(c.id)) issues.push('duplicate contract ' + c.id); seen.add(c.id);
      const sk = WEAPON_SKINS_BY_ID[c.wrap];
      if (!sk || !sk.contract) issues.push(c.id + ': ' + c.wrap + ' is not a contract wrap');
      const look = WS_LOOKS[c.wrap];
      if (!look || !WS_PATTERNS[look.pat]) issues.push(c.id + ': no look or pattern for ' + c.wrap);
      if (c.kind === 'weaponKills' && !WEAPONS.some(w => w.id === c.weapon)) issues.push(c.id + ': unknown weapon ' + c.weapon);
      if (!(c.n > 0) || !c.text) issues.push(c.id + ': needs a target and a text');
      if (look && WS_PATTERNS[look.pat]) {
        const cols = look.c.map(_wsCss), glow = ['#000000', cols[1] || cols[0], ...cols.slice(2).map(() => '#000000')];
        for (const set of [cols, glow]) {
          try { WS_PATTERNS[look.pat](document.createElement('canvas').getContext('2d'), 256, set, _wsRng(c.wrap), look); }
          catch (e) { issues.push(c.wrap + ' pattern threw: ' + e.message); }
        }
      }
    }
    for (const s of WEAPON_SKINS) if (s.contract && !contractFor(s.id)) issues.push('contract wrap with no contract: ' + s.id);
    if (wrapUnlocked('darkmatter') && !(currentUser && currentUser.isAdmin)) issues.push('a locked wrap reads as unlocked');
    const savedState = contractState, savedMatch = match, savedInfo = Object.assign({}, _killInfo), savedLobby = inLobby;
    const need = id => CONTRACTS.find(c => c.id === id).n;
    let seq = 0;
    const kill = (weapon, head, tags) => { const id = 'k' + (++seq); _killInfo[id] = { killer: myId, weapon, head, tags: tags || [], t: performance.now() }; contractsOnKill(id); };
    try {
      contractState = _contractFresh(); inLobby = false; match = { type: 'ffa' };
      // the hard ones really are hard: nothing is done after a few dozen kills
      for (let i = 0; i < 40; i++) kill('vector', i % 2 === 0, ['AIR']);
      if (Object.keys(contractState.done).length) issues.push('40 kills finished a contract: ' + Object.keys(contractState.done));
      for (let i = 40; i < need('ct_aurora'); i++) kill('vector', false, []);
      if (!contractState.done.ct_aurora) issues.push('Aurora should finish at ' + need('ct_aurora') + ' Vector kills');
      for (let i = 0; i < need('ct_warp'); i++) kill('ak20', false, ['AIR']);
      if (!contractState.done.ct_warp) issues.push('AIR kills should finish Warp Drive');
      if (contractState.bestLife < need('ct_sing') || !contractState.done.ct_sing) issues.push('a long enough life should finish Singularity');
      const heads = contractState.heads;
      for (let i = heads; i < need('ct_reaper'); i++) kill('pistol', true, []);
      if (!contractState.done.ct_reaper) issues.push('headshots should finish Reaper');
      const before = contractState.kills;
      contractsOnKill('k' + seq);                                  // an echo of the last kill
      if (contractState.kills !== before) issues.push('an echoed kill was counted twice');
      // ability shots count for their weapon
      const rg = contractState.wk.railgun || 0;
      kill('railgun_ab', false, []);
      if ((contractState.wk.railgun || 0) !== rg + 1) issues.push('a railgun_ab kill should count for the railgun');
      contractsOnDeath();
      if (contractState.life !== 0) issues.push('dying should end the life streak');
      match = { type: 'range' }; kill('vector', false, []);
      if (contractState.kills !== before + 1) issues.push('the range should not count');
      match = { type: 'ffa' };
      // streaks
      for (let i = 0; i < need('ct_prism') - 1; i++) contractsOnMatchEnd('ally');
      if (contractState.done.ct_prism) issues.push('Prismatic finished a win early');
      contractsOnMatchEnd('draw');
      contractsOnMatchEnd('ally');
      if (!contractState.done.ct_prism || contractState.done.ct_dark) issues.push('100 in a row: Prismatic yes, Dark Matter no');
      contractsOnMatchEnd('enemy');
      if (contractState.streak !== 0) issues.push('a loss should end the streak');
      for (let i = 0; i < need('ct_dark') - 1; i++) contractsOnMatchEnd('ally');
      if (contractState.done.ct_dark) issues.push('Dark Matter finished a win early');
      contractsOnMatchEnd('ally');
      if (!contractState.done.ct_dark || !wrapUnlocked('darkmatter')) issues.push('500 in a row should finish Dark Matter');
      // Xpert: every weapon, 100 each. One short, then done.
      const ids = contractWeaponIds();
      if (ids.length < 40) issues.push('Xpert only asks for ' + ids.length + ' weapons');
      if (ids.some(id => !WEAPONS.some(w => w.id === id) && !MELEE_ITEMS.some(m => m.id === id))) issues.push('Xpert lists an unknown weapon');
      if (contractWeaponIds().some(id => { const w = WEAPONS.find(x => x.id === id); return w && w.damage <= 0; })) issues.push('Xpert asks for a weapon that does no damage');
      contractState.wk = {};
      for (const id of ids) for (let i = 0; i < need('ct_xpert'); i++) { if (id === ids[ids.length - 1] && i === need('ct_xpert') - 1) break; kill(id, false, []); }
      if (contractState.done.ct_xpert) issues.push('Xpert finished with one kill missing');
      kill(ids[ids.length - 1], false, []);
      if (!contractState.done.ct_xpert || !wrapUnlocked('xpert')) issues.push('Xpert should finish on the last weapon');
      // an unlock the numbers do not support is taken back on load
      contractState.done.ct_aurora = true; contractState.wk.vector = 3;
      contractsRevalidate();
      if (contractState.done.ct_aurora) issues.push('an unearned unlock survived revalidation');
    } finally {
      contractState = savedState; match = savedMatch; inLobby = savedLobby;
      for (const k of Object.keys(_killInfo)) delete _killInfo[k];
      Object.assign(_killInfo, savedInfo);
    }
    return issues;
  })()`);
  console.log('wrap checks: contracts, looks, patterns, progression');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--status')) {
  // Status effects: a chill is timed and does not stack, a root cannot be chained, a new round or a death leaves
  // nothing of the last one behind (for you or for a bot), and the Frost Blaster does its 2 damage.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const fb = WEAPONS.find(w => w.id === 'frost_blaster');
    if (!fb || fb.damage !== 2) issues.push('Frost Blaster should do 2 damage a bullet, not ' + (fb && fb.damage));
    const wasDead = isDead; isDead = false;
    try {
      clearPlayerStatusEffects();
      const before = playerFrostSlow;
      for (let i = 0; i < 50; i++) chillPlayer();
      if (playerFrostSlow !== before) issues.push('a chill should not touch the frost slow');
      if (!(playerChillUntil > Date.now() && playerChillUntil - Date.now() <= CHILL_MS + 50)) issues.push('chill should be one short window, not a growing one');
      rootPlayer(3000);
      const first = playerRootedUntil;
      if (!(first > Date.now())) issues.push('rootPlayer should root');
      playerRootedUntil = 0;                       // pretend it just ended
      rootPlayer(3000);
      if (playerRootedUntil !== 0) issues.push('a root straight after a root should be ignored (no chaining)');
      // everything on at once, then cleared
      playerFrostSlow = 5; playerChillUntil = Date.now() + 9999; playerRootedUntil = Date.now() + 9999;
      playerFireUntil = Date.now() + 9999; _playerDot = { until: Date.now() + 9999, dps: 5, weaponId: 'flame_burn' };
      adrenalineUntil = Date.now() + 9999; nanoShieldUntil = Date.now() + 9999;
      clearPlayerStatusEffects();
      if (playerFrostSlow !== 100 || playerChillUntil !== 0 || playerRootedUntil !== 0 || playerRootImmuneUntil !== 0
          || playerFireUntil !== 0 || _playerDot !== null || adrenalineUntil !== 0 || nanoShieldUntil !== 0) issues.push('clearPlayerStatusEffects left something behind');
      // dying clears it too
      playerFrostSlow = 5; playerFireUntil = Date.now() + 9999; _fxWasDead = false; isDead = true;
      watchStatusReset();
      if (playerFrostSlow !== 100 || playerFireUntil !== 0) issues.push('dying should clear status effects');
      isDead = false; watchStatusReset();
      // bots
      const b = { id: 'bx', frostSlow: 3, _chillUntil: 9e12, _fireUntil: 9e12, _stunUntil: 9e12, _rootUntil: 9e12, kbVX: 4, kbVZ: 4 };
      _dotTargets.bx = { until: Date.now() + 9999, dps: 5, weaponId: 'flame_burn' };
      clearBotStatusEffects(b);
      if (b.frostSlow !== 100 || b._chillUntil || b._fireUntil || b._stunUntil || b._rootUntil || b.kbVX || b.kbVZ || _dotTargets.bx) issues.push('clearBotStatusEffects left something behind');
      // a bot clears its effects the moment it dies
      const db = { id: 'dbx', dead: true, frostSlow: 4, _chillUntil: 9e12, _fireUntil: 9e12, _stunUntil: 9e12, _rootUntil: 9e12, kbVX: 3, kbVZ: 3 };
      gameBots.push(db);
      watchStatusReset();
      gameBots.splice(gameBots.indexOf(db), 1);
      if (db.frostSlow !== 100 || db._fireUntil || db._rootUntil || db._chillUntil || db._stunUntil) issues.push('a bot that died kept its status effects');
      // respawn protection: coming back from the dead gives you the shield, and hazards honour it
      const savedMatch = match, savedLobby = inLobby, savedCd = countdownActive, savedShield = spawnShieldUntil;
      try {
        match = { type: 'ffa' }; inLobby = false; countdownActive = false;
        spawnShieldUntil = 0; isDead = true; isShielded();          // dead: noted
        isDead = false;
        if (!isShielded()) issues.push('coming back from the dead did not give the respawn shield');
        if (_mechCanHurt()) issues.push('a map hazard could hurt you during the respawn shield');
        if (spawnShieldUntil - performance.now() < RESPAWN_SHIELD_MS - 100) issues.push('the respawn shield is too short');
        const keep = spawnShieldUntil; grantSpawnShield(500);
        if (spawnShieldUntil !== keep) issues.push('a short shield cut a longer one short');
        spawnShieldUntil = 0;
        if (!_mechCanHurt()) issues.push('a hazard cannot hurt you with no shield');
      } finally { match = savedMatch; inLobby = savedLobby; countdownActive = savedCd; spawnShieldUntil = savedShield; }
    } finally { isDead = wasDead; clearPlayerStatusEffects(); }
    return issues;
  })()`);
  const serverSrc2 = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  if (!/SPAWN_SHIELD_MS = 2500/.test(serverSrc2)) issues.push('server respawn shield should match the client (2500 ms)');
  if (!/resetSelf[\s\S]{0,500}shieldUntil: Date\.now\(\) \+ SPAWN_SHIELD_MS/.test(serverSrc2)) issues.push('server resetSelf (a new round) gives no shield');
  console.log('status checks: frost blaster damage, chill, root chain guard, round/death/bot reset, respawn shield');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--duel')) {
  // The 1v1 duel maps: small enough to find each other in about six seconds, spawns clear and joined by a walkable
  // route, cover that is the same for both sides, and wired so only 1v1 is dealt them.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const walk = SPEED * DEFAULT_MOVE_MULT;                     // m/s, plain walking
    for (const name of DUEL_MAP_IDS) {
      const b = MAP_BOUNDS[name], sp = MAP_SPAWNS[name], cols = MAP_COLLIDERS[name] || [];
      if (!MAP_IDS.includes(name)) issues.push(name + ': not in MAP_IDS');
      if (!b || !sp) { issues.push(name + ': no bounds or spawns'); continue; }
      if (b.halfX * 2 > 40 || b.halfZ * 2 > 60) issues.push(name + ': bigger than a duel map should be (' + b.halfX * 2 + ' x ' + b.halfZ * 2 + ')');
      const ca = { x: (sp.ally.x0 + sp.ally.x1) / 2, z: (sp.ally.z0 + sp.ally.z1) / 2 }, ce = { x: (sp.enemy.x0 + sp.enemy.x1) / 2, z: (sp.enemy.z0 + sp.enemy.z1) / 2 };
      const secs = Math.hypot(ca.x - ce.x, ca.z - ce.z) / walk;
      if (secs < 4.5 || secs > 8.5) issues.push(name + ': spawn to spawn takes ' + secs.toFixed(1) + ' s at a walk, want 4.5 to 8.5');
      for (const side of [sp.ally, sp.enemy]) {
        if (side.x0 < -b.halfX + 1 || side.x1 > b.halfX - 1 || side.z0 < -b.halfZ + 1 || side.z1 > b.halfZ - 1) issues.push(name + ': a spawn rectangle is outside the walls');
        for (const c of cols) {
          if (c.max.y < 0.3 || c.min.y > 1.8) continue;
          if (c.min.x < side.x1 + 0.5 && c.max.x > side.x0 - 0.5 && c.min.z < side.z1 + 0.5 && c.max.z > side.z0 - 0.5) { issues.push(name + ': cover inside a spawn'); break; }
        }
      }
      // inside cover only: the four border walls start outside the bounds
      const inner = cols.filter(c => c.min.x > -b.halfX - 0.01 && c.max.x < b.halfX + 0.01 && c.min.z > -b.halfZ - 0.01 && c.max.z < b.halfZ + 0.01);
      if (inner.length < 4) issues.push(name + ': only ' + inner.length + ' pieces of cover');
      for (const c of inner) {
        const hit = inner.some(d => Math.abs(d.min.x + c.max.x) < 0.02 && Math.abs(d.max.x + c.min.x) < 0.02
                                  && Math.abs(d.min.z + c.max.z) < 0.02 && Math.abs(d.max.z + c.min.z) < 0.02
                                  && Math.abs(d.min.y - c.min.y) < 0.02 && Math.abs(d.max.y - c.max.y) < 0.02);
        if (!hit) { issues.push(name + ': a piece of cover has no mirror image (not fair to both sides)'); break; }
      }
      // a walkable route between the spawns: boxes you cannot hop (taller than 1.6 m) block, a 0.4 m body
      const R = 0.4, step = 0.5, solid = cols.filter(c => c.max.y > 1.6 && c.min.y < 1.5);
      const free = (x, z) => !solid.some(c => x > c.min.x - R && x < c.max.x + R && z > c.min.z - R && z < c.max.z + R);
      const gx = Math.round(b.halfX * 2 / step), gz = Math.round(b.halfZ * 2 / step), key = (i, j) => i * 10000 + j;
      const toI = x => Math.round((x + b.halfX) / step), toJ = z => Math.round((z + b.halfZ) / step);
      const seen = new Set([key(toI(ca.x), toJ(ca.z))]), q = [[toI(ca.x), toJ(ca.z)]];
      let reached = false;
      while (q.length) {
        const [i, j] = q.pop();
        if (i === toI(ce.x) && j === toJ(ce.z)) { reached = true; break; }
        for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const ni = i + di, nj = j + dj;
          if (ni < 1 || nj < 1 || ni >= gx || nj >= gz || seen.has(key(ni, nj))) continue;
          if (!free(ni * step - b.halfX, nj * step - b.halfZ)) continue;
          seen.add(key(ni, nj)); q.push([ni, nj]);
        }
      }
      if (!reached) issues.push(name + ': no walkable route between the spawns');
      // RULE ONE: nothing in one spawn can see anything in the other (the same 15 x 15 rays --maps casts, eye height)
      let exposed = 0;
      for (const a of mapSpawnSightlineSamples(sp.ally)) for (const e of mapSpawnSightlineSamples(sp.enemy)) {
        const dir = e.clone().sub(a), dist = dir.length(), ray = new THREE.Ray(a, dir.normalize()), hit = new THREE.Vector3();
        if (!cols.some(c => ray.intersectBox(c, hit) && hit.distanceTo(a) < dist)) exposed++;
      }
      if (exposed) issues.push(name + ': ' + exposed + ' exposed starting sightlines (you can see your opponent at the start)');
      if (!MAP_DESCS[name]) issues.push(name + ': no description');
    }
    return issues;
  })()`);
  const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  for (const id of ['duel_grid', 'duel_crossroads', 'duel_pillars', 'duel_platform']) {
    if (!serverSrc.includes("'" + id + "'")) issues.push('server does not know ' + id);
  }
  if (!/LOBBY_MAP_POOL = MAP_IDS\.filter\(.*DUEL_ONLY_MAPS/.test(serverSrc)) issues.push('server random pool does not exclude the duel maps');
  if (!/mapPoolFor\(mode\)/.test(serverSrc)) issues.push('server does not deal 1v1 its own pool');
  const idx = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  if (!/data-map="duel_grid"[^>]*data-duel="1"/.test(idx)) issues.push('map picker has no duel cards');
  if (/data-duel="1" style="display:none/.test(idx)) issues.push('the duel map cards are hidden in the picker: nobody would ever see them');
  console.log('duel map checks: size, spawns, route, mirror symmetry, 1v1-only wiring');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--util')) {
  // Wraps on melees and utilities, and the utility skins: a wrap really goes on a melee and comes off again, the
  // fists keep their skin, and every utility skin builds, swaps in, swaps back and is dressed too.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const colors = m => { const out = []; m.traverse(o => { if (o.isMesh) for (const x of [].concat(o.material)) if (x && x.color) out.push(x.color.getHex()); }); return out.join(','); };
    const savedWrap = selectedWeaponSkin;
    try {
      const bi = MELEE_ITEMS.findIndex(m => m.id === 'bat'), bat = meleeModels[bi];
      selectedWeaponSkin = 'default'; ensureHeldWrap(bat);
      const before = colors(bat);
      selectedWeaponSkin = 'gold'; ensureHeldWrap(bat);
      if (bat._wrapKey !== 'gold' || colors(bat) === before) issues.push('a wrap did not go on the bat');
      selectedWeaponSkin = 'default'; ensureHeldWrap(bat);
      if (colors(bat) !== before) issues.push('going back to stock did not give the bat back its colours');
      // fists: skin stays skin
      const fi = MELEE_ITEMS.findIndex(m => m.id === 'fists');
      if (fi >= 0) {
        const f = meleeModels[fi], tone = [];
        f.traverse(o => { if (o.isMesh) for (const x of [].concat(o.material)) if (x && x.userData && x.userData.skinTone) tone.push([x, x.color.getHex()]); });
        selectedWeaponSkin = 'gold'; ensureHeldWrap(f);
        if (tone.some(([x, c]) => x.color.getHex() !== c)) issues.push('a wrap recoloured the fists');
        selectedWeaponSkin = 'default'; ensureHeldWrap(f);
      }
      // a utility
      const si = SUPPORT_ITEMS.findIndex(m => m.id === 'smoke'), sm = supportModels[si];
      selectedWeaponSkin = 'default'; ensureHeldWrap(sm);
      const sb = colors(sm);
      selectedWeaponSkin = 'carbon'; ensureHeldWrap(sm);
      if (sm._wrapKey !== 'carbon') issues.push('a wrap did not go on the smoke bomb');
      selectedWeaponSkin = 'default'; ensureHeldWrap(sm);
      if (colors(sm) !== sb) issues.push('stock did not restore the smoke bomb');
    } finally { selectedWeaponSkin = savedWrap; }
    // utility skins
    for (const sk of SUPPORT_MODEL_SKINS) {
      const idx = SUPPORT_ITEMS.findIndex(m => m.id === sk.support);
      if (idx < 0) { issues.push(sk.id + ': no such utility ' + sk.support); continue; }
      let meshes = 0, bad = false;
      try { const m = sk.build(); m.traverse(o => { if (o.isMesh) { meshes++; const p = o.position; if (![p.x, p.y, p.z].every(Number.isFinite)) bad = true; } }); } catch (e) { issues.push(sk.id + ' threw: ' + e.message); continue; }
      if (meshes < 3) issues.push(sk.id + ': only ' + meshes + ' meshes');
      if (bad) issues.push(sk.id + ': a part is at NaN');
      const base = supportModels[idx];
      setSupportModelSkin(sk.support, sk.id);
      if (supportModels[idx] === base || !sk._model) issues.push(sk.id + ': did not swap in');
      setSupportModelSkin(sk.support, null);
      if (supportModels[idx] !== base) issues.push(sk.id + ': did not swap back');
    }
    return issues;
  })()`);
  console.log('utility checks: wraps on melees and utilities, utility skins');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--glow')) {
  // The light pass: it builds on real maps without throwing, finds the lit surfaces, stays inside its budget, adds
  // no more than four point lights to a map, and does not build twice.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const names = ['neon_tokyo', 'urban', 'cyber', 'pearl_harbor', 'blank', 'duel_grid', 'refinery'];
    const saved = activeMapName;
    try {
      for (const n of names) {
        if (!MAP_GROUPS[n]) { issues.push(n + ': no such map'); continue; }
        try { activateMap(n); } catch (e) { issues.push(n + ' did not activate: ' + e.message); continue; }
        const g = MAP_GROUPS[n];
        if (!g._glowBuilt) issues.push(n + ': glow pass did not run');
        const pts = g.children.filter(c => c.userData && c.userData.mapGlow);
        if (pts.length > 1) issues.push(n + ': ' + pts.length + ' glow batches (one per map)');
        if (g.userData.glowPoints > GLOW_MAX_POINTS) issues.push(n + ': over the point budget');
        let lights = 0; g.traverse(o => { if (o.isPointLight) lights++; });
        if (lights > 8) issues.push(n + ': ' + lights + ' point lights (too many for forward rendering)');
        if (n === 'neon_tokyo' && !(g.userData.glowPoints >= 40)) issues.push('neon_tokyo only found ' + g.userData.glowPoints + ' lit surfaces');
        if (n === 'duel_grid' && g.userData.glowPoints) issues.push('duel_grid has lights it should not');
        const before = g.children.length; buildMapGlow(n);
        if (g.children.length !== before) issues.push(n + ': the glow pass built twice');
      }
    } finally { activateMap(saved || 'blank'); }
    return issues;
  })()`);
  console.log('glow checks: neon_tokyo and six more maps build their light pass once, within budget');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--teams')) {
  // Team fights are fair: an enemy bot with one of your allies close and you far away shoots the ally, not you.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const savedMatch = match, savedDead = isDead, savedLobby = inLobby, savedBots = gameBots.slice(), savedPos = camera.position.clone();
    try {
      inLobby = false; isDead = false;
      camera.position.set(30, 1.65, 0);                      // you, far from the action
      const mk = (id, team, x, z) => ({ id, team, x, z, dead: false, hp: 300, difficulty: 'medium' });
      const foe = mk('tf_foe', 'enemy', 0, 0), ally = mk('tf_ally', 'ally', 4, 0);
      gameBots.length = 0; gameBots.push(foe, ally);
      for (const type of ['race', 'elim', 'frontlines']) {
        match = { type, cfg: {} };
        const t = getBotTarget(foe);
        if (!t || t.isPlayer || !t.botRef || t.botRef.id !== 'tf_ally') issues.push(type + ': the enemy bot went for the player instead of the ally standing next to it');
        const near = getBotTarget(Object.assign(mk('tf_foe2', 'enemy', 28, 0), {}));
        if (!near || !near.isPlayer) issues.push(type + ': an enemy bot next to the player should still target the player');
      }
      match = { type: 'race', cfg: { forcedMap: 'base_raid' } };
      const raid = getBotTarget(foe);
      if (!raid || !raid.isPlayer) issues.push('base raid guards should still go for the player');
    } finally {
      match = savedMatch; isDead = savedDead; inLobby = savedLobby;
      gameBots.length = 0; gameBots.push(...savedBots); camera.position.copy(savedPos);
    }
    return issues;
  })()`);
  console.log('team checks: enemy bots pick the nearest opponent, Base Raid unchanged');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--thirdperson')) {
  // Third-person guns are the weapon's own model, hands off, at world size; the owner's wrap goes on them; a prop
  // built from shared geometry can be thrown away without taking the viewmodel's geometry with it.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    for (const id of ['ak20', 'minigun', 'pistol', 'sg8', 'srx', 'bat', 'frag', 'knife']) {
      let g = null;
      try { g = makeRealWorldGun(id); } catch (e) { issues.push(id + ' threw: ' + e.message); continue; }
      if (!g) { issues.push(id + ': no real model (would fall back to the stand-in)'); continue; }
      let meshes = 0, hand = false, len = 0;
      const box = new THREE.Box3(); g.updateMatrixWorld(true); box.setFromObject(g);
      g.traverse(o => { if (o.isMesh) { meshes++; for (let p = o; p; p = p.parent) if (p.userData && p.userData.vmHand) hand = true; } });
      len = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
      if (meshes < 1) issues.push(id + ': no meshes');
      if (hand) issues.push(id + ': a hand came along');
      if (!(len > 0.08 && len < 2.2)) issues.push(id + ': ' + len.toFixed(2) + ' m long, not a held weapon size');
      let shared = true; g.traverse(o => { if (o.isMesh && !(o.userData && o.userData.sharedGeo)) shared = false; });
      if (!shared) issues.push(id + ': geometry is not marked shared (it would be disposed with the body)');
    }
    // a body with a gun, and a wrap on it
    const mesh = makePlayerMesh('Tester', false, 'enemy', 'default', {});
    mesh._ownerId = 'tp_owner';
    players.tp_owner = { id: 'tp_owner', wrap: 'gold' };
    try {
      armRemoteMesh(mesh, 'ak20');
      if (!mesh._gun || !mesh._gun.userData.realGun) issues.push('the body did not get the real gun');
      if (mesh._gun && mesh._gun._wrapKey !== 'gold') issues.push('the owner\\'s wrap was not put on the gun');
      const geo = [];
      mesh._gun.traverse(o => { if (o.isMesh) geo.push(o.geometry); });
      armRemoteMesh(mesh, 'pistol');                          // a swap throws the old prop away
      if (geo.some(g => g.attributes === undefined)) issues.push('shared geometry was disposed');
      players.tp_owner.wrap = null; dressRemoteGun(mesh);
      if (mesh._gun._wrapKey !== 'default') issues.push('taking the wrap off did not reach the gun');
    } finally { delete players.tp_owner; }
    return issues;
  })()`);
  console.log('third-person checks: real models at world size, hands off, wraps follow the owner');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--movement')) {
  // Double jump is back (whoever grants one gets one, in any mode), the blade air dash is the original, and the
  // Scythe's Reap Dash goes where you aim: up when you look up, level when you look level, twice as far as it did.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const savedSel = [selectedPrimaryIdx, selectedSecondaryIdx, selectedMeleeIdx, selectedSupportIdx];
    const savedMode = selectedModeConfig, savedMatch = match, savedStarted = gameStarted, savedDead = isDead;
    try {
      selectedModeConfig = GAME_MODE_CONFIGS['1v1']; match = null; gameStarted = true; isDead = false;
      const sc = MELEE_ITEMS.findIndex(m => m.id === 'scythe');
      selectedMeleeIdx = sc;
      if (loadoutAirJumps() < 1) issues.push('a scythe in the loadout should give a double jump');
      if (DASH_SPEED !== 17) issues.push('the air dash should be back at 17, not ' + DASH_SPEED);
      if (grantsDash(WEAPONS.find(w => w.id === 'fists') || {})) issues.push('the air dash should not have been opened to fists');
      const ab = MELEE_ITEMS[sc].ability;
      if (!ab.aimDash || ab.distance < 24) issues.push('Reap Dash should be an aimed dash of about 26 m');
      // aim straight up, then level, and run the dash to the end
      const run = (pitch) => {
        camera.position.set(0, 1.65, 0);
        camera.quaternion.setFromEuler(new THREE.Euler(pitch, 0, 0, 'YXZ'));
        slamState = null; scytheDash = null; _extVel.x = 0; _extVel.z = 0;
        const y0 = camera.position.y, z0 = camera.position.z;
        startScytheDash(MELEE_ITEMS[sc], ab);
        let guard = 0;
        while (scytheDash && guard++ < 600) {
          updateScytheDash(1 / 60);
          if (slamState) camera.position.y += slamState.vel / 60;     // the part updateMovement would do
        }
        return { up: camera.position.y - y0, fwd: -(camera.position.z - z0) };
      };
      const keepWalls = wallColliders.slice(); wallColliders.length = 0;       // open ground: nothing in the way
      let level, up, straight;
      try { level = run(0); up = run(Math.PI / 4); straight = run(Math.PI / 2 - 0.05); }
      finally { wallColliders.push(...keepWalls); }
      if (level.fwd < 20) issues.push('a level Reap Dash only covered ' + level.fwd.toFixed(1) + ' m');
      if (Math.abs(level.up) > 2.5) issues.push('a level Reap Dash climbed ' + level.up.toFixed(1) + ' m');
      if (up.up < 10) issues.push('aiming 45 degrees up should climb a lot, got ' + up.up.toFixed(1) + ' m');
      if (straight.up < 18) issues.push('aiming straight up should climb about the whole dash, got ' + straight.up.toFixed(1) + ' m');
      if (!(up.fwd > 10 && up.fwd < level.fwd)) issues.push('aiming up should trade some forward distance for height');
    } finally {
      [selectedPrimaryIdx, selectedSecondaryIdx, selectedMeleeIdx, selectedSupportIdx] = savedSel;
      selectedModeConfig = savedMode; match = savedMatch; gameStarted = savedStarted; isDead = savedDead; scytheDash = null; slamState = null;
      camera.position.set(0, 1.65, 0); camera.quaternion.set(0, 0, 0, 1);
    }
    return issues;
  })()`);
  console.log('movement checks: double jump back, original air dash, Reap Dash follows the aim');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--flare')) {
  // The flare: slow, big, and it falls gently: still in the air well past the 1.8 s a normal shot lives, and it has
  // dropped far less than a plain lob would have.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const f = WEAPONS.find(w => w.id === 'flare');
    if (!f || !(f.bulletSize >= 0.15)) issues.push('the flare should be large (bulletSize >= 0.15)');
    if (!f || !(f.arcGravity > 0 && f.arcGravity < 0.6)) issues.push('the flare should fall slower than the usual arc');
    if (!f || !(f.flightMs >= 3500)) issues.push('the flare has to be allowed to stay up for a few seconds');
    if (!f || !(f.bulletSpeed <= 30)) issues.push('the flare should be slow');
    const keepWalls = wallColliders.slice(); wallColliders.length = 0;
    const savedSound = playSoundEvent; playSoundEvent = () => {};
    const savedFlares = groundFlares.length;
    try {
      const flight = (spec) => {
        localBullets.length = 0;
        spawnLocalBullet(new THREE.Vector3(0, 1.65, 0), new THREE.Vector3(0, 0.15, -1), 'flare_test', true, spec.bulletSpeed, spec.bulletColor, spec.bulletSize || 0.05, spec.id);
        let steps = 0, dist = 0;
        while (localBullets.length && steps < 60 * 8) { const b = localBullets[0]; dist = -b.mesh.position.z; updateBullets(1 / 60); steps++; }
        return { secs: steps / 60, dist };
      };
      const r = flight(f);
      if (r.secs < 1.0) issues.push('the flare lands in ' + r.secs.toFixed(2) + ' s: too quick, it should hang in the air');
      // the same shot on the ordinary arc and speed, for comparison
      const keep = { g: f.arcGravity, s: f.bulletSpeed };
      f.arcGravity = 1; f.bulletSpeed = 44;
      let old; try { old = flight(f); } finally { f.arcGravity = keep.g; f.bulletSpeed = keep.s; }
      if (!(r.secs > old.secs)) issues.push('the flare is not slower to land than a speed-44 lob would be');
      if (groundFlares.length <= savedFlares) issues.push('the landed flare did not leave a ground flare');
    } finally {
      wallColliders.push(...keepWalls); localBullets.length = 0; playSoundEvent = savedSound;
      while (groundFlares.length > savedFlares) { const g = groundFlares.pop(); try { scene.remove(g.mesh); } catch (e) {} }
    }
    return issues;
  })()`);
  console.log('flare checks: slow, large, long-lived, gentle fall');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--quickmelee')) {
  // Quick melee (B / middle mouse) for every melee in play: it equips, uses the ability or swings, and a multi-part
  // ability (crowd charge, slam, dash, spin, aimed dash) is allowed to finish before the gun comes back.
  const issues = vm.runInThisContext(`(() => {
    const issues = [];
    const S = { started: gameStarted, dead: isDead, slot: activeSlot, mel: selectedMeleeIdx, match, mode: selectedModeConfig,
                sound: playSoundEvent, anim: showAnnouncement, cd: countdownActive, pri: selectedPrimaryIdx, sec: selectedSecondaryIdx, sup: selectedSupportIdx };
    const keepWalls = wallColliders.slice();
    const reset = () => {
      try { finishMeleeSlam(); } catch (e) {} try { finishMeleeDash(); } catch (e) {} try { finishBatCrowdClear(); } catch (e) {}
      scytheDash = null; autoLunge = null; meleeAbilityBuff = null; _quickMeleeReturn = null; _grappleRide = null;
      slamState = null; activeSlot = 'primary'; meleeSwingT = 1; lastMelee = 0;
      for (const k of Object.keys(abilityCDs)) delete abilityCDs[k];
    };
    try {
      gameStarted = true; isDead = false; match = { type: 'ffa', cfg: {} }; selectedModeConfig = GAME_MODE_CONFIGS['ffa5']; countdownActive = false;
      selectedPrimaryIdx = WEAPONS.findIndex(w => w.id === 'ak20'); selectedSecondaryIdx = WEAPONS.findIndex(w => w.id === 'pistol'); selectedSupportIdx = 0;
      playSoundEvent = () => {}; showAnnouncement = () => {};
      const sequence = new Set(['melee_slam', 'melee_charge', 'melee_lunge', 'melee_spinslash', 'bat_crowd_clear']);
      for (let i = 0; i < MELEE_ITEMS.length; i++) {
        const m = MELEE_ITEMS[i];
        if (m.archived || m.adminItem || m.skinOnly || !meleeModels[i]) continue;
        reset();
        selectedMeleeIdx = i;
        camera.position.set(0, 1.65, 0); camera.quaternion.set(0, 0, 0, 1);
        try { quickMelee(); } catch (e) { issues.push(m.id + ': quick melee threw: ' + e.message); continue; }
        if (!_quickMeleeReturn || activeSlot !== 'melee') { issues.push(m.id + ': quick melee did not equip the melee'); continue; }
        try { updateQuickMelee(); } catch (e) { issues.push(m.id + ': update threw: ' + e.message); }
        const ab = m.ability;
        if (ab && sequence.has(ab.type) && activeSlot !== 'melee') issues.push(m.id + ' (' + ab.type + '): the gun came back while the ability was still running');
        if (ab && ab.type === 'melee_mobility' && ab.aimDash && activeSlot !== 'melee') issues.push(m.id + ': the aimed dash was cancelled by the slot change');
        // with the ability cooling down it must still swing
        reset();
        selectedMeleeIdx = i;
        if (ab) abilityCDs[m.id] = Date.now();
        const before = lastMelee;
        try { quickMelee(); } catch (e) { issues.push(m.id + ': cooldown quick melee threw: ' + e.message); continue; }
        if (ab && !(meleeSwingT < 1 || lastMelee !== before)) issues.push(m.id + ': with the ability cooling down, quick melee did nothing');
      }
      // the Chain Maul has an ability now, and nothing in play is without one
      const cm = MELEE_ITEMS.find(m => m.id === 'chain_hammer');
      if (!cm || !cm.ability || cm.ability.type !== 'melee_meteor') issues.push('the Chain Maul has no ability');
      for (const m of MELEE_ITEMS) if (!m.archived && !m.adminItem && !m.skinOnly && !m.ability) issues.push(m.id + ': a melee in play with no ability');
    } finally {
      reset();
      gameStarted = S.started; isDead = S.dead; activeSlot = S.slot; selectedMeleeIdx = S.mel; match = S.match;
      selectedModeConfig = S.mode; playSoundEvent = S.sound; showAnnouncement = S.anim; countdownActive = S.cd;
      selectedPrimaryIdx = S.pri; selectedSecondaryIdx = S.sec; selectedSupportIdx = S.sup;
      wallColliders.length = 0; wallColliders.push(...keepWalls);
    }
    return issues;
  })()`);
  console.log('quick melee checks: every melee equips, uses its ability or swings, and sequences finish');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--lobby')) {
  const issues = vm.runInThisContext(`(() => {
    const issues=[],poly=MAP_GROUPS.lobby13.userData.lobbyFootprint,cols=MAP_COLLIDERS.lobby13;
    const check=(v,m)=>{if(!v)issues.push(m);};
    check(poly && poly.length>12,'Lobby must have an irregular perimeter');
    if(!poly)return issues;
    const inside=(x,z)=>{
      let v=false;
      for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const [ax,az]=poly[i],[bx,bz]=poly[j];
        if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)v=!v;
      }
      return v;
    };
    const clear=(x,z,r=.45)=>!cols.some(b=>b.max.y>.2 && b.min.y<2 &&
      b.min.x<x+r && b.max.x>x-r && b.min.z<z+r && b.max.z>z-r);
    for(const p of [[-33,30],[32,30],[-22,32],[22,-28]])check(!inside(...p),'Old square corner remains');
    check(clear(0,18),'Lobby arrival is blocked');
    const todo=[[0,18]],seen=new Set(['0,18']);
    for(let i=0;i<todo.length;i++){
      const [x,z]=todo[i];
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,nz=z+dz,key=nx+','+nz;
        if(!seen.has(key)&&inside(nx,nz)&&clear(nx,nz)){seen.add(key);todo.push([nx,nz]);}
      }
    }
    check(LOBBY_DUEL_PADS.length===5,'Missing duel bays');
    for(const p of LOBBY_DUEL_PADS)for(const side of ['blue','red']){
      check(clear(p[side].x,p[side].z,p.radius),'Duel staging area blocked');
      check(seen.has(p[side].x+','+p[side].z),'Duel pad unreachable from spawn');
    }
    for(const p of TRASHCAN_POSITIONS)check(seen.has(p.x+','+p.z),'Loadout station unreachable from spawn');
    for(const p of LOBBY_SERVICES)check(seen.has(p.x+','+p.z),'Lobby service unreachable: '+p.id);
    const nav=lobbyNavigation();check(nav.nodes.length>100,'Lobby visitors need walkable navigation');
    for(let i=0;i<50;i++){const p=lobbySpawnPoint(i);check(lobbyClear(p.x,p.z),'Lobby visitor spawn blocked');}
    const squad=LOBBY_DUEL_PADS.find(p=>p.modeId==='10v10');
    const b={...lobbySpawnPoint(0),_duelGoto:true};
    for(let i=0;i<4000 && Math.hypot(b.x-squad.red.x,b.z-squad.red.z)>.35;i++){
      const move=lobbyWalk(b,squad.red,.05);b.x+=move.x;b.z+=move.z;
    }
    check(Math.hypot(b.x-squad.red.x,b.z-squad.red.z)<.4,'NPC cannot route to squad hall');
    const savedBots=gameBots.slice(),savedUser=currentUser;
    try{
      gameBots.length=0;
      for(let i=0;i<19;i++)gameBots.push({id:'visitor-test-'+i,x:0,z:0,_lobbyVisitor:true,_wantsDuel:true});
      stageDuelBots(squad,'blue');
      check(gameBots.filter(b=>b._duelTeam==='mate').length===9,'10v10 needs nine teammates');
      check(gameBots.filter(b=>b._duelTeam==='foe').length===10,'10v10 needs ten opponents');
      for(const b of gameBots){b.x=b._duelGoto.x;b.z=b._duelGoto.z;}
      const seated=countSeated(squad,'blue');check(seated.blue===10 && seated.red===10,'Physical team counts must include player');
      currentUser={username:'lobby-story-check'};
      noteLobbyStory('met');noteLobbyStory('shop');
      check(readLobbyStory().met && readLobbyStory().shop,'Story progress must persist');
      currentUser={username:'lobby-other-account'};
      check(!readLobbyStory().shop,'Story progress must be account scoped');
    }finally{gameBots.length=0;gameBots.push(...savedBots);currentUser=savedUser;}
    return issues;
  })()`);
  console.log('lobby checks: irregular perimeter, removed square corners, spawn clearance, walkable routes to all duel pads and loadouts');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.argv.includes('--match-finale')) {
  const issues = vm.runInThisContext(`(() => {
    const issues = [], check = (v, m) => { if (!v) issues.push(m); };
    myId = 'finale-self'; currentUser = { username: 'Finale Tester' };
    players[myId] = { id: myId, team: 'ally', skin: 'default' };
    players['finale-mate'] = { id: 'finale-mate', name: 'Teammate', team: 'ally', skin: 'spiky', weaponId: 'pistol' };
    players['finale-enemy'] = { id: 'finale-enemy', name: 'Enemy', team: 'enemy', skin: 'default', weaponId: 'pistol', x: 6, z: 2 };
    pvpMatch = null;
    match = { type: 'race', active: false, over: true, cfg: {} };
    matchScore = { [myId]: 7, 'finale-mate': 7, 'finale-enemy': 4 };
    matchDeaths = { [myId]: 1, 'finale-mate': 2 };
    check(finaleRoster()[0].id === myId, 'MVP must use match kills, then deaths');
    noteKillInfo('finale-enemy', myId, 'pistol', true);
    captureFinalKill('finale-enemy', myId);
    const clip = MATCH_FINALE.lastKill;
    captureFinalKill(myId, myId);
    check(MATCH_FINALE.lastKill === clip, 'Self elimination must not replace final combat kill');
    check(JSON.parse(JSON.stringify(clip)).frames.length > 0, 'Final kill must be network serializable');
    MATCH_FINALE.lastKill = null;
    check(startMatchFinale('ally'), 'Scored match should start finale without a replay');
    check(MATCH_FINALE.phase === 'lineup', 'No recorded kill should go straight to MVP');
    updateMatchFinale(MATCH_FINALE.startedAt + 200);
    check(MATCH_FINALE.lineup.slice(1).every(x => !x.body.visible), 'Teammates should not appear immediately');
    updateMatchFinale(MATCH_FINALE.startedAt + 4000);
    check(MATCH_FINALE.lineup.length === 2, 'MVP lineup must exclude the other team');
    check(MATCH_FINALE.lineup.every(x => x.body.visible), 'Teammates should reveal after MVP');
    stopMatchFinale(true);
    check(!MATCH_FINALE.active && !MATCH_FINALE.stage && !MATCH_FINALE.replay, 'Finale resources must clear');
    resetMatchRivals();
    check(!MATCH_FINALE.lastKill && KILLCAM.buf.length === 0, 'New matches must clear old replays');
    match.type = 'wave_dash';
    check(!startMatchFinale('ally'), 'Wave Dash must keep its own results');
    match = null;
    return issues;
  })()`);
  console.log('match finale checks: ranking, self kills, network clip, staggered team reveal, cleanup and non-combat modes');
  if (issues.length) { ok = false; console.log(issues.join('\n')); }
}

if (ok && process.env.MAP_REVIEW_DIR) {
  fs.mkdirSync(process.env.MAP_REVIEW_DIR, { recursive: true });
  for (const name of ['forest', 'desert', 'tundra', 'refinery', 'space', 'volcano', 'titanic', 'carrier', 'pearl_harbor']) {
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
