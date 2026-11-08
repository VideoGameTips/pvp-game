const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(()=>window.PVP_BATTLE_SIM && myId);
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    const result=await page.evaluate(async()=>{
      await PVP_RAGDOLL.ready;
      document.getElementById('overlay').style.display='none';document.body.classList.remove('login-open');
      selectMode('battle_simulator');
      const select=document.getElementById('bs-map');select.value='duel_grid';select.onchange();
      const sim=PVP_BATTLE_SIM,s=sim.state;s.weapon='ak20';s.utility='';s.hp=3000;
      for(let z=-20;z<=20&&s.units.length<13;z+=3)for(let x=-20;x<=20&&s.units.length<13;x+=3){s.team=s.units.length?'enemy':'ally';sim.place(new THREE.Vector3(x,0,z));}
      if(s.units.length<13)throw Error('Not enough deployment positions');
      sim.start();
      const killer=gameBots[0],victims=gameBots.slice(1);
      for(const victim of victims)sim.damage(victim,killer,10000,'ak20');
      sim.frame(1/30);
      const bodies=()=>PVP_RAGDOLL.entries.filter(e=>victims.some(v=>v.id===e.id));
      if(bodies().length!==12)throw Error('Simultaneous deaths evicted corpses: '+bodies().length);
      if(bodies().some(e=>e.parts.length<7||e.joints.length<6))throw Error('Low Effects left rigid standing mannequins');
      const initial=new Map(bodies().map(e=>[e.id,e.byName.head.node.getWorldPosition(new THREE.Vector3()).y]));
      for(let i=0;i<120;i++)PVP_RAGDOLL.tick(1/60);
      const fallen=bodies().filter(e=>e.byName.head.node.getWorldPosition(new THREE.Vector3()).y<initial.get(e.id)-.35).length;
      if(fallen<10)throw Error('Bodies did not physically fall: '+fallen);
      for(let i=0;i<300;i++)PVP_RAGDOLL.tick(1/60);
      if(bodies().length!==12||bodies().some(e=>!e.visual.visible||e.visual.parent!==scene||e.source.visible))throw Error('Corpses disappeared or originals returned');
      const settled=bodies().filter(e=>e.settled).length;
      const grounded=bodies().filter(e=>e.byName.head.node.getWorldPosition(new THREE.Vector3()).y<.65).length;
      if(grounded!==12)throw Error('Heads remained upright above the ground: '+(12-grounded));
      renderer.render(scene,sim.camera);
      sim.edit();if(PVP_RAGDOLL.entries.length)throw Error('Reset retained corpses');
      // Raised terrain must catch bodies at the platform, not at an invisible
      // character-sized box or the map's underlying y=0 plane.
      const slab=new THREE.Box3(new THREE.Vector3(-25,1.8,-25),new THREE.Vector3(25,2,25));
      wallColliders.push(slab);
      for(const lowEffects of [true,false]){
        s.lowEffects=lowEffects;
        const bot=gameBots[1],mesh=remoteMeshes[bot.id];
        bot.dead=true;players[bot.id].dead=true;mesh.visible=true;mesh.position.y=2;
        if(!PVP_RAGDOLL.death(bot.id,'ak20',{persistent:true}))throw Error('Raised-platform death failed');
        const entry=PVP_RAGDOLL.entries[0];
        if(!!entry.simple!==lowEffects)throw Error('Wrong physics detail level');
        for(let i=0;i<240;i++)PVP_RAGDOLL.tick(1/60);
        const headY=entry.byName.head.node.getWorldPosition(new THREE.Vector3()).y;
        const up=new THREE.Vector3(0,1,0).applyQuaternion(entry.byName.torso.node.getWorldQuaternion(new THREE.Quaternion()));
        if(headY<2||headY>2.65||Math.abs(up.y)>.65)throw Error('Corpse did not collapse on raised terrain: '+JSON.stringify({lowEffects,headY,up:up.y}));
        PVP_RAGDOLL.reset(mesh);
      }
      wallColliders.splice(wallColliders.indexOf(slab),1);
      s.lowEffects=true;sim.edit();
      const victim=gameBots[1];victim.dead=true;players[victim.id].dead=true;
      if(!PVP_RAGDOLL.death(victim.id,'ak20'))throw Error('Ordinary ragdoll failed');
      if(PVP_RAGDOLL.entries[0].persistent)throw Error('Ordinary deaths became persistent');
      for(let i=0;i<360;i++)PVP_RAGDOLL.tick(1/60);
      if(PVP_RAGDOLL.entries.length)throw Error('Ordinary match corpse no longer expires');
      sim.stop();
      return {simultaneousDeaths:12,physicallyFallen:fallen,headsAtGround:grounded,visibleAfterSevenSeconds:12,settledBodies:settled,raisedPlatformBothDetailLevels:true,reset:true,normalLifetimeUnchanged:true};
    });
    assert.deepEqual(errors,[]);console.log('PASS',result);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
