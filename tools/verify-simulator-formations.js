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
    console.log(await page.evaluate(()=>{
      document.getElementById('overlay').style.display='none';document.body.classList.remove('login-open');
      selectMode('battle_simulator');const select=document.getElementById('bs-map');select.value='duel_grid';select.onchange();
      const sim=PVP_BATTLE_SIM,s=sim.state;s.formation='squad';s.spacing=2.5;s.unitCap=300;
      let center=null,count=0;
      for(let z=-22;z<=22&&!center;z+=5)for(let x=-22;x<=22&&!center;x+=5){const p=new THREE.Vector3(x,0,z);count=sim.deploy(p);if(count===9)center=p;else if(count)sim.undo();}
      if(!center||count!==9||gameBots.length!==9)throw Error('No 3x3 formation');
      const old=remoteMeshes[gameBots[0].id],id=gameBots[0].id;
      s.formation='line';const axis=sim.formationPoints(center),zSpan=Math.max(...axis.map(p=>p.z))-Math.min(...axis.map(p=>p.z));
      document.getElementById('bs-rotate').click();const rotated=sim.formationPoints(center);
      if(zSpan>.01||Math.max(...rotated.map(p=>p.x))-Math.min(...rotated.map(p=>p.x))>.01)throw Error('Rotation did not rotate the line');
      let extra=0;
      for(let z=-22;z<=22&&!extra;z+=4)for(let x=-22;x<=22&&!extra;x+=4)extra=sim.deploy(new THREE.Vector3(x,0,z));
      if(!extra)throw Error('Cannot deploy second batch');
      if(!sim.undo()||s.units.length!==9||remoteMeshes[id]!==old)throw Error('Undo rebuilt/deleted previous batch');
      s.unitCap=40;s.formation='company';
      const partial=sim.deploy(new THREE.Vector3(0,0,0));
      if(partial<1||partial>31||s.units.length!==9+partial)throw Error('Partial formation exceeded cap');
      sim.undo();if(s.units.length!==9)throw Error('Partial formation undo failed');
      const before=s.units.length;
      if(sim.deploy(new THREE.Vector3(10000,0,10000))!==0||s.units.length!==before)throw Error('Out-of-bounds formation accepted');
      for(let i=0;i<s.units.length;i++)for(let j=i+1;j<s.units.length;j++)if(Math.hypot(s.units[i].x-s.units[j].x,s.units[i].z-s.units[j].z)<1.25)throw Error('Formation overlap');
      s.formation='circle';s.rotation=0;
      if(sim.formationPoints(center).length!==12)throw Error('Wrong circle count');
      sim.edit();
      sim.frame(0);
      return {squad:9,rotation:true,undo:true,partialCap:true,bounds:true,overlap:true,circle:12};
    }));
    // Exercise the actual hover preview, not only placement helpers.
    const hover=await page.evaluate(()=>{const p=PVP_BATTLE_SIM.state.units[0],v=new THREE.Vector3(p.x+7,0,p.z+7).project(PVP_BATTLE_SIM.camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};});
    await page.mouse.move(hover.x,hover.y);
    await page.evaluate(()=>PVP_BATTLE_SIM.frame(0));
    await page.screenshot({path:'/tmp/simulator-formations-desktop.png'});
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
    await page.evaluate(()=>PVP_BATTLE_SIM.frame(0));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'/tmp/simulator-formations-mobile.png'});
    assert.deepEqual(errors,[]);console.log('PASS: formation deployment and undo');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
