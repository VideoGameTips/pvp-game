const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const url = process.env.PVP_TEST_URL || 'http://localhost:3001/';
const testProfile = 'KitTest';

async function openLoadout(page, username = testProfile) {
  await page.waitForFunction(() => {
    try { return !!_bestBtn && typeof canUseLoadoutPresets === 'function'; }
    catch (_) { return false; }
  });
  await page.evaluate(username => {
    currentUser = { username, purchased: [], unlocks: [] };
    document.getElementById('overlay').style.display = 'none';
    selectedModeConfig = null;
    inLobby = true;
    gameStarted = true;
    showLoadoutScreen('swap');
  }, username);
}

const selectedIds = page => page.evaluate(() => {
  const {p,s,m,u} = selectedLoadoutKit();
  return [WEAPONS[p].id, WEAPONS[s].id, MELEE_ITEMS[m].id, SUPPORT_ITEMS[u].id];
});

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1280, 320]) {
      const page = await browser.newPage({ viewport: {width, height: 760}, hasTouch: width < 500, isMobile: width < 500 });
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      const button = name => page.getByRole('button', {name, exact: true});
      const primary = id => page.locator('#loadout-primary-list [data-item-id="' + id + '"]');
      const panel = page.locator('#best-loadouts-panel');
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await openLoadout(page);
      const first = await selectedIds(page);
      const alt = first[0] === 'sg8' ? 'ak20' : 'sg8';
      const favorite = primary(alt).locator('.lh-favorite');
      if (width < 500) await favorite.tap(); else { await favorite.focus(); await page.keyboard.press('Space'); }
      assert.equal(await favorite.getAttribute('aria-pressed'), 'true');
      assert.deepEqual(await selectedIds(page), first, 'Starring an item must not equip it');
      assert.equal(await page.locator('#loadout-screen').getAttribute('data-loadout-step'), 'primary');
      await button('Favorites only').click();
      assert.equal(await page.locator('#loadout-primary-list .loadout-card:visible').count(), 1);

      await button('Saved kits').click();
      const form = panel.getByRole('textbox', {name:'Kit name'});
      const kitName = 'First <kit> "safe"';
      await form.pressSequentially(kitName);
      await button('Save Current Kit').click();
      assert.equal(await panel.locator('.kit-row strong').textContent(), kitName);
      await form.fill(kitName.toUpperCase());
      await button('Save Current Kit').click();
      assert.match(await panel.locator('.kit-status').textContent(), /already in use/);
      await button('Close saved kits').click();

      const second = await page.evaluate(first => {
        const alternative = ids => ids.find(id => !first.includes(id));
        selectedPrimaryIdx = findWeaponIdx(alternative(['sg8','ak20']));
        selectedSecondaryIdx = findWeaponIdx(alternative(['pistol','flare']));
        selectedMeleeIdx = findMeleeIdx(alternative(['fists','frying_pan']));
        selectedSupportIdx = findUtilIdx(alternative(['medkit','frag']));
        showLoadoutScreen('swap');
        return [WEAPONS[selectedPrimaryIdx].id, WEAPONS[selectedSecondaryIdx].id,
          MELEE_ITEMS[selectedMeleeIdx].id, SUPPORT_ITEMS[selectedSupportIdx].id];
      }, first);
      await button('Saved kits').click();
      await form.fill('Second kit');
      await button('Save Current Kit').click();
      await button('Equip ' + kitName).click();
      assert.deepEqual(await selectedIds(page), first);
      assert.equal(await panel.isVisible(), false);

      await page.reload({waitUntil: 'domcontentloaded'});
      await openLoadout(page);
      assert.equal(await favorite.getAttribute('aria-pressed'), 'true', 'Favorites must survive reload');
      await button('Saved kits').click();
      await panel.screenshot({path: '/tmp/pvp-saved-kits-' + width + '.png'});
      const area = await panel.boundingBox();
      assert.ok(area.x >= 0 && area.x + area.width <= width);
      assert.equal(await panel.evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Dialog overflows horizontally');
      await button('Equip Second kit').click();
      assert.deepEqual(await selectedIds(page), second, 'Restore all four slots after reload');

      await page.evaluate(() => {
        const archived = WEAPONS.find(w => w.archived && w.slot !== 'secondary');
        if (!archived) throw Error('Expected an archived primary in the catalog');
        PVP_LOADOUT_HUB.saveKit('Retired', { ...PVP_LOADOUT_HUB.kits()[0], p: archived.id });
      });
      await button('Saved kits').click();
      assert.equal(await button('Equip Retired').isDisabled(), true);
      await button('Delete ' + kitName).click();
      assert.equal(await button('Equip ' + kitName).count(), 0);
      await page.keyboard.press('Escape');
      assert.equal(await panel.isVisible(), false);
      await openLoadout(page, 'OtherProfile');
      await button('Saved kits').click();
      assert.equal(await panel.locator('.kit-empty').textContent(), 'No saved kits yet.');
      await button('Close saved kits').click();

      const feedback = await page.evaluate(() => {
        if (!myId) myId = 'feedback-test-shooter';
        inLobby = false;
        match = {type:'ffa', cfg:{}, over:false};
        showLoadoutScreen('death');
        const liveHidden = document.getElementById('best-loadouts-btn').hidden;
        const directTags = killfeedShotTags('ak20', { shotTags: [], shotDistance: 36 });
        const short = killfeedShotTags('ak20', { shotTags: [], shotDistance: 34.99 });
        const trickTags = killfeedShotTags('srx', { shotTags: ['NO SCOPE','360','AIR'], shotDistance: 36 });
        const text = document.getElementById('kill-confirm');
        const before = text.textContent;
        noteKillInfo('test-target', myId, 'ak20', true, {tags: directTags});
        const beforeConfirm = text.textContent;
        const firstKill = confirmKill('test-target', 'Test Bot');
        const afterConfirm = text.textContent;
        const echo = confirmKill('test-target', 'Test Echo');
        return { liveHidden, directTags, short, trick: eliminationCaption({ tags: trickTags, head: false }), before, beforeConfirm, firstKill, afterConfirm, echo, afterEcho: text.textContent };
      });
      assert.deepEqual(feedback.directTags, ['LONG RANGE']);
      assert.deepEqual(feedback.short, []);
      assert.equal(feedback.trick, '360 NO-SCOPE');
      assert.equal(feedback.beforeConfirm, feedback.before);
      assert.equal(feedback.firstKill, true);
      assert.match(feedback.afterConfirm, /^LONG-RANGE HEADSHOT.*Test Bot$/);
      assert.equal(feedback.echo, false);
      assert.equal(feedback.afterEcho, feedback.afterConfirm);
      assert.equal(feedback.liveHidden, true);
      assert.deepEqual(errors, []);
      console.log(width + 'px: saved kits, favorites, reload, profile isolation and confirmed elimination feedback passed');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
