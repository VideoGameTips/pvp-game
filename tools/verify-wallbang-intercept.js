const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

function verifyServer() {
  const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const handlers = {}, events = [];
  let now = 10000;
  const coneOwner = { id: 'self', account: 'regular', matchId: 'duel', lastShot: 0 };
  const rocketOwner = { id: 'enemy', account: 'regular', matchId: 'duel', lastShot: 0 };
  const context = { players: { self: coneOwner, enemy: rocketOwner }, users: {}, HUB_MATCH: 'hub',
    socket: { id: 'self', on: (name, handler) => { handlers[name] = handler; } },
    Date: { now: () => now }, Math, Number, String,
    emitToMatch: (room, event, data) => events.push({ room, event, data }),
    WEAPON_DAMAGE: { gatecrasher: 5, gatecrasher_beam: 40, pistol: 25 }, WEAPON_HS_MULT: {}, DAMAGE_OVERRIDE_CAPS: {},
    falloffMultiplier: () => 1, dist3: () => 0 };
  vm.createContext(context);
  const start = source.indexOf('function canUseHellfire(');
  vm.runInContext(source.slice(start, source.indexOf('// Damage drop-off', start)), context);
  for (const name of ['shoot', 'projectileIntercept']) {
    const s = source.indexOf(`socket.on('${name}',`);
    vm.runInContext(source.slice(s, source.indexOf('\n  });', s) + 7), context);
  }
  assert.equal(context.serverHitDamage({ weapon: 'gatecrasher_beam', wallPenetrated: true }, coneOwner, rocketOwner), 20);
  assert.equal(context.serverHitDamage({ weapon: 'gatecrasher_beam', wallPenetrated: true, damageOverride: 20 }, coneOwner, rocketOwner), 20);
  assert.equal(context.serverHitDamage({ weapon: 'gatecrasher', wallPenetrated: true }, coneOwner, rocketOwner), 3);
  assert.equal(context.serverHitDamage({ weapon: 'gatecrasher_beam' }, coneOwner, rocketOwner), 40);
  assert.equal(context.serverHitDamage({ weapon: 'pistol', wallPenetrated: true }, coneOwner, rocketOwner), 25);
  const shot = { x: 0, y: 2, z: 0, dx: 1, dy: 0, dz: 0 };
  handlers.shoot({ ...shot, weapon: 'traffic_cone', projectileId: 'local_self_cone' });
  context.socket.id = 'enemy';
  handlers.shoot({ ...shot, weapon: 'rpg', projectileId: 'local_enemy_rocket' });
  assert.equal(events.at(-1).data.id, 'local_enemy_rocket');
  context.socket.id = 'self';
  const hit = { coneId: 'local_self_cone', rocketId: 'local_enemy_rocket', rocketOwnerId: 'enemy', x: 3, y: 2, z: 0 };
  const interceptions = () => events.filter(e => e.event === 'projectileIntercept').length;
  rocketOwner.matchId = 'other'; handlers.projectileIntercept(hit); assert.equal(interceptions(), 0);
  rocketOwner.matchId = 'duel';
  handlers.projectileIntercept({ ...hit, x: Infinity }); assert.equal(interceptions(), 0);
  handlers.projectileIntercept({ ...hit, coneId: 'fake' }); assert.equal(interceptions(), 0);
  handlers.projectileIntercept(hit); assert.equal(interceptions(), 1);
  handlers.projectileIntercept(hit); assert.equal(interceptions(), 1);
  now += 500;
  const batchId = 'local_self_barrage';
  const beforeBatch = events.filter(e => e.event === 'bulletFired').length;
  for (let index = 0; index < 4; index++) handlers.shoot({ ...shot, weapon: 'traffic_cone', projectileId: `${batchId}_${index}`,
    coneBatch: { id: batchId, index, count: 4 } });
  assert.equal(events.filter(e => e.event === 'bulletFired').length, beforeBatch + 4);
  handlers.shoot({ ...shot, weapon: 'traffic_cone', projectileId: `${batchId}_3`, coneBatch: { id: batchId, index: 3, count: 4 } });
  assert.equal(events.filter(e => e.event === 'bulletFired').length, beforeBatch + 4);
  now += 3000;
  coneOwner._counterShots.set('late-cone', { weapon: 'traffic_cone', at: 10000 });
  rocketOwner._counterShots.set('late-rocket', { weapon: 'rpg', at: 10000 });
  handlers.projectileIntercept({ ...hit, coneId: 'late-cone', rocketId: 'late-rocket' }); assert.equal(interceptions(), 1);
  console.log('Server: half-damage parity, stable projectile IDs, authenticated same-match interception, invalid/expired/duplicate rejection');
}

(async () => {
  verifyServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof interceptConeRockets === 'function');
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    console.log(await page.evaluate(() => {
      finishEquip(); inLobby = false;
      for (const b of localBullets) scene.remove(b.mesh);
      localBullets.length = 0; wallColliders.length = 0;
      for (const id of Object.keys(remoteMeshes)) delete remoteMeshes[id];
      const hits = [], explosions = [], messages = [];
      emitHit = (...args) => hits.push(args);
      rocketExplode = (...args) => explosions.push(args);
      socket.emit = (event, data) => messages.push({ event, data });
      const target = new THREE.Group(); target.position.set(8, 0, 0); target.visible = true;
      remoteMeshes.test = target; players.test = { hp: 300, dead: false, isBot: true };
      const wall = new THREE.Box3(new THREE.Vector3(3, 0, -2), new THREE.Vector3(4, 5, 2));
      const fire = (id, dt, origin = new THREE.Vector3(0, 1, 0)) => {
        spawnLocalBullet(origin, new THREE.Vector3(1, 0, 0), 'test', true, 100, 0xffffff, .01, id);
        localBullets.at(-1).speed = 100; updateBullets(dt);
      };
      wallColliders.push(wall);
      for (const id of ['gatecrasher', 'gatecrasher_beam', 'gatecrasher_slug']) {
        fire(id, .1);
        if (!hits.at(-1)?.[5]?.wallPenetrated || hits.at(-1)[2] !== id) throw Error(id + ': wall shot blocked/full damage');
      }
      hits.length = 0; fire('pistol', .1);
      if (hits.length) throw Error('Ordinary pistol pierced wall');
      target.position.x = 2; fire('gatecrasher', .1);
      if (hits.at(-1)[5].wallPenetrated) throw Error('Target before wall lost damage');
      target.position.x = 8; hits.length = 0;
      fire('gatecrasher', .045); updateBullets(.045);
      if (!hits.at(-1)?.[5].wallPenetrated) throw Error('Penetration lost across frames');
      hits.length = 0; fire('gatecrasher', .05, new THREE.Vector3(3.5, 1, 0));
      if (!hits.at(-1)?.[5].wallPenetrated) throw Error('Inside-wall spawn bypassed reduction');
      wallColliders.length = 0; hits.length = 0; fire('gatecrasher', .1);
      if (hits.at(-1)[5].wallPenetrated) throw Error('Unobstructed shot lost damage');
      delete remoteMeshes.test; delete players.test;
      const pair = (z = 0, bot = true) => {
        spawnLocalBullet(new THREE.Vector3(0, 2, 0), new THREE.Vector3(1, 0, 0), 'cone', true, 100, 0xff5500, .10, 'traffic_cone');
        const cone = localBullets.at(-1); cone.speed = 100;
        spawnLocalBullet(new THREE.Vector3(10, 2, z), new THREE.Vector3(-1, 0, 0), 'rocket', false, 100, 0xff5500, .10, 'rpg', bot ? { botId: 'enemyBot', botTeam: 'enemy' } : { ownerId: 'enemy' });
        const rocket = localBullets.at(-1); rocket.speed = 100;
        return { cone, rocket };
      };
      let p = pair(); interceptConeRockets(.1);
      if (!p.cone._cull || !p.rocket._cull || explosions.length !== 1) throw Error('Crossing projectiles did not detonate');
      interceptConeRockets(.1); if (explosions.length !== 1) throw Error('Duplicate explosion');
      p = pair(2); interceptConeRockets(.1);
      if (p.rocket._cull) throw Error('Near miss detonated rocket');
      p.cone._cull = p.rocket._cull = true;
      wallColliders.push(wall); p = pair(); interceptConeRockets(.1);
      if (p.rocket._cull) throw Error('Cone intercepted through a wall');
      p.cone._cull = p.rocket._cull = true;
      wallColliders.length = 0; p = pair(0, false); interceptConeRockets(.1);
      if (!messages.some(m => m.event === 'projectileIntercept' && m.data.rocketOwnerId === 'enemy')) throw Error('Network interception not synchronized');
      return 'Client: wall traversal, before-wall/full damage, after-wall/half damage, multi-frame and inside-wall shots, ordinary blocking, swept RPG interception, near misses and wall occlusion passed';
    }));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
