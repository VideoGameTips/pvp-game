const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const [width, height] of [[1280, 820], [390, 844], [844, 390], [320, 650]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1000, reducedMotion: width < 400 ? 'reduce' : 'no-preference' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(() => window.PVP_MATCH_MVP && window.PVP_RANKED);
      await page.evaluate(() => {
        for (const id of ['overlay','login-screen','mode-screen']) {
          const el = document.getElementById(id); if (el) el.style.display = 'none';
        }
        requestAnimationFrame = () => 0;
        awardMatchCredits = () => {};
        isDead = false; gameStarted = true; inLobby = false;
        activeSlot = 'primary';
        currentWeaponIdx = WEAPONS.findIndex(w => w.id === 'p90');
        currentWeapon = WEAPONS[currentWeaponIdx];
        myId = 'home';
        currentRoom = 'mvp-10v10';
        players = { home: { name: 'Tactical Iris' }, away: { name: 'Outrider', weaponId: 'ak20' } };
        resetMatchRivals();
        gameBots.length = 0;
        for (const team of ['ally','enemy']) for (let i = 0; i < 9; i++) {
          const id = team + i;
          gameBots.push({ id, team, name: 'Sentinel ' + i, weaponId: 'pistol' });
          matchScore[id] = i + (team === 'enemy' ? 40 : 0); matchDeaths[id] = 3;
        }
        matchScore.home = 24; matchDeaths.home = 5;
        pvpMatch = { mode: '10v10', team: 'ally', isHost: true, hostId: 'home', mvpRank: 6,
          opponents: [{ socketId: 'away', team: 'enemy', name: 'Outrider', mvpRank: 7 }] };
        const setup = () => ({ type: 'race', cfg: { killGoal: 100 }, teamKills: { ally: 100, enemy: 95 }, killsAtStart: myKills, deaths: 5 });
        window.__mvpMatch = setup;
        match = setup();
        socket.emit = (event, data) => { if (event === 'matchEvent') window.__mvpEndPacket = data; };
        endMatch('ally', 'KILL GOAL REACHED');
      });
      const showcase = page.locator('#match-mvp');
      await showcase.waitFor({ state: 'visible' });
      assert.equal(await page.locator('#mvp-name').textContent(), 'Tactical Iris');
      assert.equal(await page.locator('#mvp-rank').textContent(), 'Sapphire');
      assert.equal(await page.locator('#mvp-weapon-name').textContent(), 'P90');
      assert.equal(await page.locator('#mvp-kills').textContent(), '24');
      assert.equal(await page.locator('#mvp-deaths').textContent(), '5');
      assert.equal(await page.locator('#mvp-kd').textContent(), '4.80');
      assert.equal(await showcase.locator('canvas').count(), 1);
      await page.waitForFunction(() => document.querySelector('.mvp-weapon img').naturalWidth > 0);
      assert.ok(await page.locator('#back-lobby-btn').isVisible());
      assert.ok(await page.locator('#match-over-screen').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'results horizontally overflow');
      if (width < 400) assert.equal(await showcase.evaluate(el => getComputedStyle(el).animationName), 'none');
      else assert.equal(await showcase.evaluate(el => getComputedStyle(el).animationName), 'mvp-reveal');
      if (process.env.MVP_PREVIEW_DIR) await page.screenshot({ path: process.env.MVP_PREVIEW_DIR + '/pvp-mvp-' + width + '.png', animations: 'disabled' });

      const guest = await page.evaluate(() => {
        const packet = window.__mvpEndPacket;
        if (packet.mvp.id !== 'home' || packet.mvp.kills !== 24 || packet.mvp.deaths !== 5) throw Error('Host did not attach match MVP');
        match = window.__mvpMatch();
        myId = 'away';
        pvpMatch = { mode: '10v10', team: 'enemy', isHost: false, hostId: 'home', opponents: [{ socketId: 'home', team: 'ally', name: 'Tactical Iris' }] };
        for (const listener of socket.listeners('matchEvent')) listener({ from: 'home', evt: packet });
        return [document.getElementById('mvp-name').textContent, document.getElementById('mvp-team').textContent, document.getElementById('match-over-title').textContent];
      });
      assert.deepEqual(guest, ['Tactical Iris','OPPOSING TEAM','DEFEAT']);
      await page.evaluate(() => {
        pvpMatch = null; match = window.__mvpMatch();
        matchDeaths.enemy8 = 0; matchScore.enemy8 = 55;
        endMatch('enemy', 'TIME UP');
      });
      assert.equal(await page.locator('#mvp-name').textContent(), 'Sentinel 8');
      assert.equal(await page.locator('#mvp-rank').textContent(), 'BOT');
      assert.equal(await page.locator('#mvp-kd').textContent(), '\u221e');
      assert.equal(await showcase.locator('canvas').count(), 0);
      assert.ok(await page.evaluate(() => {
        match = window.__mvpMatch(); endMatch(null, 'DRAW');
        const draw = document.getElementById('match-mvp').hidden;
        match = { ...window.__mvpMatch(), forfeit: true }; endMatch('ally', 'Opponent left');
        return draw && document.getElementById('match-mvp').hidden;
      }));
      await page.evaluate(() => { selectMode = mode => { window.__mvpExit = mode; }; });
      if (width < 1000) await page.locator('#back-lobby-btn').tap();
      else await page.locator('#back-lobby-btn').click();
      assert.equal(await page.evaluate(() => window.__mvpExit), 'lobby13');
      assert.deepEqual(errors, []);
      console.log(width + 'x' + height + ': MVP reveal, weapon render, host/guest agreement, bot, draw and lobby action');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
