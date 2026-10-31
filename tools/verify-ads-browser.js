const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(() => typeof weaponSightPose === 'function');
    await page.evaluate(() => { requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    console.log(await page.evaluate(() => {
      reloading=false; _equip=null; activeSlot='primary'; isADS=true;
      playerVelocity.set(0,0,0); _gunKick.x=_gunKick.y=_gunKick.z=_gunKick.rx=_gunKick.ry=_gunKick.rz=0;
      let checked=0, authored=0;
      for(let i=0;i<WEAPONS.length;i++) {
        currentWeaponIdx=i; const m=weaponModels[i], hip=m._hipPosition.clone();
        m.visible=true; setWeaponADSPos(true);
        for(let frame=0;frame<90;frame++) updateRealismFeedback(1/60);
        const s=weaponSightPose(m), q=new THREE.Quaternion().setFromEuler(s.rotation);
        const a=s.rear.clone().applyQuaternion(q).add(m.position), b=s.front.clone().applyQuaternion(q).add(m.position);
        if(!a.toArray().every(Number.isFinite) || Math.abs(a.x)>.001 || Math.abs(a.y)>.001 || Math.abs(b.x)>.001 || Math.abs(b.y)>.001 || a.z>-.17) throw Error('Misaligned '+WEAPONS[i].id);
        if(m._sightLine) {
          authored++;
          m.updateWorldMatrix(true,true);
          const origin=camera.localToWorld(new THREE.Vector3(0,.002,0)), direction=new THREE.Vector3(0,0,-1).transformDirection(camera.matrixWorld);
          const ray=new THREE.Raycaster(origin,direction,.01,3);
          const blocked=ray.intersectObject(m,true).some(hit=>{
            const o=hit.object,mat=Array.isArray(o.material)?o.material[0]:o.material;
            if(!mat || mat.transparent || mat.isMeshBasicMaterial)return false;
            for(let p=o;p&&p!==m;p=p.parent)if(p.userData.vmHand || p.userData.eqFx || p===m._flash)return false;
            return true;
          });
          if(blocked)throw Error('Solid geometry blocks aperture '+WEAPONS[i].id);
        }
        setWeaponADSPos(false);
        if(m._homePos.distanceTo(hip)>1e-8) throw Error('Hip pose changed '+WEAPONS[i].id);
        m.visible=false; checked++;
      }
      // A rotated, non-uniformly scaled receiver must still look straight ahead.
      const mock=new THREE.Group(),receiver=new THREE.Group();receiver.position.set(.03,.04,-.08);receiver.rotation.set(.06,.08,.02);mock.add(receiver);mock.scale.set(1.2,.9,1.1);
      mock._sightLine={space:receiver,rear:new THREE.Vector3(0,.02,.05),front:new THREE.Vector3(0,.02,-.2)};
      const pose=weaponSightPose(mock),q=new THREE.Quaternion().setFromEuler(pose.rotation);
      for(const v of [pose.rear,pose.front]){const p=v.clone().applyQuaternion(q).add(pose.position);if(Math.hypot(p.x,p.y)>1e-8)throw Error('Transformed sight line');}
      for(const id of ['ak20','pistol','srx']) {
        const m=prepViewModel(PVE_STEALTH.build(id),id),s=weaponSightPose(m);
        if(!m._sightLine || !m._sightLine.space.userData.weaponOptic)throw Error('Stealth optic missing '+id);
        const q=new THREE.Quaternion().setFromEuler(s.rotation);
        for(const v of [s.rear,s.front]){const p=v.clone().applyQuaternion(q).add(s.position);if(Math.hypot(p.x,p.y)>1e-8)throw Error('Skin optic alignment '+id);}
      }
      const p90Index=WEAPONS.findIndex(w=>w.id==='p90');
      if(!weaponModels[p90Index]._sightLine.space.userData.squareReflex)throw Error('P90 missing square reflex');
      let p90Skins=0;
      for(const skin of MODEL_SKINS.filter(s=>s.weapon==='p90')) {
        const original=weaponModels[p90Index],m=prepViewModel(_smoothModelSkin(skin.build()),null,'p90');
        if(!m._sightLine || !m._aimOnlySight || m._aimOnlySight.visible)throw Error('Missing aim-only skin sight '+skin.id);
        weaponModels[p90Index]=m;currentWeaponIdx=p90Index;m.visible=true;
        try {
          isADS=true;setWeaponADSPos(true);for(let f=0;f<90;f++)updateRealismFeedback(1/60);
          const pose=weaponSightPose(m),q=new THREE.Quaternion().setFromEuler(m.rotation);
          for(const v of [pose.rear,pose.front]){const p=v.clone().applyQuaternion(q).add(m.position);if(Math.hypot(p.x,p.y)>.001)throw Error('Skin sight off centre '+skin.id);}
          if(!m._aimOnlySight.visible)throw Error('Sight hidden during aim');
          isADS=false;setWeaponADSPos(false);if(m._aimOnlySight.visible)throw Error('Sight visible at hip');
          p90Skins++;
        } finally {weaponModels[p90Index]=original;}
      }
      return {checked,authored,stealthOptics:3,p90Skins};
    }));
    for(const [id,width,height] of [['ak20',1280,800],['pistol',1280,800],['vector',1280,800],['p90',390,844]]) {
      await page.setViewportSize({width,height});
      const result=await page.evaluate(id=>{
        document.querySelectorAll('body > :not(canvas)').forEach(e=>e.style.display='none');
        camera.children.forEach(o=>{if(!o.isLight)o.visible=false;});
        currentWeaponIdx=WEAPONS.findIndex(w=>w.id===id);const m=weaponModels[currentWeaponIdx];m.visible=true;isADS=true;
        setWeaponADSPos(true);for(let i=0;i<90;i++)updateRealismFeedback(1/60);
        camera.position.set(0,3,20);camera.rotation.set(0,0,0);camera.fov=WEAPONS[currentWeaponIdx].adsZoom;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
        renderer.setSize(innerWidth,innerHeight);renderer.render(scene,camera);
        const c=document.createElement('canvas');c.width=64;c.height=40;const ctx=c.getContext('2d');ctx.drawImage(renderer.domElement,0,0,64,40);
        const pixels=ctx.getImageData(0,0,64,40).data;let nonblank=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>40)nonblank++;
        return {nonblank,image:renderer.domElement.toDataURL('image/png')};
      },id);
      assert(result.nonblank>100,'Blank canvas '+id);
      fs.writeFileSync('/tmp/ads-'+id+'.png',Buffer.from(result.image.split(',')[1],'base64'));
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: sight alignment, transformed receivers, hip restoration, desktop/mobile rendering');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
