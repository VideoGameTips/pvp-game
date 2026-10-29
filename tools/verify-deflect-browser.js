const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof triggerDeflectImpact === 'function');
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    console.log(await page.evaluate(() => {
      document.querySelectorAll('body > :not(canvas)').forEach(e => { e.style.display = 'none'; });
      scene.children.forEach(e => { e.visible = false; });
      camera.visible = true; camera.children.forEach(e => { if (!e.isLight) e.visible = false; });
      scene.background = new THREE.Color(0x34414a);
      const light = new THREE.HemisphereLight(0xffffff, 0x8098aa, 2); scene.add(light);
      camera.position.set(0, 1.65, 0); camera.quaternion.identity();
      camera.aspect = 1280 / 800; camera.fov = 75; camera.updateProjectionMatrix();
      activeSlot = 'melee'; selectedMeleeIdx = MELEE_ITEMS.findIndex(x => x.id === 'katana');
      const model = meleeModels[selectedMeleeIdx]; model.visible = true;
      let now = 1000; const callbacks = [];
      Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
      window.requestAnimationFrame = callback => { callbacks.push(callback); return callbacks.length; };
      meleeDeflectKick = null; meleeDeflectPulseAt = now - 300; meleeDeflectDir = 1;
      applyMeleeDeflectPose(model);
      const base = model.position.clone(), poses = new Set();
      for (let i = 0; i < 20; i++) {
        now += 300;
        const before = model.position.clone();
        triggerDeflectImpact(new THREE.Vector3(.15, 1.62, -.65));
        applyMeleeDeflectPose(model);
        if (model.position.distanceTo(before) > .00001) throw Error('Deflect pose teleports on impact');
        now += 60; applyMeleeDeflectPose(model);
        const target = meleeDeflectKick.target;
        // the guard it chose plus the jitter triggerDeflectImpact adds: +-0.07, half that on y, none on z (#82; the
        // fixed box this used was the one-guard deflect's, and the eight guards of 5e06916 reach past it by design)
        const P = DEFLECT_POSES[meleeDeflectKick.sector], J = [.07, .035, 0, .07, .07, .07];
        if (!P || !target.every(Number.isFinite) || target.some((t, k) => Math.abs(t - P[k]) > J[k] + 1e-6)) throw Error('Unbounded pose');
        poses.add(target.map(x => x.toFixed(3)).join(','));
        now += 240; applyMeleeDeflectPose(model);
        if (model.position.distanceTo(base) > .00001 || Math.abs(model.rotation.z - Math.PI / 4) > .00001) throw Error('Guard stance changed');
        const pending = callbacks.splice(0); pending.forEach(callback => callback());
      }
      if (poses.size !== 20) throw Error('Repeated deflect poses');
      const previous = new Set(scene.children);
      triggerDeflectImpact(new THREE.Vector3(.15, 1.62, -.65));
      const effects = scene.children.filter(e => !previous.has(e));
      const flare = effects.find(e => e.geometry?.type === 'ShapeGeometry');
      if (!flare || flare.material.depthTest || flare.position.distanceTo(new THREE.Vector3(.15, 1.62, -.65)) > .001) throw Error('Flash not at bullet contact');
      now += 60; applyMeleeDeflectPose(model);
      renderer.setSize(1280, 800); renderer.render(scene, camera);
      window._deflectFinish = () => {
        now += 300;
        callbacks.splice(0).forEach(callback => callback());
        if (flare.parent) throw Error('Flash survives its lifetime');
      };
      return { uniquePoses: poses.size, flashAtBullet: true };
    }));
    await page.screenshot({ path: '/tmp/pvp-katana-deflect.png' });
    await page.evaluate(() => window._deflectFinish());
    assert.deepEqual(errors, []);
    console.log('Deflect random poses, smooth response, original guard, contact flash and cleanup passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
