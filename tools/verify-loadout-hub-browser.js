const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const errors = [];
    for (const size of [{width:1280,height:800},{width:390,height:844},{width:1024,height:768},{width:844,height:390}]) {
      const context = await browser.newContext({viewport:size,hasTouch:true,isMobile:size.width<1000});
      const page = await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/',{waitUntil:'load'});
      await page.waitForFunction(()=>typeof showLoadoutScreen==='function' && window.PVP_LOADOUT_HUB && window.PVP_PLAYER_RECORD);
      await page.evaluate(()=>{
        currentUser={username:'LoadoutUITest',isAdmin:false,purchased:['vector','p90','grenade_launcher','srx'],unlocks:[],skinInventory:[],bestStreak:7};
        currentUser.purchased.push(...[...WEAPONS,...MELEE_ITEMS,...SUPPORT_ITEMS].filter(w=>w.archived).map(w=>w.id));
        selectedPrimaryIdx=WEAPONS.findIndex(w=>w.archived && w.slot!=='secondary' && !w.skinOnly);
        document.getElementById('overlay').style.display='none';document.getElementById('mode-screen').style.display='none';
        requestPointerLockSafe=()=>{};showLoadoutScreen('swap');
      });
      await page.waitForFunction(()=>[...document.querySelectorAll('#loadout-primary-list img')].some(img=>img.naturalWidth>0));
      assert.equal(await page.locator('.loadout-col:not([hidden])').count(),1);
      assert(await page.evaluate(()=>!WEAPONS[selectedPrimaryIdx].archived && isOwned(WEAPONS[selectedPrimaryIdx].id)),'Old archived kit was retained');
      assert(await page.evaluate(()=>{
        const archived=new Set([...WEAPONS,...MELEE_ITEMS,...SUPPORT_ITEMS].filter(w=>w.archived).map(w=>w.id));
        return [...document.querySelectorAll('.loadout-card')].every(card=>!archived.has(card.dataset.itemId));
      }),'Archived items appear in loadout');
      assert.equal(await page.locator('#loadout-screen').getAttribute('data-loadout-step'),'primary');
      const before = await page.evaluate(()=>selectedPrimaryIdx);
      const scrolled = await page.evaluate(()=>{
        const list=document.getElementById('loadout-primary-list');list.scrollTop=list.scrollHeight;
        return {scroll:list.scrollTop,overflow:getComputedStyle(list).overflowY,action:getComputedStyle(list).touchAction};
      });
      assert(scrolled.scroll>0,'Weapon grid does not scroll'); assert.equal(scrolled.overflow,'auto');assert.equal(scrolled.action,'pan-y');
      assert.equal(await page.evaluate(()=>selectedPrimaryIdx),before);
      if(size.width===390){
        await page.evaluate(()=>{document.getElementById('loadout-primary-list').scrollTop=0;});
        const rect=await page.locator('#loadout-primary-list').boundingBox();
        const cdp=await context.newCDPSession(page),x=rect.x+rect.width*.35,y=rect.y+Math.min(rect.height-20,300);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
        for(let i=1;i<=8;i++){
          await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*22}]});
          await page.waitForTimeout(20);
        }
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await page.waitForTimeout(250);
        assert(await page.evaluate(()=>document.getElementById('loadout-primary-list').scrollTop>20),'Real touch swipe cannot scroll');
        assert.equal(await page.evaluate(()=>selectedPrimaryIdx),before,'Swipe accidentally equipped a weapon');
        await cdp.detach();
      }
      await page.locator('#loadout-search').fill('Vector');
      await page.locator('#loadout-primary-list [data-item-id="vector"]').tap();
      await page.waitForFunction(()=>document.getElementById('loadout-screen').dataset.loadoutStep==='secondary');
      assert.equal(await page.evaluate(()=>WEAPONS[selectedPrimaryIdx].id),'vector');
      await page.locator('#loadout-secondary-list [data-item-id="pistol"]').tap();
      await page.waitForFunction(()=>document.getElementById('loadout-screen').dataset.loadoutStep==='melee');
      await page.locator('#loadout-melee-list .loadout-card:not(.catalog-card-locked)').first().tap();
      await page.waitForFunction(()=>document.getElementById('loadout-screen').dataset.loadoutStep==='support');
      await page.locator('#loadout-support-list .loadout-card:not(.catalog-card-locked)').first().tap();
      assert.equal(await page.locator('#loadout-ready-btn').isEnabled(),true);
      await page.locator('#loadout-steps [data-step="0"]').tap();
      await page.screenshot({path:'/tmp/loadout-hub-'+size.width+'x'+size.height+'.png'});
      console.log(size,await page.evaluate(()=>{
        const screen=document.getElementById('loadout-screen'),r=screen.getBoundingClientRect(),footer=screen.querySelector('.lh-footer').getBoundingClientRect();
        if(screen.scrollWidth>innerWidth || footer.bottom>innerHeight+1)throw Error('Loadout overflow');
        const cols=getComputedStyle(document.getElementById('loadout-primary-list')).gridTemplateColumns;
        return {columns:cols,footerBottom:footer.bottom,viewport:r.width};
      }));
      // Mount against an isolated active match; stop the render loop before changing its fixture.
      await page.evaluate(()=>{
        requestAnimationFrame=()=>0;gameStarted=false;
      });
      await page.waitForTimeout(150);
      console.log(await page.evaluate(()=>{
        gameStarted=true;inLobby=false;match={over:false,roundActive:true,type:'ffa',cfg:{}};
        showLoadoutScreen('swap');
        const locked=[...document.querySelectorAll('.loadout-card')].filter(c=>!isOwned(c.dataset.itemId));
        if(locked.length)throw Error('Locked weapons still appear during match');
        const count=document.querySelectorAll('.loadout-card').length;
        gameStarted=false;inLobby=true;match=null;document.getElementById('loadout-screen').style.display='none';
        showLobbyModesButton(true);return {matchOwnedOnly:count,lobbyStatsButton:!document.getElementById('lobby-record-btn').hidden};
      }));
      await page.locator('#lobby-record-btn').tap();
      assert((await page.locator('.pr-overview').innerText()).includes('This device'));
      await page.evaluate(()=>{
        const first={type:'ffa'};
        PVP_PLAYER_RECORD.result(first,true,false);PVP_PLAYER_RECORD.result(first,true,false);
        PVP_PLAYER_RECORD.result({type:'ffa'},false,false);
        PVP_PLAYER_RECORD.open();
      });
      assert((await page.locator('.pr-overview').innerText()).includes('50%'),'WR does not follow completed results');
      await page.screenshot({path:'/tmp/player-record-'+size.width+'x'+size.height+'.png'});
      await page.locator('[data-view="weapons"]').tap();
      assert(await page.evaluate(()=>{
        const archived=new Set([...WEAPONS,...MELEE_ITEMS,...SUPPORT_ITEMS].filter(w=>w.archived).map(w=>w.id));
        return [...document.querySelectorAll('[data-weapon]')].every(button=>!archived.has(button.dataset.weapon));
      }),'Owned archived items appear in stats');
      assert.equal(await page.locator('[data-weapon="omega_pistol"]').count(),0);
      await page.locator('.pr-search').fill('Vector');
      await page.locator('[data-weapon="vector"]').tap();
      await page.waitForFunction(()=>document.querySelector('.pr-weapon-details h2')?.textContent==='Vector SMG');
      const text=await page.locator('.pr-weapon-details').innerText();
      assert(text.includes('14 studs') && text.includes('44 studs') && text.includes('32%'),'Wrong Vector falloff');
      const actualSpeed=await page.evaluate(()=>{
        const w=WEAPONS.find(w=>w.id==='vector');return projectileBaseSpeed(w.id,w,w.bulletSpeed)*BULLET_SPEED_MULTIPLIER*(w.bulletSpeedMult||1);
      });
      assert(text.includes(String(Number(actualSpeed.toFixed(4)))),'Wrong effective projectile speed');
      assert(text.includes('ADS vertical kick')&&text.includes('Effective cooldown'));
      await page.waitForFunction(()=>document.querySelector('.pr-weapon-heading img')?.naturalWidth>0);
      await page.screenshot({path:'/tmp/weapon-stats-'+size.width+'x'+size.height+'.png'});
      console.log(await page.evaluate(()=>{
        const panel=document.getElementById('player-record-panel');
        if(panel.scrollWidth>innerWidth)throw Error('Stats horizontal overflow');
        return {weaponStats:true,width:panel.clientWidth};
      }));
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#player-record-panel').isVisible(),false);
      await context.close();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: pictured slot grids, touch selection, scroll, responsive layouts, owned-only match menu, lobby stats, actual Vector data and modal close');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
