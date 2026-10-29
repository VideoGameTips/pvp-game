const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const catalog=require('../public/shop-catalog.js');
(async()=>{
  const url=process.env.PVP_TEST_URL || 'http://localhost:3001/';
  const server=await (await fetch(new URL('/shop/catalog',url))).json();
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.waitForFunction(()=>typeof decorateWeaponTier==='function');
    const client=await page.evaluate(()=>({costs:WEAPON_COSTS,items:[...WEAPONS,...MELEE_ITEMS,...SUPPORT_ITEMS].map(w=>({id:w.id,tier:PVP_SHOP_CATALOG.category(w.id,w),archived:!!w.archived,admin:!!w.adminItem,mode:!!(w.modeOnly||w.ddayOnly)}))}));
    assert.deepEqual(client.costs,server.costs,'Client/server prices drifted');
    const counts={normal:0,prime:0,exclusive:0,p2w:0};
    for(const item of client.items){assert(catalog.tiers[item.tier]);counts[item.tier]++;if(item.admin||item.mode)assert.equal(item.tier,'exclusive');}
    for(const [id,cost]of Object.entries(server.costs)){
      assert(Number.isInteger(cost));if(server.free.includes(id)){assert.equal(cost,0);continue;}
      const tier=catalog.tiers[server.categories[id]];assert(cost>=tier.min&&cost<=tier.max,id+' outside price band');
    }
    // Exercise the real purchase handler against disposable in-memory accounts.
    const src=fs.readFileSync(require.resolve('../server.js'),'utf8'),start=src.indexOf("app.post('/shop/buy',"),end=src.indexOf("app.post('/shop/buy-ability',",start);
    let handler,user,status,result,saves=0;
    vm.runInNewContext(src.slice(start,end),{app:{post:(_,fn)=>handler=fn},authedUser:()=>user,canPurchase:id=>Object.hasOwn(server.costs,id),WEAPON_COSTS:server.costs,FREE_WEAPONS:new Set(server.free),saveUsers:()=>saves++});
    const res={status:n=>{status=n;return res;},json:r=>result=r};
    for(const id of ['bat','vector','cyroclasm','javelin_launcher']){
      const cost=server.costs[id];user={credits:cost-1,purchased:[]};status=200;handler({body:{weaponId:id}},res);assert.equal(status,402);assert.equal(user.credits,cost-1);
      user.credits=cost;status=200;handler({body:{weaponId:id}},res);assert.equal(result.cost,cost);assert.equal(user.credits,0);assert(user.purchased.includes(id));
      handler({body:{weaponId:id}},res);assert.equal(result.already,true);assert.equal(user.credits,0);
    }
    for(const size of [{width:1280,height:800},{width:390,height:844}]) {
      await page.setViewportSize(size);
      await page.evaluate(()=>{
        currentUser={username:'TierTest',isAdmin:true,purchased:[],unlocks:[],skinInventory:[]};
        document.getElementById('overlay').style.display='none';document.getElementById('mode-screen').style.display='none';requestPointerLockSafe=()=>{};showLoadoutScreen('swap');
      });
      for(const tier of Object.keys(catalog.tiers)){
        await page.selectOption('#loadout-tier',tier);
        const cards=await page.locator('#loadout-primary-list .loadout-card:not([hidden])').evaluateAll(cards=>cards.map(c=>({tier:c.dataset.weaponTier,color:getComputedStyle(c).borderTopColor,label:c.querySelector('.weapon-tier-label')?.textContent,price:c.querySelector('.weapon-tier-price')?.textContent})));
        assert(cards.length>0,'Missing category '+tier);for(const c of cards){assert.equal(c.tier,tier);assert(c.label&&c.price);}
      }
      await page.selectOption('#loadout-tier','all');
      assert(await page.evaluate(()=>{
        const archived=new Set([...WEAPONS,...MELEE_ITEMS,...SUPPORT_ITEMS].filter(w=>w.archived).map(w=>w.id));
        return [...document.querySelectorAll('.loadout-card')].every(c=>!archived.has(c.dataset.itemId));
      }));
      await page.screenshot({path:'/tmp/weapon-tiers-'+size.width+'.png'});
      assert(await page.evaluate(()=>document.getElementById('loadout-screen').scrollWidth<=innerWidth));
    }
    assert.deepEqual(errors,[]);console.log({counts,purchaseChecks:saves});console.log('PASS: all-item categories, price parity/bands, purchases, filters, archived exclusion, desktop/mobile');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
