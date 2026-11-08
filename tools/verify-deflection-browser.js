const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL||'http://localhost:3001/');
    await page.waitForFunction(()=>myId&&typeof reflectBotShotAtPlayer==='function'&&typeof BOSS_DEFS!=='undefined'&&BOSS_DEFS.arsenal);
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    const result=await page.evaluate(()=>{
      const check=(ok,msg)=>{if(!ok)throw Error(msg);},events=[],emit=socket.emit,shield=isShielded,walls=wallColliders.splice(0);
      socket.emit=(name,data)=>{events.push({name,data});return socket;};isShielded=()=>false;
      try{
        gameStarted=true;inLobby=false;isDead=false;adminCheats.godMode=false;
        selectedModeConfig=GAME_MODE_CONFIGS.boss_arsenal;initMatch();match.active=true;match.roundActive=true;
        players[myId].team='ally';players[myId].hp=400;camera.position.set(25,1.65,35);window._crouchEye=1.65;
        meleeAbilityBuff=null;startBossFight();const B=match.boss;
        function clear(){for(const b of localBullets)b.mesh.removeFromParent();localBullets.length=0;B.def.cleanup(B);}
        B.shield=true;const before=players[myId].hp;
        emitHit(B.bot.id,'boss_reflect_test','ak20',new THREE.Vector3(0,4,0));
        const returned=Math.round(getClientWeaponDamage('ak20')*falloffMultiplier('ak20',camera.position.distanceTo(new THREE.Vector3(0,4,0))));
        check(players[myId].hp===before-returned,'Boss reflection did not damage player');
        check(localBullets.some(b=>b.visualOnly&&b.weaponId==='ak20'),'No native reflected bullet visual');
        for(let i=0;i<120;i++)updateBullets(1/120);
        check(players[myId].hp===before-returned,'Boss reflection damaged twice');clear();
        const bot={id:'guard_test',x:5,y:0,z:5,hp:300,maxHp:300,team:'enemy',dead:false,weaponId:'ak20',meleeId:'katana',difficulty:'hard',_lastHitAt:Date.now(),_meleeAbilityAt:0};
        players[bot.id]={...bot,isBot:true};gameBots.push(bot);
        const model=makePlayerMesh('Guard',true,'enemy','default');model.position.set(5,0,5);scene.add(model);remoteMeshes[bot.id]=model;
        tickBotMeleeAbility(bot,{isPlayer:true,x:camera.position.x,z:camera.position.z},1/60,Date.now(),true);
        check(bot._deflectUntil>Date.now()&&bot._regularMelee?.guard,'Regular bot did not activate katana');
        players[myId].hp=400;emitHit(bot.id,'bot_reflect_test','ak20',new THREE.Vector3(5,1,5));
        const botReturn=Math.round(getClientWeaponDamage('ak20')*falloffMultiplier('ak20',camera.position.distanceTo(new THREE.Vector3(5,1,5))));
        check(players[myId].hp===400-botReturn&&bot.hp===300,'Regular bot failed to reflect into player');clear();
        bot._deflectUntil=0;bot._regularMelee=null;
        bot.weaponId='katana';players[myId].hp=400;events.length=0;                                  // a bot with a katana in its hand that has NOT used its Deflect returns nothing either
        emitHit(bot.id,'idle_bot_katana','ak20',new THREE.Vector3(5,1,5));
        check(players[myId].hp===400&&events.some(e=>e.name==='hitBot'&&e.data.botId===bot.id),'A bot holding a katana returned a shot without using its Deflect');
        bot.weaponId='ak20';clear();
        const human='human_shooter';players[human]={id:human,team:'enemy',hp:300,x:10,y:1.65,z:10};
        const humanMesh=new THREE.Group();humanMesh.position.set(10,0,10);scene.add(humanMesh);remoteMeshes[human]=humanMesh;
        events.length=0;reflectDamageToShooter(human,'ak20','pvp_test');
        check(events.some(e=>e.name==='hit'&&e.data.targetId===human&&e.data.weapon==='ak20'),'Player reflection still only hits bots');
        check(!events.some(e=>e.name==='hitBot'),'Player reflection chose an unrelated bot');
        players[myId].hp=400;meleeAbilityBuff={type:'deflect',endTime:Date.now()+2000};
        const w=projectileWeaponSpec('ak20');
        spawnLocalBullet(new THREE.Vector3(25,1.16,25),new THREE.Vector3(0,0,1),'incoming_guard',false,w.bulletSpeed,w.bulletColor,w.bulletSize,w.id,{botId:bot.id,botTeam:'enemy'});
        for(let i=0;i<120;i++)updateBullets(1/120);
        check(players[myId].hp===400&&bot.hp<300,'Player failed to block/return a native bot bullet');
        meleeAbilityBuff=null;clear();
        selectedMeleeIdx=MELEE_ITEMS.findIndex(m=>m.id==='katana');activeSlot='melee';
        bot.hp=300;players[bot.id].hp=300;players[myId].hp=400;
        meleeAbilityBuff=null;                                              // held, with its Deflect NOT on: just a blade, the shot is an ordinary hit
        botHitsMe(bot.id,'srx',true);
        check(players[myId].hp===210&&bot.hp===300,'An idle katana returned a shot, or was not hit like anybody else: '+JSON.stringify({me:players[myId].hp,bot:bot.hp}));
        bot.hp=300;players[bot.id].hp=300;players[myId].hp=400;
        meleeAbilityBuff={type:'deflect',endTime:Date.now()+1000,extendPer:100,extendLeft:2000};     // the Deflect on: now it returns the full 190 headshot
        botHitsMe(bot.id,'srx',true);
        check(players[myId].hp===400&&bot.hp===110,'The katana did not return the full 190 headshot damage while its Deflect was on');
        check(holdingReflectKatana()===true,'The katana is not reflecting while its Deflect is on');
        meleeAbilityBuff.endTime=Date.now()-1;                              // the window has run out (the frame loop clears the buff a frame later): idle again
        check(holdingReflectKatana()===false,'The katana kept reflecting after its window ran out');
        meleeAbilityBuff=null;check(holdingReflectKatana()===false,'A katana with no Deflect reflects');
        meleeAbilityBuff={type:'deflect',endTime:Date.now()+1000};activeSlot='primary';check(holdingReflectKatana()===false,'The katana reflects while it is not in the hand');activeSlot='melee';
        meleeAbilityBuff={type:'parry',endTime:Date.now()+1000};check(holdingReflectKatana()===false,'Another guard counts as the katana Deflect');
        meleeAbilityBuff={type:'deflect',endTime:Date.now()+1000,extendPer:100,extendLeft:2000};
        B.shield=true;players[myId].hp=400;B.nativeReflectAt=0;
        emitHit(B.bot.id,'loop_test','ak20',new THREE.Vector3(0,4,0),false,{damageOverride:123});
        check(players[myId].hp===277,'Reflected damage did not transfer exactly once through another katana');clear();
        meleeAbilityBuff=null;activeSlot='primary';
        const damages=[];
        for(const eye of [1.65,.7]){
          isDead=false;players[myId].hp=400;events.length=0;window._crouchEye=eye;camera.position.set(25,eye,35);
          const attack=B.def.attacks.sniper(B);attack.tick(1.99);
          check(localBullets.length===0,'Sniper fired before two seconds');
          camera.position.x+=6;attack.tick(.02);
          check(localBullets.length===1,'Sniper failed to shoot');
          for(let i=0;i<240;i++)updateBullets(1/240);
          const expected=Math.round(getClientWeaponDamage('srx')*headshotMultFor('srx'));
          check(players[myId].hp===400-expected,'Sniper missed head: '+JSON.stringify({eye,hp:players[myId].hp,expected}));
          check(events.some(e=>e.name==='botHitMe'&&e.data.headshot),'Sniper hit not reported as headshot');
          damages.push(expected);clear();
        }
        return {bossReturnDamage:returned,noDoubleDamage:true,idleKatanaReturnsNothing:true,katanaReturnsWhileOn:true,fullHeadshotReturned:190,noReflectionLoops:true,regularBotDeflect:true,playerToPlayerReturn:true,playerToBotReturn:true,standingAndCrouchingHeadshots:damages,trackingSeconds:2};
      }finally{socket.emit=emit;isShielded=shield;wallColliders.length=0;wallColliders.push(...walls);}
    });
    assert.deepEqual(errors,[]);console.log('PASS',result);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
