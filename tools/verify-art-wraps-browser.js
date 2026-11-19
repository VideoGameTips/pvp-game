const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 820 }, hasTouch: width < 500 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (/shader error/i.test(message.text())) errors.push(message.text()); });
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(() => typeof openItemSkins === 'function' && !!WEAPON_SKINS_BY_ID.breaking_news);
      const rows = await page.evaluate(() => {
        const check = (ok, msg) => { if (!ok) throw new Error(msg); };
        const expected = {
          oil_spill: 'epic', porcelain: 'legendary', contour: 'rare', counterfeit: 'legendary',
          drought: 'epic', packet_loss: 'epic', celestial_atlas: 'legendary', cathedral: 'legendary',
          monarch: 'legendary', undertow: 'epic', marbleheart: 'epic', opalescent: 'legendary',
          pole_position: 'rare', pole_position_slipstream: 'rare', pole_position_endurance: 'rare', carbon_weave: 'rare',
          lost_expedition: 'epic', prism_shift: 'legendary', verdigris: 'epic', arcade_fever: 'epic', breaking_news: 'epic',
        };
        const collection = window.PVP_COLLECTION_WRAPS.catalog.filter(s => !s.prestige);
        const newIds = new Set(collection.map(s => s.id));
        check(collection.length === 13 && newIds.size === 13 && !collection.some(s => /blueprint/i.test(s.name)), 'Unexpected wrap catalog');
        check(WEAPON_SKINS.filter(s => s.id === 'blueprint').length === 1 && WS_LOOKS.blueprint.pat === 'blueprint', 'Existing Blueprint changed');
        openItemSkins('gun', 'ak20');
        const index = WEAPONS.findIndex(w => w.id === 'ak20'), w = WEAPONS[index], gun = weaponModels[index];
        const panel = document.getElementById('item-skins-panel');
        check(panel.scrollWidth <= panel.clientWidth + 1, 'Skin picker overflows horizontally');
        const mesh = gun.getObjectByName('receiver'), stock = mesh.material.map, geo = mesh.geometry;
        const preview = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        preview.setSize(256, 144);
        const stage = new THREE.Scene(); stage.background = new THREE.Color(0x262a31);
        stage.add(new THREE.HemisphereLight(0xffffff, 0xaeb9c9, 2.2));
        const light = new THREE.DirectionalLight(0xfff6e7, 2.2); light.position.set(2,3,4); stage.add(light);
        const view = new THREE.PerspectiveCamera(35, 256/144, .01, 10); view.position.set(.4,.23,.95); view.lookAt(0,0,0);
        const board = new THREE.Mesh(new THREE.BoxGeometry(.54,.24,.055));
        stage.add(board);
        const contact = document.createElement('canvas');
        contact.width = 1024; contact.height = 4 * 176;
        const pen = contact.getContext('2d');
        pen.fillStyle='#171b23'; pen.fillRect(0,0,contact.width,contact.height);
        const images = new Set();
        let tile = 0;
        for (const [id,rarity] of Object.entries(expected)) {
          const skin = WEAPON_SKINS_BY_ID[id], look = WS_LOOKS[id];
          const card = [...panel.querySelectorAll('.is-cell')].find(el => el.textContent.includes(skin.name));
          check(wrapUnlocked(id) && skin.rarity === rarity && card?.textContent.includes(rarity.toUpperCase()), id + ': missing picker or rarity');
          const texture = _wsTextures(id,0);
          const swatch = _wsSwatchURL(id); check(swatch && !images.has(swatch), id + ': missing or repeated swatch'); images.add(swatch);
          card.click();
          check(wrapIdFor('ak20') === id && gun.getObjectByName('receiver') === mesh && mesh.geometry === geo && mesh.material.map === texture.map && effectiveGunStats(w) === w, id + ': equip altered model or stats');
          if (newIds.has(id)) check(!gun._skinExtra && !gun._skinDecal && !texture.glow, id + ': not a surface-only finish');
          board.material = mesh.material;
          const x = (tile%4)*256, y = Math.floor(tile/4)*176;
          board.rotation.y = 0;
          preview.render(stage,view);
          const capture = () => {
            const sample = document.createElement('canvas'); sample.width = 256; sample.height = 144;
            const ctx = sample.getContext('2d'); ctx.drawImage(preview.domElement, 0, 0);
            return ctx.getImageData(96,48,64,48).data;
          };
          const rgba=capture();
          const colors=new Set();
          for(let j=0;j<rgba.length;j+=4) colors.add((rgba[j]<<16)|(rgba[j+1]<<8)|rgba[j+2]);
          check(colors.size>30,id+': blank render');
          if (look.foil) check(mesh.material.customProgramCacheKey().endsWith(':wrap-foil:'+look.foil), id + ': missing foil shader');
          if (newIds.has(id)) {
            pen.drawImage(texture.map.image,x+8,y+8,144,144);
            pen.drawImage(preview.domElement,62,43,136,63,x+155,y+24,97,45);
            board.rotation.y = 1.40;
            preview.render(stage,view);
            pen.drawImage(preview.domElement,62,43,136,63,x+155,y+80,97,45);
            if (look.foil) {
              const foil = capture(), plain = mesh.material.clone();
              board.material = plain;
              preview.render(stage,view);
              const base = capture();
              check(foil.some((v, j) => j % 4 !== 3 && Math.abs(v-base[j]) > 6), id + ': angle shader had no visible effect');
              plain.dispose();
            }
            pen.fillStyle='#f2f3f6';pen.font='15px sans-serif';pen.fillText(skin.name,x+8,y+170);
            tile++;
          }
        }
        setItemWrap('gun','ak20','prism_shift');
        setItemWrap('gun','ak20','');
        check(mesh.material.map === stock && !mesh.material.customProgramCacheKey().includes('wrap-foil'), 'Stock finish was not fully restored');
        preview.dispose();
        document.body.appendChild(contact);
        contact.style.cssText='position:fixed;inset:0;margin:auto;width:min(100vw,1024px);height:auto;z-index:99999';
        return images.size;
      });
      assert.equal(rows, 21);
      assert.deepEqual(errors, []);
      if (process.env.WRAP_PREVIEW_DIR) await page.screenshot({ path: process.env.WRAP_PREVIEW_DIR + '/art-wraps-' + width + '.png' });
      console.log(width + ': all 21 wraps render, equip, and restore stock');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
