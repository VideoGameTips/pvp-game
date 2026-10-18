const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL||'http://localhost:3001/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof watchEliminationRound==='function');
    await page.evaluate(()=>{window.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    console.log(await page.evaluate(()=>{
      const check=(ok,msg)=>{if(!ok)throw Error(msg);};
      document.querySelectorAll('body > :not(canvas)').forEach(e=>{e.style.display='none';});
      currentUser={username:'Spectator test',isAdmin:true};gameStarted=true;inLobby=false;
      match={type:'elim',active:true,roundActive:true,round:1,deaths:0,over:false,cfg:{playerHp:300}};
      selectedPrimaryIdx=WEAPONS.findIndex(w=>w.id==='ak20');selectedSecondaryIdx=WEAPONS.findIndex(w=>w.id==='pistol');
      selectedMeleeIdx=MELEE_ITEMS.findIndex(w=>w.id==='fists');selectedSupportIdx=SUPPORT_ITEMS.findIndex(w=>w.id==='frag');
      currentWeaponIdx=selectedPrimaryIdx;currentWeapon=WEAPONS[currentWeaponIdx];activeSlot='primary';
      players[myId]={hp:10,dead:false,team:'ally'};gameBots.length=0;
      for(const id of Object.keys(remoteMeshes))delete remoteMeshes[id];
      gameBots.push({id:'spectate-bot',team:'ally',dead:false,x:2,z:-3,y:2,rotY:0});
      const mate=makePlayerMesh('Human teammate');mate.position.set(-2,0,-4);scene.add(mate);
      remoteMeshes['spectate-human']=mate;players['spectate-human']={name:'Human teammate',team:'ally',dead:false};
      const savedDeath=onEntityDied;onEntityDied=()=>{};
      spawnShieldUntil=0;isDead=false;countdownActive=false;meleeAbilityBuff=null;
      applyBotDamageToPlayer('ak20',null,30);
      check(isDead&&spectatorState&&!KILLCAM.active,'Bot death did not go straight to spectator');
      check(getComputedStyle(document.getElementById('waiting-screen')).display==='none','Waiting overlay remains');
      check(document.getElementById('death-screen').style.display==='none','Death panel covers spectator');
      check(getLiveAllies().some(p=>p.id==='spectate-human'),'Human teammates absent from spectator');
      const before=camera.position.clone();startKillcam('spectate-human','ak20');
      check(!KILLCAM.active&&camera.position.equals(before),'Archived replay still starts');
      updateSpectatorCamera(.016);check(camera.position.y>4,'Spectator ignores elevated teammate');
      window._spectatorSavedDeath=savedDeath;
      return {immediateSpectator:true,humanAndBotTargets:getLiveAllies().length,killcamArchived:KILLCAM.archived};
    }));
    await page.locator('#change-loadout-btn').click();
    assert.equal(await page.locator('#loadout-screen').isVisible(),true);
    await page.evaluate(()=>{
      const pool=weaponAmmo[selectedPrimaryIdx];pool.ammo=3;
      confirmLoadout();
      if(!isDead||!spectatorState||pool.ammo!==3)throw Error('Waiting confirmation resets combat or respawns early');
      if(getComputedStyle(document.getElementById('waiting-screen')).display!=='none'||isLoadoutOpen())throw Error('Waiting confirmation leaves overlay');
    });
    await page.locator('#spectator-next').click();
    assert.match(await page.locator('#spectator-info').innerText(),/Human teammate/);
    await page.locator('#change-loadout-btn').click();
    await page.locator('#loadout-exit-btn').click();
    assert.equal(await page.locator('#loadout-screen').isVisible(),false);
    // A round starting while the editor is open must release every old death UI.
    await page.locator('#change-loadout-btn').click();
    await page.evaluate(()=>{
      resetPlayerForRound(2,3);
      if(isDead||spectatorState||isLoadoutOpen())throw Error('New round retains death/loadout lock');
      if(document.getElementById('spectator-hud').style.display!=='none')throw Error('Spectator HUD remains on respawn');
      if(!weaponModels[currentWeaponIdx].visible)throw Error('Weapon stays hidden after respawn');
      // A stale waiting-mode confirmation after the round started is a live swap, never a waiting screen.
      showLoadoutScreen('waiting');document.getElementById('death-screen').style.display='flex';confirmLoadout();
      if(isDead||isLoadoutOpen()||getComputedStyle(document.getElementById('waiting-screen')).display!=='none'||document.getElementById('death-screen').style.display!=='none')throw Error('Stale waiting mode strands live player');
      isDead=false;players[myId].dead=false;_localDeathAt=-10000;
      const networkDeath=socket.listeners('playerDied').at(-1);
      networkDeath({targetId:myId,killerId:'spectate-enemy',weapon:'ak20'});
      if(!spectatorState||KILLCAM.active)throw Error('Network death did not enter live spectator');
      onEntityDied=window._spectatorSavedDeath;
      const preview=new THREE.Scene();preview.background=new THREE.Color(0x53646b);preview.environment=scene.environment;
      preview.add(new THREE.HemisphereLight(0xffffff,0x667788,2));
      const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshLambertMaterial({color:0x637777}));
      floor.rotation.x=-Math.PI/2;preview.add(floor);
      const platform=new THREE.Mesh(new THREE.BoxGeometry(4,.3,4),new THREE.MeshLambertMaterial({color:0x8f989b}));
      platform.position.set(2,1.85,-3);preview.add(platform);
      const body=makePlayerMesh('Watching teammate',true,'ally','default');body.position.set(2,2,-3);
      armRemoteMesh(body,'ak20');animateCharacterMesh(body,.016,0);preview.add(body);
      updateSpectatorCamera(.016);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      renderer.setSize(innerWidth,innerHeight);renderer.render(preview,camera);window._spectatorPreview=preview;
    });
    await page.screenshot({path:'/tmp/pvp-spectator-clear.png'});
    await page.setViewportSize({width:390,height:740});
    await page.evaluate(()=>{
      camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
      camera.updateMatrixWorld(true);
      renderer.render(window._spectatorPreview,camera);
    });
    assert.equal(await page.locator('#spectator-hud').evaluate(e=>e.getBoundingClientRect().width<=innerWidth),true);
    await page.screenshot({path:'/tmp/pvp-spectator-mobile.png'});
    assert.deepEqual(errors,[]);
    console.log('Death spectator: clear view, bot/human targets, loadout confirm/back, round reset, stale modal, mobile and archived replay passed');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
