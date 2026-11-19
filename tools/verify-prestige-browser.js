const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { IDS } = require('../prestige-wraps');

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 820 }, hasTouch: width < 500, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(() => !!WEAPON_SKINS_BY_ID.prestige_worldbreaker);
      await page.evaluate(ids => {
        const check = (ok, msg) => { if (!ok) throw new Error(msg); };
        currentUser = { username: 'Visual test', skinInventory: [] };
        const swatches = Object.values(ids).map(id => _wsSwatchURL(id));
        check(swatches.every(s => /^data:image/.test(s)) && new Set(swatches).size === 6, 'Prestige swatch missing');
        openItemSkins('gun', 'ak20');
        const panel = document.getElementById('item-skins-panel');
        const card = id => [...panel.querySelectorAll('.is-cell')].find(el => el.textContent.includes(WEAPON_SKINS_BY_ID[id].name));
        for (const id of Object.values(ids)) {
          check(!wrapUnlocked(id) && card(id)?.textContent.includes(WEAPON_SKINS_BY_ID[id].prestige), 'No lock or requirement for ' + id);
          card(id).click();
          check(!equippedWraps.ak20, 'Locked wrap equipped by clicking');
        }
        check(panel.scrollWidth <= panel.clientWidth + 1, 'Picker overflow');
        currentUser.skinInventory.push(ids.worldbreaker, ids.clutch);
        check(!wrapUnlocked(ids.clutch), 'Unimplemented clutch award cannot be equipped');
        openItemSkins('gun', 'ak20');
        const index = WEAPONS.findIndex(w => w.id === 'ak20'), gun = weaponModels[index], mesh = gun.getObjectByName('receiver');
        const stock = mesh.material.map, geo = mesh.geometry, w = WEAPONS[index];
        card(ids.worldbreaker).click();
        check(wrapIdFor('ak20') === ids.worldbreaker && mesh.material.map === _wsTextures(ids.worldbreaker, 0).map, 'Earned wrap did not equip');
        check(mesh.geometry === geo && effectiveGunStats(w) === w && !gun._skinExtra, 'Wrap changed geometry, FX or stats');
        setItemWrap('gun', 'ak20', '');
        check(mesh.material.map === stock, 'Stock material lost');
        panel.style.display = 'none';
        for (const id of ['overlay', 'mode-screen', 'login-screen']) {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        }
        inLobby = false; myId = 'banner-tester'; match = { type: 'ffa' };
        resetKillChain(); _killConfirms.clear();
        confirmKill('a', 'A'); confirmKill('b', 'B'); confirmKill('a', 'A');
        check(document.querySelector('.pol-mk b').textContent === 'DOUBLE KILL', 'Double kill or echo handling wrong');
        confirmKill('c', 'C');
        check(document.querySelector('.pol-mk b').textContent === 'TRIPLE KILL', 'Triple kill not shown');
        resetKillChain();
        match = { type: 'elim', roundActive: true, _aceRound: { remaining: new Set(['d', 'e']), total: 2 } };
        confirmKill('d', 'D'); confirmKill('e', 'E');
        const b = document.querySelector('.pol-mk'), r = b.getBoundingClientRect();
        check(b.hasAttribute('data-ace') && b.querySelector('b').textContent === 'ACE', 'Ace not shown');
        check(+getComputedStyle(b).opacity === 1 && r.left >= 0 && r.right <= innerWidth && b.scrollWidth <= b.clientWidth, 'Banner clipped or invisible');
      }, IDS);
      if (process.env.WRAP_PREVIEW_DIR) await page.locator('.pol-mk').screenshot({ path: process.env.WRAP_PREVIEW_DIR + '/kill-ace-' + width + '.png' });
      assert.deepEqual(errors, []);
      console.log(width + ': Prestige cards and gated equip; Double Kill, Triple Kill and Ace render');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
