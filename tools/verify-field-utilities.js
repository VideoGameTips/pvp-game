const assert=require('node:assert/strict');
const create=require('../field-utilities-server');
const rules=require('../public/field-utility-rules');
let time=1000;
const events=[],players={};
for(const [id,team] of [['owner','blue'],['friend','blue'],['enemy','red']])players[id]={id,team,matchId:'test',x:0,y:1.65,z:0,hp:100};
const app=create({players,now:()=>time,emit:(match,event,d)=>events.push(d),blocked:(a,b)=>a.team===b.team,
  canUse:()=>true,weaponDamage:{ak20:25,srx:95},damage:(a,b,n)=>a.hp-=n,hub:'hub'});
const put=kind=>app.place(players.owner,{kind,x:0,y:0,z:0});
const trigger=(id,target='enemy')=>app.trigger(players[target],{id,targetId:target,dx:0,dz:1});
try{
  const pad=put('bounce_pad');assert(pad);time+=300;
  assert(trigger(pad.id,'friend'));assert.equal(pad.remaining,2);
  assert.equal(trigger(pad.id),false);time+=800;
  assert(trigger(pad.id));time+=800;assert(trigger(pad.id));assert(!app.fields.has(pad.id));
  time+=800;const pad2=put('bounce_pad');assert(pad2);time+=800;assert(!put('bounce_pad'));
  time+=15000;app.update();assert(!app.fields.has(pad2.id));
  const trap=put('bear_trap');assert(trap);time+=300;
  assert(!trigger(trap.id,'friend'));assert(trigger(trap.id));assert.equal(players.enemy.hp,65);
  assert.equal(players.enemy._fieldRootUntil,time+800);assert(!trigger(trap.id));
  time+=800;const trap2=put('bear_trap');assert(trap2);time+=900000;app.update();assert(app.fields.has(trap2.id));
  const shot={id:trap2.id,bulletId:'one',weapon:'ak20',x:0,y:.1,z:0};
  assert(app.hit(players.enemy,shot));assert.equal(trap2.hp,5);assert(!app.hit(players.enemy,shot));
  assert(app.hit(players.enemy,{...shot,bulletId:'two'}));assert(!app.fields.has(trap2.id));
  time+=800;assert(!put('bear_trap'));
  app.reset(players.owner);assert(put('bear_trap'));
  const k=rules.launch(33);assert(Math.abs(k.up*k.up/66-18)<1e-10);assert(Math.abs(k.forward*k.duration-12)<1e-10);
  assert.equal(rules.specs.bear_trap.hp,30);
  console.log('Field utilities OK: charges, shared pads, 3 launches, expiry, friendly immunity, 35 damage, 800ms root, durability, duplicate shots, launch arc');
}finally{app.dispose();}
