const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    for (const width of [1280,390]) {
      const page=await browser.newPage({viewport:{width,height:840}}), errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',e=>{if(/shader error|\[model skin\]/i.test(e.text()))errors.push(e.text());});
      await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
      await page.waitForFunction(()=>typeof MILITECH_GUN_SKINS!=='undefined' && typeof SKIN_FX!=='undefined');
      await page.evaluate(()=>{
        const ok=(test,msg)=>{if(!test)throw Error(msg);};
        requestAnimationFrame=()=>0;
        currentUser={username:'Militech Test',purchased:[],skinInventory:[]};
        const contact=document.createElement('canvas');contact.width=960;contact.height=530;
        const pen=contact.getContext('2d');pen.fillStyle='#171e27';pen.fillRect(0,0,960,530);
        const renderer=new THREE.WebGLRenderer({preserveDrawingBuffer:true,antialias:true});renderer.setSize(320,112);
        const stage=new THREE.Scene();stage.background=new THREE.Color(0x263744);
        stage.add(new THREE.HemisphereLight(0xffffff,0xb0bed6,2));
        const light=new THREE.DirectionalLight(0xffecd8,2.7);light.position.set(2,4,-1);stage.add(light);
        const eye=new THREE.PerspectiveCamera(36,320/112,.01,10);
        const savedClock=performance.now.bind(performance);let seconds=savedClock()/1000;
        performance.now=()=>seconds*1000;
        function capture(model,x,y,distance){
          stage.add(model);model.visible=true;model.position.set(0,0,0);model.rotation.set(0,0,0);
          eye.position.set(.73*distance,.34*distance,-.18*distance);eye.lookAt(0,.027,-.060);
          renderer.render(stage,eye);pen.drawImage(renderer.domElement,x,y);
          const rgba=pen.getImageData(x+14,y+9,292,95).data;
          const colors=new Set(), bg=rgba[0]*65536+rgba[1]*256+rgba[2];let n=0;
          for(let j=0;j<rgba.length;j+=4){const p=rgba[j]*65536+rgba[j+1]*256+rgba[j+2];if(p!==bg){n++;colors.add(p);}}
          ok(n>400&&colors.size>60,'Blank render: '+model.name);
          stage.remove(model);
        }
        MILITECH_GUN_SKINS.forEach((s,i)=>{
          const idx=WEAPONS.findIndex(w=>w.id===s.weapon), w=WEAPONS[idx], stock=weaponModels[idx];
          ok(GEN3_SKIN_DEFS.includes(s)&&isCaseSkinLocked(s),s.id+': missing gate');
          setModelSkin(w.id,s.id);ok(weaponModels[idx]===stock,s.id+': locked model applied');
          currentUser.skinInventory.push(s.id);setModelSkin(w.id,s.id);
          finishEquip();
          const m=weaponModels[idx];m.name=s.id;
          ok(m!==stock&&effectiveGunStats(w)===w&&!_modelSkinLook[w.id]&&!SKIN_FX[s.id].reload,s.id+': stats changed');
          ok(m._stockShotOrigin.equals(stock._flash.position)&&m._adsSightPose===weaponSightPose(stock),s.id+': stock sight/origin mismatch');
          const get=n=>m.getObjectByName(n);
          const tick=(time=.016)=>{seconds+=time;m._tick(time,seconds,false);};
          const action=(progress,inspect)=>{m._inspectMode=inspect;m._reloadDur=1800;m._reloadStart=Date.now()-1800*progress;tick();};
          const part=get(['railbreaker-rail','phantom-camo-panel','tempest-barrel-0','blackbox-cell-0','ghost-lance-armor-0','zero-recoil-counterweight'][i]);
          ok(part,s.id+': missing signature part');
          m._calm();m.traverse(n=>ok(n.position.toArray().every(Number.isFinite),s.id+': invalid transform'));
          const x=i%3*320,y=Math.floor(i/3)*265,distance=[1.16,.98,1.08,.76,.88,.87][i];
          capture(m,x,y+23,distance);
          const home=part.position.clone();
          if(i===4)m._javelinLaunchPose();else m._onFire();
          if(i===2){for(let j=0;j<9;j++){m._onFire();tick(.030);}}else tick(.014);
          ok(part.position.distanceTo(home)>.004,s.id+': fire did not move signature component');
          if(i===0)ok(get('railbreaker-arc').visible,'No rail discharge');
          if(i===4)ok(m._flash.position.equals(stock._flash.position),'Javelin launch origin changed');
          tick(.62);
          if(i!==2){
            action(.45,false);
            if(i===0)ok(get('railbreaker-tungsten').visible,'Tungsten projectile not visible during reload');
            if(i===1)ok(Math.abs(part.position.x)>Math.abs(home.x)+.015,'Phantom mag well stayed covered');
            if(i===3)ok(get('blackbox-cylinder').position.y>.066,'Blackbox cylinder did not lift');
            if(i===4)ok(get('ghost-lance-next-missile').visible,'Ghost Lance reload has no missile');
            if(i===5)ok(get('zero-recoil-top-mag').position.y>.085,'P90 top magazine did not clear');
          }
          if(i===1){
            const shell=part.children[0]; action(.30,true);const desert=shell.material;action(.50,true);const urban=shell.material;action(.71,true);
            ok(desert!==urban&&shell.material!==urban&&shell.material!==desert,'Phantom did not cycle three camouflages');
          }
          action(.51,true);
          if(i===2)ok(get('tempest-stabilizer').visible,'Iron Tempest stabilizers did not deploy');
          if(i===3||i===5)ok(get('militech-diagnostic').visible,'Missing diagnostic');
          if(i===4)ok(get('ghost-lance-reticle').visible,'Missing Ghost Lance reticle');
          capture(m,x,y+140,distance);
          pen.fillStyle='#f5f8fb';pen.font='bold 15px sans-serif';pen.fillText(s.name,x+12,y+17);
          pen.font='11px sans-serif';pen.fillText('INSPECT',x+12,y+153);
          m._inspectMode=false;m._reloadStart=0;m._calm();
          ok(part.position.distanceTo(home)<.00001,s.id+': animation failed to reset');
        });
        renderer.dispose();performance.now=savedClock;
        contact.style.cssText='position:fixed;inset:0;margin:auto;width:min(100vw,960px);height:auto;z-index:99999';document.body.append(contact);
      });
      assert.deepEqual(errors,[]);
      if(process.env.WRAP_PREVIEW_DIR)await page.screenshot({path:process.env.WRAP_PREVIEW_DIR+'/militech-'+width+'.png'});
      console.log(width+'px: six Militech skins gated, rendered, and animated with stock gameplay');
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
