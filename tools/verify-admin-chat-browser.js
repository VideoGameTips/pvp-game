const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof openLobbyAdmin === 'function');
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      document.querySelectorAll('body > :not(canvas)').forEach(element => { element.style.display = 'none'; });
      openLobbyAdmin();
    });
    const panel = page.locator('#lobby-service-panel');
    const reply = label => panel.locator('.admin-chat-replies').getByRole('button', { name: label, exact: true }).click();
    await reply('Anything interesting going on?');
    await reply('Why only at night?');
    await reply('Orange? What are they testing?');
    await reply('Heat shielding?');
    await reply('What happened during the test?');
    await reply('Tell me the name, at least.');
    assert.match(await panel.locator('.admin-chat-log').innerText(), /promise not to say/);
    await reply('Give me a hint instead.');
    assert.match(await panel.locator('.admin-chat-log').innerText(), /will not stay cold for long/);
    assert.doesNotMatch(await panel.innerText(), /hellfire|Visit the supply shop\.|LOBBY JOURNAL/i);
    assert.equal(await panel.locator('.admin-chat-player').count(), 7);
    await panel.screenshot({ path: '/tmp/pvp-admin-chat-desktop.png' });
    await page.setViewportSize({ width: 390, height: 740 });
    await reply('I will be watching that weapon rack.');
    await panel.screenshot({ path: '/tmp/pvp-admin-chat-mobile.png' });
    assert.equal(await panel.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight
        && element.scrollWidth <= element.clientWidth;
    }), true);
    await reply('Right. The ventilation.');
    // Long conversations stay bounded; every return offers a fresh set of replies.
    for (let i = 0; i < 10; i++) {
      await reply('Who built this place?');
      await reply('Something else.');
    }
    assert.equal(await panel.locator('.admin-chat-log > div').count(), 24);
    await page.keyboard.press('Escape');
    assert.equal(await panel.isVisible(), false);
    await page.evaluate(() => openLobbyAdmin());
    assert.equal(await panel.locator('.admin-chat-log > div').count(), 1);
    await page.evaluate(() => openLobbyArcade());
    assert.equal(await panel.locator('.admin-chat-log').count(), 0);
    assert.equal(await panel.evaluate(element => element.classList.contains('admin-conversation')), false);
    assert.deepEqual(errors, []);
    console.log('Admin chat: chosen replies, multi-step hints, withheld name, mobile layout, bounded transcript, close/reopen and arcade passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
