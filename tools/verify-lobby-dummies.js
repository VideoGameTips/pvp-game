const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(()=>typeof spawnTrainingDummies==='function' && typeof TRAINING_DUMMIES!=='undefined');
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    console.log(await page.evaluate(()=>{
      const absent=()=>{for(const d of TRAINING_DUMMIES)if(d._mesh.visible || d._mesh.parent || remoteMeshes[d.id] || players[d.id])throw Error('Practice target leaked into '+activeMapName);};
      absent();activateMap('lobby13');
      const ids=TRAINING_DUMMIES.map(d=>d._mesh.uuid);
      const present=()=>{for(const d of TRAINING_DUMMIES)if(!d._mesh.visible || d._mesh.parent!==scene || remoteMeshes[d.id]!==d._mesh || !players[d.id]?.isDummy)throw Error('Lobby target missing');};
      present();spawnTrainingDummies();present();
      if(scene.children.filter(o=>o._dummy).length!==2)throw Error('Duplicate targets');
      const maps=['blank','volcano','range',...Object.keys(MAP_GROUPS).filter(n=>/tower/.test(n)).slice(0,2)];
      for(const map of maps){
        activateMap(map);absent();
        const d=TRAINING_DUMMIES[0],hp=d.hp;
        handleDummyHit(d,d._mesh,{damage:100},new THREE.Vector3());if(hp!==d.hp)throw Error('Invisible dummy takes damage');
        activateMap('lobby13');present();
        if(TRAINING_DUMMIES.some((d,i)=>d._mesh.uuid!==ids[i]))throw Error('Rebuilt targets on transition');
      }
      return {lobbyTargets:2,mapsChecked:maps};
    }));
    assert.deepEqual(errors,[]);console.log('PASS: lobby-only visibility, hit registration, map transitions and no duplicate meshes');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
