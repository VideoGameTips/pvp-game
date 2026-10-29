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
      currentWeaponIdx=WEAPONS.findIndex(w=>w.id==='javelin_launcher');currentWeapon=WEAPONS[currentWeaponIdx];activeSlot='primary';
      if(weaponModels[currentWeaponIdx].userData.verticalLaunchCells!==6)throw Error('Still uses RPG model');
      wallColliders.length=0;gameStarted=true;inLobby=false;isDead=false;
      match={type:'tdm',roundActive:true};players[myId]={team:'ally',hp:300};
      for(const id of Object.keys(remoteMeshes)){remoteMeshes[id].visible=false;}
      const add=(id,x,z,team)=>{const m=new THREE.Group();m.position.set(x,0,z);remoteMeshes[id]=m;players[id]={team,hp:300,dead:false};};
      add('javelin-enemy',18,0,'enemy');add('javelin-friend',1,0,'ally');add('javelin-far',90,0,'enemy');
      let hits=[];emitHit=(pid)=>hits.push(pid);playWeaponSound=()=>{};playSoundEvent=()=>{};spawnAbilityAOEFX=()=>{};startReload=()=>{};
      fireJavelin(new THREE.Vector3(0,2,0),0);let j=javelins[0];
      if(j.targetId || j.vx!==0 || j.vz!==0 || j.vy<=0)throw Error('Launch not strictly vertical');
      for(let i=0;i<12;i++){updateJavelins(1/60);if(j.targetId || j.homing || Math.abs(j.x)>1e-9 || Math.abs(j.z)>1e-9)throw Error('Guided before altitude');}
      for(let i=0;i<600 && javelins.length;i++)updateJavelins(1/60);
      if(hits.length!==1 || hits[0]!=='javelin-enemy')throw Error('Did not home into enemy player '+hits);
      // Acquire another enemy if the first dies, never a teammate or distant actor.
      hits=[];fireJavelin(new THREE.Vector3(0,20,0),1);j=javelins[0];j.y=33;updateJavelins(.001);
      if(j.targetId!=='javelin-enemy')throw Error('No altitude acquisition');
      players['javelin-enemy'].dead=true;add('javelin-other',25,10,'enemy');j.searchIn=0;updateJavelins(.001);
      if(j.targetId!=='javelin-other')throw Error('No retarget after death');
      while(javelins.length)removeJavelin(0);players['javelin-other'].dead=true;
      fireJavelin(new THREE.Vector3(0,2,0),2);j=javelins[0];j.y=15;updateJavelins(.1);
      if(j.targetId!==null || j.vy>=55)throw Error('No-target fallback');while(javelins.length)removeJavelin(0);
      // A low roof intercepts the vertical launch before guidance.
      wallColliders.push(new THREE.Box3(new THREE.Vector3(-2,3,-2),new THREE.Vector3(2,3.2,2)));
      fireJavelin(new THREE.Vector3(0,2,0),3);updateJavelins(.05);if(javelins.length)throw Error('Missile passed through roof');wallColliders.length=0;
      javelinLocked=false;javelinLockTargetId=null;weaponAmmo[currentWeaponIdx]={ammo:6,reserve:36};ammo=6;
      fireJavelinVolley(currentWeapon);await new Promise(r=>setTimeout(r,600));
      if(javelins.length!==6 || ammo!==0 || weaponAmmo[currentWeaponIdx].ammo!==0)throw Error('Unprompted volley failed');
      if(javelins.some(j=>j.targetId!==null || j.vx!==0 || j.vz!==0))throw Error('Volley required crosshair/was not vertical');
      matchEpoch++;updateJavelins(.016);if(javelins.length)throw Error('Old-round missiles survived');
      gameStarted=false;return {verticalVolley:6,climbHeight:currentWeapon.lockOn.climbHeight,humanHit:true,retarget:true,roofCollision:true};
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
    assert.deepEqual(errors,[]);console.log('PASS: vertical launch, altitude gate, automatic human target, allies/range, retarget, ceilings, ammo and round cleanup');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
