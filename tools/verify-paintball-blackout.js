const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(() => window.MODEL_SKINS_BY_WEAPON || typeof MODEL_SKINS_BY_WEAPON !== 'undefined');
    const result = await page.evaluate(() => {
      requestAnimationFrame = () => 0;
      const idx = WEAPONS.findIndex(w => w.id === 'paintball');
      const spec = JSON.stringify(WEAPONS[idx]), original = weaponModels[idx];
      const skin = MODEL_SKINS_BY_WEAPON.paintball.find(s => s.id === 'paintball_blackout');
      if (!skin || isCaseSkinLocked(skin) || isLegendLocked(skin)) throw Error('Skin missing or locked');
      const stock = buildPaintball(), black = skin.build();
      let blueStock = 0, transparentStock = 0, nonBlack = 0, transparentBlack = 0, glossy = 0, rubber = 0, roundedHopper = 0;
      for (const [model, tactical] of [[stock, false], [black, true]]) model.traverse(node => {
        if (!node.isMesh || node === model._flash) return;
        if (tactical && node.geometry.type === 'SphereGeometry') roundedHopper++;
        for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
          if (!tactical) {
            if (mat.color?.getHex() === 0x2f5f8a) blueStock++;
            if (mat.transparent) transparentStock++;
          } else {
            if (mat.transparent) transparentBlack++;
            if (mat.color && Math.max(mat.color.r, mat.color.g, mat.color.b) > .1) nonBlack++;
            if (mat.metalness >= .8 && mat.roughness <= .25) glossy++;
            if (mat.metalness === 0 && mat.roughness >= .9) rubber++;
          }
        }
      });
      if (!blueStock || !transparentStock) throw Error('Original paintball appearance changed');
      if (nonBlack || transparentBlack || glossy < 10 || !rubber || roundedHopper) throw Error('Blackout lost its polished black metal or remodeled silhouette');
      openWeaponSkinsPanel();
      const cell=document.querySelector('[data-mskin="paintball_blackout"]');
      if (!cell) throw Error('Skin missing from picker');
      cell.click();
      if (weaponModels[idx] === original || _activeModelSkin.paintball !== skin) throw Error('Skin did not equip');
      if (JSON.stringify(WEAPONS[idx]) !== spec) throw Error('Cosmetic changed weapon stats');
      setModelSkin('paintball', null);
      if (weaponModels[idx] !== original) throw Error('Stock did not restore');
      openWeaponSkinsPanel();
      if (!document.querySelector('[data-mskin="paintball_blackout"]')) throw Error('Skin missing from picker');
      document.getElementById('weapon-skins-panel').style.display = 'none';
      document.getElementById('overlay').style.display = 'none';
      const preview = new THREE.Scene();
      preview.background = new THREE.Color(0x8a9298);
      preview.add(new THREE.HemisphereLight(0xffffff, 0x4b5055, 2));
      const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(1, 2, 1); preview.add(light);
      metalizeModel(black);
      black.position.set(0, 0, 0); preview.add(black);
      const cam = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .001, 10);
      cam.position.set(.52, .25, .48); cam.lookAt(0, .02, -.045);
      window.renderBlackoutPreview=()=>{
        cam.aspect=innerWidth/innerHeight;cam.zoom=Math.min(1,cam.aspect/1.1);cam.updateProjectionMatrix();
        renderer.render(preview, cam);
        const gl=renderer.getContext(),pixel=new Uint8Array(4),colors=new Set();
        for(let y=.15;y<.85;y+=.05)for(let x=.15;x<.85;x+=.05){
          gl.readPixels(Math.floor(gl.drawingBufferWidth*x),Math.floor(gl.drawingBufferHeight*y),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
          colors.add(pixel.join(','));
        }
        return colors.size;
      };
      return { separateSkin: true, polishedMetal: true, stockPreserved: true, statsUnchanged: true, pickerAvailable: true, desktopColors:renderBlackoutPreview() };
    });
    await page.screenshot({ path: '/tmp/paintball-blackout.png' });
    assert.ok(result.desktopColors>10);
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>renderBlackoutPreview())>10);
    await page.screenshot({ path: '/tmp/paintball-blackout-mobile.png' });
    assert.deepEqual(errors, []);
    console.log('PASS', result);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
