const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:820},hasTouch:width<500});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL||'http://localhost:3001/');
      await page.waitForFunction(()=>{try{return DAMAGE_FLASH_MS===50&&!!window.PVP_BATTLE_SIM;}catch{return false;}});
      const result=await page.evaluate(()=>{
        const check=(v,m)=>{if(!v)throw Error(m);};
        requestAnimationFrame=()=>0;
        const original=new THREE.MeshStandardMaterial({color:0x222222}),group=new THREE.Group();
        const torso=new THREE.Mesh(new THREE.BoxGeometry(.6,.8,.3),original);
        const head=new THREE.Mesh(new THREE.BoxGeometry(.4,.4,.4),[original,original,original,original,original,original]);
        head.position.y=.65;group.add(torso,head);group._rig={head,torso};
        const other=new THREE.Mesh(new THREE.BoxGeometry(.6,.8,.3),original),oldHead=head.material;
        const oldSet=window.setTimeout,oldClear=window.clearTimeout,oldSound=playSoundEvent;
        const timers=new Map(),sounds=[];let serial=0;
        window.setTimeout=(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;};
        window.clearTimeout=id=>timers.delete(id);
        try{
          flashDamagedCharacter(group);
          check(torso.material!==original&&torso.material.color.getHex()===0xff3333,'Body not red');
          check(head.material.every(m=>m.color.getHex()===0xff3333),'Face materials not red');
          check(other.material===original&&original.color.getHex()===0x222222,'Shared character material mutated');
          flashDamagedCharacter(group);
          check(timers.size===1&&[...timers.values()][0].ms===50,'Hits do not restart a single 50ms timer');
          const renderer=new THREE.WebGLRenderer({preserveDrawingBuffer:true});renderer.setSize(320,240);
          const stage=new THREE.Scene();stage.add(group,new THREE.HemisphereLight(0xffffff,0xffffff,2));
          const view=new THREE.PerspectiveCamera(40,320/240,.01,10);view.position.set(1,1,3);view.lookAt(0,.3,0);
          renderer.render(stage,view);const gl=renderer.getContext(),px=new Uint8Array(320*240*4);
          gl.readPixels(0,0,320,240,gl.RGBA,gl.UNSIGNED_BYTE,px);
          let red=0;for(let i=0;i<px.length;i+=4)if(px[i]>150&&px[i]>px[i+1]*1.4&&px[i]>px[i+2]*1.4)red++;
          check(red>200,'Red flash not visible on canvas');renderer.dispose();
          const corpse=group.clone(true);group._ragdoll={visual:corpse};
          [...timers.values()][0].fn();
          check(torso.material===original&&head.material===oldHead&&!damagedCharacterFlashes.has(group),'Original materials not restored');
          check(corpse.children[0].material===original&&corpse.children[1].material.every(m=>m===original),'Ragdoll retained red materials');
          delete group._ragdoll;
          const victim={id:'flash-test',hp:100,team:'red'},attacker={id:'flash-source',team:'blue'};
          remoteMeshes[victim.id]=group;
          PVP_BATTLE_SIM.damage(victim,attacker,10,'ak20');
          check(victim.hp===90&&damagedCharacterFlashes.has(group),'Simulator damage lacks flash');
          restoreDamageFlash(group);delete remoteMeshes[victim.id];
          playSoundEvent=(name,opts)=>sounds.push({name,opts});HITMARKER.volume=1;
          playHitConfirmSound('head');playHitConfirmSound('head');playHitConfirmSound('hit');
          check(sounds.map(s=>s.name).join(',')==='hm_head,hm_body,hm_head,hm_body,hm_body','Headshot and body sounds not layered');
          check(sounds.every(s=>s.opts.minGap===0),'Stacked sounds throttled');
          return {red};
        }finally{
          restoreDamageFlash(group);window.setTimeout=oldSet;window.clearTimeout=oldClear;playSoundEvent=oldSound;
        }
      });
      assert.deepEqual(errors,[]);console.log(width+': red pixels '+result.red+', 50ms refresh, material restoration, simulator, layered and stacking headshot audio passed');
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
