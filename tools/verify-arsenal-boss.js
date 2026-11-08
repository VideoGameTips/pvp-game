const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:850}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVP_TEST_URL || 'http://localhost:3001/');
    await page.waitForFunction(()=>myId && typeof BOSS_DEFS !== 'undefined' && BOSS_DEFS.arsenal);
    await page.evaluate(()=>{requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
    const result = await page.evaluate(()=>{
      const check=(condition,message)=>{if(!condition)throw Error(message);};
      const emit=socket.emit,now=Date.now,events=[];let clock=now();
      socket.emit=(name,data)=>{events.push({name,data});return socket;};Date.now=()=>clock;
      try {
        document.getElementById('overlay').style.display='none';document.body.classList.remove('login-open');
        check(ARCHIVED_MODES.has('boss_hydra')&&BOSS_DEFS.hydra,'Hydra was deleted rather than archived');
        check(!document.querySelector('[data-mode="boss_hydra"]')&&document.querySelector('[data-mode="boss_arsenal"]'),'Wrong boss menu');
        gameStarted=true;inLobby=false;isDead=false;activateMap('boss_arena');
        selectedModeConfig=GAME_MODE_CONFIGS.boss_arsenal;
        const kit=defaultLoadoutIdx();selectedPrimaryIdx=kit.p;selectedSecondaryIdx=kit.s;selectedMeleeIdx=kit.m;selectedSupportIdx=kit.u;
        currentWeaponIdx=kit.p;currentWeapon=WEAPONS[kit.p];activeSlot='primary';
        initMatch();match.active=true;match.roundActive=true;
        camera.position.set(20,1.65,38);players[myId].hp=400;players[myId].dead=false;
        startBossFight();const B=match.boss,U=B.robot.userData;
        check(B.bot.hp===7500,'Wrong HP');
        check(U.uzis.length===3&&U.rockets.length===5&&U.launchers.length===2&&U.bottles.length===10&&U.sniper&&U.sword,'Loadout mismatch');
        function tickAttack(name,seconds){const attack=B.def.attacks[name](B);for(let t=0;t<seconds;t+=1/120){clock+=1000/120;B.def.anim(B,1/120);attack.tick(1/120);}return attack;}
        function clear(){B.def.cleanup(B);}
        tickAttack('uzis',11.1);check(localBullets.length===62&&localBullets.every(b=>b.weaponId==='machine_pistol'&&!b.isOwn&&b.botId===B.bot.id),'Uzis are not native bullets');clear();
        const sniper=B.def.attacks.sniper(B);sniper.tick(.5);
        const laser=B.nativeWarnings[0],before=[...laser.geometry.attributes.position.array];
        camera.position.x+=5;sniper.tick(.5);
        check(before.some((n,i)=>Math.abs(n-laser.geometry.attributes.position.array[i])>.1),'Laser did not track');
        sniper.tick(.99);check(localBullets.length===0&&B.nativeWarnings.length===2,'Sniper fired before 2 seconds');
        camera.position.x+=4;sniper.tick(.02);
        check(localBullets.length===1&&localBullets[0].weaponId==='srx'&&B.nativeWarnings.length===0,'Sniper did not fire after tracking');
        const shot=localBullets[0],head=camera.position.clone().setY(camera.position.y-.03);
        const closest=new THREE.Ray(shot.mesh.position,shot.dir).closestPointToPoint(head,new THREE.Vector3());
        check(closest.distanceTo(head)<.001&&shot.preciseHeadshot,'Sniper did not aim at current head position');clear();
        tickAttack('rockets',4);check(localBullets.length===5&&localBullets.every(b=>projectileKind(b.weaponId)==='rocket'&&b._arc&&b.dir.y>0)&&!B.nativeWarnings.length,'RPG salvo wrong');clear();
        tickAttack('grenades',3);check(localBullets.length===2&&localBullets.every(b=>b.weaponId==='grenade_launcher'),'Grenade launchers wrong');clear();
        tickAttack('molotovs',27);
        check(activeGrenades.length===30&&activeGrenades.every(g=>g.mesh.isGroup&&g.mesh.children.length>=5&&g.itemRef.id==='molotov'&&g.ownerId===B.bot.id),'Molotovs are fake orbs');
        check(U.bottles.every(b=>!b.visible),'Used bottles remained on rack');
        const bottle=activeGrenades[0];bottle.mesh.position.set(B.bot.x,0,B.bot.z);explodeSupport(bottle);
        const hpBeforeFire=B.bot.hp;updateBurnZones(.2);check(B.bot.hp===hpBeforeFire,'Boss burns itself');
        check(burnZones.some(z=>z.molotov&&z.ownerId===B.bot.id),'Molotov failed to create native fire');clear();
        B.observedHp=B.bot.hp;B.bot.hp-=20;B.def.updateDefense(B,clock);
        const due=B.deflectAt;check(due===clock+1000&&!B.shield,'Katana activated too early');
        clock=due-1;B.def.updateDefense(B,clock);check(!B.shield,'Katana delay too short');
        clock=due;B.def.updateDefense(B,clock);check(B.shield&&B.shieldUntil===clock+3000&&!B.shieldMesh,'Wrong katana duration or bubble');
        const shieldHp=B.bot.hp;emitHit(B.bot.id,'test_deflect','ak20',_bossWorld(B.mesh).setY(4));
        check(B.bot.hp===shieldHp&&localBullets.some(b=>b.weaponId==='ak20'),'Katana failed to block/reflect a real bullet');
        check(!B.def.blockHit(B,new THREE.Vector3(0,4,0),'rpg',{}),'Katana incorrectly reflects rockets');
        clock+=2999;B.def.updateDefense(B,clock);check(B.shield,'Katana ended early');
        clock++;B.def.updateDefense(B,clock);check(!B.shield,'Katana did not end');clear();
        players[myId].hp=173;weaponAmmo[selectedPrimaryIdx]={ammo:0,reserve:0};
        const util=selectedSupportIdx;supportUses[util]=0;supportRechargeUntil.medkit=clock+30000;
        pendingEnvironmentDamage.push({amount:7,at:clock});
        const pending=pendingEnvironmentDamage.length;
        bossPhaseUp(B,2);
        check(players[myId].hp===173&&!events.some(e=>e.name==='healSelf'),'Phase change healed player');
        check(weaponAmmo[selectedPrimaryIdx].ammo===applyUpgrades(WEAPONS[selectedPrimaryIdx]).mag,'Phase did not refill ammo');
        check(supportUses[util]===0&&supportRechargeUntil.medkit>clock&&pendingEnvironmentDamage.length===pending,'Phase reset more than bullets');
        // Exercise the real updateBoss scheduler at phase three: warnings must
        // not speed up when the boss has low HP.
        B.bot.hp=2000;B.observedHp=2000;B.phase=3;
        const advance=seconds=>{for(let i=0;i<Math.round(seconds*60);i++){clock+=1000/60;updateBoss(1/60);}};
        // ONE attack at a time. Every attack is wrapped so we can see what is running when it starts, and the real updateBoss
        // drives the real scheduler: no attack may start while another is going, and none may be starved by the rest.
        const cover=_bossSegHitsWall,random=Math.random,realAttacks={...B.def.attacks};
        const segments=[],live=new Set();
        for(const name of Object.keys(realAttacks))B.def.attacks[name]=boss=>{
          const attack=realAttacks[name](boss),seg={name,start:clock/1000,end:null,others:live.size};segments.push(seg);live.add(attack);
          const tick=attack.tick;attack.tick=dt=>{const done=tick.call(attack,dt);if(done){seg.end=clock/1000;live.delete(attack);}return done;};
          return attack;
        };
        let base=0;const restart=()=>{clear();segments.length=0;live.clear();base=clock/1000;};
        try {
          Math.random=()=>0;_bossSegHitsWall=()=>false;
          restart();advance(180);
          check(segments.length>=6,'Scheduler barely ran: '+segments.length+' attacks in 180 s');
          check(segments.every(x=>x.others===0),'An attack started while another was still running');
          check(segments.every((x,i)=>i===0||segments[i-1].end!==null&&x.start>=segments[i-1].end),'Two attacks overlapped in time');
          const ran=n=>segments.filter(x=>x.name===n&&x.end!==null);
          for(const n of ['uzis','sniper','grenades','molotovs'])check(ran(n).length>=1,n+' never got a turn in 180 s (starved)');
          check(!ran('rockets').length&&!localBullets.some(x=>x.weaponId==='rpg'),'RPGs fired at someone in the open');
          const u=ran('uzis')[0];check(u&&Math.abs((u.end-u.start)-11)<.2,'Uzi burst is not 11 seconds');
          check(u.start-base>=2.9&&u.start-base<=3.3,'First Uzi burst did not start at 3 seconds (it started at '+(u.start-base).toFixed(2)+')');
          const gaps=segments.slice(1).map((x,i)=>x.start-segments[i].end);
          check(gaps.every(g=>g>=.65),'No breath between two attacks');
          // A covered player: the RPG roll only QUEUES a volley. It waits for the current attack and does not interrupt it.
          restart();_bossSegHitsWall=()=>false;advance(3.4);
          check(B.nativeClocks.current?.name==='uzis','Test setup: the Uzis should be firing');
          _bossSegHitsWall=()=>true;advance(1);
          check(B.nativeClocks.rocketsQueued&&!localBullets.some(x=>x.weaponId==='rpg'),'Covered RPG should be queued behind the Uzis, not fired over them');
          // (the player stays covered until the volley STARTS, so the roll cannot queue a second one behind it)
          for(let i=0;i<14*60;i++){clock+=1000/60;updateBoss(1/60);if(segments.some(x=>x.name==='rockets'))_bossSegHitsWall=()=>false;}
          advance(2);
          check(segments.filter(x=>x.name==='rockets').length===1&&segments.every(x=>x.others===0),'Queued RPG volley did not fire once, alone, after the Uzis');
          check(localBullets.filter(x=>x.weaponId==='rpg').length===5,'RPG volley is not five rockets');
          // ...and if you have come out of cover by the time its turn comes, it is dropped.
          restart();_bossSegHitsWall=()=>false;advance(3.4);_bossSegHitsWall=()=>true;advance(1);
          check(B.nativeClocks.rocketsQueued,'Test setup: RPG should be queued');
          _bossSegHitsWall=()=>false;advance(13);
          check(!B.nativeClocks.rocketsQueued&&!segments.some(x=>x.name==='rockets')&&!localBullets.some(x=>x.weaponId==='rpg'),'A queued RPG volley fired at someone who left cover');
          // A Molotov barrage is not cancelled by anything else coming due.
          restart();_bossSegHitsWall=()=>false;B.nativeClocks={t:0,due:{uzis:999,sniper:3,grenades:999,molotovs:1},coverCheck:0,rocketsQueued:false,current:null,pause:0};
          const throws0=activeGrenades.length;advance(10);
          check(B.nativeClocks.current?.name==='molotovs'&&activeGrenades.length>throws0,'Molotov barrage did not carry on while the sniper was due');
          check(segments.every(x=>x.others===0)&&!segments.some(x=>x.name==='sniper'&&x.end===null&&segments.some(y=>y.name==='molotovs'&&y.end===null)),'Sniper ran over the Molotov barrage');
        } finally {Math.random=random;_bossSegHitsWall=cover;Object.assign(B.def.attacks,realAttacks);}
        // Native collision integration: a boss round hits the local player,
        // while the same round is stopped by a wall first.
        clear();const saved=wallColliders.splice(0);const damage=applyBotDamageToPlayer;let hits=0;
        applyBotDamageToPlayer=()=>{hits++;return true;};
        const shield=isShielded;isShielded=()=>false;
        try {
          camera.position.set(30,1.65,30);
          const origin=new THREE.Vector3(30,1.16,20),dir=new THREE.Vector3(0,0,1),w=projectileWeaponSpec('machine_pistol');
          function shoot(){spawnLocalBullet(origin,dir,'native_test',false,w.bulletSpeed,w.bulletColor,w.bulletSize,w.id,{botId:B.bot.id,botTeam:'enemy',bossOwner:B.bot.id});for(let i=0;i<20;i++){clock+=1000/60;updateBullets(1/60);}}
          shoot();check(hits===1,'Native bullet did not damage player');
          wallColliders.push(new THREE.Box3(new THREE.Vector3(29,0,24),new THREE.Vector3(31,4,25)));
          shoot();check(hits===1,'Native bullet passed through wall');
          wallColliders.length=0;
          const explode=rocketExplode;let impacts=0;
          rocketExplode=(pos,id,exclude,opts)=>{impacts++;check(id==='rpg'&&opts.damagePlayer===false,'Rocket direct hit applied splash twice');};
          try {
            const rpg=projectileWeaponSpec('rpg');
            spawnLocalBullet(origin,dir,'native_rocket_test',false,rpg.bulletSpeed,rpg.bulletColor,rpg.bulletSize,rpg.id,{botId:B.bot.id,botTeam:'enemy',bossOwner:B.bot.id});
            for(let i=0;i<30;i++){clock+=1000/60;updateBullets(1/60);}
            check(hits===2&&impacts===1,'Native RPG failed to hit and detonate');
          } finally {rocketExplode=explode;}
        } finally {wallColliders.length=0;wallColliders.push(...saved);applyBotDamageToPlayer=damage;isShielded=shield;}
        clear();check(!B.proj.length&&!B.nativeWarnings.length,'Legacy orbs or warning leak');
        return {hp:7500,uziRounds:62,rocketSalvo:5,grenadeLaunchers:2,molotovBottles:30,sniperTrackingSeconds:2,oneAttackAtATime:true,katanaDelayMs:1000,katanaDurationMs:3000,noPhaseHealing:true,ammoOnlyRefill:true,nativeCollision:true};
      } finally {Date.now=now;socket.emit=emit;}
    });
    assert.deepEqual(errors,[]);console.log('PASS',result);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
