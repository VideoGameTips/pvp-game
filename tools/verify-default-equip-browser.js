const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof startDefaultEquip === 'function');
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    console.log(await page.evaluate(() => {
      let now = 1000;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
      finishEquip(); shooting = false; reloading = false; isADS = false; meleeSwingT = 1;
      const ammo = JSON.stringify(weaponAmmo);
      let count = 0;
      const profiles = new Set();
      for (const [items, models, slot] of [[WEAPONS, weaponModels, null], [MELEE_ITEMS, meleeModels, 'melee'], [SUPPORT_ITEMS, supportModels, 'support']]) {
        items.forEach((item, i) => {
          const model = models[i], actualSlot = slot || item.slot;
          if (!model) throw Error(item.id + ': missing model');
          if (!slot) ensureMech(model, item.id);
          const home = new Map();
          model.traverse(o => home.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }));
          now += 2000;
          _equipDur = equipMsFor(item, actualSlot); equipReadyAt = now + _equipDur;
          startDefaultEquip(model, item, actualSlot, _equipDur);
          const e = _equip;
          if (!e || e.dur > _equipDur || e.t0 + e.dur > equipReadyAt) throw Error(item.id + ': animation exceeds equip time');
          profiles.add(e.profile);
          for (const t of [0, .24, .42, .72, .99]) {
            _equipStep(e, t);
            model.traverse(o => {
              if (![...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray()].every(Number.isFinite)) throw Error(item.id + ': invalid transform');
            });
          }
          finishEquip();
          for (const [o, h] of home) {
            if (o.position.distanceTo(h.p) > 1e-7 || o.quaternion.angleTo(h.q) > 1e-6 || o.scale.distanceTo(h.s) > 1e-7) throw Error(item.id + ': rest transform changed');
          }
          startDefaultEquip(model, item, actualSlot, 0);
          if (_equip) throw Error(item.id + ': instant switch still animates');
          count++;
        });
      }
      if (JSON.stringify(weaponAmmo) !== ammo) throw Error('Equip changed ammo');
      activeSlot = 'secondary'; currentWeaponIdx = WEAPONS.findIndex(x => x.id === 'pistol');
      const pistol = weaponModels[currentWeaponIdx]; pistol.visible = true;
      now += 2000; _equipDur = equipMsFor(WEAPONS[currentWeaponIdx], activeSlot); equipReadyAt = now + _equipDur;
      startEquipAnim(currentWeaponIdx, _equipDur);
      if (!_equip.action || _equip.profile !== 'slide') throw Error('Pistol does not rack actual slide');
      const action = _equip.action.g, h = _equip.ps.find(p => p.c === action).h;
      _equipStep(_equip, .42);
      const rackPose = action.position.clone();
      const saved = _equip.action; _equip.action = null; _equipStep(_equip, .42); _equip.action = saved;
      if (rackPose.distanceTo(action.position) < .025) throw Error('Slide did not retract');
      _equipStep(_equip, .42); shooting = true; updateEquipAnim(); shooting = false;
      if (_equip || action.position.distanceTo(h.p) > 1e-7) throw Error('Interrupted rack not restored');
      startEquipAnim(currentWeaponIdx, _equipDur);
      now = equipReadyAt; updateEquipAnim();
      if (_equip || !equipReady()) throw Error('Default animation survives gameplay deadline');
      activeSlot = 'primary'; currentWeaponIdx = WEAPONS.findIndex(x => x.id === 'ak20');
      startEquipAnim(currentWeaponIdx, 700);
      if (_equip.type !== 'draw') throw Error('AK draw changed');
      finishEquip();
      const frag = supportModels[SUPPORT_ITEMS.findIndex(x => x.id === 'frag')];
      const fragIdx = SUPPORT_ITEMS.findIndex(x => x.id === 'frag');
      now += 2000; _equipDur = equipMsFor(SUPPORT_ITEMS[fragIdx], 'support'); equipReadyAt = now + _equipDur;
      startSupportEquipAnim(fragIdx, _equipDur);
      if (!_equip || _equip.dur > _equipDur) throw Error('Stock grenade exceeds utility equip time');
      finishEquip(); startSupportEquipAnim(fragIdx, 0);
      if (_equip) throw Error('Instant grenade swap still animates');
      _beginEquip(frag, { equip: 'donutbuild', equipMs: 1450 }, false, true);
      if (_equip.type !== 'donutbuild' || _equip.dur !== 1450) throw Error('Custom equip changed');
      finishEquip();
      document.querySelectorAll('body > :not(canvas)').forEach(e => { e.style.display = 'none'; });
      scene.children.forEach(e => { e.visible = false; });
      camera.visible = true; camera.children.forEach(e => { if (!e.isLight) e.visible = false; });
      camera.position.set(0, 1.65, 0); camera.quaternion.identity();
      scene.background = new THREE.Color(0x34414a);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8098aa, 2));
      window._renderEquip = (id, slot, width, height) => {
        finishEquip();
        camera.children.forEach(e => { if (!e.isLight) e.visible = false; });
        const items = slot === 'melee' ? MELEE_ITEMS : slot === 'support' ? SUPPORT_ITEMS : WEAPONS;
        const models = slot === 'melee' ? meleeModels : slot === 'support' ? supportModels : weaponModels;
        const i = items.findIndex(x => x.id === id), m = models[i];
        m.visible = true;
        equipReadyAt = now + equipMsFor(items[i], slot); _equipDur = equipMsFor(items[i], slot);
        startDefaultEquip(m, items[i], slot, _equipDur); _equipStep(_equip, .42);
        camera.aspect = width / height; camera.fov = 75; camera.updateProjectionMatrix();
        renderer.setSize(width, height); renderer.render(scene, camera);
        const pixels = new Uint8Array(width * height * 4);
        renderer.getContext().readPixels(0, 0, width, height, renderer.getContext().RGBA, renderer.getContext().UNSIGNED_BYTE, pixels);
        let changed = 0;
        for (let j = 4; j < pixels.length; j += 4) if (pixels[j] !== pixels[0] || pixels[j + 1] !== pixels[1] || pixels[j + 2] !== pixels[2]) changed++;
        if (changed < 500) throw Error(id + ': blank equip frame ' + JSON.stringify({ changed, position: m.position.toArray(), scale: m.scale.toArray(), parent: m.parent && m.parent.type, held: m._heldItem && m._heldItem.visible }));
      };
      return { weaponsChecked: count, profiles: [...profiles], deadlines: 'passed', slideRack: 'passed', interruptAndInstant: 'passed' };
    }));
    for (const [id, slot, width, height] of [['pistol', 'secondary', 1280, 800], ['katana', 'melee', 1280, 800], ['frag', 'support', 844, 390], ['fists', 'melee', 844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(args => window._renderEquip(...args), [id, slot, width, height]);
      await page.screenshot({ path: `/tmp/pvp-equip-${id}.png` });
    }
    assert.deepEqual(errors, []);
    console.log('Default equip timing, physical slide, rest poses, ammo, custom entrances and desktop/mobile rendering passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
