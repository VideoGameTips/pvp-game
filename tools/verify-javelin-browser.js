const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');await page.waitForFunction(()=>typeof acquireJavelinEnemy==='function');
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    console.log(await page.evaluate(async()=>{
      currentWeaponIdx=WEAPONS.findIndex(w=>w.id==='javelin_launcher');currentWeapon=WEAPONS[currentWeaponIdx];selectedPrimaryIdx=currentWeaponIdx;activeSlot='primary';
      if(weaponModels[currentWeaponIdx].userData.verticalLaunchCells!==6)throw Error('Still uses RPG model');
      wallColliders.length=0;gameStarted=true;inLobby=false;isDead=false;
      match={type:'tdm',roundActive:true};players[myId]={team:'ally',hp:300};
      for(const id of Object.keys(remoteMeshes)){remoteMeshes[id].visible=false;}
      const check=(v,msg)=>{if(!v)throw Error(msg);};
      const add=(id,x,z,team)=>{const m=new THREE.Group();m.position.set(x,0,z);remoteMeshes[id]=m;players[id]={team,hp:300,dead:false};return m;};
      const enemy=add('enemy',4,-25,'enemy');
      add('friend',0,-10,'ally'); add('behind',0,8,'enemy'); add('far',0,-100,'enemy');
      let hits=[];
      emitHit=(pid,id,w)=>hits.push([pid,w,getClientWeaponDamage(w)]);
      playWeaponSound=()=>{};playSoundEvent=()=>{};spawnAbilityAOEFX=()=>{};spawnExplosion=()=>{};startReload=()=>{};
      _abilityMuzzleOrigin=()=>new THREE.Vector3(0,2,0);
      euler.y=0; equipReadyAt=0; countdownActive=false;
      weaponAmmo[currentWeaponIdx]={ammo:6,reserve:36};ammo=6;lastShot=0;
      activateAbility();
      const j=javelins[0];
      check(javelins.length===1&&ammo===5&&j.dir.y===1&&!j.targetId,'Expected one vertical launch and one ammo spent');
      lastShot=0;tryShoot();
      check(javelins.length===1&&ammo===5,'Allowed a second airborne missile');
      for(let i=0;i<12;i++) {
        updateJavelins(1/60);
        check(!j.targetId&&!j.homing&&j.pos.x===0&&j.pos.z===0,'Guided before altitude');
      }
      check(missileCamStart(),'Could not enter missile cam');
      // The normal camera is not steering; the seeker evaluates the missile heading.
      let locked=false;
      for(let i=0;i<250&&javelins.length;i++){updateJavelins(1/60);locked||=j.targetId==='enemy';}
      check(locked&&hits.some(([pid,w,d])=>pid==='enemy'&&w==='javelin_launcher'&&d===90),'Failed missile-cam auto-lock or hit: '+JSON.stringify({locked,hits}));
      check(hits.length===1,'Unexpected teammate, behind, far, or double hit: '+JSON.stringify(hits));
      missileCamEnd();

      hits=[];enemy.position.set(0,0,-4);
      const direct=spawnJavelin('direct',new THREE.Vector3(0,1,0));direct.dir.set(0,0,-1);
      for(let i=0;i<6&&javelins.length;i++)updateJavelins(1/60);
      check(JSON.stringify(hits)===JSON.stringify([['enemy','javelin_launcher',90]]),'Wrong direct-hit damage: '+JSON.stringify(hits));
      enemy.position.set(4,0,-25);
      const seek=spawnJavelin('seek',new THREE.Vector3(0,10,0));seek.dir.set(0,-.34,-1).normalize();
      const spec=currentWeapon.lockOn;
      check(acquireJavelinEnemy(seek,spec)==='enemy','Did not acquire visible enemy');
      wallColliders.push(new THREE.Box3(new THREE.Vector3(0,0,-15),new THREE.Vector3(4,12,-10)));
      check(acquireJavelinEnemy(seek,spec)===null,'Seeker acquired enemy behind cover');
      wallColliders.length=0;removeJavelin(0);

      // Detonate at an actual floor impact. Targets near the outer edge get
      // splash, but nobody outside the RPG radius or behind a wall does.
      hits=[];enemy.position.set(4.8,0,0);
      add('outside',5.1,0,'enemy');add('covered',0,3,'enemy');add('blast-ally',2,0,'ally');
      wallColliders.push(new THREE.Box3(new THREE.Vector3(-1,0,1),new THREE.Vector3(1,3,1.2)));
      const floor=spawnJavelin('floor',new THREE.Vector3(0,1,0));floor.dir.set(0,-1,0);
      updateJavelins(.05);
      check(!javelins.length&&JSON.stringify(hits)===JSON.stringify([['enemy','javelin_launcher_splash',70]]),'Wrong floor blast hits: '+JSON.stringify(hits));
      check(currentWeapon.splashRadius===WEAPONS.find(w=>w.id==='rpg').splashRadius,'Wrong RPG blast radius');
      wallColliders.length=0;

      wallColliders.push(new THREE.Box3(new THREE.Vector3(-2,3,-2),new THREE.Vector3(2,3.2,2)));
      lastShot=0;tryShoot();check(javelins.length===1&&ammo===4,'Primary fire did not launch one round');
      updateJavelins(.05);check(!javelins.length,'Missile passed through roof');wallColliders.length=0;
      spawnJavelin('stale',new THREE.Vector3(0,2,0),undefined,true);
      check(!missileCamStart(),'Allowed riding an enemy missile');
      matchEpoch++;updateJavelins(.016);check(!javelins.length,'Old-round missiles survived');
      gameStarted=false;return {shot:90,splash:70,radius:5,ammoSpentPerLaunch:1};
    }));
    for(const size of [{width:1280,height:800},{width:390,height:844}]) {
      await page.setViewportSize(size);
      const image=await page.evaluate(()=>{
        document.querySelectorAll('body > :not(canvas)').forEach(e=>e.style.display='none');
        const model=weaponModels[currentWeaponIdx],display=model.clone(true);display.visible=true;display.position.set(0,0,0);display.rotation.set(0,-.6,0);display.scale.setScalar(5);
        const shotScene=new THREE.Scene();shotScene.background=new THREE.Color(0x353e45);shotScene.add(new THREE.HemisphereLight(0xffffff,0x58626c,2));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(2,4,5);shotScene.add(sun);shotScene.add(display);
        const cam=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.01,20);cam.position.set(1.6,1.8,3.2);cam.lookAt(0,.2,-.1);renderer.setSize(innerWidth,innerHeight);renderer.render(shotScene,cam);
        const c=document.createElement('canvas');c.width=96;c.height=60;const ctx=c.getContext('2d');ctx.drawImage(renderer.domElement,0,0,96,60);const pixels=ctx.getImageData(0,0,96,60).data;let different=0;
        for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>30)different++;
        if(different<100)throw Error('Launcher model is blank');
        return renderer.domElement.toDataURL('image/png');
      });
      fs.writeFileSync('/tmp/javelin-model-'+size.width+'.png',Buffer.from(image.split(',')[1],'base64'));
    }
    assert.deepEqual(errors,[]);console.log('PASS: single shot, missile-cam seeking, occlusion, RPG splash, ceiling impacts and round cleanup');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
