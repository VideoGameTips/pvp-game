const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof armRemoteMesh === 'function');
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      document.querySelectorAll('body > :not(canvas)').forEach(e => { e.style.display = 'none'; });
      const preview = new THREE.Scene(); preview.background = new THREE.Color(0x53646b);
      preview.environment = scene.environment;
      preview.add(new THREE.HemisphereLight(0xffffff, 0x667788, 2));
      const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(2, 4, 3); preview.add(light);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshLambertMaterial({ color: 0x42525b }));
      floor.rotation.x = -Math.PI / 2; preview.add(floor);
      const observer = new THREE.PerspectiveCamera(42, 1280 / 800, .01, 30);
      observer.position.set(3.7, 2.5, 5.2); observer.lookAt(0, .9, 0);
      const actors = ['ak20', 'pistol', 'minigun'].map((id, i) => {
        const body = makePlayerMesh(id, i !== 1, 'enemy', 'default');
        body.position.set((i - 1) * 1.6, 0, 0); body.rotation.y = .3;
        armRemoteMesh(body, id); preview.add(body); return body;
      });
      renderer.setSize(1280, 800);
      window._gripPreview = { preview, observer, actors };
    });
    for (const state of ['running', 'crouching', 'sliding', 'jumping']) {
      console.log(await page.evaluate(state => {
        const { actors, observer, preview } = window._gripPreview;
        let maxGap = 0;
        for (let frame = 0; frame < 90; frame++) for (const body of actors) {
          body.position.z += .09;
          animateCharacterMesh(body, 1 / 60, ['crouching', 'sliding'].includes(state) ? .58 : 0,
            state === 'sliding' ? 1 : 0, state === 'jumping' ? 1 : 0, .25);
          body.updateMatrixWorld(true);
          const palm = body._rig.handR.getWorldPosition(new THREE.Vector3());
          const grip = body._gun.getWorldPosition(new THREE.Vector3());
          maxGap = Math.max(maxGap, palm.distanceTo(grip));
          if (maxGap > .00001) throw Error(state + ': weapon left hand');
        }
        // Move the whole test scene back into view without changing the poses.
        for (const body of actors) { body.position.z = 0; body.updateMatrixWorld(true); }
        renderer.render(preview, observer);
        const pixels = new Uint8Array(4);
        const gl = renderer.getContext(); gl.readPixels(640, 400, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        if (!pixels[3]) throw Error('Blank render');
        return { state, maxGap };
      }, state));
      await page.screenshot({ path: `/tmp/pvp-remote-grips-${state}.png` });
    }
    // Force the crowd-budget stand-in path, not just the high-detail models.
    await page.evaluate(() => {
      const saved = _realGunsInUse;
      try {
        _realGunsInUse = () => REAL_GUN_BUDGET;
        const body = makePlayerMesh('Fallback'); armRemoteMesh(body, 'ak20');
        for (let i = 0; i < 60; i++) {
          body.position.x += .1; animateCharacterMesh(body, 1 / 60, .58, 1); body.updateMatrixWorld(true);
          if (body._gun.userData.realGun || body._gun.getWorldPosition(new THREE.Vector3()).distanceTo(body._rig.handR.getWorldPosition(new THREE.Vector3())) > .00001) throw Error('Fallback floats');
        }
        disposeBody(body);
      } finally { _realGunsInUse = saved; }
    });
    assert.deepEqual(errors, []);
    console.log('Remote grip animation renders and crowded-match fallback passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
