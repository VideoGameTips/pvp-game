const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    for (const width of [1280,390]) {
      const page = await browser.newPage({viewport:{width,height:820},hasTouch:width<500});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(() => typeof updateItemInspect==='function' && !!MELEE_MODEL_SKINS_BY_BASE.scythe);
      const result=await page.evaluate(width=>{
        const check=(value, message)=>{if(!value)throw Error(message);};
        const wait=window.requestAnimationFrame;
        let frame;
        window.requestAnimationFrame=fn=>{frame=fn;return 1;};
        let time=performance.now();
        const originalNow=performance.now;
        performance.now=()=>time;
        try {
          const id='scythe_bloodstorm';
          const skin=GEN3_SKIN_DEFS.find(s=>s.id===id);
          check(skin?.rarity==='legendary' && isCaseSkinLocked(skin),'Missing legendary ownership gate');
          currentUser={username:'Bloodstorm test',purchased:[],skinInventory:[id,'katana_tidal_fang']};
          setMeleeModelSkin('scythe',id);
          selectedMeleeIdx=MELEE_ITEMS.findIndex(w=>w.id==='scythe');
          activeSlot='melee';
          const model=meleeModels[selectedMeleeIdx], item=MELEE_ITEMS[selectedMeleeIdx], hand=model._hands;
          check(model===skin._model && !hand.single && effectiveMeleeItem(item)===item,'Incorrect model, grip or stats');
          check(_skinHitId('scythe')===id && _hasSkinFinisher(id),'Finisher cannot reach other clients');
          model.visible=true; meleeSwingT=1;
          startMeleeEquipAnim(selectedMeleeIdx);
          finishEquip();
          const blade=model.getObjectByName('bloodstorm-blade-1'), far=model.getObjectByName('bloodstorm-blade--1'), tether=model.getObjectByName('bloodstorm-tether');
          check(blade.parent===far.parent && blade.parent.children.length===3, 'Blades should be independent and have no solid handle or hub');
          check(tether.children.length===2 && tether.children.every(c=>c.visible && c.geometry.attributes.position.count>40),'Missing black/crimson tether');
          model._tick(0,time/1000,false);
          const q1=blade.quaternion.clone(), q2=far.quaternion.clone(), z1=blade.position.z, z2=far.position.z;
          time+=250;model._tick(.25,time/1000,false);
          check(Math.abs(q1.angleTo(blade.quaternion)-Math.PI/2)<.01 && Math.abs(q2.angleTo(far.quaternion)-Math.PI/2)<.01,'Idle is not one revolution per second');
          check(blade.position.distanceTo(hand.rear.position)<.07 && far.position.distanceTo(hand.front.position)<.07,'Each blade should sit at its own hand');
          check(startItemInspect(),'Inspect did not start');
          for (const [p, first, other] of [[.24,blade,far],[.70,far,blade]]) {
            itemInspect.t0=time-p*itemInspect.ms;updateItemInspect();
            check(first.position.y>other.position.y+.07,'Inspect must raise the right blade, then the left');
          }
          cancelItemInspect();
          check(Math.abs(blade.position.z-z1)<.001 && Math.abs(far.position.z-z2)<.001,'Cancel inspect did not reset both hands');

          gameStarted=true;isDead=false;inLobby=true;countdownActive=false;equipReadyAt=0;lastMelee=0;
          tryMelee();
          check(meleeSwingT===0 && meleeSwingDur===Math.min(540,item.cooldown*.95),'Slash changed stock timing');
          const step=p=>{time+=16;updateMeleeSwing((p-meleeSwingT)*meleeSwingDur/1000);};
          step(.23);
          check(blade.position.z<z1-.55 && Math.abs(far.position.z-z2)<.01,'First slash must lead with the right blade');
          step(.46);
          check(blade.position.z<z1-.53 && far.position.z<z2-.55,'Second blade must follow the first before retrieval');
          const core=tether.children[0].geometry.attributes.position;
          check(Math.abs(core.getZ(0)-blade.position.z)<.007 && Math.abs(core.getZ(core.count-1)-far.position.z)<.007,'Tether did not follow the thrown blades');
          step(1);
          check(Math.abs(blade.position.z-z1)<.001 && Math.abs(far.position.z-z2)<.001,'Both blades must return by the end of the slash');
          model._onSwing();meleeSwingT=0;step(.23);
          check(far.position.z<z2-.55 && blade.position.z===z1,'Next slash did not alternate its leading hand');
          startScytheDash(item,item.ability);step(.46);
          check(blade.position.z===z1 && far.position.z===z2,'Normal dash should not throw blades');
          check(scytheDash.left===item.ability.distance,'Dash did not keep the stock distance');
          finishScytheDash(false);slamState=null;step(1);
          const target=new THREE.Group();remoteMeshes.fx_test=target;
          check(playBloodstormFinisher('fx_test'),'Missing elimination effect');
          check(playBloodstormFinisher('fx_test'),'Elimination echo was not consumed');
          time+=700;frame();
          delete remoteMeshes.fx_test;

          const stage=new THREE.Scene();stage.background=new THREE.Color(0x2e323a);
          stage.add(new THREE.HemisphereLight(0xfaf4ff,0x8591a9,2.5));
          const light=new THREE.DirectionalLight(0xffe3e7,2.6);light.position.set(2,3,1);stage.add(light);
          const prize=skin.build();attachEquipmentHands(prize,item);prize._calm();
          const view=new THREE.PerspectiveCamera(camera.getEffectiveFOV(),width/820,.01,10);view.add(prize);stage.add(view);
          const preview=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
          preview.setSize(width,820);document.body.appendChild(preview.domElement);
          preview.domElement.style.cssText='position:fixed;left:0;top:0;z-index:99999';
          preview.render(stage,view);
          const data=new Uint8Array(width*820*4),gl=preview.getContext();
          gl.readPixels(0,0,width,820,gl.RGBA,gl.UNSIGNED_BYTE,data);
          let red=0, sides=[0,0];
          for(let i=0;i<data.length;i+=4)if(data[i]>95 && data[i]>data[i+1]+40 && data[i]>data[i+2]+15){red++;sides[i/4%width<width/2?0:1]++;}
          check(red>50 && sides.every(n=>n>20),'Missing crimson lightning on either side of the viewport');
          const png=preview.domElement.toDataURL().split(',')[1];
          preview.dispose();

          model.visible=false;
          setMeleeModelSkin('katana','katana_tidal_fang');
          selectedMeleeIdx=MELEE_ITEMS.findIndex(w=>w.id==='katana');
          const katana=meleeModels[selectedMeleeIdx];
          const sword=katana._heldItem || katana.children[0], rest=sword.quaternion.clone();
          katana.visible=true;meleeAbilityBuff={type:'deflect',endTime:Date.now()+4000};
          katana._fangDeflect(false);
          time+=100;frame();
          const initial=sword.quaternion.clone();
          time+=10;frame();
          const slow=initial.angleTo(sword.quaternion);
          for(let i=0;i<16;i++)katana._fangDeflect(true);
          const max=sword.quaternion.clone();
          time+=10;frame();
          const fast=max.angleTo(sword.quaternion);
          check(Math.abs(slow-3*Math.PI*2*.01)<.02 && Math.abs(fast-13*Math.PI*2*.01)<.02,'Incorrect katana spin ramp: '+[slow,fast]);
          meleeAbilityBuff=null; time+=10;frame();time+=160;frame();
          check(sword.quaternion.angleTo(rest)<.001,'Katana guard did not settle');
          return {png,red};
        } finally {
          window.requestAnimationFrame=wait;
          performance.now=originalNow;
        }
      },width);
      assert.deepEqual(errors,[]);
      if(process.env.BLOODSTORM_PREVIEW_DIR)fs.writeFileSync(process.env.BLOODSTORM_PREVIEW_DIR+'/bloodstorm-'+width+'.png',Buffer.from(result.png,'base64'));
      console.log(width+': Bloodstorm idle spin, alternating throws, tether, stock dash, inspect, elimination and katana regression; '+result.red+' red pixels');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
