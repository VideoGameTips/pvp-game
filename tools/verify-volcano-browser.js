const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='warning'&&/\[(bespoke|theme|upgrade|gimmick)\]/.test(m.text()))errors.push(m.text());});
    await page.goto(process.env.PVP_TEST_URL||'http://localhost:3001/',{waitUntil:'load'});
    await page.waitForFunction(()=>typeof activateMap==='function'&&window.PVP_VOLCANO);
    await page.evaluate(()=>{requestAnimationFrame=()=>0;requestPointerLockSafe=()=>{};});await page.waitForTimeout(100);
    console.log(await page.evaluate(()=>{
      activateMap('volcano');const G=MAP_GROUPS.volcano;
      if(!G.userData.authoredVolcano||MAP_BOUNDS.volcano.halfX!==64||MAP_BOUNDS.volcano.halfZ!==76)throw Error('Missing authored caldera');
      const f=MAP_VOID.volcano.rects,area=f.reduce((n,r)=>n+(r.x1-r.x0)*(r.z1-r.z0),0);
      if(area/(128*152)>.85)throw Error('Footprint is still square');
      const samples=r=>Array.from({length:25},(_,i)=>new THREE.Vector3(r.x0+(r.x1-r.x0)*(i%5)/4,1.81,r.z0+(r.z1-r.z0)*Math.floor(i/5)/4));
      const a=samples(MAP_SPAWNS.volcano.ally),b=samples(MAP_SPAWNS.volcano.enemy);
      let blocked=0;
      for(const p of [...a,...b])if(!PVP_VOLCANO.safeAt(p.x,p.z)||wallColliders.some(c=>c.containsPoint(p)))throw Error('Unsafe spawn');
      for(const h of [0,3])for(const p0 of a)for(const q0 of b){
        const p=p0.clone().add(new THREE.Vector3(0,h,0)),q=q0.clone().add(new THREE.Vector3(0,h,0)),d=q.clone().sub(p),length=d.length(),ray=new THREE.Ray(p,d.normalize());
        if(!wallColliders.some(c=>{const hit=ray.intersectBox(c,new THREE.Vector3());return hit&&hit.distanceTo(p)<length;}))throw Error('Spawn sightline');blocked++;
      }
      const nav=_botNavGrid(),at=(x,z)=>Math.floor((z-nav.z0)/nav.cell)*nav.W+Math.floor((x-nav.x0)/nav.cell);
      _botNavFill(nav,at(0,68));
      for(const [x,z] of [[0,-68],[-36,-8],[36,8],[0,44],[0,-44]])if(nav.dist[at(x,z)]<0)throw Error('Blocked route '+[x,z]);
      for(let j=0;j<nav.H;j++)for(let i=0;i<nav.W;i++){
        const x=nav.x0+(i+.5)*nav.cell,z=nav.z0+(j+.5)*nav.cell;
        if(!PVP_VOLCANO.safeAt(x,z,.85)&&!nav.blocked[j*nav.W+i])throw Error('Bot routes through lava or void');
      }
      const walker={x:-36,z:37,y:.16},target={x:36,z:37};
      if(PVP_VOLCANO.lineSafe(walker.x,walker.z,target.x,target.z))throw Error('Unsafe shortcut was accepted');
      for(let i=0;i<1000&&Math.hypot(walker.x-target.x,walker.z-target.z)>1.5;i++){
        const point=botNavPoint(walker,target)||target,dx=point.x-walker.x,dz=point.z-walker.z,len=Math.hypot(dx,dz)||1;
        walker.x+=dx/len*Math.min(.3,len);walker.z+=dz/len*Math.min(.3,len);
        if(!PVP_VOLCANO.safeAt(walker.x,walker.z,.1))throw Error('Bot shortcut crosses lava');
      }
      if(Math.hypot(walker.x-target.x,walker.z-target.z)>1.5)throw Error('Bot failed to follow safe route');
      if(MAP_RAMPS.volcano.length!==4)throw Error('Missing ramps');
      for(const r of MAP_RAMPS.volcano){
        let y=.16;for(let t=0;t<=r.run;t+=.25)y=botGroundYAt(r.x0+r.ux*t,r.z0+r.uz*t,y,.95,1.25);
        if(y<4.7)throw Error('Bot cannot physically climb rim ramp');
      }
      gameStarted=true;inLobby=false;isDead=false;match=null;
      const peaks=[];
      for(const r of MAP_RAMPS.volcano){
        camera.position.set(r.x0-r.ux,1.81,r.z0-r.uz);window._crouchEye=1.65;playerYVel=0;slamState=null;
        euler.set(0,Math.atan2(-r.ux,-r.uz),0);camera.quaternion.setFromEuler(euler);keys.KeyW=true;
        let peak=0;try{for(let i=0;i<240;i++){updateMovement(1/60);peak=Math.max(peak,playerFeetY());if(peak>=4.7)break;}}finally{keys.KeyW=false;}
        if(peak<4.7)throw Error('Player cannot climb rim ramp '+JSON.stringify({r,peak,pos:camera.position.toArray()}));peaks.push(peak);
      }
      let damage=0;const savedDamage=applyEnvironmentDamage,savedShield=isShielded,savedMe=players[myId];
      try{
        applyEnvironmentDamage=n=>damage+=n;isShielded=()=>false;players[myId]={hp:300};
        camera.position.set(0,1.65,0);_lavaTickAt=0;updateMapGimmicks(.5);
        if(damage!==60)throw Error('Wrong lava contact damage '+damage);
        camera.position.set(0,5.65,0);_lavaTickAt=0;updateMapGimmicks(.5);
        if(damage!==60)throw Error('Lava hurts airborne player');
        camera.position.set(0,1.81,68);_lavaTickAt=0;updateMapGimmicks(.5);
        if(damage!==60)throw Error('Lava hurts safe ground');
      }finally{applyEnvironmentDamage=savedDamage;isShielded=savedShield;players[myId]=savedMe;gameStarted=false;}
      const count=MAP_COLLIDERS.volcano.length;activateMap('volcano');if(count!==MAP_COLLIDERS.volcano.length)throw Error('Duplicated map');
      return {footprintArea:area,spawnRaysBlocked:blocked,rampPeaks:peaks,colliders:count,lavaDps:G.userData.caldera.lavaDps,ventCount:g_gimDbg.volcano.pts.length};
    }));
    for(const [id,size,from,to] of [['overview',{width:1280,height:800},[52,44,77],[0,2,0]],['lane',{width:1280,height:800},[-36,2,38],[0,4,0]],['mobile',{width:390,height:844},[-34,17,43],[0,3,0]]]){
      await page.setViewportSize(size);
      const shot=await page.evaluate(([from,to])=>{
        document.querySelectorAll('body > :not(canvas)').forEach(e=>e.style.display='none');
        camera.children.forEach(o=>{if(!o.isLight)o.visible=false;});
        camera.position.set(...from);camera.lookAt(...to);camera.fov=78;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
        renderer.setSize(innerWidth,innerHeight);
        scene.background.setHex(0x39414d);renderer.render(scene,camera);
        const c=document.createElement('canvas');c.width=96;c.height=60;const ctx=c.getContext('2d');ctx.drawImage(renderer.domElement,0,0,96,60);
        const data=ctx.getImageData(0,0,96,60).data;let lit=0,hot=0;
        for(let i=0;i<data.length;i+=4){if(data[i]+data[i+1]+data[i+2]>80)lit++;if(data[i]>data[i+1]*1.4&&data[i]>100)hot++;}
        return {image:renderer.domElement.toDataURL('image/png'),lit,hot,calls:renderer.info.render.calls};
      },[from,to]);
      assert(shot.lit>500,'Blank or unreadable '+id);assert(shot.hot>20,'Lava is missing '+id);
      fs.writeFileSync('/tmp/volcano-'+id+'.png',Buffer.from(shot.image.split(',')[1],'base64'));
      console.log(id,{litPixels:shot.lit,lavaPixels:shot.hot,drawCalls:shot.calls});
    }
    assert.deepEqual(errors,[]);console.log('PASS: authored Volcano footprint, protected spawns, connected bot-safe routes, four climbable ramps, lava contact and desktop/mobile rendering');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
