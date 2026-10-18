const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof _donutOctPart === 'function');
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    console.log(await page.evaluate(() => {
      finishEquip();
      const builders = [buildDonutAK20, buildDonutPistol, buildDonutRevolver, buildDonutSG8,
        buildDonutRPG, buildDonutMachinePistol, buildDonutSRX, buildDonutVector, buildDonutGrenadeLauncher,
        buildDonutMinigun, buildDonutMP40, buildDonutDeagle, buildDonutShorty, buildDonutKatana, buildDonutFragGrenade];
      const gallery = new THREE.Scene(); gallery.background = new THREE.Color(0x20282b);
      gallery.add(new THREE.HemisphereLight(0xffffff, 0x53606a, 1.3));
      const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 6, 5); gallery.add(key);
      const camera = new THREE.OrthographicCamera(-2, 2, 1.56, -1.56, .01, 20); camera.position.z = 6;
      let octagonalParts = 0;
      const models = builders.map((build, i) => {
        const m = build(); m._calm();
        let oct = 0, rings = 0;
        m.traverse(o => {
          if (!o.geometry) return;
          for (const attr of ['position', 'normal']) {
            if (!Array.from(o.geometry.attributes[attr].array).every(Number.isFinite)) throw Error(build.name + ': invalid geometry');
          }
          if (o.userData.donutOctagonal) {
            oct++;
            const points = o.geometry.parameters.shapes.extractPoints().shape;
            if (points.length !== 9 || !o.geometry.parameters.options.bevelEnabled) throw Error(build.name + ': missing eight-sided bevel');
          }
          if (o.geometry.type === 'TorusGeometry' && o.geometry.parameters.tubularSegments === 8) rings++;
          if (o.geometry.type === 'BoxGeometry' && Math.max(o.geometry.parameters.width, o.geometry.parameters.height, o.geometry.parameters.depth) > .015) throw Error(build.name + ': blocky body remains');
        });
        if (!oct || !rings) throw Error(build.name + ': missing octagonal body/ring');
        octagonalParts += oct;
        const homes = new Map();
        m.traverse(o => homes.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }));
        _beginEquip(m, { equip: 'donutbuild', equipMs: 1450 }, build === buildDonutKatana, build === buildDonutFragGrenade);
        for (const t of [.2, .55, .9]) _equipStep(_equip, t);
        finishEquip();
        for (const [o, h] of homes) if (o.position.distanceTo(h.p) > 1e-6 || o.quaternion.angleTo(h.q) > 1e-6 || o.scale.distanceTo(h.s) > 1e-6) throw Error(build.name + ': equip changed rest pose');
        if (build === buildDonutRevolver && m._parts.main._chambers !== 6) throw Error('Revolver cylinder lost');
        m.position.set(0, 0, 0); m.rotation.set(.22, -.68, 0);
        const box = new THREE.Box3().setFromObject(m), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
        const holder = new THREE.Group(), scale = Math.min(1.14 / size.x, .47 / size.y);
        m.position.sub(center); holder.add(m); holder.scale.setScalar(scale);
        holder.position.set((i % 3 - 1) * 1.3, 1.25 - Math.floor(i / 3) * .625, 0);
        gallery.add(holder); return holder;
      });
      document.querySelectorAll('body > :not(canvas)').forEach(e => { e.style.display = 'none'; });
      window._drawDonutGallery = (width, height) => {
        camera.left = -2; camera.right = 2; camera.top = 2 * height / width; camera.bottom = -camera.top; camera.updateProjectionMatrix();
        renderer.setSize(width, height); renderer.render(gallery, camera);
        const gl = renderer.getContext(), pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let visible = 0;
        for (let i = 4; i < pixels.length; i += 4) if (pixels[i] !== pixels[0] || pixels[i+1] !== pixels[1] || pixels[i+2] !== pixels[2]) visible++;
        if (visible < width * height * .025) throw Error('Blank donut render');
      };
      window._drawDonutGallery(1280, 1000);
      return { models: models.length, octagonalParts, equipRestoration: 'passed', revolverCylinder: 'preserved' };
    }));
    await page.screenshot({ path: '/tmp/pvp-donut-octagonal.png' });
    await page.setViewportSize({ width: 640, height: 500 });
    await page.evaluate(() => window._drawDonutGallery(640, 500));
    await page.screenshot({ path: '/tmp/pvp-donut-octagonal-small.png' });
    assert.deepEqual(errors, []);
    console.log('All donut models: octagonal bodies, clipped corners, eight-sided rings, finite geometry, equip cleanup and WebGL renders passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
