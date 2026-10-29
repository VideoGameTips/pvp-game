// Finds map scenery that hangs in the air touching nothing at all.
//
//   PLAYWRIGHT_MODULE=/path/to/playwright-core [PW_CHROME=/path/to/chrome] \
//   [PVP_TEST_URL=http://localhost:3001/] node tools/verify-map-floaters.js [id ...]
//
// It drives a running game, builds every map and tests each piece of scenery
// against every other one: a piece is fine if it touches ANYTHING on any side
// — the ground, a wall, another prop. Only something separated from every
// surface is really floating.
//
// What it deliberately ignores, because all of it is supposed to hang:
//   · self-lit things (MeshBasicMaterial, or any emissive) — fireflies in the
//     forest, wind streaks on gale_peaks, sky crystals, lamp glows
//   · anything starting above 20 m — clouds, backdrop ridges, station rings
//   · near-transparent things — haze, water film
//   · ground planes and sky domes (over 150 m across), and decals
//   · hidden things (a gimmick's train waits invisible) and _eggFloatingChain's platforms
// Without those rules this reported 116 pieces and every one was intended,
// which is the same as reporting nothing.
//
// BASELINE is what each map is known to hang on purpose (asteroids in space,
// impossible shapes in dreamscape — that one is the map's whole premise, a
// moai in flying_moai). The check fails only on counts ABOVE the baseline, so
// a new map with real floaters, or a regression in an old one, is what shows up.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const BASELINE = {
  space: 11, volcano: 5,   // (space: 4 more asteroids since its LOOK pass -- counted now that the check sees upgraded maps)
  dreamscape: 5, big_harbor: 4, skydock: 2, flying_moai: 1,
};

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof MAP_GROUPS !== 'undefined' && typeof MAP_IDS !== 'undefined',
                             null, { timeout: 90000 });
  const wanted = process.argv.slice(2);
  const report = await page.evaluate((only) => {
    const ids = only.length ? only : MAP_IDS;
    const out = [];
    for (const id of ids) {
      const G = MAP_GROUPS[id];
      if (!G) { out.push({ id, missing: true }); continue; }
      // as it is played: the depth, eggs, outskirts and gimmicks are added the first time a map is played, and
      // without this the check never saw any of them (#82)
      try { _upgradeMap(id); } catch (e) { out.push({ id, upgradeError: String(e.message || e) }); continue; }
      G.updateMatrixWorld(true);
      const parts = [];
      const shown = o => { for (let p = o; p && p !== G; p = p.parent) if (p.visible === false) return false; return true; };
      G.traverse(o => {
        if (!o.isMesh || !o.geometry || !shown(o)) return;          // (a gimmick's train waits hidden)
        if (o.userData && o.userData.egg === 'chain') return;          // _eggFloatingChain: floating on purpose
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        if (m && m.transparent && m.opacity < 0.5) return;
        if (m && (m.type === 'MeshBasicMaterial' || (m.emissive && m.emissive.getHex() !== 0))) return;
        const b = new THREE.Box3().setFromObject(o);
        if (!isFinite(b.min.y) || !isFinite(b.max.y)) return;
        const s = new THREE.Vector3(); b.getSize(s);
        if (s.x > 150 || s.z > 150) return;
        if (b.min.y > 20) return;
        if (s.x * s.y * s.z < 1e-4) return;
        parts.push({ o, b, s });
      });
      const E = 0.35;
      const found = [];
      for (const p of parts) {
        if (p.b.min.y <= E) continue;
        let touches = false;
        for (const q of parts) {
          if (q === p) continue;
          if (q.b.max.x < p.b.min.x - E || q.b.min.x > p.b.max.x + E) continue;
          if (q.b.max.y < p.b.min.y - E || q.b.min.y > p.b.max.y + E) continue;
          if (q.b.max.z < p.b.min.z - E || q.b.min.z > p.b.max.z + E) continue;
          touches = true; break;
        }
        if (!touches) found.push({
          kind: p.o.geometry.type.replace('Geometry', ''),
          y: +p.b.min.y.toFixed(1),
          size: [p.s.x, p.s.y, p.s.z].map(v => +v.toFixed(1)).join('x'),
          at: [Math.round((p.b.min.x + p.b.max.x) / 2), Math.round((p.b.min.z + p.b.max.z) / 2)].join(','),
        });
      }
      out.push({ id, parts: parts.length, found });
    }
    return out;
  }, wanted);

  let bad = 0;
  for (const r of report) {
    if (r.missing) { console.log(r.id.padEnd(22) + 'NO MAP GROUP'); bad++; continue; }
    if (r.upgradeError) { console.log(r.id.padEnd(22) + 'UPGRADE THREW ' + r.upgradeError); bad++; continue; }
    const base = BASELINE[r.id] || 0;
    if (r.found.length <= base) continue;
    bad++;
    console.log(r.id.padEnd(22) + r.found.length + ' floating (allowed ' + base + ') of ' + r.parts + ' parts');
    for (const f of r.found.slice(0, 6)) {
      console.log('    ' + f.kind.padEnd(14) + 'y=' + String(f.y).padStart(6) + '  ' + f.size.padEnd(16) + 'at ' + f.at);
    }
  }
  if (errs.length) console.log('\npage errors: ' + errs.slice(0, 3).join(' | '));
  console.log(bad ? '\n' + bad + ' map(s) over baseline' : '\nno scenery hanging in the air that is not meant to be');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
