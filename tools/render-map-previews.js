// Renders the picture on each map's card in the map vote: a screenshot of the real map, from a corner, at about
// three-quarters, with a first-person lens — what you would see arriving there.
//
//   PLAYWRIGHT_MODULE=/path/to/playwright-core [PW_CHROME=/path/to/chrome] node tools/render-map-previews.js [id ...]
//
// It drives a running game (PVP_TEST_URL, default http://localhost:3001/), builds each map the way a match does,
// puts the camera where VIEWS says (or at a computed corner), and writes public/map-previews/<id>.jpg. Run it again
// whenever a map's look changes; ids on the command line redo only those. `--sheet` also writes a contact sheet to
// the path in PREVIEW_SHEET so the whole set can be looked over at once.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const OUT = process.env.PREVIEW_OUT || path.join(__dirname, '..', 'public', 'map-previews');
const W = 960, H = 600, OUT_W = 400, OUT_H = 250;

// Hand-placed views for the maps whose corner is indoors, walled in, or has nothing to look at. { from: [x, y, z],
// to: [x, y, z], fov } in metres. Everything else gets the computed corner.
const VIEWS = {
  volcano: { from: [52, 44, 77], to: [0, 2, 0], fov: 78 },
  // the automatic pick faced a bare wall; from the harbour edge, up a little, the quays and the cranes show
  pearl_harbor: { from: [0, 8, 82], to: [0, 3, 0], fov: 80 },
  ...JSON.parse(process.env.PREVIEW_VIEWS || '{}'),
};

(async () => {
  const ids = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PW_CHROME || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  fs.mkdirSync(OUT, { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof activateMap === 'function' && typeof renderer !== 'undefined', null, { timeout: 90000 });
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });   // nothing else draws while we do
    const all = await page.evaluate(() => MAP_IDS.filter(id => MAP_GROUPS[id] && MAP_BOUNDS[id]));
    const todo = ids.length ? ids : all;
    const sheet = [];
    for (const id of todo) {
      const data = await page.evaluate(([id, views, OUT_W, OUT_H, RED]) => {
        document.querySelectorAll('body > :not(canvas)').forEach(e => { e.style.display = 'none'; });
        try { weaponModels.forEach(m => { m.visible = false; }); } catch (e) {}
        camera.children.forEach(c => { if (!c.isLight) c.visible = false; });
        activateMap(id);
        if (RED) for (const m of MAP_GROUPS[id].children) if (m.userData && m.userData.mapWear && m.material && m.material.map) { m.material.vertexColors = false; m.material.color.setHex(0xff0000); m.material.needsUpdate = true; }   // PREVIEW_RED: show where the wear is
        const sky = MAP_GROUPS[id] && MAP_GROUPS[id]._skyColor;
        if (sky != null && scene.background && scene.background.setHex) scene.background.setHex(sky);
        const b = MAP_BOUNDS[id], cols = MAP_COLLIDERS[id] || [];
        const R = Math.max(b.halfX, b.halfZ);
        const place = v => {
          camera.fov = v.fov || 78; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
          camera.position.set(...v.from); camera.lookAt(...v.to);
          scene.updateMatrixWorld(true);
        };
        // Pixels of the current frame, small: how bright, and how much there is to look at.
        const probe = document.createElement('canvas'); probe.width = 96; probe.height = 60;
        const pctx = probe.getContext('2d', { willReadFrequently: true });
        const look = () => {
          renderer.render(scene, camera);
          pctx.drawImage(renderer.domElement, 0, 0, 96, 60);
          const d = pctx.getImageData(0, 0, 96, 60).data, lum = new Float32Array(96 * 60);
          let sum = 0;
          for (let i = 0; i < lum.length; i++) { lum[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]; sum += lum[i]; }
          let edge = 0;
          for (let y = 1; y < 60; y++) for (let x = 1; x < 96; x++) edge += Math.abs(lum[y * 96 + x] - lum[y * 96 + x - 1]) + Math.abs(lum[y * 96 + x] - lum[(y - 1) * 96 + x]);
          return { mean: sum / lum.length, edge: edge / lum.length };
        };
        const solidAt = (x, y, z) => cols.some(c => x > c.min.x - 0.4 && x < c.max.x + 0.4 && z > c.min.z - 0.4 && z < c.max.z + 0.4 && y > c.min.y - 0.2 && y < c.max.y + 0.2);
        const clearAhead = (from, to) => {           // metres of open air straight ahead, up to 14
          const dx = to[0] - from[0], dz = to[2] - from[2], dy = to[1] - from[1], len = Math.hypot(dx, dy, dz) || 1;
          for (let t = 0.5; t <= 14; t += 0.5) if (solidAt(from[0] + dx / len * t, from[1] + dy / len * t, from[2] + dz / len * t)) return t;
          return 14;
        };
        let best = null;
        if (views[id]) best = views[id];
        else {
          // Corners and the middles of the sides, two heights, looking across the map; the plain corner-to-far-side
          // view is the favourite and the others only win by being clearly better (not facing a wall, not dark).
          const sx = b.halfX, sz = b.halfZ, cand = [];
          const low = Math.max(2.6, Math.min(4, R * 0.04)), high = Math.max(4, Math.min(8, R * 0.07));
          for (const [cx, cz] of [[-0.55, 0.72], [0.55, 0.72], [-0.55, -0.72], [0.55, -0.72], [0, 0.8], [0, -0.8], [-0.7, 0], [0.7, 0]]) {
            for (const h of [low, high]) for (const [tx, tz] of [[-cx * 0.3, -cz * 0.3], [-cx * 0.5 + 0.25 * sx / sx, -cz * 0.2], [-cx * 0.2, -cz * 0.5]]) {
              cand.push({ from: [cx * sx, h, cz * sz], to: [tx * sx, 1.2, tz * sz], fov: 78 });
            }
          }
          const base = cand[0];
          let lift = null;
          { place(base); if (look().mean < 38) { lift = new THREE.AmbientLight(0xffffff, 1.4); scene.add(lift); } }
          let bestScore = -1;
          cand.forEach((v, i) => {
            if (solidAt(...v.from)) return;
            const free = clearAhead(v.from, v.to);
            if (free < 7) return;
            place(v);
            const m = look();
            const bright = Math.max(0.05, Math.min(1, m.mean / 70)) * (m.mean > 205 ? 0.6 : 1);
            const score = m.edge * bright * (i === 0 ? 1.18 : 1) * (0.7 + 0.3 * Math.min(1, free / 14));
            if (score > bestScore) { bestScore = score; best = v; }
          });
          if (!best) best = base;
          best.lift = !!lift;
          if (lift) { scene.userData._previewLift = lift; }
        }
        place(best);
        renderer.setSize(innerWidth, innerHeight);
        renderer.render(scene, camera);
        const small = document.createElement('canvas'); small.width = OUT_W; small.height = OUT_H;
        small.getContext('2d').drawImage(renderer.domElement, 0, 0, OUT_W, OUT_H);
        if (scene.userData._previewLift) { scene.remove(scene.userData._previewLift); scene.userData._previewLift = null; }
        if (RED) window.__lastView = best;
        return small.toDataURL('image/jpeg', 0.8);
      }, [id, VIEWS, OUT_W, OUT_H, !!process.env.PREVIEW_RED]);
      const buf = Buffer.from(data.split(',')[1], 'base64');
      fs.writeFileSync(path.join(OUT, id + '.jpg'), buf);
      sheet.push(id);
      console.log(id.padEnd(22), (buf.length / 1024).toFixed(1) + ' KB');
    }
    if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 5));
    if (process.argv.includes('--sheet') && process.env.PREVIEW_SHEET) {
      const html = `<body style="margin:0;background:#111;display:flex;flex-wrap:wrap;gap:4px">${sheet.map(id =>
        `<div style="color:#fff;font:12px monospace;width:${OUT_W}px"><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(OUT, id + '.jpg')).toString('base64')}" width="${OUT_W}"><br>${id}</div>`).join('')}</body>`;
      fs.writeFileSync(process.env.PREVIEW_SHEET, html);
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
