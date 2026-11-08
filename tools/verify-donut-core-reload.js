const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(()=>typeof updateDonutCoreReload==='function');
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    const result=await page.evaluate(()=>{
      const check=(ok,msg)=>{if(!ok)throw Error(msg);};
      const frames=[],tested=[];finishEquip();playEquipSound=()=>{};
      document.querySelectorAll('body > :not(canvas)').forEach(el=>el.style.display='none');
      camera.children.forEach(o=>{if(!o.isLight)o.visible=false;});
      camera.position.set(0,3,20);camera.rotation.set(0,0,0);camera.add(new THREE.HemisphereLight(0xffffff,0x777777,2));
      let now=100000;Date.now=()=>now;
      for(const skin of MODEL_SKINS.filter(s=>s.rarity==='donut')) {
        const idx=WEAPONS.findIndex(w=>w.id===skin.weapon),original=weaponModels[idx];
        const model=prepViewModel(skin.build(),skin.weapon);camera.add(model);model.visible=true;
        weaponModels[idx]=model;currentWeaponIdx=idx;currentWeapon=WEAPONS[idx];_activeModelSkin[skin.weapon]=skin;
        model._homePos=model.position.clone();model._reloadStart=now;model._reloadDur=2000;model._inspectMode=false;
        const start=now,props=_rProps.length;
        for(const t of [.1,.24,.35,.49,.52,.62,.74,.85,.99]) {
          now=start+2000*t;updateReloadAnim();const rig=model._donutCoreRig;
          check(rig?.active,skin.id+': missing core reload');
          check(rig.coreWidth<rig.chamberWidth*.65,skin.id+': core is wider than the chamber');
          check(!_equip && _rProps.length===props,skin.id+': old magic reload or generic props leaked');
          check(rig.parts.every(p=>[p.object.position.x,p.object.position.y,p.object.position.z].every(Number.isFinite)),skin.id+': invalid expanded geometry');
          if(t===.24)check(rig.parts.some(p=>p.object.position.distanceTo(p.position)>.04),skin.id+': housing did not expand');
          if(t===.35) {
            check(rig.old.visible && !rig.fresh.visible && rig.old.position.distanceTo(rig.seat)>.02,skin.id+': old core not removed');
            if(model._hands&&!model._hands.single)check(model._hands.front.position.distanceTo(rig.old.position)<.08,skin.id+': hand missed old core');
          }
          if(t===.52)check(!rig.old.visible && !rig.fresh.visible,skin.id+': no empty socket stage');
          if(t===.62)check(!rig.old.visible && rig.fresh.visible && rig.fresh.position.distanceTo(rig.seat)>.02,skin.id+': fresh core did not enter');
          if(t===.74)check(rig.fresh.position.distanceTo(rig.seat)<.001,skin.id+': new core not seated');
          if(['ak20_donut','revolver_donut','rpg_donut'].includes(skin.id)&&[.24,.35,.62,.85].includes(t)) {
            renderer.render(scene,camera);frames.push({id:skin.id,t,image:renderer.domElement.toDataURL('image/png')});
          }
        }
        now=start+2001;updateReloadAnim();const rig=model._donutCoreRig;
        check(!rig.active && !rig.group.visible,skin.id+': core reload did not finish');
        for(const p of rig.parts)check(p.object.position.equals(p.position),skin.id+': housing not closed');
        now+=100;model._reloadStart=now;now+=700;updateReloadAnim();
        reloading=true;_reloadSt=null;cancelReload();
        check(!rig.active && !rig.group.visible,skin.id+': cancelled core stuck on screen');
        for(const p of rig.parts)check(p.object.position.equals(p.position)&&p.object.quaternion.equals(p.rotation),skin.id+': cancel did not restore housing');
        if(currentWeapon.reloadStyle==='shell')check(_shellPlanFor(currentWeapon,2).loadAt.every(t=>t===.74),skin.id+': shell ammo loads before core seats');
        model.visible=false;weaponModels[idx]=original;delete _activeModelSkin[skin.weapon];tested.push(skin.id);
      }
      return {tested,frames};
    });
    for(const f of result.frames)fs.writeFileSync(`/tmp/core-${f.id}-${f.t}.png`,Buffer.from(f.image.split(',')[1],'base64'));
    await page.setViewportSize({width:390,height:844});
    const pixels=await page.evaluate(()=>{
      const m=prepViewModel(buildDonutAK20(),'ak20');camera.add(m);m.visible=true;m._homePos=m.position.clone();m._reloadStart=9999;
      updateDonutCoreReload(m,.35);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.render(scene,camera);
      const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.drawImage(renderer.domElement,0,0,64,64);
      const data=ctx.getImageData(0,0,64,64).data,colors=new Set();for(let i=0;i<data.length;i+=4)colors.add((data[i]<<16)|(data[i+1]<<8)|data[i+2]);return colors.size;
    });
    assert(pixels>32);await page.screenshot({path:'/tmp/core-mobile.png'});
    assert.deepEqual(errors,[]);console.log('PASS:',result.tested.join(', '),'expansion, empty socket, hand-held core swap, seating, completion and cancellation.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
