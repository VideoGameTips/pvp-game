const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(()=>window.PVP_BATTLE_SIM && myId);
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    const result=await page.evaluate(()=>{
      document.getElementById('overlay').style.display='none';document.body.classList.remove('login-open');
      const shadows=renderer.shadowMap.enabled;
      selectMode('battle_simulator');
      const sim=PVP_BATTLE_SIM,s=sim.state;
      if(s.unitCap!==40)throw Error('Default cap changed');
      const map=document.getElementById('bs-map');map.value='blank';map.onchange();
      s.hp=3000;s.weapon='ak20';s.utility='';
      for(let z=-30;z<=30&&s.units.length<2;z+=3)for(let x=-30;x<=30&&s.units.length<2;x+=3){s.team=s.units.length?'enemy':'ally';sim.place(new THREE.Vector3(x,0,z));}
      if(s.units.length!==2)throw Error('No deployment');
      const first=remoteMeshes[gameBots[0].id];
      const grounded=document.getElementById('bs-grounded');grounded.checked=true;grounded.onchange();
      sim.start();
      function sample(speed){const input=document.getElementById('bs-speed');input.value=String(speed);input.onchange();const start=sim.time;for(let i=0;i<60;i++)sim.frame(.01);return sim.time-start;}
      const normal=sample(1),quarter=sample(.25);
      if(Math.abs(normal-600)>35||Math.abs(quarter-150)>35)throw Error('Slow-mo clock ratio failed '+normal+' / '+quarter);
      if(gameBots.some(b=>(b.yVel||0)>0||(b._slideUntil||0)>sim.now))throw Error('Grounded units jumped/slid');
      s.phase='paused';const paused=sim.time;sim.frame(.1);if(sim.time!==paused)throw Error('Paused clock advanced');
      s.phase='running';sim.edit();
      const limit=document.getElementById('bs-limit');limit.value='300';limit.onchange();
      const original=remoteMeshes[gameBots[0].id],start=performance.now();
      for(let z=-42;z<=42&&s.units.length<300;z+=3)for(let x=-42;x<=42&&s.units.length<300;x+=3){s.team=s.units.length<150?'ally':'enemy';sim.place(new THREE.Vector3(x,0,z));}
      if(s.units.length!==300||gameBots.length!==300)throw Error('Cannot deploy 300: '+s.units.length);
      if(remoteMeshes[gameBots[0].id]!==original)throw Error('Placement rebuilt existing fighters');
      if(sim.place(new THREE.Vector3(0,0,0)))throw Error('Exceeded selected cap');
      const deployMs=Math.round(performance.now()-start);
      document.getElementById('bs-speed').value='1';document.getElementById('bs-speed').onchange();
      sim.start();
      const before=performance.now();for(let i=0;i<6;i++)sim.frame(1/30);const sixFramesMs=Math.round(performance.now()-before);
      if(localBullets.length)throw Error('Low Effects spawned decorative bullets');
      if(renderer.shadowMap.enabled)throw Error('Low Effects left shadows enabled');
      const saved=JSON.parse(localStorage.getItem('pvp_battle_sim_v1'));
      if(saved.unitCap!==300||!saved.grounded||!saved.lowEffects)throw Error('Settings not saved');
      s.phase='paused';
      return {maxUnits:s.units.length,normalMs:Math.round(normal),quarterMs:Math.round(quarter),incrementalPlacement:remoteMeshes[gameBots[0].id]!==first,grounded:true,lowEffects:true,deployMs,sixFramesMs,shadows};
    });
    await page.screenshot({path:'/tmp/battle-simulator-300-desktop.png'});
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(100);
    const canvasColors=await page.evaluate(()=>{
      PVP_BATTLE_SIM.frame(0);
      const gl=renderer.getContext(),pixels=new Uint8Array(64*64*4),colors=new Set();
      gl.readPixels(Math.max(0,Math.floor(renderer.domElement.width/2)-32),Math.max(0,Math.floor(renderer.domElement.height/2)-32),64,64,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      for(let i=0;i<pixels.length;i+=16)colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
      return colors.size;
    });
    assert.ok(canvasColors>8,'Mobile canvas is blank');
    assert.equal(await page.evaluate(()=>{const header=document.querySelector('.bs-header').getBoundingClientRect();const controls=[...document.querySelectorAll('.bs-performance label')];return document.documentElement.scrollWidth<=innerWidth&&controls.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=header.bottom;});}),true);
    await page.screenshot({path:'/tmp/battle-simulator-300-mobile.png'});
    const corpses=await page.evaluate(async()=>{
      await PVP_RAGDOLL.ready;
      PVP_BATTLE_SIM.state.phase='running';
      for(const bot of gameBots){bot.dead=true;bot.hp=0;bot._simKillingWeapon='ak20';}
      PVP_BATTLE_SIM.frame(1/30);
      if(PVP_RAGDOLL.entries.length!==300)throw Error('Mass casualty eviction: '+PVP_RAGDOLL.entries.length);
      for(let i=0;i<90;i++)PVP_RAGDOLL.tick(1/30);
      if(PVP_RAGDOLL.entries.some(e=>!e.visual.visible))throw Error('Mass casualty bodies hidden');
      return {count:PVP_RAGDOLL.entries.length,simple:PVP_RAGDOLL.entries.filter(e=>e.simple).length};
    });
    await page.click('#bs-exit');
    assert.equal(await page.evaluate(()=>!PVP_BATTLE_SIM.active&&gameBots.length===0),true);
    assert.equal(await page.evaluate(()=>renderer.shadowMap.enabled),result.shadows);
    assert.deepEqual(errors,[]);console.log('PASS',result,{corpses});
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
