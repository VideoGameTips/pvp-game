const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: width < 500 });
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(() => typeof animateCharacterMesh === 'function');
      const result = await page.evaluate(() => {
        requestAnimationFrame = () => 0;
        const stage = new THREE.Scene();
        stage.add(new THREE.HemisphereLight(0xffffff, 0x8796ac, 2));
        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(2, 5, 4);
        stage.add(light);
        const camera = new THREE.PerspectiveCamera(37, 1, .01, 20);
        camera.position.set(2.45, 1.45, 2.5);
        camera.lookAt(0, .55, -.1);
        const view = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        view.setSize(360, 360);
        const shots = {};
        const actors = [['default', false], ['vesper', true], ['pixel', false], ['jugger', true],
          ['cipher', false], ['frost', true], ['atlas', false], ['ace', true], ['nomad', false]];
        for (const [id, isBot] of actors) {
          const actor = makePlayerMesh('Slide Test', isBot, 'enemy', id);
          const { head, torso } = actor._rig;
          head.geometry.computeBoundingBox();
          torso.geometry.computeBoundingBox();
          const h = head.geometry.boundingBox, t = torso.geometry.boundingBox;
          function step(slide, aim) {
            for (let i = 0; i < 60; i++) animateCharacterMesh(actor, 1 / 60, 0, slide, 0, aim);
            actor.updateMatrixWorld(true);
            return head.rotation.x;
          }
          const standing = step(0, 0);
          const level = step(1, 0);
          const recline = torso.rotation.x;
          const inspectPose = aim => {
            const pitch = step(1, aim);
            // Sample the visible face in chest space, including the chin and its corners.
            let buried = 0;
            for (let row = 0; row <= 16; row++) for (let col = 0; col <= 16; col++) {
              const p = new THREE.Vector3(THREE.MathUtils.lerp(h.min.x, h.max.x, col / 16),
                THREE.MathUtils.lerp(h.min.y, h.max.y, row / 16), h.max.z);
              torso.worldToLocal(head.localToWorld(p));
              if (p.x > t.min.x + .005 && p.x < t.max.x - .005 && p.y > t.min.y + .005 &&
                  p.y < t.max.y - .005 && p.z > t.min.z + .005 && p.z < t.max.z - .005) buried++;
            }
            return { pitch, buried };
          };
          const low = inspectPose(.8), high = inspectPose(-.8), neutral = inspectPose(0);
          stage.add(actor);
          view.render(stage, camera);
          const probe = document.createElement('canvas');
          probe.width = probe.height = 64;
          const ctx = probe.getContext('2d');
          ctx.drawImage(view.domElement, 0, 0, 64, 64);
          const coverage = ctx.getImageData(0, 0, 64, 64).data.filter((v, i) => i % 4 === 3 && v > 128).length;
          shots[id] = { standing, level, recline, low, high, neutral, recovered: step(0, 0), coverage,
            png: view.domElement.toDataURL('image/png').split(',')[1] };
          actor.removeFromParent();
        }
        view.dispose();
        return shots;
      });
      for (const [id, { png, ...pose }] of Object.entries(result)) {
        if (process.env.SLIDE_PREVIEW_DIR) fs.writeFileSync(`${process.env.SLIDE_PREVIEW_DIR}/slide-${id}-${width}.png`, Buffer.from(png, 'base64'));
        const label = `${id} at ${width}px: ${JSON.stringify(pose)}`;
        assert.ok(pose.recline < -1 && pose.level < pose.standing - .2 && pose.level > pose.recline + .25, label);
        assert.ok(pose.low.pitch > pose.level + .15 && pose.high.pitch < pose.level - .15, label);
        assert.equal(pose.low.buried + pose.high.buried + pose.neutral.buried, 0, label);
        assert.ok(Math.abs(pose.standing - pose.recovered) < .001, label);
        assert.ok(pose.coverage > 200 && pose.coverage < 3000, label);
        console.log(label);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
