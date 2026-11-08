const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(() => typeof removeReloadProp === 'function');
    await page.evaluate(() => { requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    console.log(await page.evaluate(() => {
      const check = (ok, why) => { if (!ok) throw Error(why); };
      const tested = [];
      for (const id of ['ak20', 'vector', 'pistol', 'p90', 'p90_spec', 'm1911', 'glock18', 'desert_eagle', 'five_seven', 'machine_pistol', 'hand_cannon', 'taser']) {
        const idx = WEAPONS.findIndex(w => w.id === id), model = weaponModels[idx];
        const mag = model._mech?.mag;
        check(mag, id + ': missing magazine');
        const events = RELOAD_PROPS[id], out = events.find(e => e.k === 'mag' && e.m === 'eject');
        const inn = events.find(e => e.k === 'mag' && e.m === 'arrive');
        check(out && inn, id + ': missing swap events');
        applyWeaponSkin(model, { id: 'test_wrap', wrap: 'carbon' });
        updateGunMech(model, id, out.t - .02, events, 2500);
        check(mag.g.visible && mag.g.position.distanceTo(mag.home) > .05, id + ': no extraction');
        spawnReloadProp(model, 'mag', 'eject', 'mag');
        const copy = _rProps[_rProps.length - 1].mesh, originalMeshes = [], copies = [];
        mag.g.traverse(o => { if (o.isMesh) originalMeshes.push(o); });
        copy.traverse(o => { if (o.isMesh) copies.push(o); });
        check(copy.visible && copies.length === originalMeshes.length, id + ': incorrect dropped geometry');
        copies.forEach((o, i) => {
          check(o.geometry === originalMeshes[i].geometry, id + ': wrong magazine shape');
          const a = Array.isArray(o.material) ? o.material[0] : o.material;
          const b = Array.isArray(originalMeshes[i].material) ? originalMeshes[i].material[0] : originalMeshes[i].material;
          check(a !== b && a.map === b.map && a.color.equals(b.color), id + ': wrap/material mismatch');
        });
        const originalOpacity = originalMeshes[0].material.opacity;
        updateReloadProps(.7);
        check(originalMeshes[0].material.opacity === originalOpacity, id + ': fading drop changed gun');
        clearReloadProps();
        updateGunMech(model, id, out.t + .01, events, 2500);
        check(!mag.g.visible, id + ': old magazine remained seated');
        updateGunMech(model, id, inn.t, events, 2500);
        check(mag.g.visible && mag.g.position.distanceTo(mag.home) > .1, id + ': new magazine did not arrive');
        updateGunMech(model, id, inn.t + .13, events, 2500);
        check(mag.g.position.distanceTo(mag.home) < .001, id + ': magazine not seated');
        updateGunMech(model, id, null, events, 2500);
        check(mag.g.visible && mag.g.position.equals(mag.home) && mag.g.quaternion.equals(mag.rotation), id + ': cancel/rest did not restore');
        tested.push(id);
      }
      const skin = MODEL_SKINS.find(s => s.weapon === 'ak20' && s.series === 'stealth');
      if (skin) {
        const model = prepViewModel(skin.build(), 'ak20');
        check(model._mech?.mag, 'Stealth skin magazine not recognized');
        spawnReloadProp(model, 'mag', 'eject', 'mag');
        check(_rProps.at(-1).mesh.children.length === model._mech.mag.g.children.length, 'Stealth skin replaced with generic magazine');
        clearReloadProps(); tested.push(skin.id);
      }
      currentWeaponIdx = WEAPONS.findIndex(w => w.id === 'ak20');
      const model = weaponModels[currentWeaponIdx];
      model._reloadStart = Date.now() - 2500 * .27; model._reloadDur = 2500;
      model._inspectMode = false; model._reloadPlan = null;
      updateReloadAnim();
      check(model._hands.front.position.distanceTo(model._mech.mag.g.position) < .08, 'Hand did not grip real magazine');
      camera.children.forEach(o => { if (!o.isLight) o.visible = false; });
      document.querySelectorAll('body > :not(canvas)').forEach(e => { e.style.display = 'none'; });
      camera.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2));
      model.visible = true; camera.position.set(0, 3, 20); camera.rotation.set(0, 0, 0);
      renderer.render(scene, camera);
      return tested;
    }));
    await page.screenshot({ path: '/tmp/magazine-reload.png' });
    assert.deepEqual(errors, []);
    console.log('PASS: actual magazine shapes, wraps, extraction, insertion, cancellation and hand contact');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
