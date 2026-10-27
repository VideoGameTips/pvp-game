const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const errors = [];
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'load' });
      await page.waitForFunction(() => typeof MODEL_SKINS !== 'undefined' && window.PVE_STEALTH_SHOWROOM);
      await page.evaluate(() => { requestPointerLockSafe = () => {}; });
      await page.click('#stealth-login-btn');
      for (const id of ['pistol_stealth_cipher', 'ak20_stealth_ghostline', 'srx_stealth_longwatch']) {
        await page.click('[data-stealth-skin="' + id + '"]');
        await page.waitForFunction(() => document.querySelector('#stealth-panel img')?.naturalWidth === 640);
        const pixels = await page.evaluate(() => {
          const img = document.querySelector('#stealth-panel img'), c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, c.width, c.height).data;
          let count = 0; for (let i = 3; i < data.length; i += 4) if (data[i]) count++;
          return count;
        });
        assert(pixels > 800, id + ': empty preview');
        await page.click('#stealth-panel .st-equip');
        assert.equal(await page.locator('#stealth-panel .st-state').innerText(), 'Equipped');
        console.log(viewport.width, id, pixels, 'visible pixels');
      }
      console.log(await page.evaluate(async () => {
        const result = [];
        for (const skin of MODEL_SKINS.filter(s => s.series === 'stealth')) {
          const idx = WEAPONS.findIndex(w => w.id === skin.weapon), stats = JSON.stringify(WEAPONS[idx]);
          setModelSkin(skin.weapon, skin.id); finishEquip();
          const g = weaponModels[idx];
          if (!g._stealth || !g._mech?.mag || !(g._mech.knob || g._mech.slide)) throw Error('Missing mechanics: ' + skin.id);
          const action = g._mech.knob || g._mech.slide, home = action.g.position.clone();
          updateGunMech(g, skin.weapon, .85, RELOAD_PROPS[skin.weapon], 3000);
          if (action.g.position.distanceTo(home) < .015) throw Error('Action does not rack: ' + skin.id);
          updateGunMech(g, skin.weapon, null, RELOAD_PROPS[skin.weapon], 3000);
          g._flash.visible = true; g._tick(.016, 1, false); g._flash.visible = false;
          if (g._stealth.spring.scale.z >= 1) throw Error('Stationary spring');
          g._calm(); if (g._stealth.spring.scale.z !== 1 || stats !== JSON.stringify(WEAPONS[idx])) throw Error('Reset or stats regression');
          result.push({ id: skin.id, mechanics: true });
        }
        const rect = document.querySelector('#stealth-panel .st-window').getBoundingClientRect();
        if (rect.left < 0 || rect.right > innerWidth || rect.top < 0 || rect.bottom > innerHeight) throw Error('Collection overflow');
        if (typeof io !== 'function' || !window.SOUND_DATA['sounds/stealth-shot.mp3']) throw Error('Lost multiplayer or embedded audio');
        const ctx = getAudioCtx(); weaponSamplesPreload(ctx);
        await new Promise((resolve, reject) => {
          let tries = 0;
          const poll = () => {
            if (_sampleState.stealth?.buf) { resolve(); return; }
            if (_sampleState.stealth?.failed || ++tries > 100) { reject(Error('Stealth recording failed to decode')); return; }
            setTimeout(poll, 100);
          }; poll();
        });
        const play = playWeaponSample, played = [];
        try {
          playWeaponSample = (ctx, start, sample) => played.push(sample.def.file);
          setModelSkin('pistol', 'pistol_stealth_cipher'); finishEquip(); weaponSoundLastAt = {};
          playWeaponSound('pistol'); playWeaponSound('pistol', {remote:true});
          setModelSkin('pistol', null); finishEquip(); weaponSoundLastAt = {}; playWeaponSound('pistol');
          if (played.join(',') !== ['stealth', WEAPON_SAMPLES.pistol.file, WEAPON_SAMPLES.pistol.file].join(',')) throw Error('Changed default or remote recordings: ' + played);
          setModelSkin('pistol', 'pistol_stealth_cipher'); finishEquip();
        } finally { playWeaponSample = play; }
        return { skins: result, embeddedRecording: _sampleState.stealth.buf.duration, multiplayer: typeof io, soundRouting: played };
      }));
      await page.screenshot({ path: '/tmp/pvp-stealth-' + viewport.width + '.png' });
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#stealth-panel').isVisible(), false);
      await page.evaluate(() => {
        currentUser = {username:'StealthPreview',unlocks:[],purchased:[],skinInventory:[]};
        document.getElementById('overlay').style.display = 'none'; inLobby = true;
        const d = defaultLoadoutIdx();
        selectedPrimaryIdx=d.p; selectedSecondaryIdx=d.s; selectedMeleeIdx=d.m; selectedSupportIdx=d.u;
        PVE_STEALTH_SHOWROOM.open();
      });
      await page.click('[data-stealth-skin="pistol_stealth_cipher"]');
      await page.click('#stealth-panel .st-range');
      await page.waitForFunction(() => match?.roundActive && !countdownActive && currentWeapon?.id === 'pistol' && activeSlot === 'secondary', {}, {timeout:30000});
      console.log(await page.evaluate(() => {
        const model = weaponModels[currentWeaponIdx]; finishEquip(); model._inspectMode = false;
        isDead = false; reloading = false; inLobby = false;
        camera.position.set(0, 1.65, 0); camera.quaternion.identity();
        const saved = wallColliders.slice();
        try {
          wallColliders.splice(0, wallColliders.length, new THREE.Box3(new THREE.Vector3(-10,0,-6),new THREE.Vector3(10,5,-5.5)));
          PVE_STEALTH.update(model, true);
          if (!PVE_STEALTH.laser?.visible) throw Error('Laser is missing in range');
          const laserEnd = PVE_STEALTH.laser.children[1].position.z;
          if (laserEnd < -5.5 || laserEnd > -5.4) throw Error('Laser goes through wall: ' + laserEnd);
          PVE_STEALTH.update(model, false);
          if (PVE_STEALTH.laser.visible) throw Error('Laser survives camera change');
          return {range:currentWeapon.id, laserEnd, cameraGate:true};
        } finally { wallColliders.splice(0,wallColliders.length,...saved); }
      }));
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: main PvP boot, desktop/mobile collection, three real models, equip, moving mechanisms, embedded sound and unchanged stats');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
