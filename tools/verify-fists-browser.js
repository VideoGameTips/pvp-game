const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const source=fs.readFileSync(require.resolve('../server.js'),'utf8');
  const block=source.match(/const WEAPON_DAMAGE = \{[\s\S]*?\n\};/);
  assert(block,'Server damage table missing');assert.equal(vm.runInNewContext(block[0]+';WEAPON_DAMAGE.fists'),50);
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');await page.waitForFunction(()=>typeof updateFistStrike==='function');
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    console.log(await page.evaluate(()=>{
      gameStarted=true;isDead=false;inLobby=false;activeSlot='melee';countdownActive=false;match={type:'tdm',roundActive:true};
      meleeCombo=null;meleeSlam=null;meleeDash=null;meleeAbilityBuff=null;
      selectedMeleeIdx=MELEE_ITEMS.findIndex(m=>m.id==='fists');const item=MELEE_ITEMS[selectedMeleeIdx],model=meleeModels[selectedMeleeIdx];model.visible=true;model._punchLeft=false;
      if(item.damage!==50 || CLIENT_WEAPON_DAMAGE.fists!==50 || Math.abs(1000/item.cooldown-3)>1e-8)throw Error('Wrong fist stats');
      equipReady=()=>true;playSoundEvent=()=>{};spawnHitParticle=()=>{};
      let now=100000;Date.now=()=>now;Math.random=()=>.9;lastMelee=0;
      wallColliders.length=0;for(const mesh of Object.values(remoteMeshes))mesh.visible=false;
      players[myId]={team:'ally',hp:300};
      const target=new THREE.Group();target.position.set(.7,0,-2.5);remoteMeshes.fist_test=target;players.fist_test={team:'enemy',hp:300};
      const friend=new THREE.Group();friend.position.set(0,0,-1);remoteMeshes.fist_friend=friend;players.fist_friend={team:'ally',hp:300};
      const hits=[];emitHit=(id,bid,weapon)=>hits.push({id,weapon,damage:getClientWeaponDamage(weapon)});
      camera.position.set(0,1.65,0);camera.rotation.set(0,0,0);tryMelee();
      if(!model._punchLeft || !fistStrike || hits.length)throw Error('Left punch did not begin with windup');
      updateFistStrike(.05);if(hits.length)throw Error('Hit before contact window');
      updateFistStrike(.05);updateFistStrike(.2);
      if(hits.length!==1 || hits[0].id!=='fist_test' || hits[0].damage!==50)throw Error('Wider hitbox/damage/friendly fire');
      updateMeleeSwing(meleeSwingDur/1000*.45);
      if(model._offHand.position.z>-.35 || model.position.z<-.3)throw Error('Left hand did not actually punch');
      now+=100;tryMelee();if(!model._punchLeft)throw Error('Cooldown bypass');
      updateMeleeSwing(1);now+=234;Math.random=()=>0;target.position.set(2.4,0,0);tryMelee();
      if(model._punchLeft || !fistStrike || fistStrike.start<.14)throw Error('Right punch/delayed contact missing');
      updateFistStrike(.10);if(hits.length!==1)throw Error('Delayed strike landed early');
      camera.rotation.y=-Math.PI/2;updateFistStrike(.055);
      if(hits.length!==2)throw Error('Dragging aim could not land delayed punch');
      updateMeleeSwing(meleeSwingDur/1000*.45);
      if(model.position.z>-.35 || model._offHand.position.z<-.3)throw Error('Right hand did not actually punch');
      now+=334;tryMelee();activeSlot='primary';updateFistStrike(.2);if(fistStrike || hits.length!==2)throw Error('Holstered hit landed');
      activeSlot='melee';camera.rotation.set(0,0,0);target.position.set(0,0,-2);now+=334;tryMelee();
      wallColliders.push(new THREE.Box3(new THREE.Vector3(-2,0,-1.1),new THREE.Vector3(2,3,-.9)));updateFistStrike(.2);
      if(hits.length!==2)throw Error('Punch passed through wall');wallColliders.length=0;
      target.position.y=10;now+=334;tryMelee();updateFistStrike(.2);if(hits.length!==2)throw Error('Hitbox has unlimited height');
      now+=334;tryMelee();isDead=true;updateFistStrike(.2);if(fistStrike)throw Error('Dead punch persisted');
      isDead=false;gameStarted=false;return {damage:item.damage,punchesPerSecond:1000/item.cooldown,reach:item.range,alternates:true,dragging:true};
    }));
    for(const [side,size]of [['left',{width:1280,height:800}],['right',{width:390,height:844}]]) {
      await page.setViewportSize(size);
      const img=await page.evaluate(side=>{
        document.querySelectorAll('body > :not(canvas)').forEach(e=>e.style.display='none');camera.children.forEach(o=>{if(!o.isLight)o.visible=false;});
        const m=meleeModels[selectedMeleeIdx];activeSlot='melee';m.visible=true;m._punchLeft=side==='left';meleeSwingType='punch';meleeSwingT=0;meleeSwingDur=317;
        updateMeleeSwing(.145);updateMeleeGripPose();camera.position.set(0,3,20);camera.rotation.set(0,0,0);camera.fov=75;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.render(scene,camera);
        return renderer.domElement.toDataURL('image/png');
      },side);fs.writeFileSync('/tmp/fists-'+side+'.png',Buffer.from(img.split(',')[1],'base64'));
    }
    assert.deepEqual(errors,[]);console.log('PASS: 50 damage, cadence, alternating hands, delayed dragging, single hits, cover, allies, height and cancellation');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
