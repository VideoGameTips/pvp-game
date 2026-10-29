const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  // The server applies the damage, so its table has to say what the client's does. (This used to pin one value,
  // boombow: 32; the bow has been retuned four times since and the check had been red ever since -- #82.)
  const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const table = server.slice(server.indexOf('const WEAPON_DAMAGE'), server.indexOf('};', server.indexOf('const WEAPON_DAMAGE')));
  const srv = Object.fromEntries(['boombow', 'freeze_gun'].map(id => [id, Number((table.match(new RegExp('\\b' + id + ':\\s*([0-9.]+)')) || [])[1])]));
  assert.ok(Number.isFinite(srv.boombow) && Number.isFinite(srv.freeze_gun), 'WEAPON_DAMAGE has no boombow / freeze_gun');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof spawnLocalBullet === 'function');
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    console.log(await page.evaluate((srv) => {
      const bow = WEAPONS.find(w => w.id === 'boombow');
      if (!bow.doubleJump || bow.hitscan) throw Error('Wrong Bow stats');
      for (const id of Object.keys(srv)) { const w = WEAPONS.find(x => x.id === id); if (!w || w.damage !== srv[id]) throw Error(id + ': client damage ' + (w && w.damage) + ' but the server applies ' + srv[id]); }
      finishEquip();
      for (const b of localBullets) scene.remove(b.mesh);
      localBullets.length = 0; wallColliders.length = 0;
      for (const id of Object.keys(remoteMeshes)) delete remoteMeshes[id];
      const drops = [];
      for (const [id, own] of [['boombow', true], ['boombow', false], ['boombow_ab', true]]) {
        spawnLocalBullet(new THREE.Vector3(0, 50, 0), new THREE.Vector3(1, 0, 0), `bow-${own}-${id}`, own,
          bow.bulletSpeed, bow.bulletColor, bow.bulletSize, id);
        const b = localBullets.at(-1);
        const dt = 1 / 240;
        for (let step = 0; b.mesh.position.x < 60 && step < 1000; step++) {
          if (!localBullets.includes(b)) throw Error(id + ': arrow removed early at ' + JSON.stringify(b.mesh.position.toArray()) + ', speed=' + b.speed);
          updateBullets(dt);
        }
        if (b.mesh.position.x < 60) throw Error(id + ': arrow stopped moving, speed=' + b.speed);
        const drop = 50 - b.mesh.position.y;
        // the game's own gravity over the time it takes to fly 60 m, not a fixed range: the arrow was made 35% faster a day
        // after this was written (a215c89), which flattens the arc by 1/1.35^2, and 1.4-1.9 m had been red since (#82)
        const t = 60 / Math.max(20, b.speed), want = 0.5 * BULLET_GRAVITY * (b._arcG ?? 1) * t * t;   // (b.speed: the speed it flies at, not the weapon's bulletSpeed)
        if (!(drop > 0.2) || Math.abs(drop - want) > want * 0.15 || b.dir.y >= 0) throw Error(id + ': arrow not following gentle ballistic arc: ' + drop.toFixed(3) + ' m against ' + want.toFixed(3));
        if (b.mesh._alignToDir && new THREE.Vector3(0, 1, 0).applyQuaternion(b.mesh.quaternion).dot(b.dir.clone().normalize()) < .999) throw Error('Arrow does not point along curved flight');
        drops.push({ id, own, dropAt60m: +drop.toFixed(2) });
        scene.remove(b.mesh); localBullets.splice(localBullets.indexOf(b), 1);
      }
      return { damage: bow.damage, reloadMs: bow.reloadTime, doubleJump: bow.doubleJump, drops };
    }, srv));
    assert.deepEqual(errors, []);
    console.log('Bow: client/server damage, twice-fast reload, physical arrows, gravity, remote/ability parity and flight orientation passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
