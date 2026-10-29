const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(()=>window.PVP_LOBBY_CASE && typeof openSkinCase==='function');
    await page.evaluate(()=>{requestAnimationFrame=()=>0;requestPointerLockSafe=()=>{};});await page.waitForTimeout(100);
    console.log(await page.evaluate(async()=>{
      currentUser={username:'case-browser-test',credits:5000,skinCasePacks:{gen1_basic:2,gen2_entrances:1},skinInventory:[],purchased:[]};
      selectMode('lobby13');
      document.querySelectorAll('body > :not(canvas)').forEach(el=>el.style.display='none');
      let requests=0,resolve;const skin=GEN1_SKIN_DEFS.find(s=>s.weapon);
      authRequest=()=>{requests++;return new Promise(r=>resolve=r);};
      const pending=openSkinCase('gen1_basic');
      if(await openSkinCase('gen1_basic')!==false || requests!==1)throw Error('Double opening charged twice');
      resolve({skinId:skin.id,skinCasePacks:{gen1_basic:1},skinInventory:[skin.id]});await pending;
      if(!PVP_LOBBY_CASE.active || !scene.getObjectByName('lobby-skin-case') || !currentUser.skinInventory.includes(skin.id))throw Error('Physical opening missing');
      const position=camera.position.clone();keys.KeyW=true;updateMovement(1);keys.KeyW=false;if(position.distanceTo(camera.position)>.001)throw Error('Player moved during opening');
      if(await openSkinCase('gen1_basic')!==false || requests!==1)throw Error('Opening was reentrant');
      for(let i=0;i<36;i++)PVP_LOBBY_CASE.tick(.1);
      if(!document.getElementById('skin-case-opening').textContent.includes(skin.name))throw Error('Wrong reward');
      [...document.querySelectorAll('#skin-case-opening button')].find(b=>b.textContent==='Equip').click();
      const equipped=skin.build?equippedModelSkins[skin.weapon]:equippedGunStatSkins[skin.weapon];
      if(equipped!==skin.id || PVP_LOBBY_CASE.active || scene.getObjectByName('lobby-skin-case'))throw Error('Gen1 equip or cleanup failed');
      if(!weaponModels[currentWeaponIdx].visible)throw Error('Equipped gun remained hidden');
      // A duplicate is displayed honestly; closing cannot consume another case.
      const special=GEN2_SKIN_DEFS.find(s=>s.build && s.weapon);
      showSkinCaseOpening(special.id,true,'gen2_entrances');for(let i=0;i<36;i++)PVP_LOBBY_CASE.tick(.1);
      if(!document.getElementById('skin-case-opening').textContent.includes('DUPLICATE'))throw Error('Duplicate not displayed');
      PVP_LOBBY_CASE.close(false);
      if(requests!==1)throw Error('Reveal requested another reward');
      // Changing modes cleans up without teleporting back to the lobby camera.
      showSkinCaseOpening(special.id,false,'gen2_entrances');inLobby=false;camera.position.set(77,3,77);PVP_LOBBY_CASE.tick(.1);
      if(PVP_LOBBY_CASE.active || camera.position.x!==77)throw Error('Mode transition cleanup');inLobby=true;
      return {requests,gen1:skin.name,gen2:special.name};
    }));
    for(const [label,width,height]of [['desktop',1280,800],['mobile',390,844]]) {
      await page.setViewportSize({width,height});
      const shot=await page.evaluate(()=>{
        closeOtherDialogs();const skin=GEN2_SKIN_DEFS.find(s=>s.build && s.weapon);camera.position.set(0,1.65,0);camera.rotation.set(0,0,0);euler.set(0,0,0);
        showSkinCaseOpening(skin.id,false,'gen2_entrances');for(let i=0;i<36;i++)PVP_LOBBY_CASE.tick(.1);
        camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.render(scene,camera);
        return renderer.domElement.toDataURL('image/png');
      });
      fs.writeFileSync('/tmp/lobby-case-'+label+'.png',Buffer.from(shot.split(',')[1],'base64'));
      await page.screenshot({path:'/tmp/lobby-case-'+label+'-ui.png'});
      const buttons=page.locator('#skin-case-opening button');assert.equal(await buttons.count(),2);
      const rect=await buttons.first().boundingBox();assert(rect.width>=100 && rect.height>=44);
      await page.getByRole('button',{name:'Collect',exact:true}).click();
      assert.equal(await page.locator('#skin-case-opening').count(),0);
    }
    assert.deepEqual(errors,[]);console.log('PASS: reward integrity, duplicate requests, equip, duplicates, transitions, desktop/mobile');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
