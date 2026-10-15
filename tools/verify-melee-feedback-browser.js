// Run against the local server; PLAYWRIGHT_MODULE can point to a bundled runtime.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof updateActionWind === 'function');
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);

    const audio = await page.evaluate(async () => {
      const saved = { getAudioCtx, unlockAudio }, results = [];
      try {
        unlockAudio = () => {};
        for (const name of ['melee_swing', 'melee_blade', 'melee_heavy', 'melee_fist', 'melee_chain', 'melee_whirlwind', 'melee_impact']) {
          const context = new OfflineAudioContext(1, 44100, 44100);
          getAudioCtx = () => context;
          playSoundEvent(name, { minGap: 0, material: 'heavy' });
          const samples = (await context.startRendering()).getChannelData(0);
          let energy = 0, peak = 0, secondPass = 0;
          for (let i = 0; i < samples.length; i++) {
            if (!Number.isFinite(samples[i])) throw Error(name + ' has invalid samples');
            energy += samples[i] ** 2; peak = Math.max(peak, Math.abs(samples[i]));
            if (i > 44100 * .19 && i < 44100 * .30) secondPass += samples[i] ** 2;
          }
          if (energy < .01 || peak > 1) throw Error(name + ' is silent or clipping');
          if (name === 'melee_whirlwind' && secondPass < .01) throw Error('Missing second blade pass');
          results.push({ name, rms: Math.sqrt(energy / samples.length), peak });
        }
      } finally { getAudioCtx = saved.getAudioCtx; unlockAudio = saved.unlockAudio; }
      return results;
    });
    console.log('Offline Web Audio:', audio);

    console.log(await page.evaluate(() => {
      document.querySelectorAll('body > :not(canvas)').forEach(e => { e.style.display = 'none'; });
      camera.children.forEach(o => { if (!o.isLight) o.visible = false; });
      const preview = new THREE.Scene(); preview.background = new THREE.Color(0x39464c);
      preview.environment = scene.environment;
      preview.add(new THREE.HemisphereLight(0xffffff, 0x808f9f, 2)); preview.add(camera);
      camera.position.set(0, 1.65, 0); camera.quaternion.identity();
      camera.aspect = 1280 / 800; camera.fov = 75; camera.updateProjectionMatrix();
      gameStarted = true; isDead = false; activeSlot = 'melee';
      selectedMeleeIdx = MELEE_ITEMS.findIndex(x => x.id === 'combat_axe');
      const item = MELEE_ITEMS[selectedMeleeIdx], model = meleeModels[selectedMeleeIdx];
      model.visible = true;
      meleeDash = { item, model, ab: item.ability, speed: item.ability.distance / item.ability.dashTime, elapsed: 0 };
      const originalNow = performance.now;
      let now = 1000;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
      try {
        playerVelocity.set(0, 0, -meleeDash.speed);
        for (let i = 0; i < 13; i++) {
          now = 1000 + i * 16; meleeDash.elapsed = i * .016;
          poseMeleeDash(); updateActionWind(.016);
        }
        const canvas = actionWind.canvas;
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let drawn = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) drawn++;
        if (drawn < 1000 || actionWind.points.length < 2) throw Error('Missing wind trail');
        renderer.setSize(1280, 800); renderer.render(preview, camera);
        return { trailPoints: actionWind.points.length, drawnPixels: drawn };
      } finally { Object.defineProperty(performance, 'now', { configurable: true, value: originalNow }); }
    }));
    await page.screenshot({ path: '/tmp/pvp-melee-feedback.png' });
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 740 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => {
        meleeDash = null; clearActionWind(); activeSlot = 'primary'; playerVelocity.set(0, 0, -29);
        for (let i = 0; i < 25; i++) updateActionWind(.016);
        const canvas = actionWind.canvas;
        const center = canvas.getContext('2d').getImageData(canvas.width * .3, canvas.height * .3, canvas.width * .4, canvas.height * .4).data;
        if (center.some((v, i) => i % 4 === 3 && v)) throw Error('Speed ring covers aim area');
      });
      await page.screenshot({ path: `/tmp/pvp-melee-speed-${viewport.width}.png` });
    }
    await page.evaluate(() => {
      playerVelocity.set(0, 0, 0);
      for (let i = 0; i < 120; i++) updateActionWind(.016);
      if (actionWind.canvas.style.display !== 'none') throw Error('Wind fails to fade');
      isDead = true; updateActionWind(.016);
      if (actionWind.points.length || actionWind.speed) throw Error('Wind survives death');
    });
    assert.deepEqual(errors, []);
    console.log('Melee audio, visible trails, desktop/mobile clear aim area and cleanup passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
