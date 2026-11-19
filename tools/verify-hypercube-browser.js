const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'load' });
      await page.waitForFunction(() => typeof SKIN_FX !== 'undefined');
      const result = await page.evaluate(() => {
        const check = (value, message) => { if (!value) throw Error(message); };
        const shape = createHypercube4D();
        check(shape.vertices.length === 64 && shape.edges.length === 32, 'Wrong tesseract topology');
        const degrees = Array(16).fill(0);
        for (const [a, b] of shape.edges) {
          degrees[a]++; degrees[b]++;
          check(Number.isInteger(Math.log2(a ^ b)), 'An edge changes more than one coordinate');
        }
        check(degrees.every(n => n === 4), 'Each vertex must have four neighbors');
        check(shape.edges.filter(([a, b]) => (a ^ b) === 8).length === 8, 'Missing cube-to-cube edges');
        for (let n = 0; n < 160; n++) {
          shape.project(n * .097, n * .061, n * -.083, n * .043);
          for (let i = 0; i < 16; i++) {
            const v = shape.rotated.slice(i * 4, i * 4 + 4);
            check(Math.abs(v.reduce((s, x) => s + x * x, 0) - 4) < 1e-10, '4D radius changed');
            check(shape.projected[i].toArray().every(Number.isFinite), 'Invalid perspective coordinate');
          }
          for (const [a, b] of shape.edges) {
            let length2 = 0;
            for (let k = 0; k < 4; k++) length2 += (shape.rotated[a * 4 + k] - shape.rotated[b * 4 + k]) ** 2;
            check(Math.abs(length2 - 4) < 1e-10, '4D edge stretched');
          }
        }
        const cubeRadii = () => [0, 8].map(start =>
          shape.projected.slice(start, start + 8).reduce((s, p) => s + p.lengthSq(), 0));
        shape.project(0, 0, 0, 0); const first = cubeRadii();
        shape.project(Math.PI, 0, 0, 0); const second = cubeRadii();
        check(first[0] < first[1] && second[0] > second[1], 'The cubes never exchange inside/outside');

        const id = 'continuum_hypercube', idx = WEAPONS.findIndex(w => w.id === 'continuum');
        const stockStats = JSON.stringify(WEAPONS[idx]);
        currentUser = { username: 'HypercubePreview', skinInventory: [id] };
        setModelSkin('continuum', id);
        check(_activeModelSkin.continuum?.id === id && GEN2_MODEL_SKIN_IDS.has(id), 'Case ownership or equip failed');
        currentWeaponIdx = selectedSecondaryIdx = idx; currentWeapon = WEAPONS[idx]; activeSlot = 'secondary';
        const g = weaponModels[idx], rig = g._hypercube;
        g.visible = true; finishEquip(); equipReadyAt = 0;
        check(rig.edges.count === 32 && rig.nodes.count === 16 && rig.panels.length === 4, 'Incomplete model');
        const oldDate = Date.now, oldSound = playSoundEvent;
        let wall = Date.now(), perf = performance.now();
        const events = [];
        Date.now = () => wall;
        Object.defineProperty(performance, 'now', { configurable: true, value: () => perf });
        window.requestAnimationFrame = () => 0;
        playSoundEvent = name => events.push(name);
        const tick = ms => { wall += ms; perf += ms; g._tick(ms / 1000, perf / 1000, false); };
        const seek = t => {
          const next = g._reloadStart + g._reloadDur * t;
          const elapsed = Math.max(.016, (next - wall) / 1000);
          perf += next - wall; wall = next;
          updateReloadAnim(); g._tick(elapsed, perf / 1000, false);
        };
        const panelOffset = () => rig.panels[0].part.position.distanceTo(rig.panels[0].home);
        try {
          gameStarted = true; isDead = countdownActive = reloading = isADS = false;
          camera.fov = 75; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
          g._calm();
          const idleShot = g.clone();
          const matrix = Array.from(rig.edges.instanceMatrix.array);
          tick(220);
          check(rig.edges.instanceMatrix.array.some((x, i) => Math.abs(x - matrix[i]) > 1e-5), 'Idle core is static');
          isADS = true; tick(250);
          check(panelOffset() > .016 && rig.core.scale.x > 1.22, 'ADS does not open and expand');
          const ceiling = Math.max(...rig.shape.projected.map(p => p.y * .048)) * rig.core.scale.y + rig.core.position.y;
          check(ceiling < .083, 'Core obstructs the sight line');
          const pool = weaponAmmo[idx]; pool.ammo = 3; pool.reserve = 100; lastShot = 0;
          tryShoot();
          check(pool.ammo === 2 && rig.dot.visible && !rig.core.visible, 'Shot does not collapse into a point');
          tick(24); check(rig.core.scale.x < .02 && rig.dot.visible, 'Collapse is too brief to see');
          tick(130); check(rig.core.scale.x > 1.2, 'Core does not expand after firing');
          tick(100); check(!rig.dot.visible && rig.core.visible, 'Shot point fails to clear');
          isADS = false; startReload();
          check(reloading && g._reloadDur === 500, 'Changed the 500 ms reload');
          seek(.50); check(rig.core.scale.x < .11 && rig.dot.visible, 'Reload does not fold inward');
          seek(.91); check(rig.core.scale.x > .90 && events.includes('hypercube_lock'), 'Reload does not reconstruct');
          cancelReload(); tick(16);
          startInspect(); check(g._inspectMode && g._reloadDur === 3600, 'Missing dedicated inspect');
          seek(.48);
          check(rig.core.scale.x > 2.75 && panelOffset() > .11, 'Inspect does not reveal a giant tesseract');
          g._flash.visible = false;
          const shot = g.clone();
          const snapshot = rig.edges.instanceMatrix.array.slice();
          seek(.63);
          check(rig.edges.instanceMatrix.array.some((x, i) => Math.abs(x - snapshot[i]) > .01), 'Inspect 4D fold is static');
          seek(.87); seek(.89);
          check(events.filter(x => x === 'hypercube_lock').length === 2, 'Inspect snap is missing or repeated');
          seek(.99); check(panelOffset() < .001 && Math.abs(rig.core.scale.x - 1) < .001, 'Inspect does not reassemble');
          cancelInspect(); g._calm();
          check(rig.panels.every(({ part, home }) => part.position.distanceTo(home) < 1e-6 && part.rotation.toArray().slice(0, 3).every(x => x === 0)), 'Reset leaves separated panels');
          check(stockStats === JSON.stringify(WEAPONS[idx]), 'Changed Continuum stats');

          // Render the full inspect with the real camera-relative pose.
          const stage = new THREE.Scene(); stage.background = new THREE.Color(0x29313c);
          const view = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .01, 10);
          view.add(shot); stage.add(view, new THREE.HemisphereLight(0xe8edff, 0x7c8b96, 2.1));
          const key = new THREE.DirectionalLight(0xeaf7ff, 3); key.position.set(-1, 2, 2); stage.add(key);
          const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
          renderer.setSize(innerWidth, innerHeight);
          Object.assign(renderer.domElement.style, { position: 'fixed', inset: 0, zIndex: 2147483647 });
          document.body.appendChild(renderer.domElement); renderer.render(stage, view);
          const projected = shot.getObjectByName('projected tesseract');
          const gl = renderer.getContext(), pixels = new Uint8Array(innerWidth * innerHeight * 4);
          gl.readPixels(0, 0, innerWidth, innerHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let purple = 0;
          for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 2] > 125 && pixels[i + 2] > pixels[i + 1] * 1.22 && pixels[i] > 55) purple++;
          check(purple > 120, 'Core render is blank');
          const bounds = new THREE.Box3();
          // Use the actual instance matrices, not the base cylinder's bounds.
          for (let i = 0; i < 16; i++) {
            const m = new THREE.Matrix4(); projected.getObjectByName('16 tesseract vertices').getMatrixAt(i, m);
            const point = new THREE.Vector3().setFromMatrixPosition(m);
            point.applyMatrix4(projected.matrixWorld).project(view); bounds.expandByPoint(point);
          }
          check([bounds.min.x, bounds.max.x, bounds.min.y, bounds.max.y].every(v => Math.abs(v) < .96), 'Inspect core is clipped');
          for (const panel of shot.children.filter(p => p.name.startsWith('hypercube-panel-'))) {
            for (const x of [-.016, .016]) for (const y of [-.016, .016]) for (const z of [-.12, .12]) {
              const point = panel.localToWorld(new THREE.Vector3(x, y, z)).project(view);
              check(Math.abs(point.x) < .98 && Math.abs(point.y) < .98, 'Inspect armor is clipped');
            }
          }
          check(renderer.info.render.calls < 180, 'Unexpected draw-call explosion');
          window._hypercubeRenderIdle = () => {
            view.remove(shot); view.add(idleShot); renderer.render(stage, view);
            const next = new Uint8Array(innerWidth * innerHeight * 4);
            gl.readPixels(0, 0, innerWidth, innerHeight, gl.RGBA, gl.UNSIGNED_BYTE, next);
            let visible = 0;
            for (let i = 0; i < next.length; i += 4) if (next[i + 2] > 125 && next[i + 2] > next[i + 1] * 1.22 && next[i] > 55) visible++;
            check(visible > 80, 'Idle core is hidden by armor');
            return visible;
          };
          return { vertices: 16, edges: 32, genuine4DRotation: true, purplePixels: purple, drawCalls: renderer.info.render.calls };
        } finally {
          Date.now = oldDate; delete performance.now; playSoundEvent = oldSound;
        }
      });
      await page.screenshot({ path: '/tmp/pvp-hypercube-' + viewport.width + '.png' });
      console.log('idle', viewport.width, await page.evaluate(() => window._hypercubeRenderIdle()));
      await page.screenshot({ path: '/tmp/pvp-hypercube-idle-' + viewport.width + '.png' });
      assert.deepEqual(errors, []);
      console.log(viewport.width, result);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
