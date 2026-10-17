const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const handlers={},events=[],p={id:'self',account:'regular',matchId:'test',hp:300,kills:0,deaths:0};
const context={users:{regular:{isAdmin:false},admin:{isAdmin:true}},players:{self:p},
  socket:{id:'self',on:(name,fn)=>handlers[name]=fn},Date,Math,Number,String,
  emitToMatch:(room,event,data)=>events.push({room,event,data}),shielded:()=>false,blocksFriendlyFire:()=>false,
  creditFfaDamage:()=>{},cleanKillTags:()=>[],nextSpawn:()=>({x:0,y:1,z:0}),maxHpForMode:()=>300,SPAWN_SHIELD_MS:1500,
  WEAPON_DAMAGE:{hellfire:8,hellfire_burn:7,hellfire_pool:10},WEAPON_HS_MULT:{},DAMAGE_OVERRIDE_CAPS:{},
  falloffMultiplier:()=>1,dist3:()=>5};
vm.createContext(context);
const fnStart=source.indexOf('function canUseHellfire('),fnEnd=source.indexOf('// Damage drop-off',fnStart);
vm.runInContext(source.slice(fnStart,fnEnd),context);
for(const name of ['setWeapon','shoot','hellfireCore','hit','hitBot','readyRespawn']){
  const start=source.indexOf(`socket.on('${name}',`),end=source.indexOf('\n  });',start)+7;
  assert(start>0&&end>start);vm.runInContext(source.slice(start,end),context);
}
const core={x:0,y:1,z:0,dx:0,dy:0,dz:-1};
for(const identity of [{account:'regular'},{account:'regular',isAdmin:true,adminPassExpiresAt:Date.now()+60000},{account:null,isAdmin:true}]){
  Object.assign(p,identity);events.length=0;
  handlers.setWeapon({weaponId:'hellfire'});handlers.shoot({...core,weapon:'hellfire'});handlers.hellfireCore(core);
  assert.equal(events.length,0);assert.notEqual(p.weaponId,'hellfire');
  assert.equal(context.serverHitDamage({weapon:'hellfire',damageOverride:999},p,{}),0);
  context.players.target={id:'target',matchId:'test',hp:300};
  context.players.bot={id:'bot',isBot:true,matchId:'test',hp:300};
  handlers.hit({targetId:'target',weapon:'hellfire'});
  handlers.hitBot({botId:'bot',weapon:'hellfire_pool',fatal:true,instakill:true});
  assert.equal(context.players.target.hp,300);assert.equal(context.players.bot.hp,300);
  handlers.setWeapon({weaponId:'omega_pistol'});handlers.shoot({...core,weapon:'omega_pistol'});
  handlers.hitBot({botId:'bot',weapon:'omega_pistol',fatal:true,instakill:true});
  assert.equal(context.players.bot.hp,300);assert.notEqual(p.weaponId,'omega_pistol');
}
Object.assign(p,{account:'admin',isBot:false,dead:false,lastShot:0});events.length=0;
handlers.setWeapon({weaponId:'hellfire'});assert.equal(p.weaponId,'hellfire');
for(let i=0;i<4;i++)handlers.hellfireCore(core);
assert.equal(events.filter(e=>e.event==='hellfireCore').length,3);assert.equal(p._hellfireCores,0);
assert.equal(context.serverHitDamage({weapon:'hellfire'},p,{}),8);
assert.equal(context.serverHitDamage({weapon:'hellfire_burn'},p,{}),7);
assert.equal(context.serverHitDamage({weapon:'hellfire_pool'},p,{}),10);
p.dead=true;handlers.readyRespawn({});assert.equal(p._hellfireCores,3);
handlers.hellfireCore({...core,dx:Infinity});assert.equal(p._hellfireCores,3);
handlers.hellfireCore(core);assert.equal(p._hellfireCores,2);
console.log('Hellfire server: authenticated admin only, cosmetic/pass/bot rejection, shot/hit gates, three immediate cores, damage and respawn reset');
events.length=0;p.lastShot=0;
handlers.shoot({...core,weapon:'omega_pistol'});
assert.equal(events.filter(e=>e.event==='bulletFired').length,1);
assert.equal(context.serverHitDamage({weapon:'omega_pistol'},p,{hp:1000000}),1000000);
assert.equal(context.serverHitDamage({weapon:'omega_pistol'},p,{hp:300}),0);
p.lastShot=0;handlers.shoot({...core,weapon:'omega_pistol'});
assert.equal(events.filter(e=>e.event==='bulletFired').length,1);
p.dead=true;handlers.readyRespawn({});p.lastShot=0;handlers.shoot({...core,weapon:'omega_pistol'});
assert.equal(events.filter(e=>e.event==='bulletFired').length,2);
console.log('Omega server: admin-only, one shot and one hit per life, arbitrary-health elimination, respawn replenishment');
