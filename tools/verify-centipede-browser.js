const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 800 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'load' });
      console.log(width, await page.evaluate(() => {
        const check = (v, message) => { if (!v) throw Error(message); };
        const idx = WEAPONS.findIndex(w => w.id === 'rpd'), id = 'rpd_iron_centipede';
        const stats = JSON.stringify(WEAPONS[idx]);
        currentUser = { username: 'CentipedePreview', skinInventory: [id] };
        setModelSkin('rpd', id); finishEquip(); equipReadyAt = 0;
        currentWeaponIdx = selectedPrimaryIdx = idx; currentWeapon = WEAPONS[idx]; activeSlot = 'primary';
        const g = weaponModels[idx], rig = g._centipede;
        check(rig?.segments.length === 13 && GEN2_MODEL_SKIN_IDS.has(id), 'Skin registration failed');
        g.visible = true; gameStarted = true; isDead = countdownActive = reloading = isADS = false;
        camera.fov = 75; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
        const date = Date.now, sound = playEquipSound;
        let now = performance.now(), wall = Date.now(), clacks = 0;
        Date.now = () => wall;
        Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
        window.requestAnimationFrame = () => 0;
        playEquipSound = name => { if (name === 'clack') clacks++; };
        const tick = ms => { now += ms; wall += ms; g._tick(ms / 1000, now / 1000, false); };
        const inspectAt = t => {
          const next = g._reloadStart + t * g._reloadDur;
          const dt = Math.max(.016, (next - wall) / 1000);
          now += next - wall; wall = next;
          updateReloadAnim(); g._tick(dt, now / 1000, false);
        };
        try {
          g._calm();
          const idle = rig.segments[3].part.position.clone(); tick(150);
          check(idle.distanceTo(rig.segments[3].part.position) > .0001, 'Idle twitch missing');
          const headY = rig.head.position.y;
          isADS = true; tick(250);
          check(rig.head.position.y > headY + .013, 'ADS head lift missing');
          isADS = false;
          const pool = weaponAmmo[idx]; pool.ammo = 37; pool.reserve = 0;
          const prior = rig.segments[3].part.position.clone(); lastShot = 0; tryShoot(); tick(50);
          check(pool.ammo === 36 && prior.distanceTo(rig.segments[3].part.position) > .008 && !rig.head.visible, 'Belt does not feed while firing');
          tick(250); check(rig.head.visible, 'Head does not peek out after firing');
          const ammoBefore = JSON.stringify(pool);
          g._cosmeticReload(); tick(900);
          check(!rig.head.visible && rig.segments.every(s => !s.part.visible), 'Empty belt does not retract into nest');
          tick(900); check(rig.head.visible && rig.segments.some(s => s.part.visible), 'Fresh centipede does not emerge');
          tick(560); tick(50);
          check(rig.cover.rotation.z < .01 && JSON.stringify(pool) === ammoBefore && !reloading, 'Cosmetic reload changes ammunition or fails to close');
          startInspect(); check(g._inspectMode && g._reloadDur === 5200, 'Missing escape inspect');
          inspectAt(.36);
          check(rig.head.position.z < -.13 && rig.segments.some(s => s.part.position.z < -.13), 'Creature never leaves feed/barrel route');
          inspectAt(.57);
          const facing = rig.head.getWorldDirection(new THREE.Vector3());
          const toward = camera.getWorldPosition(new THREE.Vector3()).sub(rig.head.getWorldPosition(new THREE.Vector3())).normalize();
          check(facing.dot(toward) > .99, 'Head does not stare at camera');
          g._flash.visible = false;
          const shot = g.clone();
          shot.traverse(o => { if (o.material) o.material = o.material.clone(); });
          inspectAt(.83); check(!rig.head.visible, 'Creature does not return to nest');
          inspectAt(.99); check(clacks === 2 && rig.cover.rotation.z < .01, 'Feed cover does not clack shut once per sequence');
          cancelInspect(); g._calm();
          check(rig.head.visible && rig.segments.every(s => s.part.visible) && rig.cover.rotation.z === 0, 'Cancel/holster does not reset creature');
          check(stats === JSON.stringify(WEAPONS[idx]) && currentWeapon.mag === 300 && currentWeapon.noReload && pool.reserve === 0, 'RPD gameplay changed');
          g._cosmeticReload(); tick(150); lastShot = 0; tryShoot(); tick(20);
          check(g.rotation.y === 0, 'Firing does not interrupt cosmetic reload');
          const stage = new THREE.Scene(); stage.background = new THREE.Color(0x303942);
          const view = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .01, 10);
          view.add(shot); stage.add(view, new THREE.HemisphereLight(0xf7eff0, 0x84919b, 2.2));
          const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(-1, 2, 2); stage.add(key);
          const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
          renderer.setSize(innerWidth, innerHeight);
          Object.assign(renderer.domElement.style, { position: 'fixed', inset: 0, zIndex: 2147483647 });
          document.body.appendChild(renderer.domElement); renderer.render(stage, view);
          const gl = renderer.getContext(), pixels = new Uint8Array(innerWidth * innerHeight * 4);
          gl.readPixels(0, 0, innerWidth, innerHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let red = 0;
          for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 110 && pixels[i] > pixels[i + 1] * 1.6 && pixels[i] > pixels[i + 2] * 1.4) red++;
          check(red > 40, 'Red eyes/armor absent from render');
          for (const segment of shot.getObjectByName('iron-centipede').children) {
            if (!segment.visible) continue;
            const p = segment.getWorldPosition(new THREE.Vector3()).project(view);
            check(Math.abs(p.x) < .97 && Math.abs(p.y) < .97, 'Creature clipped');
          }
          check(renderer.info.render.calls < 230, 'Too many draw calls');
          return { segments: 13, redPixels: red, drawCalls: renderer.info.render.calls, cosmeticReloadPreservesAmmo: true };
        } finally { Date.now = date; delete performance.now; playEquipSound = sound; }
      }));
      await page.screenshot({ path: '/tmp/pvp-centipede-' + width + '.png' });
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
