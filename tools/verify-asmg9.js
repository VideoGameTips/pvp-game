const assert=require('node:assert/strict');
const {once}=require('node:events');
const {io}=require('socket.io-client');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.PVP_TEST_URL||'http://localhost:3001/';
const event=(socket,name)=>once(socket,name,{signal:AbortSignal.timeout(4000)});

async function serverChecks() {
  const catalog=await fetch(url+'shop/catalog').then(r=>r.json());
  assert.equal(catalog.costs.asmg9,3200);
  assert.equal(catalog.categories.asmg9,'prime');
  const stats=await fetch(url+'weapon-stats.json').then(r=>r.json());
  const w=stats.guns.find(w=>w.id==='asmg9');
  assert.deepEqual([w.slot,w.damage,w.magazine,w.shotsPerSec,w.reloadSec,w.ttkBodySec],['secondary',16,40,24,2,.75]);
  assert.deepEqual(w.movementSpreadDeg,{standing:1,walking:5,sprinting:9,jumping:12});
  const sockets=Array.from({length:3},()=>io(url,{reconnection:false}));
  try {
    await Promise.all(sockets.map(s=>event(s,'init')));
    const [shooter,body,head]=sockets;
    for(const s of sockets) {
      const joined=event(s,'matchRoster');
      s.emit('enterMatch',{matchId:'asmg9-test-'+shooter.id,mode:'ffa'});
      await joined;
      s.emit('move',{x:0,y:2,z:0,rotX:0,rotY:0});
    }
    for(let n=1;n<=19;n++) {
      const hit=event(body,'playerHit');
      shooter.emit('hit',{targetId:body.id,weapon:'asmg9',bulletId:'body-'+n});
      assert.equal((await hit)[0].hp,Math.max(0,300-16*n));
    }
    const hit=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{head.off('playerHit',listener);reject(Error('Headshot feedback timed out'));},4000);
      const listener=data=>{
        if(data.targetId!==head.id)return;
        clearTimeout(timer);head.off('playerHit',listener);resolve([data]);
      };
      head.on('playerHit',listener);
    });
    shooter.emit('hit',{targetId:head.id,weapon:'asmg9',bulletId:'head',headshot:true});
    assert.equal((await hit)[0].dealt,32);
  } finally {sockets.forEach(s=>s.disconnect());}
}

async function browserChecks() {
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    for(const width of [1280,390]) {
      const page=await browser.newPage({viewport:{width,height:800},hasTouch:width<500});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);
      const result=await page.evaluate(()=>{
        const check=(value,message)=>{if(!value)throw Error(message);};
        const i=findWeaponIdx('asmg9'),w=WEAPONS[i],m=weaponModels[i];
        check(i>=0 && m?._mech?.mag?.g && m._sightLine?.space.userData.squareReflex,'Missing gun, magazine, or square sight');
        check(w.slot==='secondary' && botLegalGun(w,'secondary'),'Wrong slot or bot restrictions');
        const motions=[
          [{grounded:true,speed:0},'standing',1],
          [{grounded:true,speed:4},'walking',5],
          [{grounded:true,speed:12},'sprinting',9],
          [{grounded:true,speed:4,sprinting:true},'sprinting',9],
          [{grounded:false,speed:0},'jumping',12],
        ];
        const facing=[new THREE.Vector3(0,0,-1),new THREE.Vector3(0,1,0),new THREE.Vector3(.4,.8,-.2).normalize()];
        const q=camera.quaternion.clone();
        for(const [motion,state,degrees] of motions) {
          const spread=movementWeaponSpread(w,motion);
          check(weaponMovementState(w,motion)===state,'Wrong movement state: '+state);
          check(Math.abs(Math.atan(spread)*180/Math.PI-degrees)<1e-7,'Wrong spread: '+state);
          for(const forward of facing) {
            let max=0;
            for(let n=0;n<600;n++) {
              const direction=applyMovementWeaponSpread(forward.clone(),spread);
              check(Math.abs(direction.length()-1)<1e-7,'Invalid bullet direction');
              const angle=direction.angleTo(forward)*180/Math.PI;
              check(angle<=degrees+1e-6,'Bullet escaped '+degrees+' degree cone');
              max=Math.max(max,angle);
            }
            check(max>degrees*.94,'Spread is not reaching the expected angle');
          }
        }
        check(camera.quaternion.angleTo(q)<1e-8,'Spread altered camera aim');
        check(movementWeaponSpread(WEAPONS[0])===WEAPONS[0].spread,'Changed another weapon');
        check(movementWeaponSpread(w,{grounded:true,speed:0})===w.spread,'Standing accuracy has a recovery delay');
        selectedSecondaryIdx=currentWeaponIdx=i;currentWeapon=w;activeSlot='secondary';
        gameStarted=true;inLobby=true;isDead=false;isADS=false;countdownActive=false;
        equipReadyAt=0;_equip=null;abilityBuff=null;shooting=true;weaponMovementSpeed=0;
        const emit=socket.emit,spawn=spawnLocalBullet,now=Date.now;
        const results=[];
        let clock=now()+10000,originClock=clock,shots=[];
        socket.emit=function(name,data){if(name==='shoot')shots.push({at:clock-originClock,id:data.weapon});return this;};
        const spawned=[];
        spawnLocalBullet=(pos,dir,id,own,speed,color,size,weapon)=>spawned.push({at:clock,weapon});
        Date.now=()=>clock;
        try {
          for(const fps of [30,60,144]) {
            cancelReload();weaponAmmo[i].ammo=40;weaponAmmo[i].reserve=120;lastShot=0;
            originClock=clock+=5000;shots=[];
            for(let frame=0;frame<fps*3 && shots.length<40;frame++) {
              clock=originClock+Math.round(frame*1000/fps);
              tryShoot();
            }
            check(shots.length===40,'Firing lost rounds at '+fps+' Hz');
            check(shots[0].at===0,'First shot was delayed');
            const expected=39*1000/24;
            check(Math.abs(shots[39].at-expected)<=1000/fps+1,'Incorrect sustained rate at '+fps+' Hz: '+shots[39].at);
            check(shots.every(s=>s.id==='asmg9'),'Wrong projectile identity');
            results.push([fps,shots[39].at]);
          }
          check(spawned.length===120,'Bullets were delayed or duplicated');
          weaponAmmo[i].ammo=40;
          clock+=5000;const before=spawned.length;
          tryShoot();tryShoot();
          check(spawned.length===before+1,'Frame stall queued a burst of delayed bullets');
        } finally {socket.emit=emit;spawnLocalBullet=spawn;Date.now=now;}
        weaponAmmo[i].ammo=0;weaponAmmo[i].reserve=120;
        shooting=false;gameStarted=false;
        m._flash.visible=false;
        startReload();
        check(_reloadSt.dur===2000,'Incorrect reload duration');
        return results;
      });
      await page.waitForFunction(()=>!reloading&&weaponAmmo[findWeaponIdx('asmg9')].ammo===40,null,{polling:50});
      assert.equal(await page.evaluate(()=>weaponAmmo[findWeaponIdx('asmg9')].reserve),80);
      await page.evaluate(()=>{
        currentUser={username:'ASMG test',purchased:['asmg9']};
        document.getElementById('overlay').style.display='none';
        shooting=false;
        showLoadoutScreen('swap');
      });
      await page.locator('#loadout-steps [data-step="1"]').click();
      await page.locator('#loadout-search').fill('ASMG');
      const card=page.locator('#loadout-secondary-list [data-item-id="asmg9"]');
      await card.scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>document.querySelector('[data-item-id="asmg9"] img')?.naturalWidth>0,null,{polling:50});
      assert.equal(await page.locator('#loadout-primary-list [data-item-id="asmg9"]').count(),0);
      assert.equal(await card.getAttribute('data-weapon-tier'),'prime');
      assert.equal(await card.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
      await card.screenshot({path:'/tmp/pvp-asmg9-'+width+'.png'});
      const pixels=await card.locator('img').evaluate(img=>{
        const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
        const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
        const data=ctx.getImageData(0,0,c.width,c.height).data;
        let count=0;for(let i=3;i<data.length;i+=4)if(data[i]>127)count++;
        return count;
      });
      assert.ok(pixels>500,'Blank model thumbnail');
      const aiming=await page.evaluate(()=>{
        const i=findWeaponIdx('asmg9'),m=weaponModels[i];
        currentWeaponIdx=i;activeSlot='secondary';isADS=true;m.visible=true;
        setWeaponADSPos(true);
        for(let f=0;f<90;f++)updateRealismFeedback(1/60);
        const pose=weaponSightPose(m),q=new THREE.Quaternion().setFromEuler(pose.rotation);
        return [pose.rear,pose.front].map(v=>v.clone().applyQuaternion(q).add(m.position).toArray());
      });
      assert.ok(aiming.every(p=>Math.abs(p[0])<.001&&Math.abs(p[1])<.001),'Misaligned optic');
      await page.evaluate(()=>{
        selectMode('battle_simulator');
        const map=document.getElementById('bs-map');map.value='duel_grid';map.onchange();
        const sim=PVP_BATTLE_SIM,s=sim.state;
        s.weapon='lever';s.utility='';s.hp=3000;
        const found=[];
        for(let z=-20;z<20;z+=3)for(let x=-20;x<20;x+=3) {
          if(found.length===2)break;
          if(found.length&&(Math.hypot(x-found[0].x,z-found[0].z)>4||!hasLineOfSight(x,z,found[0].x,found[0].z)))continue;
          s.team=found.length?'enemy':'ally';
          if(sim.place(new THREE.Vector3(x,0,z)))found.push({x,z});
        }
        if(found.length!==2)throw Error('No bot test positions');
        sim.start();s.active=false;inLobby=false;BOT_STRATEGY_ON=false;
        const shooter=gameBots[0],victim=gameBots[1];
        shooter.weaponId='asmg9';shooter.botAmmo=40;shooter.botMag=40;
        shooter.lastShot=0;shooter.reactionMs=0;shooter.meleeId=null;shooter.utilityId=null;
        victim.state='target';
        const shots=[];
        spawnLocalBullet=(...args)=>shots.push(args);
        socket.emit=()=>{};
        hasLineOfSight=()=>true;
        getBotTarget=b=>b.id===shooter.id?{x:victim.x,z:victim.z,isPlayer:false,botRef:victim}:null;
        updateBotAI(.016);
        if(!shots.some(args=>args[7]==='asmg9'))throw Error('Bot could not fire the ASMG-9 with movement spread');
      });
      assert.deepEqual(errors,[]);
      console.log(width+'px: all four movement cones, immediate firing, 30/60/144 Hz cadence '+JSON.stringify(result)+', reload, secondary picker and model passed');
      await page.close();
    }
  } finally {await browser.close();}
}

(async()=>{
  await serverChecks();
  await browserChecks();
  console.log('PASS: ASMG-9 authority, 19-body-hit kill, shop, spread, timing and desktop/mobile UI');
})().catch(e=>{console.error(e);process.exitCode=1;});
