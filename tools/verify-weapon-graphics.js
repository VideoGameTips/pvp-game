const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1250,height:850}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(()=>typeof weaponSightPose==='function'&&typeof RELOAD_PROPS!=='undefined'&&myId);
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    const result=await page.evaluate(()=>{
      const check=(ok,msg)=>{if(!ok)throw Error(msg);};
      const entries=[['ak20',buildAK20],['pistol',buildPistol],['vector',buildVectorSMG],['srx',buildSRX],['paintball',buildPaintball]];
      for(const [id,builder] of entries){
        const idx=WEAPONS.findIndex(w=>w.id===id),m=weaponModels[idx],before=builder(),after=builder(true);
        let bore=false,parts=0;after.traverse(o=>{if(o.userData.openMuzzle)bore=true;if(o.isMesh)parts++;});
        check(bore&&parts>20,id+' lacks a recessed muzzle or complete model');
        check(m._hands?.rear&&m._flash,id+' lost its hands or muzzle flash');
        const {position,rotation,rear,front}=weaponSightPose(m);
        for(const p of [rear,front]){const a=p.clone().applyEuler(rotation).add(position);check(Math.hypot(a.x,a.y)<1e-5,id+' sight is off-axis');}
        if(id!=='paintball'){
          const mech=ensureMech(m,id);check(mech?.mag?.g===m._parts.magazine,id+' reload is not using the actual magazine');
          const beat=RELOAD_PROPS[id].find(e=>e.k==='mag'&&e.m==='eject');
          updateGunMech(m,id,beat.t,RELOAD_PROPS[id],WEAPONS[idx].reloadTime);
          check(!mech.mag.g.visible&&mech.mag.g.position.distanceTo(mech.mag.home)>.05,id+' magazine did not release');
          updateGunMech(m,id,null,[],1000);check(mech.mag.g.visible&&mech.mag.g.position.equals(mech.mag.home),id+' magazine did not seat');
          if(id==='pistol'){
            check(mech.slide?.g===m._parts.slide&&!before._parts.slide,'Stock slide leaked into skins');
            updateGunMech(m,id,.87,RELOAD_PROPS[id],1000);check(mech.slide.g.position.z>mech.slide.z0+.02,'Pistol slide did not cycle');
            updateGunMech(m,id,null,[],1000);
          }
        }
        if(id==='vector')check(after._sightLine?.space.userData.squareReflex&&!before._sightLine,'Vector optic leaked into skins');
        if(id==='srx'){
          const sight=after._sightLine,optic=sight.space;
          optic.updateWorldMatrix(true,true);
          const from=optic.localToWorld(sight.rear.clone().add(new THREE.Vector3(0,0,.01)));
          const dir=optic.localToWorld(sight.front.clone()).sub(from).normalize();
          const ray=new THREE.Raycaster(from,dir);
          check(!ray.intersectObject(optic,true).some(hit=>!hit.object.material.transparent),'SR-X mount blocks the scope');
        }
      }
      const view=new THREE.Scene(),cam=new THREE.PerspectiveCamera(43,1,.005,20);
      view.background=new THREE.Color(0x596973);
      view.add(new THREE.HemisphereLight(0xeaf7ff,0x555b65,2.4));
      const key=new THREE.DirectionalLight(0xffecd8,2.6);key.position.set(1,2,-1);view.add(key);
      const canvas=renderer.domElement;
      document.body.replaceChildren(canvas);canvas.style.cssText='display:block;width:100vw;height:100vh';
      window.renderWeaponReview=(stage,offset=0,count=5)=>{
        const w=innerWidth,h=innerHeight,cols=stage==='compare'?2:3,rows=count;
        renderer.setSize(w,h,false);renderer.setScissorTest(true);
        for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
          const [id,builder]=entries[offset+j],idx=WEAPONS.findIndex(w=>w.id===id);
          const isComparison=stage==='compare',source=isComparison?builder(i===1):weaponModels[idx];
          if(isComparison)metalizeModel(source);
          const viewportW=Math.floor(w/cols),viewportH=Math.floor(h/rows);
          if(!isComparison){
            currentWeaponIdx=idx;source._homePos=source._hipPosition.clone();source.position.copy(source._homePos);source.rotation.set(0,0,0);
            if(source._aimOnlySight)source._aimOnlySight.visible=i===1;
            if(i===1){const sight=weaponSightPose(source);source.position.copy(sight.position);source.rotation.copy(sight.rotation);}
            if(i===2){source._reloadDur=WEAPONS[idx].reloadTime;source._reloadStart=Date.now()-source._reloadDur*.47;updateReloadAnim();}
          }
          const m=source.clone(true);m.visible=true;view.add(m);
          if(!isComparison){source._reloadStart=0;updateReloadAnim();}
          cam.aspect=viewportW/viewportH;cam.zoom=isComparison?2.15:1;cam.updateProjectionMatrix();
          if(isComparison){
            m.position.set(0,0,0);
            const bounds=new THREE.Box3().setFromObject(m),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()).length();
            cam.position.copy(center).add(new THREE.Vector3(.95,.47,-.46).normalize().multiplyScalar(size*1.33));cam.lookAt(center);
          }else{cam.position.set(0,0,0);cam.rotation.set(0,0,0);}
          renderer.setViewport(i*viewportW,h-(j+1)*viewportH,viewportW,viewportH);
          renderer.setScissor(i*viewportW,h-(j+1)*viewportH,viewportW,viewportH);renderer.render(view,cam);
          view.remove(m);
        }
        const gl=renderer.getContext(),px=new Uint8Array(4),colors=new Set();
        for(let y=10;y<canvas.height;y+=13)for(let x=10;x<canvas.width;x+=17){gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);colors.add(px.join(','));}
        renderer.setScissorTest(false);return colors.size;
      };
      return entries.map(([id])=>id);
    });
    for(const stage of ['compare','poses']){
      assert.ok(await page.evaluate(stage=>renderWeaponReview(stage),stage)>30);
      await page.screenshot({path:`/tmp/pvp-weapon-${stage}-desktop.png`});
    }
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>renderWeaponReview('poses',2,2))>30);
    await page.screenshot({path:'/tmp/pvp-weapon-poses-mobile.png'});
    assert.deepEqual(errors,[]);console.log('PASS: stock geometry, sights, hands, reload assemblies and rendered desktop/mobile views',result);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
