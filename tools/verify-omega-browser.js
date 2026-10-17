const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL||'http://localhost:3001/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof WEAPONS!=='undefined');
    await page.evaluate(()=>{window.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    console.log(await page.evaluate(()=>{
      const check=(ok,msg)=>{if(!ok)throw Error(msg);};
      const idx=WEAPONS.findIndex(w=>w.id==='omega_pistol'),w=WEAPONS[idx];
      check(w.mag===1&&w.reserve===0&&w.noReload,'Wrong ammunition');
      check(!botLegalGun(w),'Bot may select Omega');
      currentUser={username:'Pass',isAdmin:false,unlocks:['omega_pistol'],adminPassExpiresAt:Date.now()+600000};
      check(!isOwned(w.id),'Pass holder owns Omega');showLoadoutScreen('swap');
      check(!document.querySelector('[data-item-id="omega_pistol"]'),'Pass holder sees Omega');
      currentUser={username:'Admin',isAdmin:true};showLoadoutScreen('swap');
      const card=document.querySelector('[data-item-id="omega_pistol"]');
      check(card&&card.textContent.includes('\u03a9'),'Admin card lacks Omega damage symbol');
      closeOtherDialogs();document.getElementById('loadout-screen').style.display='none';
      gameStarted=true;isDead=false;inLobby=false;countdownActive=false;pointerLocked=true;
      currentWeaponIdx=idx;selectedSecondaryIdx=idx;currentWeapon=w;activeSlot='secondary';
      reloading=false;lastShot=0;weaponAmmo[idx]={ammo:1,reserve:0};adminCheats.infiniteAmmo=true;
      camera.position.set(0,1.65,0);camera.quaternion.identity();wallColliders.length=0;
      for(const id of Object.keys(remoteMeshes))delete remoteMeshes[id];
      const target=new THREE.Group();target.position.set(0,0,-5);remoteMeshes.omegaTarget=target;
      players.omegaTarget={team:'enemy',hp:300};players[myId]={team:'ally',hp:300};
      const savedEmit=socket.emit,savedHit=emitHit,shots=[],hits=[];
      socket.emit=(event,data)=>{if(event==='shoot')shots.push(data);};emitHit=(...args)=>hits.push(args);
      try{
        tryShoot();check(weaponAmmo[idx].ammo===0&&weaponAmmo[idx].reserve===0,'Shot did not consume sole round');
        check(shots.length===1&&hits.length===1,'Shot failed to fire or hit');
        lastShot=0;tryShoot();startReload();
        check(shots.length===1&&!reloading,'Infinite ammo or reload bypasses single round');
      }finally{socket.emit=savedEmit;emitHit=savedHit;}
      return {rounds:1,reserve:0,damageSymbol:w.damageLabel,shots:shots.length,adminOnly:true};
    }));
    await page.evaluate(()=>{
      document.querySelectorAll('body > :not(canvas)').forEach(e=>{e.style.display='none';});
      camera.children.forEach(e=>{if(!e.isLight)e.visible=false;});
      const preview=new THREE.Scene();preview.background=new THREE.Color(0x35434b);preview.environment=scene.environment;
      preview.add(new THREE.HemisphereLight(0xffffff,0x667788,2));preview.add(camera);
      weaponModels[currentWeaponIdx].visible=true;
      camera.aspect=1280/800;camera.fov=75;camera.updateProjectionMatrix();renderer.setSize(1280,800);renderer.render(preview,camera);
    });
    await page.screenshot({path:'/tmp/pvp-omega-pistol.png'});
    assert.deepEqual(errors,[]);console.log('Omega client: admin-only card, symbol, one round, zero reserve, hit, no reload and infinite-ammo exclusion passed');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
