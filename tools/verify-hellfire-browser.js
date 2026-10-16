const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL||'http://localhost:3001/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof fireHellfireCore==='function');
    await page.evaluate(()=>{window.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    console.log(await page.evaluate(()=>{
      const check=(ok,msg)=>{if(!ok)throw Error(msg);};
      check(WEAPONS.length===weaponModels.length,'Model parallel array mismatch');
      const idx=WEAPONS.findIndex(w=>w.id==='hellfire'),w=WEAPONS[idx];
      currentUser={isAdmin:false,unlocks:['hellfire'],purchased:['hellfire'],adminPassExpiresAt:Date.now()+600000};
      check(!isOwned('hellfire')&&!botLegalGun(w),'Prototype leaked to pass holders or bots');
      currentUser={isAdmin:true};check(isOwned('hellfire'),'Admin cannot use prototype');
      check(equippedAbility(w).type==='hellfire_core'&&abilityCooldownFor(w)===0,'Core cooldown/ability mismatch');
      gameStarted=true;isDead=false;inLobby=false;countdownActive=false;activeSlot='primary';
      currentWeaponIdx=idx;selectedPrimaryIdx=idx;currentWeapon=w;reloading=false;hellfireCores=3;
      const uses=supportUses.slice();
      setADS(true);check(hellfireCores===2&&!isADS,'Aim input did not launch core');
      activateAbility();check(hellfireCores===1,'E ability did not launch core');
      renderer.domElement.dispatchEvent(new MouseEvent('mousedown',{button:2,bubbles:true,cancelable:true}));
      check(hellfireCores===0,'Right-click did not launch core');
      check(!fireHellfireCore()&&hellfireCores===0,'Fourth core allowed');
      check(JSON.stringify(uses)===JSON.stringify(supportUses),'Core used utility inventory');
      const core=activeGrenades.find(g=>g.itemRef?.id==='hellfire_core');
      check(core&&core.explodeOnImpact&&core.gravMult===1,'Core lacks grenade collision/gravity');
      core.mesh.position.set(0,0,-5);explodeSupport(core);
      check(burnZones.some(z=>z.hellfire&&z.radius===3.2),'Core did not create fire pool');
      const savedReady=loadoutReady;loadoutReady=()=>false;resetCombatResources();loadoutReady=savedReady;
      check(hellfireCores===3,'Charges did not reset on respawn');
      // Real ray geometry with two targets, a third behind a wall, and an ally.
      for(const id of Object.keys(remoteMeshes))delete remoteMeshes[id];
      for(const [id,x,z,team] of [['a',0,-5,'enemy'],['b',0,-9,'enemy'],['c',0,-15,'enemy'],['ally',0,-7,'ally']]){
        const body=new THREE.Group();body.position.set(x,0,z);remoteMeshes[id]=body;players[id]={team,hp:300};
      }
      players[myId]={team:'ally',hp:300};
      wallColliders.length=0;wallColliders.push(new THREE.Box3(new THREE.Vector3(-2,0,-12),new THREE.Vector3(2,3,-11)));
      const hits=[],savedHit=emitHit;emitHit=(pid,id,weapon,at,head,opts)=>hits.push({pid,weapon,damage:opts?.damageOverride});
      const origin=new THREE.Vector3(0,1.6,0),dir=new THREE.Vector3(0,0,-1);
      fireHellfireBeam(origin,dir,true);
      check(hits.length===2&&hits.every(h=>h.damage===8)&&hits.some(h=>h.pid==='a')&&hits.some(h=>h.pid==='b'),'Beam misses head-height targets, hits allies, or passes wall');
      check(_dotTargets.a?.dps===7&&_dotTargets.a?.weaponId==='hellfire_burn','Burn missing or incorrect');
      hits.length=0;wallColliders.length=0;remoteMeshes.a.position.set(0,0,-5);
      for(const id of ['b','c','ally'])remoteMeshes[id].position.x=20;
      const pool=burnZones.find(z=>z.hellfire);pool.lastTick=0;updateBurnZones(.016);
      check(hits.length===1&&hits[0].weapon==='hellfire_pool'&&hits[0].damage===10,'Pool damage incorrect');
      check(players[myId].hp===300,'Own core damaged shooter');
      emitHit=savedHit;
      return {beamHits:2,damagePerTick:8,cores:3,burnDamage:7,poolTick:10};
    }));
    await page.evaluate(()=>{
      document.querySelectorAll('body > :not(canvas)').forEach(e=>{e.style.display='none';});
      camera.children.forEach(e=>{if(!e.isLight)e.visible=false;});
      const preview=new THREE.Scene();preview.background=new THREE.Color(0x303a40);preview.environment=scene.environment;
      preview.add(new THREE.HemisphereLight(0xffffff,0x667788,2));preview.add(camera);
      const m=weaponModels[currentWeaponIdx];m.visible=true;
      camera.position.set(0,1.65,0);camera.quaternion.identity();camera.aspect=1280/800;camera.fov=75;camera.updateProjectionMatrix();
      const origin=new THREE.Vector3();m._flash.getWorldPosition(origin);
      const trace=hellfireTrace(origin,new THREE.Vector3(0,0,-1));
      // Preview the same three beam layers in this isolated render scene.
      const before=new Set(scene.children);fireHellfireBeam(origin,new THREE.Vector3(0,0,-1));
      for(const e of scene.children.filter(e=>!before.has(e)))preview.add(e);
      renderer.setSize(1280,800);renderer.render(preview,camera);window._hellfirePreview={preview};
      updateAbilityHUD();document.getElementById('ability-hud').style.display='block';
    });
    await page.screenshot({path:'/tmp/pvp-hellfire.png'});
    await page.setViewportSize({width:390,height:740});
    await page.evaluate(()=>{
      camera.aspect=390/740;camera.updateProjectionMatrix();renderer.setSize(390,740);
      renderer.render(window._hellfirePreview.preview,camera);
    });
    await page.screenshot({path:'/tmp/pvp-hellfire-mobile.png'});
    await page.evaluate(()=>{
      currentUser={username:'Prototype test',isAdmin:true};showLoadoutScreen('swap');
      if(!document.querySelector('.loadout-card[data-item-id="hellfire"]'))throw Error('Admin loadout lacks Hellfire');
      currentUser={username:'Pass test',isAdmin:false,unlocks:['hellfire'],adminPassExpiresAt:Date.now()+600000};
      showLoadoutScreen('swap');
      if(document.querySelector('.loadout-card[data-item-id="hellfire"]'))throw Error('Prototype visible in pass-holder loadout');
    });
    assert.deepEqual(errors,[]);console.log('Hellfire client controls, gating, wall stops, multi-hit, friendly fire, burning, pools and charge reset passed');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
