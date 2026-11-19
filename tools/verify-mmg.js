const assert = require('node:assert/strict');
const { once } = require('node:events');
const { io } = require('socket.io-client');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const url = new URL(process.env.PVP_TEST_URL || 'http://localhost:3001/');
const event = (client, name) => once(client, name, { signal: AbortSignal.timeout(4000) });

async function verifyServer() {
  const catalog = await fetch(new URL('/shop/catalog', url)).then(response => response.json());
  assert.equal(catalog.costs.mmg, 4500);
  assert.equal(catalog.categories.mmg, 'prime');
  const stats = await fetch(new URL('/weapon-stats.json', url)).then(response => response.json());
  const mmg = stats.guns.find(w => w.id === 'mmg');
  assert.deepEqual([mmg.damage, mmg.magazine, mmg.shotsPerSec, mmg.dps, mmg.timeToEmptySec, mmg.reloadSec], [19,25,20,380,1.2,2.2]);
  const [shooter, target] = Array.from({length:2}, () => io(url.origin, {reconnection:false}));
  try {
    await Promise.all([shooter,target].map(client => event(client,'init')));
    for (const client of [shooter,target]) {
      const joined = event(client, 'matchRoster');
      client.emit('enterMatch', {matchId:'mmg-test-' + shooter.id, mode:'ffa'});
      await joined;
    }
    const hitAt = async (distance, headshot) => {
      shooter.emit('move', {x:0,y:2,z:0,rotY:0,rotX:0});
      // Read the broadcast position before the hit so falloff uses this test's distance.
      const at = new Promise((resolve, reject) => {
        const signal = AbortSignal.timeout(4000);
        const listener = data => {
          if (data[target.id]?.z !== distance || data[shooter.id]?.z !== 0) return;
          shooter.off('posUpdate', listener); resolve();
        };
        shooter.on('posUpdate', listener);
        signal.addEventListener('abort', () => { shooter.off('posUpdate', listener); reject(signal.reason); }, {once:true});
      });
      target.emit('move', {x:0,y:2,z:distance,rotY:0,rotX:0});
      await at;
      const hit = event(target, 'playerHit');
      shooter.emit('hit', { targetId:target.id, weapon:'mmg', headshot });
      return (await hit)[0].dealt;
    };
    assert.equal(await hitAt(6, false), 19);
    assert.equal(await hitAt(6, true), 38);
    assert.equal(await hitAt(36, false), 5);
  } finally { shooter.disconnect(); target.disconnect(); }
}

async function verifyBrowser() {
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({viewport:{width,height:800}, hasTouch:width<500});
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(url.href);
      await page.evaluate(() => {
        currentUser = {username:'MMG test', purchased:['mmg']};
        document.getElementById('overlay').style.display = 'none';
        inLobby = true;
        showLoadoutScreen('swap');
      });
      await page.locator('#loadout-search').fill('MMG');
      const card = page.locator('#loadout-primary-list [data-item-id="mmg"]');
      assert.equal(await card.isVisible(),true);
      assert.equal(await card.getAttribute('data-weapon-tier'),'prime');
      const icon = card.locator('img');
      await icon.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('[data-item-id="mmg"] img')?.naturalWidth > 0);
      await icon.evaluate(img => img.decode());
      assert.ok(await icon.evaluate(img => {
        const c=document.createElement('canvas');
        c.width=img.naturalWidth; c.height=img.naturalHeight;
        const ctx=c.getContext('2d');
        ctx.drawImage(img,0,0);
        const data=ctx.getImageData(0,0,c.width,c.height).data;
        let opaque=0;
        for(let i=3;i<data.length;i+=4) if(data[i]>127) opaque++;
        return opaque>500;
      }), 'Model preview is blank');
      await card.screenshot({path:'/tmp/pvp-mmg-' + width + '.png'});
      const result = await page.evaluate(() => {
        const idx=findWeaponIdx('mmg'), model=weaponModels[idx];
        selectedPrimaryIdx=currentWeaponIdx=idx;
        currentWeapon=WEAPONS[idx]; activeSlot='primary';
        gameStarted=true; isDead=false; equipReadyAt=0; _equip=null;
        lastShot=0;
        const shots=[], origEmit=socket.emit, now=Date.now;
        let clock=now();
        const start=clock;
        socket.emit=function(name,data) {
          if(name==='shoot') shots.push([clock-start,data.weapon]);
          return this;
        };
        Date.now=()=>clock;
        try {
          for (let i=0;i<=1200;i+=10) { clock=start+i; tryShoot(); }
        } finally { Date.now=now; socket.emit=origEmit; }
        startReload();
        return {
          shots, ammo:weaponAmmo[idx].ammo, weight:currentWeapon.weight, reload:model._reloadDur,
          mag:!!model._mech?.mag?.g, sight:!!model._sightLine?.space.userData.squareReflex,
          botLegal:botLegalGun(currentWeapon,'primary'),
        };
      });
      assert.deepEqual(result.shots, Array.from({length:25}, (_,i)=>[i*50,'mmg']));
      assert.deepEqual([result.ammo,result.weight,result.reload,result.mag,result.sight,result.botLegal], [0,.05,2200,true,true,true]);
      await page.waitForFunction(() => !reloading && weaponAmmo[findWeaponIdx('mmg')].ammo === 25);
      assert.equal(await page.evaluate(() => weaponAmmo[findWeaponIdx('mmg')].reserve),75);
      assert.deepEqual(errors,[]);
      await page.close();
    }
  } finally { await browser.close(); }
}

(async () => {
  await verifyServer();
  await verifyBrowser();
  console.log('MMG: shop tier and price, PvP damage and falloff, desktop and mobile previews, 25-shot firing cycle and magazine reload passed');
})().catch(err => { console.error(err); process.exitCode = 1; });
