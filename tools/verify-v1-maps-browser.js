#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

(async()=>{
  const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const out=process.env.PVP_QA_OUT||'/tmp/pvp-v1-map-qa';
  fs.mkdirSync(out,{recursive:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL||'http://localhost:3001/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof buildV1Concept==='function'&&MAP_GROUPS.reactor,{timeout:90000});
    await page.evaluate(()=>{window.requestAnimationFrame=()=>0;});
    const audit=await page.evaluate(fs.readFileSync(path.join(__dirname,'v1-map-audit.js'),'utf8'));
    assert.deepEqual(audit.issues,[]);
    assert.deepEqual(audit.missing,[]);
    console.log('Real-browser movement:',JSON.stringify(audit.results));
    const frames=[];
    for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
      await page.setViewportSize(viewport);
      for(const id of ['zen_garden','shipbreak','reactor']) {
        const metrics=await page.evaluate(id=>{
          hideMapPick();
          document.querySelectorAll('body > :not(canvas)').forEach(e=>{e.style.display='none';});
          camera.children.forEach(c=>{if(!c.isLight)c.visible=false;});
          const before=MAP_COLLIDERS[id].length;
          activateMap(id);
          scene.children.forEach(o=>{if(o!==MAP_GROUPS[id]&&!o.isLight&&o!==camera)o.visible=false;});
          MAP_GROUPS[id].visible=true;
          scene.background.setHex(MAP_GROUPS[id]._skyColor);
          renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);
          camera.fov=55;camera.far=1500;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
          const b=MAP_BOUNDS[id],radius=Math.hypot(b.halfX,b.halfZ,10);
          const fov=Math.min(camera.fov*Math.PI/180,2*Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));
          const distance=radius/Math.sin(fov/2)*1.06;
          const direction=new THREE.Vector3(.65,1,.7).normalize();
          camera.position.copy(direction.multiplyScalar(distance));camera.lookAt(0,2,0);
          scene.updateMatrixWorld(true);renderer.render(scene,camera);
          const canvas=document.createElement('canvas');canvas.width=144;canvas.height=90;
          const ctx=canvas.getContext('2d',{willReadFrequently:true});
          ctx.drawImage(renderer.domElement,0,0,144,90);
          const pixels=ctx.getImageData(0,0,144,90).data,colors=new Set();let edge=0;
          for(let i=0;i<pixels.length;i+=4) {
            colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);
            if(i>=4)edge+=Math.abs(pixels[i]-pixels[i-4]);
          }
          return {id,colors:colors.size,edge:edge/(144*90),colliders:MAP_COLLIDERS[id].length,unchanged:before===MAP_COLLIDERS[id].length,drawCalls:renderer.info.render.calls,position:camera.position.toArray(),children:MAP_GROUPS[id].children.length};
        },id);
        assert(metrics.colors>50&&metrics.edge>.4,JSON.stringify(metrics));
        assert(metrics.unchanged,'activation altered '+id);
        await page.screenshot({path:path.join(out,`${id}-${viewport.width}.png`)});
        frames.push({...metrics,width:viewport.width});
        const aim=await page.evaluate(id=>{
          const s=MAP_SPAWNS[id].ally;
          camera.far=200;camera.fov=75;camera.updateProjectionMatrix();
          camera.position.set(0,PLAYER_EYE_HEIGHT,(s.z0+s.z1)/2);camera.lookAt(0,PLAYER_EYE_HEIGHT,0);
          const probe=document.createElement('canvas');probe.width=96;probe.height=60;
          const ctx=probe.getContext('2d',{willReadFrequently:true});
          const sample=()=>{
            scene.updateMatrixWorld(true);renderer.render(scene,camera);
            ctx.drawImage(renderer.domElement,0,0,96,60);
            return Array.from(ctx.getImageData(0,0,96,60).data);
          };
          const before=sample();camera.rotation.y+=.18;
          const after=sample(),changed=before.filter((v,i)=>v!==after[i]).length;
          camera.rotation.y-=.18;sample();
          return {changed,colors:new Set(before).size};
        },id);
        assert(aim.changed>500&&aim.colors>25,'first-person camera is blank or unresponsive: '+id);
        await page.screenshot({path:path.join(out,`${id}-spawn-${viewport.width}.png`)});
      }
      await page.evaluate(()=>showMapPick({mode:'5v5',options:mapPoolForMode('5v5'),vsBot:false,ms:120000,pickId:'v1-qa'}));
      for(const id of ['zen_garden','shipbreak','reactor']) {
        const card=page.locator(`[data-mp-map="${id}"]`);
        await card.scrollIntoViewIfNeeded();
        await page.waitForFunction(id=>{
          const img=document.querySelector(`[data-mp-map="${id}"] img`);
          return img&&img.complete&&img.naturalWidth>0;
        },id);
        const box=await card.boundingBox();
        assert(box&&box.x>=0&&box.x+box.width<=viewport.width+1,'map card overflows');
      }
      await page.screenshot({path:path.join(out,`map-vote-${viewport.width}.png`)});
      await page.locator('[data-mp-map="reactor"]').click();
      assert.equal(await page.evaluate(()=>_mapPick.mine),'reactor');
    }
    assert.deepEqual(errors,[]);
    console.log('Desktop/mobile canvas checks:',JSON.stringify(frames));
    console.log('First-person cameras respond; 5v5 map cards render previews and accept votes; screenshots:',out);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
