const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');await page.waitForFunction(()=>typeof supportRechargeUntil!=='undefined');
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    console.log(await page.evaluate(()=>{
      let now=1000000,complete;Date.now=()=>now;const native=setTimeout;
      window.setTimeout=(fn,ms,...args)=>{if(ms===2500){complete=fn;return 12345678;}return native(fn,ms,...args);};
      gameStarted=true;isDead=false;inLobby=false;countdownActive=false;activeSlot='support';match={type:'tdm',roundActive:true};
      equipReady=()=>true;adminInfiniteAmmoActive=()=>false;startUseAnim=()=>0;spawnHitParticle=()=>{};playSoundEvent=()=>{};
      const emitted=[];socket.emit=(event,data)=>emitted.push({event,data});players[myId]={hp:50,team:'ally'};
      selectedSupportIdx=SUPPORT_ITEMS.findIndex(s=>s.id==='medkit');const index=selectedSupportIdx,item=SUPPORT_ITEMS[index];
      supportUses[index]=0;trySupport();
      if(!medkitHealChannel || supportUses[index]!==0 || supportRechargeUntil.medkit!==now+20000)throw Error('Not a reusable 20s medkit');
      updateWeaponHUD();if(document.getElementById('ammo-count').textContent!=='HEALING')throw Error('No healing HUD');
      now+=2500;complete();if(players[myId].hp!==150)throw Error('Healing changed from 100');
      const healEvents=emitted.filter(e=>e.event==='healSelf').length;trySupport();if(medkitHealChannel || emitted.filter(e=>e.event==='healSelf').length!==healEvents)throw Error('Cooldown bypass');
      updateWeaponHUD();if(document.getElementById('ammo-count').textContent!=='18s')throw Error('No cooldown countdown');
      now+=17500;lastSupport=now-1;trySupport();if(!medkitHealChannel)throw Error('Other utility blocked recharged medkit');
      const stale=complete;cancelMedkitHeal('interrupted by damage');stale();if(players[myId].hp!==150)throw Error('Interrupted healing completed');
      adminInfiniteAmmoActive=()=>true;trySupport();if(medkitHealChannel)throw Error('Infinite ammo bypassed medkit cooldown');
      adminInfiniteAmmoActive=()=>false;now+=20000;updateWeaponHUD();if(document.getElementById('ammo-count').textContent!=='READY')throw Error('No ready HUD');
      trySupport();if(!medkitHealChannel)throw Error('Cannot reuse after interruption');cancelMedkitHeal();
      selectedSupportIdx=SUPPORT_ITEMS.findIndex(s=>s.id==='stim');supportUses[selectedSupportIdx]=1;lastSupport=0;trySupport();if(supportUses[selectedSupportIdx]!==0)throw Error('Other utilities became unlimited');
      selectedPrimaryIdx=null;resetCombatResources();if(Object.keys(supportRechargeUntil).length)throw Error('Recharge survived combat reset');
      gameStarted=false;return {heal:100,channelMs:item.healTime,cooldownMs:item.cooldown,reusable:true,interruptible:true};
    }));
    assert.deepEqual(errors,[]);console.log('PASS: reusable medkit, timed heal, interruption, independent recharge, HUD, other utilities and reset');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
