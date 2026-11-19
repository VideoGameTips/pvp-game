const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 800 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'load' });
      console.log(width, await page.evaluate(() => {
        const check = (v, message) => { if (!v) throw Error(message); };
        const idx = MELEE_ITEMS.findIndex(m => m.id === 'sledge'), id = 'sledge_foundry';
        const stats = JSON.stringify(MELEE_ITEMS[idx]);
        currentUser = { username: 'FoundryPreview', skinInventory: [id] };
        setMeleeModelSkin('sledge', id); finishEquip();
        const g = meleeModels[idx], rig = g._foundry;
        check(rig?.blocks.length === 4 && GEN2_MELEE_MODEL_SKIN_IDS.has(id), 'Skin/case registration');
        activeSlot = 'melee'; selectedMeleeIdx = idx; g.visible = true;
        gameStarted = true; isDead = reloading = countdownActive = false;
        meleeSwingT = 1; equipReadyAt = 0; lastMelee = 0;
        let now = performance.now(); const events = [], callbacks = [], sound = playSoundEvent;
        Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
        window.requestAnimationFrame = fn => (callbacks.push(fn), callbacks.length);
        playSoundEvent = name => events.push(name);
        const tick = ms => { now += ms; g._tick(ms / 1000, now / 1000, false); };
        try {
          g._calm(); tryMelee(); g._onFoundryContact(new THREE.Vector3(0, 1, -1));
          tick(200);
          check(rig.blocks[0].part.position.distanceTo(rig.blocks[0].home) > .07, 'Swing windup did not split the head');
          tick(147);
          check(rig.blocks[0].part.position.distanceTo(rig.blocks[0].home) < .001, 'Head did not lock during the swing');
          check(_foundryBursts.size === 1, 'Missing geometric impact burst');
          tick(500); callbacks.splice(0).forEach(fn => fn());
          check(_foundryBursts.size === 0, 'Impact geometry did not expire');
          meleeSwingT = 1; g._calm();
          camera.fov = 75; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
          check(startItemInspect() && itemInspect.kind === 'foundry', 'Missing dedicated inspect');
          const seek = t => { now = itemInspect.t0 + t * itemInspect.ms; updateItemInspect(); };
          seek(.45);
          check(rig.blocks.every(b => b.mat.emissiveIntensity > 1), 'Forge armor did not heat up');
          const shot = g.clone();
          shot.traverse(o => { if (o.material) o.material = o.material.clone(); });
          for (const t of [.656, .716, .776, .836]) seek(t);
          check(events.filter(e => e === 'foundry_clang').length === 5, 'Expected impact plus four forging clangs');
          seek(.985);
          check(rig.blocks.every(b => b.mat.emissiveIntensity === 0 && b.part.position.distanceTo(b.home) < .001), 'Head failed to cool and reassemble');
          cancelItemInspect();
          check([..._foundryBursts].every(clear => clear.parentModel !== g), 'Cancel left local sparks');
          check(stats === JSON.stringify(MELEE_ITEMS[idx]), 'Sledge gameplay changed');
          const stage = new THREE.Scene(); stage.background = new THREE.Color(0x29313a);
          const cam = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .01, 10);
          cam.add(shot); stage.add(cam, new THREE.HemisphereLight(0xfff0df, 0x788c9a, 2));
          const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(-1, 2, 2); stage.add(key);
          const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
          renderer.setSize(innerWidth, innerHeight);
          Object.assign(renderer.domElement.style, { position: 'fixed', inset: 0, zIndex: 2147483647 });
          document.body.appendChild(renderer.domElement); renderer.render(stage, cam);
          const gl = renderer.getContext(), pixels = new Uint8Array(innerWidth * innerHeight * 4);
          gl.readPixels(0, 0, innerWidth, innerHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let orange = 0;
          for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 155 && pixels[i] > pixels[i + 1] * 1.2 && pixels[i + 1] > pixels[i + 2] * 1.3) orange++;
          check(orange > 100, 'Blank forge rendering');
          for (const block of shot.getObjectByName('held-equipment').children.filter(o => o.name.startsWith('foundry-block-'))) {
            for (const x of [-.05, .05]) for (const y of [-.04, .04]) for (const z of [-.08, .08]) {
              const point = block.localToWorld(new THREE.Vector3(x, y, z)).project(cam);
              check(Math.abs(point.x) < .98 && Math.abs(point.y) < .98, 'Hammerhead clipped');
            }
          }
          return { blocks: 4, forgeStrikes: 4, orangePixels: orange, unchangedStats: true };
        } finally { playSoundEvent = sound; delete performance.now; }
      }));
      await page.screenshot({ path: '/tmp/pvp-foundry-' + width + '.png' });
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
