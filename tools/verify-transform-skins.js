const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const skins = process.argv.slice(2);
if (!skins.length) skins.push('sandstorm', 'thunderbird', 'cerberus', 'iron_maiden', 'checkmate');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const which of skins) for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 800 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'load' });
      console.log(which, width, await page.evaluate(which => {
        const check = (v, message) => { if (!v) throw Error(message); };
        const weapon = { sandstorm: 'grenade_launcher', thunderbird: 'javelin_launcher', cerberus: 'amr', iron_maiden: 'sg8', checkmate: 'duelist_pistol' }[which];
        const id = { thunderbird: 'javelin_thunderbird', checkmate: 'duelist_checkmate' }[which] || `${weapon}_${which}`;
        const idx = WEAPONS.findIndex(w => w.id === weapon), stats = JSON.stringify(WEAPONS[idx]);
        currentUser = { username: 'Preview', skinInventory: [id], isAdmin: which === 'cerberus' };
        setModelSkin(weapon, id); finishEquip(); equipReadyAt = 0;
        currentWeaponIdx = selectedPrimaryIdx = idx; currentWeapon = WEAPONS[idx]; activeSlot = 'primary';
        if (which === 'checkmate') { selectedSecondaryIdx = idx; activeSlot = 'secondary'; }
        const g = weaponModels[idx], r = g._sandstorm, pool = weaponAmmo[idx];
        check(_activeModelSkin[weapon]?.id === id, 'Skin not registered');
        check(which === 'cerberus' ? skinIsArchived(_activeModelSkin[weapon]) && !GEN2_MODEL_SKIN_IDS.has(id) : GEN2_MODEL_SKIN_IDS.has(id), 'Incorrect case availability');
        g.visible = true; gameStarted = true; isDead = countdownActive = reloading = isADS = false;
        camera.fov = 75; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
        let now = performance.now(), wall = Date.now();
        const realDate = Date.now;
        Date.now = () => wall;
        Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
        window.requestAnimationFrame = () => 0;
        const tick = ms => { now += ms; wall += ms; g._tick(ms / 1000, now / 1000, false); };
        const seek = t => {
          const next = g._reloadStart + t * g._reloadDur, dt = Math.max(.016, (next - wall) / 1000);
          now += next - wall; wall = next; updateReloadAnim(); g._tick(dt, now / 1000, false);
        };
        try {
          let focus, color;
          if (which === 'sandstorm') {
          check(r?.wedges.length === 4, 'Four drill wedges missing');
          g._calm(); tick(200);
          check(r.rotor.rotation.z > .1, 'Drill does not rotate at idle');
          isADS = true; tick(250);
          check(r.wedges.every(w => w.position.length() > .03), 'Drill does not open on ADS');
          pool.ammo = 6; pool.reserve = 3; lastShot = 0; tryShoot(); tick(40);
          check(pool.ammo === 5 && r.wedges.every(w => w.position.z > .02), 'Grenade or drill recoil missing');
          tick(180); check(r.wedges.every(w => w.position.length() < .006), 'Drill does not snap shut');
          isADS = false; tick(400);
          const angle = r.drum.rotation.z;
          check(Math.abs(angle - Math.PI / 3) < .01, 'Cylinder does not index');
          startReload(); check(g._reloadDur === currentWeapon.reloadTime, 'Reload timing changed');
          seek(.81); check(r.hinge.rotation.y < -1 && Math.abs(r.drum.rotation.z - angle - Math.PI * 2) < .01,
            'Cylinder does not swing out and rotate on reload');
          cancelReload(); startInspect(); check(g._inspectMode && g._reloadDur === 5200, 'Core Sample inspect missing');
          seek(.31); const sample = r.holo.getWorldPosition(new THREE.Vector3());
          const tip = r.rotor.localToWorld(new THREE.Vector3(0, 0, -.223));
          seek(.48);
          check(r.holo.getWorldPosition(new THREE.Vector3()).distanceTo(sample) < .0001, 'Terrain moves with the drill');
          check(r.rotor.localToWorld(new THREE.Vector3(0, 0, -.223)).distanceTo(sample) < tip.distanceTo(sample), 'Drill does not lower into sample');
          seek(.78);
          check(r.rock.visible && r.fossil.visible && r.halves[0].position.x - r.halves[1].position.x > .075, 'Fossil reveal missing');
          g._flash.visible = false;
          focus = 'golden-dinosaur-fossil';
          color = (r, g, b) => r > 235 && g > 175 && g < 225 && b < 115;
          var shot = clone();
          seek(.94); check(!r.holo.visible, 'Terrain does not fade');
          cancelInspect(); g._calm();
          check(!r.fossil.visible && stats === JSON.stringify(currentWeapon), 'Skin changes stats or leaks inspect state');
          const bloom = WEAPONS.findIndex(w => w.id === 'storm_bloom');
          currentWeaponIdx = bloom; currentWeapon = WEAPONS[bloom];
          weaponAmmo[bloom].ammo = 5; lastShot = 0;
          const before = localBullets.length;
          tryShoot();
          const pellets = localBullets.slice(before), pulse = pellets[0]?.bloomPulse;
          check(pellets.length === 10 && pulse && pellets.every(b => b.bloomPulse === pulse), 'Storm Bloom pellets do not share a pulse');
          const point = new THREE.Vector3(pellets[0].spawnX, pellets[0].spawnY, pellets[0].spawnZ);
          for (const [name, x] of Object.entries({ direct: 0, near: .25, ally: .4, blocked: .5, far: 1.1 })) {
            const m = new THREE.Group(); m.position.copy(point).add(new THREE.Vector3(x, -1.05, 0));
            remoteMeshes['pulse_' + name] = m;
          }
          const hits = [], emit = emitHit, los = hasLineOfSight, ff = friendlyFireBlocked;
          emitHit = (target, bullet, weapon, at, headshot, opts) => hits.push([target, opts.damageOverride]);
          hasLineOfSight = (x, z, tx) => Math.abs(tx - point.x - .5) > .001;
          friendlyFireBlocked = id => id === 'pulse_ally';
          inLobby = false;
          const effects = _muzzleFx.length;
          pulseStormBloom(pellets[0], 'pulse_direct', point.clone().addScalar(20));
          check(!pulse.spent, 'Out-of-range pulse consumed the shot');
          for (const pellet of pellets) pulseStormBloom(pellet, 'pulse_direct', point);
          check(JSON.stringify(hits) === '[[' + JSON.stringify('pulse_near') + ',4]]' && _muzzleFx.length === effects + 1, 'Splash hit count or damage is wrong');
          check(_muzzleFx.at(-1).sprite.material.color.getHex() === 0x59dfb6 && currentWeapon.ability.cd === 15000, 'Wrong pulse tint or Ball Lightning timing');
          emitHit = emit; hasLineOfSight = los; friendlyFireBlocked = ff;
          } else if (which === 'thunderbird') {
            const rig = g._thunderbird;
            check(rig.wings.length === 2 && rig.wings.every(w => w.lights.length === 5), 'Missing feather assemblies');
            const folded = rig.wings[1].hinge.rotation.y;
            const target = _nearestAbilityRayHit;
            _nearestAbilityRayHit = () => ({ pid: 'preview' });
            isADS = true; tick(300);
            _nearestAbilityRayHit = target;
            check(rig.wings[1].hinge.rotation.y - folded > .9 && rig.eyes.color.getHex() === 0xb8fbff, 'Targeting sensors do not deploy');
            const start = new THREE.Vector3(1, 2, 3);
            fireJavelin(start, 0); tick(30);
            const missile = javelins[javelins.length - 1];
            check(missile.dir.equals(new THREE.Vector3(0, 1, 0)) && missile.targetId === null && missile.mesh.position.equals(start), 'Missile launch changed');
            check(rig.head.rotation.x > 1 && rig.jaw.rotation.x < -.30 && rig.wings[1].hinge.rotation.y < folded, 'Beak and wings do not react to launch');
            removeJavelin(javelins.length - 1); isADS = false; tick(450);
            pool.ammo = 1; pool.reserve = 6; startReload();
            seek(.30); const extended = rig.cassette.position.z;
            seek(.66); check(rig.cassette.visible && extended - rig.cassette.position.z > .12, 'Missile cassette does not load');
            seek(.94); check(!rig.cassette.visible && Math.abs(rig.jaw.rotation.x) < .03, 'Beak does not close after reload');
            cancelReload(); startInspect(); seek(.48);
            check(g._inspectMode && g.rotation.x > .4 && rig.arcs.flat().every(m => m.visible), 'Storm Call spread or arcs missing');
            focus = 'thunderbird-head';
            color = (r, g, b) => b > 205 && g > 155 && r < 205;
            shot = clone();
            seek(.685); check(rig.burst.visible && rig.wings[1].hinge.rotation.z > 1.5, 'Thunder flash or wing clap missing');
            seek(.90); check(!rig.burst.visible && rig.arcs.flat().every(m => !m.visible), 'Storm Call effects linger');
            cancelInspect(); g._calm();
            check(Math.abs(rig.wings[1].hinge.rotation.y - folded) < .01 && stats === JSON.stringify(currentWeapon), 'Skin changes gameplay or does not reset');
          } else if (which === 'cerberus') {
            const rig = g._cerberus;
            check(rig.sliders.length === 3 && rig.fins.length === 2, 'Missing recoil hardware');
            isADS = true; tick(280);
            check(rig.stock.position.z > .19 && rig.fins[1].p.rotation.z > 1.2, 'Brace and fins do not deploy');
            const home = rig.sliders.map(({ p }) => p.position.z);
            pool.ammo = 3; lastShot = 0; tryShoot(); tick(26);
            const shifts = () => rig.sliders.map(({ p }, i) => p.position.z - home[i]);
            check(pool.ammo === 2 && shifts()[0] > .045 && Math.abs(shifts()[1]) < .003, 'Front stage does not recoil first');
            tick(54); check(shifts()[1] > .039 && Math.abs(shifts()[2]) < .003, 'Middle stage timing is wrong');
            tick(53); check(shifts()[2] > .033 && rig.stock.position.z < .187, 'Rear stage and brace do not compress');
            tick(350); check(shifts().every(x => Math.abs(x) < .003), 'Stages do not settle');
            isADS = false; tick(150); startInspect(); seek(.45);
            check(rig.diagnostics.visible && rig.sliders.every(({ p, z }) => p.position.z - z > .04), 'Diagnostics do not expose the pistons');
            seek(.67); g._flash.visible = false;
            focus = 'cerberus-diagnostic-display';
            color = (r, g, b) => r > 185 && g > 60 && g < 170 && b < 150;
            shot = clone();
            seek(.97); check(!rig.diagnostics.visible && rig.sliders.every(({ p, z }) => Math.abs(p.position.z - z) < .003), 'Diagnostics do not stow');
            cancelInspect(); g._calm();
            check(stats === JSON.stringify(currentWeapon) && currentWeapon.archived, 'Skin changes gameplay or archive status');
          } else if (which === 'iron_maiden') {
            const rig = g._ironMaiden;
            check(rig.jaws.length === 4, 'Chamber press missing jaws');
            const top = rig.jaws[0].jaw, home = top.position.y;
            startEquipAnim(idx);
            check(_equip?.model === g, 'Machine Activation did not start');
            const at = u => {
              const next = _equip.t0 + u * _equip.dur, ms = next - now;
              now = next; wall += ms;
              updateEquipAnim();g._tick(.016, now / 1000, true);
            };
            at(.53); check(top.position.y - home > .035 && rig.led.color.getHex() === 0xff4635, 'Press does not cycle or flash on equip');
            at(.75); check(rig.led.color.getHex() === 0xff4635, 'Second activation flash missing');
            finishEquip(); tick(250);
            pool.ammo = 6; pool.reserve = 4; lastShot = 0; tryShoot(); tick(64);
            check(pool.ammo === 5 && top.position.y - home > .026 && rig.casing.visible, 'Shot does not open press or eject hull');
            tick(165); check(top.position.y - home < .002, 'Press did not slam shut');
            const plan = _shellReloadPlan(weapon, currentWeapon.mag, 3);
            startReload();
            check(g._reloadPlan.loadAt.length === 3 && g._reloadDur === currentWeapon.reloadTime * plan.frac && g._reloadPlan.loadAt.every((v, i) => v === plan.loadAt[i]), 'Stock shell timing changed');
            const interval = g._reloadPlan.loadAt[1] - g._reloadPlan.loadAt[0];
            for (const load of plan.loadAt) {
              seek(load - interval * .57); const lowered = rig.loader.position.y;
              check(rig.feedShell.visible && lowered < -.098, 'Feeder does not pick up shell');
              seek(load - interval * .07); check(rig.loader.position.y - lowered > .059, 'Shell does not reach chamber');
            }
            seek(.98); check(!rig.feedShell.visible && top.position.y - home < .004, 'Press does not close at end of reload');
            cancelReload(); startInspect(); seek(.64);
            check(rig.scanner.visible && rig.scanBeam.visible && rig.display.visible, 'Quality Control scanner missing');
            seek(.82); check(rig.display.visible && !rig.scanBeam.visible, 'Warning does not replace scan');
            focus = 'maiden-diagnostic-display';
            color = (r, g, b) => r > 185 && g > 60 && g < 170 && b < 150;
            g._flash.visible = false; shot = clone();
            seek(.92); check(!rig.scanner.visible && top.position.y - home < .002, 'Scanner/jaws do not retract');
            cancelInspect(); g._calm();
            check(stats === JSON.stringify(currentWeapon), 'SG-8 gameplay changed');
          } else {
            const rig = g._checkmate;
            check(rig.minis.length === 4 && rig.lid.visible && !rig.holo.visible, 'Chamber missing at rest');
            const start = rig.minis[0].position.clone();
            startEquipAnim(idx);
            now = _equip.t0 + _equip.dur * .53;
            updateEquipAnim(); g._tick(.016, now / 1000, true);
            check(rig.minis[0].position.distanceTo(start) > .009 && rig.light.color.getHex() === 0xffdb7d, 'Opening Move is missing');
            finishEquip(); tick(60);
            pool.ammo = 1; pool.reserve = 8; lastShot = 0;
            const count = localBullets.length;
            tryShoot(); tick(85);
            check(pool.ammo === 0 && localBullets.length === count + 1 && rig.muzzleSpark.visible, 'Shot or spark changed');
            tick(110);
            check(!rig.minis[1].visible && rig.minis[0].position.distanceTo(start) > .020, 'Capture did not finish');
            startReload();
            check(g._reloadDur === currentWeapon.reloadTime, 'Reload time changed');
            seek(.48); check(rig.lid.rotation.x > 1 && rig.minis.every(p => p.visible), 'Next Turn does not lift lid and restore the captured piece');
            seek(.98); check(rig.lid.rotation.x === 0 && rig.minis[0].position.distanceTo(start) > .020, 'Next Turn does not lock a fresh layout');
            cancelReload(); startInspect(); seek(.32);
            check(rig.holo.visible && rig.holo.scale.x > .98 && !rig.mate.visible, 'Final Move board missing');
            const knight = rig.knight.position.clone(), king = rig.king.position.clone(), queen = rig.queen.position.clone();
            seek(.44); check(rig.knight.position.distanceTo(knight) > .095 && rig.king.position.equals(king), 'Knight does not move first');
            seek(.55); check(rig.king.position.distanceTo(king) > .045 && rig.queen.position.equals(queen), 'King does not retreat');
            seek(.78); check(rig.queen.position.distanceTo(queen) > .13 && rig.king.rotation.z < -1.4 && rig.mate.visible, 'Queen does not deliver mate');
            focus = 'checkmate-title';
            color = (r, g, b) => r > 230 && g > 175 && g < 234 && b < 168;
            g._flash.visible = false; shot = clone();
            seek(.97); check(!rig.holo.visible && !rig.mate.visible, 'Board does not fold into chamber');
            cancelInspect(); g._calm();
            check(stats === JSON.stringify(currentWeapon) && currentWeapon.mag === 1, 'Duelist gameplay changed');
          }

          function clone() {
            const shot = g.clone();
            shot.traverse(o => {
              if (!o.material) return;
              o.material = o.material.clone();
              const source = o.material.map?.image;
              if (!(source instanceof HTMLCanvasElement)) return;
              const copy = document.createElement('canvas'); copy.width = source.width; copy.height = source.height;
              copy.getContext('2d').drawImage(source, 0, 0);
              o.material.map = new THREE.CanvasTexture(copy);
              o.material.map.colorSpace = THREE.SRGBColorSpace;
            });
            return shot;
          }

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
          let accent = 0;
          for (let i = 0; i < pixels.length; i += 4) if (color(pixels[i], pixels[i + 1], pixels[i + 2])) accent++;
          const p = shot.getObjectByName(focus).getWorldPosition(new THREE.Vector3()).project(view);
          check(accent > 35 && Math.abs(p.x) < .90 && Math.abs(p.y) < .90, `Inspect clipped or invisible (${accent}, ${p.x}, ${p.y})`);
          return { accentPixels: accent, drawCalls: renderer.info.render.calls };
        } finally { Date.now = realDate; delete performance.now; }
      }, which));
      await page.screenshot({ path: `/tmp/pvp-${which}-${width}.png` });
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
