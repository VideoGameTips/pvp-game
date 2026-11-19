const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 840 }, hasTouch: width < 500 });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(() => typeof SKIN_FX !== 'undefined');
      await page.evaluate(() => {
        requestAnimationFrame = () => 0;
        currentUser = { username: 'Paradox Test', purchased: [], skinInventory: [] };
        const skin = MODEL_SKINS.find(s => s.id === 'm1_garand_paradox');
        if (skin?.rarity !== 'mythic' || !GEN3_SKIN_DEFS.includes(skin) || !isCaseSkinLocked(skin)) throw Error('Missing Mythic case gating');
        setModelSkin('m1_garand', skin.id);
        if (_activeModelSkin.m1_garand) throw Error('Unlocked without ownership');
        currentUser.skinInventory.push(skin.id);
        openItemSkins('gun', 'm1_garand');
      });
      await page.locator('[data-preview-skin="m1_garand_paradox"]').click();
      const png = await page.evaluate(() => {
        const check = (v, msg) => { if (!v) throw Error(msg); };
        const idx = WEAPONS.findIndex(w => w.id === 'm1_garand');
        const w = WEAPONS[idx], g = weaponModels[idx], stock = _baseWeaponModels[idx], skin = _activeModelSkin[w.id];
        check(skin?.id === 'm1_garand_paradox' && effectiveGunStats(w) === w && skinLookFor(skin) === null, 'Skin changed handling or did not equip');
        check(g._hipPosition.equals(stock._hipPosition) && g._flash.position.equals(stock._flash.position), 'Stock origin differs');
        check(g.getObjectByName('paradox-receiver-2') && g.getObjectByName('paradox-barrel-1'), 'Missing receiver or twisted barrels');
        const core = g.getObjectByName('paradox-dodecahedron'), ammoRig = g._parts.ammo;
        check(core.children.length === 12 && ammoRig.children.length === w.mag, 'Wrong chamber or cartridge count');
        currentWeaponIdx = selectedPrimaryIdx = idx; currentWeapon = w; activeSlot = 'primary';
        gameStarted = true; isDead = false; inLobby = false; reloading = false; countdownActive = false;
        equipReadyAt = 0; finishEquip();
        weaponAmmo[idx] = { ammo: w.mag, reserve: w.reserve };
        const ammoCount = () => ammoRig.children.filter(o => o.visible).length;
        const before = ammoRig.children[0].position.clone(), angle = core.quaternion.clone();
        g._tick(.2, performance.now() / 1000, false);
        check(before.distanceTo(ammoRig.children[0].position) > .005 && angle.angleTo(core.quaternion) > .1, 'Idle orbit does not move');
        const shots = [];
        const emit = socket.emit;
        socket.emit = function (ev, d, ...args) {
          if (ev === 'shoot') shots.push(d);
          else return emit.call(this, ev, d, ...args);
        };
        for (let n = w.mag; n > 0; n--) {
          lastShot = 0;
          tryShoot();
          check(weaponAmmo[idx].ammo === n-1 && ammoCount() === n-1, 'One shot did not remove exactly one cartridge');
          g._tick(1/60, performance.now() / 1000, false);
          check(core.children.some(o => Math.abs(o.quaternion.w) < .97), 'Chamber did not open on firing');
          g._tick(1/60, performance.now() / 1000 + .4, false);
          check(core.children.every(o => o.quaternion.w === 1), 'Chamber did not close');
        }
        socket.emit = emit;
        check(shots.length === w.mag && shots.every(s => s.weapon === w.id), 'Changed shot count or weapon ID');
        startReload();
        check(g._reloadDur === w.reloadTime, 'Reload timer changed');
        const state = _reloadSt;
        _endReload(state, true); clearTimeout(state.timer);
        check(ammoCount() === w.mag && weaponAmmo[idx].reserve === w.reserve - w.mag, 'Ammo display did not refill from reserve');

        const stage = new THREE.Scene();
        stage.background = new THREE.Color(0x272d3b);
        stage.environment = window.PVE_WEAPON_FINISH.environment(renderer);
        stage.add(new THREE.HemisphereLight(0xf6f5ff, 0x9294b9, 2));
        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(-3, 5, 2); stage.add(light);
        const display = skin.build();
        display.position.set(0, 0, 0); stage.add(display);
        const cam = new THREE.OrthographicCamera(-.43, .43, .23, -.23, .01, 10);
        cam.position.set(-2, .28, -.30); cam.lookAt(0, -.015, -.02);
        renderer.setSize(innerWidth, Math.round(innerWidth * .535));
        renderer.render(stage, cam);
        const probe = document.createElement('canvas'); probe.width = 160; probe.height = 86;
        const ctx = probe.getContext('2d'); ctx.drawImage(renderer.domElement,0,0,160,86);
        const pixels = ctx.getImageData(0,0,160,86).data;
        let lightParts = 0, violetParts = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] > 160 && pixels[i+2] > 165) lightParts++;
          if (pixels[i+2] - pixels[i+1] > 34 && pixels[i] - pixels[i+1] > 12) violetParts++;
        }
        check(lightParts > 100 && violetParts > 30, 'Preview is blank or missing the porcelain/violet contrast');
        return renderer.domElement.toDataURL('image/png').split(',')[1];
      });
      assert.deepEqual(errors, []);
      if (process.env.PARADOX_PREVIEW_DIR) fs.writeFileSync(`${process.env.PARADOX_PREVIEW_DIR}/paradox-garand-${width}.png`, Buffer.from(png,'base64'));
      console.log(`Paradox ${width}px: Mythic equip, 12 opening faces, eight live cartridges, stock reload and nonblank render`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
