const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  assert.match(fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8'), /freeze_gun: 13, boombow: 32/);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof spawnLocalBullet === 'function');
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    console.log(await page.evaluate(() => {
      const bow = WEAPONS.find(w => w.id === 'boombow');
      if (bow.damage !== 32 || bow.reloadTime !== 525 || !bow.doubleJump || bow.hitscan) throw Error('Wrong Bow stats');
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
        if (drop < 1.4 || drop > 1.9 || b.dir.y >= 0) throw Error(id + ': arrow not following gentle ballistic arc: ' + drop);
        if (b.mesh._alignToDir && new THREE.Vector3(0, 1, 0).applyQuaternion(b.mesh.quaternion).dot(b.dir.clone().normalize()) < .999) throw Error('Arrow does not point along curved flight');
        drops.push({ id, own, dropAt60m: +drop.toFixed(2) });
        scene.remove(b.mesh); localBullets.splice(localBullets.indexOf(b), 1);
      }
      return { damage: bow.damage, reloadMs: bow.reloadTime, doubleJump: bow.doubleJump, drops };
    }));
    assert.deepEqual(errors, []);
    console.log('Bow: client/server damage, twice-fast reload, physical arrows, gravity, remote/ability parity and flight orientation passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
