const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.PVP_TEST_URL || 'http://localhost:3001/';

(async () => {
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    for (const width of [1280,390]) {
      const page = await browser.newPage({viewport:{width,height:850},hasTouch:width<500});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);
      const result=await page.evaluate(() => {
        const check=(value,message)=>{if(!value)throw Error(message);};
        requestAnimationFrame=()=>0;
        FLOATDMG={...FLOATDMG_DEFAULT};
        gameStarted=true;inLobby=false;match={type:'ffa',cfg:{},over:false};
        const id='symbol-test',mesh=new THREE.Group();
        mesh.position.set(0,0,-6);remoteMeshes[id]=mesh;
        players[id]={hp:1000,team:'enemy'};
        const first=floatDamage(id,mesh,36,36,false,false);
        floatDamage(id,mesh,36,36,false,false);
        floatDamage(id,mesh,36,36,false,false);
        check(first.total===108 && first.count===3 && first.el.textContent==='36\u00d73','Bad combined damage arithmetic');
        check(first.el.dataset.damageKind==='multi','Missing multi-hit symbol');
        floatDamage('other-target',mesh,120,120,false,false);
        check(first.total===108,'Hits combined across targets');
        const reflection=floatDamage(id,mesh,80,80,false,false,{reflected:true});
        check(reflection!==first && reflection.el.dataset.damageKind==='reflection','Reflection mixed with ordinary damage');
        const lethal=floatDamage('kill-target',mesh,999,90,true,true,{longRange:true});
        check(lethal.el.dataset.damageKind==='headKill' && lethal.el.textContent==='999!','Wrong lethal headshot symbol or raw damage');
        FLOATDMG.mode='effective';
        const clipped=floatDamage('effective',mesh,999,40,true,true);
        check(clipped.el.textContent==='40!','Effective damage ignored');
        FLOATDMG.mode='raw';
        check(floatDamage('zero',mesh,0,0,false,false)===null,'Zero damage created a fake hit');
        const blocked=floatDamage('blocked',mesh,0,0,false,false,{blocked:true,shield:true});
        check(blocked.el.textContent==='BLOCKED' && blocked.el.dataset.damageKind==='shield','Invulnerability invented damage');
        rememberDamageSymbolMeta(id,'confirmed',{ricochet:true,longRange:true});
        const hit={targetId:id,shooterId:myId,bulletId:'confirmed',weapon:'pistol',hp:920,dealt:80};
        check(hitConfirmFromServer(hit,1000),'Server hit was not accepted');
        check(!hitConfirmFromServer(hit,1000),'Server echo duplicated a hit');
        check(_floatLast[id].el.dataset.damageKind==='ricochet','Confirmation lost original shot context');
        const reflected={...hit,bulletId:'returned',reflected:true,hp:840};
        check(hitConfirmFromServer(reflected,920),'A confirmed return must be visible to the defender');
        check(_floatLast[id].el.dataset.damageKind==='reflection','Reflected return missing symbol');
        check(!hitConfirmFromServer({...hit,shooterId:'someone-else',bulletId:'not-mine'},1000),'Other players damage was shown as mine');
        check(damageSymbolMeta('sg8',id,mesh,{},24,1).kind===null,'Ordinary shotgun pellets must not become fire damage');
        check(damageSymbolMeta('arc_rifle',id,mesh,{},28,1).kind==='electric','Electric weapon classification');
        check(damageSymbolMeta('molotov_fire',id,mesh,{periodic:true},12,1).kind==='burning','Burn tick classification');
        const capped=damageSymbolMeta('srx',id,mesh,{headshot:true},999,1);
        check(!capped.critical,'A headshot must not be mistaken for a separate damage buff');
        const botId='symbol-live-bot',bot={id:botId,x:0,y:0,z:-6,hp:1000,maxHp:1000,dead:false,team:'enemy'};
        gameBots.push(bot);
        players[botId]={id:botId,isBot:true,hp:1000,team:'enemy'};
        remoteMeshes[botId]=mesh;
        const emit=socket.emit;
        socket.emit=function(){return this;};
        try {
          emitHit(botId,'symbol-actual-hit','pistol',mesh.position.clone(),false,{ricochet:true,shotDistance:40});
          check(bot.hp<1000 && _floatLast[botId].el.dataset.damageKind==='ricochet','Live bot hit lost ricochet metadata');
          emitHit(botId,'symbol-actual-return','pistol',mesh.position.clone(),false,{reflectedDamage:true,damageOverride:30,periodic:true});
          check(_floatLast[botId].el.dataset.damageKind==='reflection','Live bot hit lost reflected damage metadata');
        } finally {
          socket.emit=emit;gameBots.splice(gameBots.indexOf(bot),1);
          delete players[botId];delete remoteMeshes[botId];
        }
        for(let i=0;i<40;i++)floatDamage('cap'+i,mesh,120,120,false,false);
        check(_floatNums.length===FLOATDMG_MAX,'Unbounded floating DOM nodes');
        clearCombatFeedback();
        check(!_floatNums.length && !_fdMeta.size && !Object.keys(_floatLast).length,'Match cleanup leaked symbols');
        delete players[id];delete remoteMeshes[id];
        return {cap:FLOATDMG_MAX,catalog:Object.keys(PVP_DAMAGE_SYMBOLS.catalog).length};
      });
      assert.deepEqual(result,{cap:28,catalog:66});
      await page.evaluate(() => {
        for (const child of document.body.children) child.style.display='none';
        const host=document.createElement('main');
        host.id='symbol-verification';
        host.style.cssText='position:absolute;inset:0 auto auto 0;width:100%;padding:16px;background:#10151c;color:#f2f5fa;font:14px system-ui,sans-serif;box-sizing:border-box;';
        for(const [label,items] of PVP_DAMAGE_SYMBOLS.groups){
          const section=document.createElement('section');
          const heading=document.createElement('h2');heading.textContent=label;
          heading.style.cssText='margin:12px 0 8px;font:600 16px system-ui,sans-serif';
          section.appendChild(heading);
          const grid=document.createElement('div');
          grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;';
          for(const [id,label] of items){
            const item=document.createElement('div');
            item.style.cssText='padding:8px 0;border-bottom:1px solid #35424f;text-align:center;min-width:0;';
            const icon=document.createElement('div');
            icon.innerHTML=PVP_DAMAGE_SYMBOLS.svg(id);
            icon.style.cssText='width:32px;height:32px;margin:0 auto 8px;color:'+PVP_DAMAGE_SYMBOLS.catalog[id].color;
            item.appendChild(icon);
            const text=document.createElement('span');text.textContent=label;item.appendChild(text);
            grid.appendChild(item);
          }
          section.appendChild(grid);host.appendChild(section);
        }
        document.body.appendChild(host);
      });
      const grid=page.locator('#symbol-verification');
      assert.equal(await grid.locator('svg').count(),66);
      const bad=await grid.locator('svg').evaluateAll(nodes=>nodes.some(n=>n.getBoundingClientRect().width<20||!n.querySelector('path,text,circle')));
      assert.equal(bad,false);
      assert.equal(await grid.evaluate(n=>n.scrollWidth>innerWidth),false);
      await grid.screenshot({path:'/tmp/pvp-damage-symbols-'+width+'.png'});
      await page.evaluate(() => {
        document.getElementById('symbol-verification').remove();
        openFloatDmgPanel();
      });
      await page.locator('#fd-symbol-preview').selectOption('reflection');
      assert.equal(await page.locator('#fd-stage [data-damage-kind="reflection"]').count(),1);
      assert.equal(await page.locator('#fd-symbol-preview option').count(),66);
      await page.evaluate(()=>showKillBanner(2,false));
      assert.equal(await page.locator('.pol-mk-mark svg').count(),1);
      assert.deepEqual(errors,[]);
      await page.close();
      console.log(width+'px: confirmation, deduplication, raw/effective values, cap, all 66 icons and settings preview passed');
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
