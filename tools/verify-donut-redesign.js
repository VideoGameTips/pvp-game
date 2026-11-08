const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:800}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(()=>typeof _beginEquip==='function' && typeof _donutStreaks!=='undefined');
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});
    await page.waitForTimeout(100);
    const result=await page.evaluate(()=>{
      const check=(ok,msg)=>{if(!ok)throw Error(msg);};
      playEquipSound=()=>{};finishEquip();
      document.querySelectorAll('body > :not(canvas)').forEach(el=>el.style.display='none');
      camera.children.forEach(o=>{if(!o.isLight)o.visible=false;});
      camera.position.set(0,3,20);camera.rotation.set(0,0,0);
      camera.add(new THREE.HemisphereLight(0xffffff,0x777777,2));
      const frames=[], tested=[];
      const skins=[...MODEL_SKINS.filter(s=>s.rarity==='donut'),...MELEE_MODEL_SKINS.filter(s=>s.rarity==='donut')];
      for(const skin of skins) {
        _updateDonutPuffs(1);
        const melee=!!skin.melee;
        const model=melee ? skin.build() : prepViewModel(skin.build(),skin.weapon);
        camera.add(model);model.visible=true;
        model._tick?.(.016,1,false);
        let sprites=0;model.traverse(o=>{if(o.isSprite)sprites++;});
        check(!sprites,skin.id+': blurry ambient sprites remain');
        _beginEquip(model,{equip:'donutbuild',equipMs:1600},melee);
        check(_equip?.type==='donutfold',skin.id+': old assemble animation');
        const event=_equip;
        check(!model._aimOnlySight || !event.ps.some(p=>p.c===model._aimOnlySight),'Hidden aiming sight included in unfold');
        check(event.ps.some(p=>p.foldAngle),skin.id+': no folding hinges');
        const packedBox=_eqLocalBox(model,event.ps.map(p=>p.c));
        check(event.ps.every(p=>p.c.scale.x>0 && p.c.scale.y>0 && p.c.scale.z>0),skin.id+': packed pieces disappeared');
        if(skin.weapon && !['revolver'].includes(skin.weapon)) {
          check(event.ps.filter(p=>p.foldAngle).length>=4,skin.id+': too few unfolding sections');
          check(model._parts.techReceiver0 && model._parts.techReceiver2,skin.id+': missing open receiver sections');
        }
        for(let frame=0;frame<=60;frame++) {
          const t=frame/60;
          _equipStep(event,t);
          _updateDonutPuffs(1/60);
          model.updateMatrixWorld(true);
          check(event.ps.every(p=>[p.c.position.x,p.c.position.y,p.c.position.z].every(Number.isFinite)),skin.id+': invalid pose');
          if([0,15,33,51,60].includes(frame) && ['ak20_donut','revolver_donut','katana_donut'].includes(skin.id)) {
            renderer.render(scene,camera);
            const c=document.createElement('canvas');c.width=c.height=32;
            const ctx=c.getContext('2d');ctx.drawImage(renderer.domElement,0,0,32,32);
            const pixels=ctx.getImageData(0,0,32,32).data,colors=new Set();
            for(let i=0;i<pixels.length;i+=4)colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);
            check(colors.size>32,skin.id+': blank desktop canvas');
            frames.push({id:skin.id,t,image:renderer.domElement.toDataURL('image/png')});
          }
        }
        const deployedBox=_eqLocalBox(model,event.ps.map(p=>p.c));
        check(packedBox.getSize(new THREE.Vector3()).length()<deployedBox.getSize(new THREE.Vector3()).length()*.70,skin.id+': packed weapon is not small enough');
        finishEquip();
        for(const p of event.ps)check(p.c.position.equals(p.h.p)&&p.c.quaternion.equals(p.h.q)&&p.c.scale.equals(p.h.s),skin.id+': cancelled equip not restored');
        model.visible=false;tested.push(skin.id);
      }
      const grenade=buildDonutFragGrenade();camera.add(grenade);grenade.visible=true;
      _beginEquip(grenade,{equip:grenade._supportEquip,equipMs:600},false,true);
      check(_equip?.type==='donutfold','Grenade equip still assembles');finishEquip();grenade.visible=false;
      const from=new THREE.Vector3(0,3,19),to=from.clone().add(new THREE.Vector3(.2,.1,0));
      const puffs=_donutPuffs.length;
      _emitDonutTrail(0xff00ff,.04,from,to);
      check(_donutPuffs.length===puffs,'Donut trail still uses puffs');
      const trail=_donutStreaks.at(-1);
      check(trail.mesh.isMesh && trail.mesh.material.color.getHex()===0xffce54,'Trail is not defined gold geometry');
      check(trail.mesh.children[0]?.material.color.getHex()===0xffffff && trail.mesh.children[0].scale.x<1,'Trail is missing a narrow white core');
      for(let i=0;i<200;i++)_emitDonutTrail(0,.04,from,to);
      check(_donutStreaks.length<=160,'Trail budget exceeded');
      _updateDonutPuffs(1);check(_donutStreaks.length===0,'Trails did not expire');
      return {tested,frames};
    });
    for(const frame of result.frames)fs.writeFileSync(`/tmp/donut-${frame.id}-${frame.t}.png`,Buffer.from(frame.image.split(',')[1],'base64'));
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{
      const m=prepViewModel(buildDonutAK20(),'ak20');camera.add(m);m.visible=true;
      camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
      _beginEquip(m,{equip:'donutbuild',equipMs:1600},false);
      for(let i=0;i<=33;i++){_equipStep(_equip,i/60);_updateDonutPuffs(1/60);}
      renderer.render(scene,camera);
    });
    const pixelCheck=await page.evaluate(()=>{
      renderer.render(scene,camera);
      const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
      const ctx=canvas.getContext('2d');ctx.drawImage(renderer.domElement,0,0,64,64);
      const pixels=ctx.getImageData(0,0,64,64).data, colors=new Set();
      for(let i=0;i<pixels.length;i+=4)colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);
      return colors.size;
    });
    assert(pixelCheck>32,'Mobile canvas is blank or missing geometry');
    await page.screenshot({path:'/tmp/donut-mobile.png'});
    assert.deepEqual(errors,[]);
    console.log('PASS:',result.tested.join(', '),'+ grenade; hinged equip/restoration; no ambient sprites; bounded golden trails.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
