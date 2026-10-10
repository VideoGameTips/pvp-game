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
    const issues = [], names = [...Object.keys(_BESPOKE), ...M4_TOWER_MAP_NAMES];
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
      if (boundary.length < 4) issues.push(name + ': missing high perimeter walls');
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
      if (a.hp !== 36) issues.push('actual bullet did not damage explosive (' + a.hp + ')');
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
    players: { shooter: player }, socket: { id: 'shooter', on: (name, fn) => { handler = fn; } },
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
      if (main.geometry !== geometry || locked.material !== lockedMat || lens.material.color.getHex() !== 0x55aaff || sight.material.map) issues.push(id + ': altered geometry, locked skin, lens or sight');
      if (id === 'wood' && main.material.metalness !== 0) issues.push('wood reads as metal');
      if (id === 'fire' && !main.material.emissiveMap) issues.push('fire has no glow mask');
    }
    applyWeaponSkin(model, WEAPON_SKINS_BY_ID.woodland);
    if (main.material.map !== _wsTextures('woodland', 0).map || main.material.bumpMap !== originalBump) issues.push('legacy pattern did not replace wrap cleanly');
    applyWeaponSkin(model, WEAPON_SKINS_BY_ID.cyber);
    if (main.material.map !== getWeaponWrapSurface('cyber').map) issues.push('wrap did not replace legacy pattern');
    applyWeaponSkin(model, WEAPON_SKINS_BY_ID.default);
    if (main.material.map !== originalMap || main.material.bumpMap !== originalBump || main.material.color.getHex() !== 0x456789 || main.material.roughness !== .67 || main.material.metalness !== .8 || main.material.emissiveMap) issues.push('stock did not restore original material');
    console.log('wrap checks: six textured materials, cache, sight/lens protection, skin locks and stock restoration');
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
    console.log('secret inspect checks: ' + Object.keys(SECRET_INSPECTS).length + ' skin/weapon pairs, repeated triggers, frame updates, cancellation and resource cleanup');
    return issues;
  })()`);
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
