const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..'), source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const stats = JSON.parse(fs.readFileSync(path.join(root, 'public/weapon-stats.json'), 'utf8'));
const handlers = {}, events = [], players = {};let clock=100000;
const ctx = {fs,path,__dirname:root,players,Math,Number,String,Set,Map,Object,Infinity,Date:{now:()=>clock},
  socket:{id:'defender',on:(name,fn)=>handlers[name]=fn},HUB_MATCH:'lobby',
  emitToMatch:(room,event,data)=>events.push({room,event,data}),shielded:p=>!!p.shield,
  blocksFriendlyFire:(a,b)=>a.team===b.team,creditFfaDamage:()=>{},cleanKillTags:()=>[],cleanSkinId:()=>undefined,
  hellfireWeapon:()=>false,canUseHellfire:()=>false,isFrozen:()=>false,freezeRayHit:()=>{},
  WEAPON_DAMAGE:Object.fromEntries([...stats.guns,...stats.melees].map(w=>[w.id,w.damage])),WEAPON_HS_MULT:{},DAMAGE_OVERRIDE_CAPS:{},
  falloffMultiplier:()=>1,dist3:()=>10};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('const DEFLECT_GUARDS'),source.indexOf('// Damage drop-off by range')),ctx);
for(const name of ['setWeapon','deflectGuard','hit','botHitMe']){
  const start=source.indexOf(`socket.on('${name}',`),end=source.indexOf('\n  });',start)+7;
  assert(start>0&&end>start);vm.runInContext(source.slice(start,end),ctx);
}
function reset(){
  events.length=0;clock+=10000;ctx.socket.id='defender';
  players.defender={id:'defender',hp:300,dead:false,kills:0,deaths:0,team:'ally',matchId:'duel',weaponId:'katana'};
  players.shooter={id:'shooter',hp:300,dead:false,kills:0,deaths:0,team:'enemy',matchId:'duel'};
  handlers.deflectGuard({weapon:'katana'});ctx.socket.id='shooter';
}
function hit(id='shot',weapon='ak20',damageOverride=40){handlers.hit({targetId:'defender',bulletId:id,weapon,damageOverride});}
reset();hit();assert.equal(players.defender.hp,300);assert.equal(players.shooter.hp,260);
assert(events.some(e=>e.event==='projectileDeflected'));assert(events.some(e=>e.event==='playerHit'&&e.data.targetId==='shooter'&&e.data.reflected));
hit();assert.equal(players.shooter.hp,260,'Duplicate reflected twice');
players.defender.hp=10;players.shooter.hp=30;hit('fatal', 'srx', 190);
assert.equal(players.defender.hp,10);assert.equal(players.defender.dead,false);assert.equal(players.shooter.dead,true);
assert(events.some(e=>e.event==='playerDied'&&e.data.targetId==='shooter'&&e.data.killerId==='defender'));
reset();hit('pierce','gatecrasher',40);assert.equal(players.defender.hp,300);assert(players.shooter.hp<300);   // (the katana's return is the blunt one: it sends back a round that ignores defences too, while it is on)
reset();hit('rocket','rpg',120);assert.equal(players.defender.hp,180);assert.equal(players.shooter.hp,300);
// a katana held with its Deflect NOT on returns nothing: an ordinary hit (it used to return everything the whole time it was in the hand)
reset();players.defender._deflectGuard=null;clock+=5000;hit('idle');assert.equal(players.defender.hp,260,'An idle katana was not hit like anybody else');assert.equal(players.shooter.hp,300,'An idle katana returned a shot');
assert(!events.some(e=>e.event==='projectileDeflected'||e.event==='playerHit'&&e.data.reflected),'An idle katana announced a deflect');
// ...and once its 1 s window has run out it is idle again: the next shot lands on it
reset();clock+=900;hit('inside');assert.equal(players.shooter.hp,260,'The window was open at 0.9 s');clock+=1200;hit('late');assert.equal(players.defender.hp,260,'A shot after the window was not an ordinary hit');assert.equal(players.shooter.hp,260,'A shot after the window was returned');
// a katana that was never switched on in this life has no guard to return anything with
reset();delete players.defender._deflectGuard;hit('never');assert.equal(players.defender.hp,260);assert.equal(players.shooter.hp,300);
reset();ctx.socket.id='defender';handlers.setWeapon({weaponId:'pistol'});ctx.socket.id='shooter';hit('switched');assert.equal(players.defender.hp,260);
reset();players.shooter.team='ally';hit('friendly');assert.equal(players.shooter.hp,300);assert.equal(players.defender.hp,300);
reset();players.shooter.matchId='other';hit('other');assert.equal(players.shooter.hp,300);assert.equal(players.defender.hp,300);
reset();players.shooter.shield=true;hit('shield');assert.equal(players.shooter.hp,260);assert.equal(players.defender.hp,300);
reset();players.defender.shield=true;hit('defender_shield');assert.equal(players.shooter.hp,260);assert.equal(players.defender.hp,300);
reset();ctx.socket.id='defender';const until=players.defender._deflectGuard.until;handlers.deflectGuard({weapon:'katana'});assert.equal(players.defender._deflectGuard.until,until);
players.defender._deflectGuard=null;players.defender.weaponId='constructor';handlers.deflectGuard({weapon:'constructor'});assert.equal(players.defender._deflectGuard,null);
reset();ctx.socket.id='defender';players.defender._deflectGuard=null;players.defender._nextDeflectAt=0;players.defender.weaponId='tennis_racket';handlers.deflectGuard({weapon:'tennis_racket'});
assert.equal(players.defender._deflectGuard.until-clock,2000);ctx.socket.id='shooter';hit('racket');assert.equal(players.shooter.hp,260);
clock+=2100;hit('expired_racket');assert.equal(players.defender.hp,260);
reset();players.bot={id:'bot',isBot:true,hp:7500,team:'enemy',matchId:'duel'};players.defender._deflectGuard=null;ctx.socket.id='defender';
handlers.botHitMe({botId:'bot',weapon:'srx',headshot:true});assert.equal(players.defender.hp,110,'Bot headshot lost its multiplier');
players.bot.ownerId='defender';players.defender.hp=300;players.defender.shield=true;
handlers.botHitMe({botId:'bot',weapon:'ak20',reflectedDamage:190});assert.equal(players.defender.hp,110,'Full return was reduced to gun base damage');
assert(events.some(e=>e.event==='playerHit'&&e.data.reflected&&e.data.damage===190));
// what the shooter's hitmarker is told (hitConfirmFromServer in public/game.js): a hit that took health says how much; one that was deflected or blocked says nothing about the defender
reset();players.defender._deflectGuard=null;hit('plain');
{const ph=events.find(e=>e.event==='playerHit'&&e.data.targetId==='defender');assert(ph,'A plain hit sent no playerHit');assert.equal(ph.data.dealt,40,'playerHit.dealt is not what the hit took');assert.equal(ph.data.shooterId,'shooter');}
reset();hit('deflected');assert(!events.some(e=>e.event==='playerHit'&&e.data.targetId==='defender'),'A deflected shot was reported to its shooter as a hit on the defender');
reset();players.defender.shield=true;hit('blocked');assert(!events.some(e=>e.event==='playerHit'&&e.data.targetId==='defender'),'A shielded hit was reported as damage');
console.log('PASS: PvP return damage only while Deflect is on (an idle katana returns nothing), lethal blocks, kill credit, deduplication, piercers/explosives, cooldown, expiry, weapon switches, team/match isolation, shields, racket, bot headshots');
