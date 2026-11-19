const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:820},hasTouch:width<500});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL||'http://localhost:3001/');
      await page.waitForFunction(()=>{try{return !!RELOAD_PROPS.rad_pulse&&window.PVP_RADIATION;}catch{return false;}});
      const data=await page.evaluate(()=>{
        const check=(ok,m)=>{if(!ok)throw Error(m);};
        requestAnimationFrame=()=>0;
        const index=WEAPONS.findIndex(w=>w.id==='rad_pulse'),w=WEAPONS[index],model=weaponModels[index];
        check(WEAPONS.length===weaponModels.length&&model?._flash,'Model array alignment');
        check(w.damage===18&&w.mag===36&&Math.abs(w.fireRate-1000/6)<.01&&w.reloadTime===2400&&!w.archived,'Incorrect stats');
        check(falloffMultiplier(w.id,80)===1&&headshotMultFor(w.id)===1,'Direct hit changes with range or headshots');
        const at=new THREE.Vector3(0,1.5,0),dir=new THREE.Vector3(0,0,-1);
        spawnLocalBullet(at,dir,'rad_speed_test',true,w.bulletSpeed,w.bulletColor,w.bulletSize,w.id);
        const pulse=localBullets.find(b=>b.id==='rad_speed_test');
        check(Math.abs(pulse.speed-140)<.01&&projectileKind(w.id)==='energy','Projectile is not a 140-stud pulse');
        currentUser={username:'Radiation test',purchased:[w.id],unlocks:[],skinInventory:[]};
        check(isOwned(w.id)&&PVP_SHOP_CATALOG.category(w.id)==='prime','Ownership or tier');
        document.getElementById('overlay').style.display='none';document.getElementById('mode-screen').style.display='none';
        requestPointerLockSafe=()=>{};
        showLoadoutScreen('swap');
        check([...document.querySelectorAll('.loadout-card')].some(c=>c.dataset.itemId===w.id),'Primary picker missing Rad Pulse');
        const oldNow=Date.now,base=oldNow();let time=base;Date.now=()=>time;
        activeMapName='lobby13';spawnTrainingDummies();
        const dummy=TRAINING_DUMMIES.find(d=>d.infinite)||TRAINING_DUMMIES[0],mesh=remoteMeshes[dummy.id];
        try{
          activeMapName='lobby13';mesh.visible=true;
          for(let i=0;i<3;i++)handleDummyHit(dummy,mesh,{weaponId:w.id,damage:18},mesh.position.clone());
          check(_radLocal.get(dummy.id).stacks===3,'Practice dummy does not stack exposure');
          time+=1000;updateRadiation();
          check(_radLocal.get(dummy.id).next===base+2000,'Dummy radiation did not tick');
          time+=4000;updateRadiation();
          check(_radLocal.get(dummy.id)?.until===Infinity,'Practice contamination should not expire');
          _radLocal.delete(dummy.id);
        }finally{Date.now=oldNow;}
        const sim=window.PVP_BATTLE_SIM;
        if(sim){
          const attacker={id:'rad_sim_source',team:'ally'},victim={id:'rad_sim_target',team:'enemy',hp:500};
          for(let i=0;i<4;i++)sim.damage(victim,attacker,18,w.id);
          check(victim._simRadiation.stacks===3&&victim.hp===428,'Simulator exposure stacks or direct damage');
          const tick=window.PVP_RADIATION.tick(victim._simRadiation,sim.now+1000);
          sim.damage(victim,attacker,tick,'rad_pulse_dot');
          check(tick===6&&victim.hp===422&&victim._simRadiation.stacks===3,'Simulator radiation restacked or dealt wrong damage');
        }
        const render=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});render.setSize(600,360);
        const stage=new THREE.Scene();stage.background=new THREE.Color(0x293038);
        stage.add(new THREE.HemisphereLight(0xf4fff1,0x9aa2ac,2.5));
        const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(2,3,1);stage.add(sun);
        const prize=buildRadPulse();prize.position.set(0,0,0);stage.add(prize);
        check(prize.children.filter(o=>o.name==='rad-pulse-trefoil'&&o.material.map).length===2,'Radioactive symbols missing');
        check(w.radiationOnHit.dps===2&&w.radiationOnHit.permanent,'Radiation should be 2 HP per stack without expiry');
        const view=new THREE.PerspectiveCamera(36,600/360,.01,10);view.position.set(.75,.23,.22);view.lookAt(0,0,-.025);
        render.render(stage,view);
        const gl=render.getContext(),px=new Uint8Array(600*360*4);gl.readPixels(0,0,600,360,gl.RGBA,gl.UNSIGNED_BYTE,px);
        let green=0;for(let i=0;i<px.length;i+=4)if(px[i+1]>110&&px[i+1]>px[i]+25&&px[i+1]>px[i+2]+25)green++;
        check(green>50,'Missing green containment chamber');
        const png=render.domElement.toDataURL().split(',')[1];render.dispose();
        return {png,green};
      });
      assert.deepEqual(errors,[]);
      if(process.env.RAD_PREVIEW_DIR)fs.writeFileSync(process.env.RAD_PREVIEW_DIR+'/rad-pulse-'+width+'.png',Buffer.from(data.png,'base64'));
      console.log(width+': primary picker, stats, 140-stud pulses, 3-stack practice target and model verified');
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
