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
        const check = (value, message) => { if (!value) throw Error(message); };
        const ids = ['freeze_ray_absolute_zero', 'combat_axe_guillotine', 'nail_gun_factory_override', 'knife_mirror_dimension'];
        const stats = JSON.stringify([WEAPONS, MELEE_ITEMS, SUPPORT_ITEMS]);
        currentUser = { username: 'MachineryPreview', skinInventory: ids };
        window.requestAnimationFrame = () => 0;
        let now = performance.now(), wall = Date.now();
        const oldDate = Date.now;
        Date.now = () => wall;
        Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
        gameStarted = true; isDead = reloading = countdownActive = false;
        camera.fov = 75; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
        const shots = [];
        const capture = model => {
          const shot = model.clone(); shot.position.set(0, 0, 0); shot.quaternion.identity();
          shot.traverse(o => { if (o.material) o.material = o.material.clone(); });
          shots.push(shot);
        };
        const tick = (model, ms) => { now += ms; wall += ms; model._tick?.(ms / 1000, now / 1000, false); };
        try {
          const utility = SUPPORT_ITEMS.findIndex(x => x.id === 'freeze_ray');
          setSupportModelSkin('freeze_ray', ids[0]); finishEquip();
          selectedSupportIdx = utility; activeSlot = 'support';
          const cryo = supportModels[utility]; cryo.visible = true;
          check(cryo._cryo?.chambers.length === 6 && GEN2_SUPPORT_MODEL_SKIN_IDS.has(ids[0]), 'Cryo equip/registration failed');
          tick(cryo, 200); const spinning = cryo._cryo.rotator.rotation.z;
          fireFreezeRay(SUPPORT_ITEMS[utility]); tick(cryo, 50);
          const locked = cryo._cryo.rotator.rotation.z;
          tick(cryo, 100); check(locked === cryo._cryo.rotator.rotation.z && spinning !== locked, 'Six chambers did not lock');
          tick(cryo, 400);
          check(cryo._cryo.frost.every(f => f.mesh.material.color.clone().sub(f.base).toArray().some(x => Math.abs(x) > .15)), 'Frost did not cover all armor');
          capture(cryo); tick(cryo, 2400);
          check(cryo._cryo.frost.every(f => f.mesh.material.color.clone().sub(f.base).toArray().every(x => Math.abs(x) < .001)), 'Frost did not recover');

          const axeIdx = MELEE_ITEMS.findIndex(x => x.id === 'combat_axe');
          setMeleeModelSkin('combat_axe', ids[1]); finishEquip();
          selectedMeleeIdx = axeIdx; activeSlot = 'melee';
          const axe = meleeModels[axeIdx]; axe.visible = true;
          check(axe._guillotine?.blades.length === 3, 'Missing three axe sections');
          axe._onSwing(); tick(axe, 130);
          check(axe._guillotine.blades[0].part.position.distanceTo(axe._guillotine.blades[0].home) > .055, 'Axe does not split on windup');
          capture(axe); tick(axe, 130);
          check(axe._guillotine.blades.every(b => b.part.position.distanceTo(b.home) < .001), 'Axe does not lock before impact');
          const fakeAnim = { t: .09, ms: .5 };
          meleeCombo = { anim: fakeAnim }; tick(axe, 16);
          check(axe._guillotine.blades[0].part.position.distanceTo(axe._guillotine.blades[0].home) > .05, 'Combo windup ignores skin');
          fakeAnim.t = .25; tick(axe, 16);
          check(axe._guillotine.blades.every(b => b.part.position.distanceTo(b.home) < .001), 'Combo does not close blades');
          meleeCombo = null;

          const nailIdx = WEAPONS.findIndex(x => x.id === 'nail_gun');
          setModelSkin('nail_gun', ids[2]); finishEquip();
          selectedSecondaryIdx = currentWeaponIdx = nailIdx; currentWeapon = WEAPONS[nailIdx]; activeSlot = 'secondary';
          const factory = weaponModels[nailIdx]; factory.visible = true;
          check(factory._factory?.nails.length === 10, 'Visible conveyor nails missing');
          const oldZ = factory._factory.nails[4].position.z;
          weaponAmmo[nailIdx].ammo = 7; lastShot = 0; equipReadyAt = 0; tryShoot(); tick(factory, 55);
          check(factory._factory.nails[4].position.z < oldZ - .008 && weaponAmmo[nailIdx].ammo === 6, 'Conveyor does not feed on real firing');
          factory._flash.visible = false; capture(factory);
          startReload();
          const start = factory._reloadStart;
          wall = start + currentWeapon.reloadTime * .50; factory._tick(.10, now / 1000, false);
          check(factory._factory.lid.rotation.z > 1.4 && factory._factory.nails.some(n => !n.visible), 'Service reload did not open/feed');
          cancelReload(); factory._calm();

          const knifeIdx = MELEE_ITEMS.findIndex(x => x.id === 'knife');
          setMeleeModelSkin('knife', ids[3]); finishEquip();
          selectedMeleeIdx = knifeIdx; activeSlot = 'melee'; meleeSwingT = 1; meleeAbilityBuff = null;
          const mirror = meleeModels[knifeIdx]; mirror.visible = true;
          check(mirror._mirror?.holders.length === 2 && startItemInspect(), 'Mirror inspect did not start');
          const seek = t => { now = itemInspect.t0 + itemInspect.ms * t; updateItemInspect(); };
          seek(.30); const originalX = mirror._mirror.holders[0].h.position.x;
          seek(.65); check(mirror._mirror.holders[0].h.position.x < originalX - .15, 'Knives did not cross the mirror');
          capture(mirror); seek(.86);
          check(mirror._mirror.isSwapped(), 'Knives did not reverse colors');
          cancelItemInspect();
          check(mirror._mirror.hands.every(h => h.visible) && mirror._mirror.holders.every(h => h.h.scale.x === 1), 'Interrupted inspect leaves hidden hands/knives');
          check(JSON.stringify([WEAPONS, MELEE_ITEMS, SUPPORT_ITEMS]) === stats, 'Gameplay stats changed');

          const events = [], eventImpl = _playSoundEvent, shotImpl = _playWeaponSound;
          try {
            _playSoundEvent = () => events.push(_wpnPitch);
            _playWeaponSound = () => events.push(_wpnPitch);
            playSoundEvent('melee_swing'); check(events.pop() === 1.09 && _wpnPitch === 1, 'Melee pitch missing or leaking');
            playSoundEvent('footstep'); check(events.pop() === 1, 'Ambient sounds got pitched');
            playSoundEvent('melee_swing', { remote: true }); check(events.pop() === 1, 'Remote sound borrowed local skin');
            playWeaponSound('nail_gun'); check(events.pop() === .89, 'Original gun report not pitched');
            playWeaponSound('nail_gun', { remote: true, skinId: ids[2] }); check(events.pop() === .89, 'Remote skin pitch missing');
            for (const skin of MODEL_SKINS) check(skinPitchOf(skin.id) >= .88 && skinPitchOf(skin.id) <= 1.12, 'Excessive pitch: ' + skin.id);
          } finally { _playSoundEvent = eventImpl; _playWeaponSound = shotImpl; }

          window._quartetRender = index => {
            const scene = new THREE.Scene(); scene.background = new THREE.Color(0x303a43);
            scene.add(shots[index], new THREE.HemisphereLight(0xf5f6ff, 0x8c9d9b, 2.1));
            const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(-1, 2, 1); scene.add(key);
            const view = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .01, 10), d = innerWidth < 500 ? 2.0 : 1;
            view.position.set(-.46 * d, .32 * d, .36 * d); view.lookAt(-.015, -.01, -.07);
            document.querySelectorAll('[data-quartet-render]').forEach(c => c.remove());
            const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
            renderer.setSize(innerWidth, innerHeight); renderer.domElement.dataset.quartetRender = '1';
            Object.assign(renderer.domElement.style, { position: 'fixed', inset: 0, zIndex: 2147483647 });
            document.body.appendChild(renderer.domElement); renderer.render(scene, view);
            const gl = renderer.getContext(), p = new Uint8Array(innerWidth * innerHeight * 4);
            gl.readPixels(0, 0, innerWidth, innerHeight, gl.RGBA, gl.UNSIGNED_BYTE, p);
            let changed = 0; for (let i = 0; i < p.length; i += 4) if (p[i] !== p[0] || p[i + 1] !== p[1] || p[i + 2] !== p[2]) changed++;
            check(changed > 800, 'Blank machinery skin ' + index);
            return changed;
          };
          return { skins: 4, originalStats: true, pitchBounded: true, mirrorColorsReversed: true };
        } finally { Date.now = oldDate; delete performance.now; }
      }));
      for (let i = 0; i < 4; i++) {
        console.log(width, i, await page.evaluate(i => window._quartetRender(i), i));
        await page.screenshot({ path: '/tmp/pvp-quartet-' + i + '-' + width + '.png' });
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
