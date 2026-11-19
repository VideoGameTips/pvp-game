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
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(() => typeof buildGunSkinViewModel === 'function' && typeof openItemSkins === 'function');
      const skins = [['ak20', 'ak20_crimson_eclipse'], ['srx', 'srx_frostfall_sovereign'],
        ['ak20', 'ak20_phoenix_reign'], ['revolver', 'revolver_relic_six']];
      for (const [weapon, id] of skins.filter(([, id]) => process.argv.length === 2 || process.argv.slice(2).includes(id))) {
        await page.evaluate(({ weapon, id }) => {
          requestAnimationFrame = () => 0;
          currentUser = { username: 'Finish Test', purchased: [], skinInventory: [] };
          const skin = MODEL_SKINS.find(s => s.id === id);
          const season = id === 'ak20_phoenix_reign';
          if (season ? !SEASON_MODEL_SKIN_IDS.has(id) || GEN3_SKIN_DEFS.includes(skin) : !GEN3_SKIN_DEFS.includes(skin))
            throw Error('Wrong acquisition source');
          if (!isCaseSkinLocked(skin)) throw Error('Missing ownership gate');
          setModelSkin(weapon, id);
          if (_activeModelSkin[weapon]?.id === id) throw Error('Equipped without ownership');
          currentUser.skinInventory.push(id);
          openItemSkins('gun', weapon);
        }, { weapon, id });
        await page.locator(`[data-preview-skin="${id}"]`).click();
        const result = await page.evaluate(({ weapon, id }) => {
          const check = (v, msg) => { if (!v) throw Error(id + ': ' + msg); };
          const idx = WEAPONS.findIndex(w => w.id === weapon), w = WEAPONS[idx];
          const stock = _baseWeaponModels[idx], model = weaponModels[idx], skin = _activeModelSkin[weapon];
          const phoenix = id === 'ak20_phoenix_reign', relic = weapon === 'revolver';
          check(skin?.id === id && model !== stock, 'Did not equip');
          check(effectiveGunStats(w) === w && skinPitchFor(weapon) === 1 && !reloadMagicForSkin(skin), 'Gameplay or stock audio changed');
          function shapes(root) {
            const out = [];
            root.traverse(o => {
              for (let p = o; p && p !== root; p = p.parent) if (p.userData.vmHand || p === root._flash) return;
              if (!o.isMesh) return;
              out.push(o.geometry.attributes.position.array);
            });
            return out;
          }
          const a = shapes(stock), b = shapes(model);
          if (!relic) {
            check(model._mech?.mag && model._mech?.knob && skinLookFor(skin) === null && !_skinFxFor(weapon), 'Stock mechanics or FX changed');
            check(a.length === b.length && a.every((p, i) => p.length === b[i].length && p.every((v, j) => v === b[i][j])),
            'Model vertices differ from stock: ' + a.length + '/' + b.length);
            check(['rear', 'front'].every(k => stock._sightLine[k].equals(model._sightLine[k])) &&
            stock._hipPosition.equals(model._hipPosition) && stock._flash.position.equals(model._flash.position),
            'ADS, hip pose or muzzle origin changed: ' + JSON.stringify([stock, model].map(m => [
              m._sightLine.rear.toArray(), m._sightLine.front.toArray(), m._hipPosition.toArray(), m._flash.position.toArray(),
            ])));
            const receiver = model.getObjectByName('receiver').material;
            const remote = makeRealWorldGun(weapon, id);
            check(phoenix ? receiver.map === phoenixReignMap && !receiver.emissiveMap && !receiver.emissive.getHex() &&
                !model._tick && remote.children.some(o => o.material?.map === receiver.map) :
                receiver.emissiveMap && remote.children.some(o => o.material?.emissiveMap), 'Missing finish or unwanted glow');
            check(stock.getObjectByName('receiver').material.map !== receiver.map, 'Stock was recolored');
            if (phoenix) {
              const canvas = receiver.map.image;
              const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
              let black = 0, gold = 0, ember = 0;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                if (r < 32 && g < 32 && b < 36) black++;
                else if (r === 212 && g === 166 && b === 58) gold++;
                else if (r === 230 && g === 90 && b === 36) ember++;
              }
              check(black >= .8 * canvas.width * canvas.height && gold > 500 && ember > 0 && ember < gold * .1,
                'Wrong obsidian, gold or ember coverage');
            }
          } else {
            check(a.length !== b.length && model._parts.main._chambers === 6, 'Not a distinct six-chamber model');
            const cage = model._parts.main, hammer = model._parts.hammer;
            check(cage.children.filter(o => o.userData.openMuzzle).length === 6, 'Missing exposed chambers');
            currentWeaponIdx = idx; currentWeapon = w; isADS = false;
            gameStarted = true; isDead = false; reloading = false;
            weaponAmmo[idx] = { ammo: 1, reserve: w.reserve }; ammo = 1;
            finishEquip();
            indexCylinder(model); model._shotPose(); updateCylinders(.08);
            check(hammer.rotation.x < -.3 && cage.rotation.z > .9, 'Hammer and cage did not move on fire');
            model._tick(.18, performance.now() / 1000 + .18, false);
            check(!hammer.rotation.x, 'Hammer stayed open after the shot');
            startReload();
            check(model._reloadDur === w.reloadTime, 'Reload duration differs from stock');
            model._reloadStart = Date.now() - .46 * w.reloadTime;
            updateReloadAnim();
            check(cage.position.x < -.04 && cage.rotation.y < -.4 && cage.rotation.z > 1, 'Cage did not swing out and rotate');
            cancelReload();
            startInspect();
            model._reloadStart = Date.now() - .33 * model._reloadDur;
            updateReloadAnim();
            check(model.rotation.y > .8 && model.rotation.z < 0, 'First inspect side was missing');
            model._reloadStart = Date.now() - .72 * model._reloadDur;
            updateReloadAnim();
            check(model.rotation.y < -.4 && model.rotation.z > 0, 'Second inspect side was missing');
            cancelInspect(); updateReloadAnim();
            check(cage.position.distanceTo(cage._home) < 1e-5, 'Cage did not reseat');
          }
          const stage = new THREE.Scene();
          stage.background = new THREE.Color(0x263039);
          stage.environment = window.PVE_WEAPON_FINISH.environment(renderer);
          stage.add(new THREE.HemisphereLight(0xf5fbff, 0x74808e, 2.5));
          const key = new THREE.DirectionalLight(0xffffff, 2);
          key.position.set(3, 4, 1); stage.add(key);
          const prize = skin.build();
          prize.position.set(0, 0, 0); stage.add(prize);
          const cam = new THREE.OrthographicCamera(relic ? -.20 : -.57, relic ? .20 : .57, relic ? .11 : .31, relic ? -.11 : -.31, .01, 10);
          if (relic) cam.position.set(-1.5, .43, -1.1);
          else cam.position.set(-2, .29, .19);
          cam.lookAt(0, -.025, -.08);
          renderer.setSize(innerWidth, Math.round(innerWidth * .54));
          renderer.render(stage, cam);
          const probe = document.createElement('canvas');
          probe.width = 160; probe.height = 86;
          const ctx = probe.getContext('2d');
          ctx.drawImage(renderer.domElement, 0, 0, probe.width, probe.height);
          const pixels = ctx.getImageData(0, 0, probe.width, probe.height).data;
          let accent = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
            if (phoenix || relic ? r > 65 && r > g + 12 && g > b + 12 :
                weapon === 'ak20' ? r > 100 && r > g + 46 : b > 110 && b > r + 32 && g > r + 12) accent++;
          }
          check(accent > (phoenix ? 12 : 20), 'No visible accent pixels: ' + accent);
          const png = renderer.domElement.toDataURL('image/png').split(',')[1];
          setModelSkin(weapon, null);
          check(weaponModels[idx] === stock, 'Could not restore stock');
          return { png, accent, meshes: a.length };
        }, { weapon, id });
        if (process.env.FINISH_PREVIEW_DIR) fs.writeFileSync(`${process.env.FINISH_PREVIEW_DIR}/${id}-${width}.png`, Buffer.from(result.png, 'base64'));
        console.log(id, width, result.meshes, 'meshes;', result.accent, 'accent pixels');
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
