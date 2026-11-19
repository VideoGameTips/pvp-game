const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const gen2 = ['duelist_checkmate', 'rpg_cardboard_calamity', 'minigun_budget_cuts', 'revolver_banana_split',
  'ak20_missing_texture', 'throwing_knives_moms_slipper', 'hand_cannon_certified_brick'];
const gen3 = ['ak20_carrot47', 'srx_french_warfare', 'frag_tactical_quack', 'katana_school_supplies',
  'flamethrower_moms_hair_dryer', 'moon_mine_tactical_potato', 'railgun_aa_battery', 'crossbow_office_supplies',
  'rpg_plunger_launcher', 'revolver_finger_guns', 'sledge_bonk_stick', 'freeze_ray_refrigerator',
  'boombow_coat_hanger', 'medkit_band_aid', 'riot_shield_nope'];

async function verifyCaseServer(pools) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-novelty-'));
  const port = 41000 + Math.floor(Math.random() * 4000), password = 'novelty-test-only';
  const hash = bcrypt.hashSync(password, 4);
  const specs = [['gen2_entrances', gen2], ['gen3_clockwork', gen3]];
  const seeded = Object.fromEntries(specs.map(([id, newIds]) => [id, { passwordHash: hash, economyV: 2,
    credits: 200000, skinInventory: pools[id].filter(skin => !newIds.includes(skin)), skinCasePacks: { [id]: 1 } }]));
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify(seeded));
  const server = spawn(process.execPath, [path.resolve(__dirname, '../server.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dir }, stdio: 'ignore',
  });
  try {
    const base = 'http://127.0.0.1:' + port;
    let up = false;
    for (let i = 0; i < 50 && !up && server.exitCode === null; i++) {
      try { up = (await fetch(base + '/shop/catalog')).ok; }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(up, 'Test server did not start');
    const post = async (verb, caseId) => {
      const response = await fetch(base + '/shop/' + verb + '-skin-case', { method: 'POST',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: caseId, password, caseId }) });
      const data = await response.json();
      assert.ok(response.ok, JSON.stringify(data));
      return data;
    };
    for (const [caseId, ids] of specs) {
      const missing = new Set(ids);
      const bought = await post('buy', caseId);
      assert.equal(bought.skinCasePacks[caseId], 2, 'Buying lost an existing unopened case');
      while (missing.size) {
        const opened = await post('open', caseId);
        assert.ok(!opened.duplicate && missing.delete(opened.skinId), 'Unexpected drop: ' + opened.skinId);
        assert.ok(opened.skinInventory.includes(opened.skinId), 'Drop did not enter inventory');
        if (missing.size && !opened.skinCasePacks[caseId]) await post('buy', caseId);
      }
    }
    console.log('Both cases bought and opened on a real server; all 22 new drops earned without duplicates.');
  } finally {
    if (server.exitCode === null) {
      const closed = new Promise(resolve => server.once('close', resolve));
      server.kill(); await closed;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  let pools;
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 800 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'load' });
      const result = await page.evaluate(({ gen2, gen3 }) => {
        const check = (ok, msg) => { if (!ok) throw Error(msg); };
        currentUser = { username: 'NoveltyPreview', skinInventory: [] };
        const cases = CLIENT_SKIN_CASES;
        check(gen2.every(id => cases.gen2_entrances.defs().some(s => s.id === id)), 'Gen 2 is missing a drop');
        check(gen3.every(id => cases.gen3_clockwork.defs().some(s => s.id === id)), 'Gen 3 is missing a drop');
        check(!Object.values(cases).some(c => c.defs().some(s => s.id === 'amr_long_boi')), 'Archived Long Boi is a case drop');
        openWeaponSkinsPanel();
        const panel = document.querySelector('#weapon-skins-panel');
        check(panel.querySelector('#buy-skin-case-gen3') && /Pull from Gen 3 cases/.test(panel.querySelector('[data-mmskin="katana_school_supplies"]').textContent), 'Case UI and item locks disagree');
        check(!panel.querySelector('[data-mskin="amr_long_boi"]'), 'Archived skin is shown in public picker');
        panel._skinPreviewCleanup?.(); panel.style.display = 'none';

        const gallery = document.createElement('div');
        Object.assign(gallery.style, { position: 'absolute', zIndex: 2147483647, inset: '0 0 auto', background: '#252a30',
          display: 'grid', gridTemplateColumns: `repeat(${innerWidth < 500 ? 2 : 4}, minmax(0,1fr))`, gap: '6px', padding: '8px' });
        document.body.append(gallery);
        const render = def => {
          const m = def.build();
          const uri = _renderWeaponIcon(m);
          check(uri?.startsWith('data:image/png'), 'Blank preview for ' + def.id);
          const item = document.createElement('figure');
          Object.assign(item.style, { margin: 0, background: '#353b41', textAlign: 'center', padding: '4px', minWidth: 0 });
          const img = document.createElement('img'); img.src = uri;
          Object.assign(img.style, { display: 'block', width: '100%', height: innerWidth < 500 ? '74px' : '92px', objectFit: 'contain' });
          const cap = document.createElement('figcaption'); cap.textContent = def.name;
          cap.style.cssText = 'color:#fff;font:13px system-ui;overflow-wrap:anywhere';
          item.append(img, cap); gallery.append(item);
        };
        for (const id of [...gen2, ...gen3]) {
          const def = catalogSkin(id);
          check(def && isCaseSkinLocked(def), 'Ungated skin ' + id);
          currentUser.skinInventory.push(id);
          check(!isCaseSkinLocked(def), 'Cannot unlock skin ' + id);
          if (def.weapon) {
            setModelSkin(def.weapon, id);
            check(_activeModelSkin[def.weapon]?.id === id && def._model, 'Cannot equip ' + id);
          } else if (def.melee) {
            setMeleeModelSkin(def.melee, id);
            check(def._model === meleeModels[MELEE_ITEMS.findIndex(w => w.id === def.melee)], 'Cannot equip ' + id);
          } else {
            setSupportModelSkin(def.support, id);
            check(def._model === supportModels[SUPPORT_ITEMS.findIndex(w => w.id === def.support)], 'Cannot equip ' + id);
          }
          render(def);
        }
        for (const id of ['minigun_ceiling_fan', 'chainsaw_toothbrush', 'amr_long_boi']) render(catalogSkin(id));
        check(skinLookById('throwing_knives_moms_slipper')?.shot?.shape === 'slipper', 'Thrown slippers still use knife projectile');
        const slipper = makeBulletMesh(0, .05, 'throwing_knives', false, skinLookById('throwing_knives_moms_slipper'));
        check(slipper.children.length === 4, 'Slipper projectile geometry did not build');
        const now = Date.now(), dir = new THREE.Vector3(0, 0, -1), origin = new THREE.Vector3(0, 2, -1);
        spawnFrag(origin, dir, 'novelty_test_duck', false, 'frag_tactical_quack', now + GRENADE_FUSE);
        const duck = activeGrenades.pop(); scene.remove(duck.mesh);
        check(duck.visualOnly && duck.velZ === -20 && Math.abs(duck.explodeAt - now - GRENADE_FUSE) < 50, 'Duck flight changes fuse, velocity, or remote damage');
        const duckView = catalogSkin('frag_tactical_quack')._model;
        duckView._itemInspectFrame(.50);
        check(duckView.getObjectByName('tactical-duck').scale.y < .70, 'Duck inspect does not squeeze');
        duckView._itemInspectEnd();
        const ruler = catalogSkin('katana_school_supplies')._model;
        ruler._itemInspectFrame(.61);
        check(ruler.getObjectByName('ruler-skill-issue').visible, 'Ruler result missing');
        ruler._itemInspectEnd();
        check(!ruler.getObjectByName('ruler-skill-issue').visible, 'Ruler inspect result lingers');
        return { previews: gallery.children.length, pools: Object.fromEntries(['gen2_entrances', 'gen3_clockwork']
          .map(id => [id, cases[id].defs().map(s => s.id)])) };
      }, { gen2, gen3 });
      pools = result.pools;
      console.log(width, { gen2: gen2.length, gen3: gen3.length, previews: result.previews });
      await page.screenshot({ path: `/tmp/pvp-novelty-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
  await verifyCaseServer(pools);
})().catch(error => { console.error(error); process.exitCode = 1; });
