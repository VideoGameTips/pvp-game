const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL||'http://localhost:3001/');
    await page.waitForFunction(()=>myId&&typeof meleeStrikeScan==='function');
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    const result=await page.evaluate(()=>{
      const check=(ok,msg)=>{if(!ok)throw Error(msg);},hits=[],emit=emitHit,socketEmit=socket.emit,walls=wallColliders.splice(0);
      emitHit=(pid,id,weapon)=>hits.push({pid,weapon});socket.emit=()=>socket;
      try{
        for(const mesh of Object.values(remoteMeshes))mesh.visible=false;
        gameStarted=true;inLobby=false;isDead=false;countdownActive=false;match={type:'elim'};players[myId].team='ally';
        selectedMeleeIdx=MELEE_ITEMS.findIndex(m=>m.id==='knife');activeSlot='melee';equipReadyAt=0;
        const item=equippedMeleeItem(),enemy=new THREE.Group();scene.add(enemy);remoteMeshes.knife_target=enemy;players.knife_target={id:'knife_target',team:'enemy',hp:300,dead:false};
        function pose(x,z,yaw){camera.position.set(x,1.65,z);euler.set(0,yaw,0,'YXZ');camera.quaternion.setFromEuler(euler);hits.length=0;lastMelee=-100000;meleeAbilityBuff=null;abilityCDs[item.id]=0;}
        for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
          enemy.rotation.y=angle;
          pose(Math.sin(angle)*1.2,Math.cos(angle)*1.2,angle);tryMelee();
          check(hits.length===1&&hits[0].weapon==='knife','Front stab misclassified at '+angle);
          pose(-Math.sin(angle)*1.2,-Math.cos(angle)*1.2,angle+Math.PI);tryMelee();
          check(hits.length===1&&hits[0].weapon==='knife_instakill','Rear stab misclassified at '+angle);
        }
        enemy.rotation.y=0;pose(0,1.2,0);
        const position=camera.position.clone(),quaternion=camera.quaternion.clone();activateMeleeAbility();
        check(hits.length===1&&hits[0].weapon==='knife','Ability did not use a normal frontal stab');
        check(meleeSwingType==='stab'&&meleeSwingT===0,'No forward stab animation');
        check(camera.position.equals(position)&&camera.quaternion.equals(quaternion),'Ability moved/auto-aimed the player');
        check(!autoLunge&&!scytheDash&&!meleeAbilityBuff,'Ability left movement or stored kill buffs');
        check(typeof startBackstabGlide==='undefined'&&typeof updateBackstabGlide==='undefined','Glide code remains');
        pose(0,5,0);activateMeleeAbility();check(hits.length===0&&camera.position.z===5,'Ability lunged to a distant enemy');
        pose(0,1.2,0);wallColliders.push(new THREE.Box3(new THREE.Vector3(-2,0,.4),new THREE.Vector3(2,3,.6)));tryMelee();check(!hits.length,'Knife stabbed through a wall');
        wallColliders.length=0;pose(0,-1.2,Math.PI);
        meleeStrikeScan({...item,id:'test_knife_skin',baseId:'knife'},'knife',false,Date.now());check(hits[0]?.weapon==='knife_instakill','Skinned knife lost backstab');
        return {frontDamage:getClientWeaponDamage('knife'),backDamage:getClientWeaponDamage('knife_instakill'),fourFacingDirections:true,noGlide:true,noAutoAim:true,noExtendedReach:true,wallBlocked:true,skinCompatible:true};
      }finally{emitHit=emit;socket.emit=socketEmit;wallColliders.length=0;wallColliders.push(...walls);}
    });
    assert.deepEqual(errors,[]);console.log('PASS',result);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
