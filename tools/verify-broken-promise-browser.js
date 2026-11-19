const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 820 }, hasTouch: width < 500 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (/shader error|\[model skin\]/i.test(message.text())) errors.push(message.text());
      });
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(() => {
        try { return !!SKIN_FX.revolver_broken_promise; } catch { return false; }
      }, null, { timeout: 15000 });
      const result = await page.evaluate(() => {
        const check = (ok, message) => { if (!ok) throw Error(message); };
        const id = 'revolver_broken_promise';
        const skin = GEN3_SKIN_DEFS.find(s => s.id === id);
        const index = WEAPONS.findIndex(w => w.id === 'revolver');
        const weapon = WEAPONS[index], stock = weaponModels[index];
        currentUser = { username: 'Porcelain test', purchased: [], skinInventory: [] };
        check(skin?.rarity === 'legendary' && isCaseSkinLocked(skin), 'Missing award gate');
        setModelSkin('revolver', id);
        check(weaponModels[index] === stock, 'Unowned skin equipped');
        currentUser.skinInventory.push(id);
        setModelSkin('revolver', id);
        const model = weaponModels[index], name = value => model.getObjectByName(value);
        check(model !== stock && model._flash.position.equals(stock._flash.position) &&
          model._stockShotOrigin.equals(stock._flash.position) && model._kickZ === stock._kickZ &&
          model._hipPosition.equals(stock._hipPosition) && weaponSightPose(model) === weaponSightPose(stock) &&
          effectiveGunStats(weapon) === weapon, 'Stock weapon handling changed');
        check(_skinHitId('revolver') === id && _hasSkinFinisher(id) && !skinLookById(id).projectile,
          'Finisher did not register separately from the stock projectile');
        const barrels = Array.from({ length: 3 }, (_, i) => name('promise-barrel-' + i));
        const chambers = Array.from({ length: 6 }, (_, i) => name('promise-chamber-' + i));
        const chip = name('promise-drifting-chip'), grip = name('promise-grip-shard');
        const rest = barrels.map(b => b.position.clone()), gripRest = grip.position.clone(), chipRest = chip.position.clone();
        const now = () => performance.now() / 1000;
        const tick = (dt = .016, time = now()) => model._tick(dt, time, false);
        tick(.46);
        check(chip.position.distanceTo(chipRest) > .001 && grip.position.equals(gripRest), 'Idle is missing or moves the grip');
        model._onFire(); tick();
        check(barrels.every((b, i) => b.position.distanceTo(rest[i]) > .012) && grip.position.distanceTo(gripRest) > .016,
          'Shot did not scatter the ceramic pieces');
        tick(.2, now() + .2);
        check(barrels.every((b, i) => b.position.equals(rest[i])) && grip.position.equals(gripRest), 'Pieces did not snap back');
        const reloadAt = p => {
          model._reloadDur = weapon.reloadTime;
          model._reloadStart = Date.now() - p * model._reloadDur;
          tick(.016, now() + .5);
        };
        const radius = o => Math.hypot(o.position.x, o.position.y - .013);
        reloadAt(.47);
        check(chambers.every(o => radius(o) > .034) && chambers.every(o => Math.abs(o.rotation.x) > .2),
          'Reload chambers did not scatter and tumble independently');
        reloadAt(.77);
        check(radius(chambers[0]) < .018 && radius(chambers[5]) > .032, 'Reload did not seat chambers in sequence');
        reloadAt(.97);
        check(chambers.every(o => radius(o) < .018), 'Reload did not reseat all six chambers');
        model._reloadStart = 0; model._calm();

        const preview = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        preview.setSize(440, 360);
        const stage = new THREE.Scene(); stage.background = new THREE.Color(0x27313a);
        stage.add(new THREE.HemisphereLight(0xf5fbff, 0xa18c72, 2.6));
        const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(2, 3, 2); stage.add(key);
        const prize = skin.build(); prize.position.set(0,0,0); stage.add(prize);
        const view = new THREE.PerspectiveCamera(35, 440/360, .01, 10);
        view.position.set(.38,.101,.20); view.lookAt(0,-.025,-.03);
        preview.render(stage,view);
        const png = preview.domElement.toDataURL().split(',')[1];
        const rgba = new Uint8Array(440*360*4), gl = preview.getContext();
        gl.readPixels(0,0,440,360,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
        let ceramic = 0;
        for (let i=0; i<rgba.length; i+=4) if (rgba[i]>155 && rgba[i+1]>145 && rgba[i+2]>125) ceramic++;
        check(ceramic>900, 'Ceramic did not render');
        preview.dispose();

        let frame, time = performance.now();
        const request = window.requestAnimationFrame, originalNow = performance.now;
        window.requestAnimationFrame = fn => { frame = fn; return 1; };
        performance.now = () => time;
        const target = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(.42, 1.12, .3), new THREE.MeshBasicMaterial());
        body.position.y=1.12;target.add(body);scene.add(target);
        remoteMeshes.porcelain_test=target;
        try {
          check(playPorcelainFinisher('porcelain_test') && playPorcelainFinisher('porcelain_test'), 'Crack did not reach target');
          const effects=scene.children.filter(o=>o.name==='porcelain-fracture');
          check(effects.length===1, 'Duplicate elimination effect');
          time+=95;frame();
          check(effects[0].children[0].geometry.drawRange.count>6,'Crack did not spread');
          time+=190;frame();
          check(effects[0].children.slice(2).some(o=>o.visible),'Porcelain chips did not flake away');
          time+=400;frame();
          check(!effects[0].parent,'Elimination effect leaked');
        } finally {
          delete remoteMeshes.porcelain_test;target.removeFromParent();
          window.requestAnimationFrame=request;performance.now=originalNow;
        }
        return { png, ceramic };
      });
      assert.deepEqual(errors, []);
      if (process.env.PORCELAIN_PREVIEW_DIR) fs.writeFileSync(process.env.PORCELAIN_PREVIEW_DIR + '/broken-promise-' + width + '.png', Buffer.from(result.png, 'base64'));
      console.log(width + ': ceramic render, staggered reload, firing scatter and elimination passed');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
