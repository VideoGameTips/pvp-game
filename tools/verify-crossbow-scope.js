const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');await page.waitForFunction(()=>typeof drawCrossbowScope==='function');
    for(const size of [{width:1280,height:800},{width:390,height:844}]) {
      await page.setViewportSize(size);const outputs={};
      for(const id of ['crossbow','srx']) {
        const result=await page.evaluate(id=>{
          currentWeaponIdx=WEAPONS.findIndex(w=>w.id===id);currentWeapon=WEAPONS[currentWeaponIdx];drawScope();
          const c=document.getElementById('scope-canvas'),ctx=c.getContext('2d'),pixels=ctx.getImageData(0,0,c.width,c.height).data;
          let red=0,green=0,clear=0;
          for(let i=0;i<pixels.length;i+=4){if(!pixels[i+3])clear++;if(pixels[i+3]>100&&pixels[i]>150&&pixels[i+1]<90&&pixels[i+2]<90)red++;if(pixels[i+3]>100&&pixels[i+1]>150&&pixels[i]<80)green++;}
          const sample=(dx,dy)=>Array.from(ctx.getImageData(Math.floor(c.width/2+dx),Math.floor(c.height/2+dy),1,1).data);
          return {style:c.dataset.scopeStyle,red,green,clear,center:sample(0,0),horizontal:sample(30,0),vertical:sample(0,30),open:sample(30,30),image:c.toDataURL()};
        },id);
        assert.equal(result.style,id==='srx'?'sniper':'crossbow');assert(result.clear>10000);
        if(id==='crossbow'){
          assert(result.red>15);assert.equal(result.green,0);assert(result.center[0]>200);
          assert.deepEqual(result.horizontal,[0,0,0,255]);assert.deepEqual(result.vertical,[0,0,0,255]);assert.equal(result.open[3],0);
        }else assert(result.green>100);
        outputs[id]=result;fs.writeFileSync('/tmp/'+id+'-scope-'+size.width+'.png',Buffer.from(result.image.split(',')[1],'base64'));
      }
      assert.notEqual(outputs.crossbow.image,outputs.srx.image);console.log(size.width,{crossbowClear:outputs.crossbow.clear,sniperClear:outputs.srx.clear});
    }
    const check=await page.evaluate(()=>{
      currentWeapon={...WEAPONS.find(w=>w.id==='crossbow'),id:'crossbow_test_skin',baseId:'crossbow'};drawScope();
      return {style:document.getElementById('scope-canvas').dataset.scopeStyle,optic:!!weaponModels[WEAPONS.findIndex(w=>w.id==='crossbow')]._sightLine};
    });assert.equal(check.style,'crossbow');assert(check.optic);
    assert.deepEqual(errors,[]);console.log('PASS: distinct reticles, transparent sights, responsive canvas, skin base and mounted optic');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
