#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const start = source.indexOf("socket.on('environmentDamage',");
const end = source.indexOf("socket.on('healSelf',",start);
assert(start > 0 && end > start);
const handlers={},events=[],player={id:'local',hp:300,deaths:0,matchId:'test',matchMode:'ffa',dead:false};
const context={players:{local:player,other:{hp:300}},socket:{id:'local',on:(name,fn)=>handlers[name]=fn},
  HUB_MATCH:'hub',maxHpForMode:mode=>mode==='m4_tower'?100:300,
  emitToMatch:(room,event,data)=>events.push({room,event,data})};
vm.runInNewContext(source.slice(start,end),context);
const hit=handlers.environmentDamage;
hit({seq:1,amount:100,source:'lava',matchId:'test'});
assert.equal(player.hp,200);assert.equal(player.environmentSeq,1);assert.equal(context.players.other.hp,300);
assert.equal(events[0].data.environmentSeq,1);assert.equal(events[0].data.healthEvent,'environment');
hit({seq:1,amount:100,source:'lava'});assert.equal(player.hp,200);
for(const data of [{seq:2,amount:-20},{seq:2,amount:NaN},{seq:2,amount:Infinity},{seq:2,amount:301},{seq:2.5,amount:10},{seq:2,amount:10,matchId:'other'}])hit(data);
assert.equal(player.hp,200);assert.equal(player.environmentSeq,1);
// The next player shot must start from the server's already-reduced HP.
player.hp-=30;hit({seq:2,amount:20,source:'chernobyl_gas'});assert.equal(player.hp,150);
hit({seq:3,amount:150,source:'lava'});assert.equal(player.hp,0);assert.equal(player.dead,true);assert.equal(player.deaths,1);
assert.equal(events.filter(x=>x.event==='playerDied').length,1);
hit({seq:4,amount:20});assert.equal(player.deaths,1);
for(const room of ['lobby','hub']){Object.assign(player,{dead:false,hp:300,matchId:room});hit({seq:4,amount:20});assert.equal(player.hp,300);}
Object.assign(player,{dead:false,hp:100,matchId:'test',matchMode:'m4_tower'});
hit({seq:4,amount:101});assert.equal(player.hp,100);hit({seq:4,amount:25});assert.equal(player.hp,75);
for(const owner of ['target','player','p'])assert(source.includes(`environmentSeq: ${owner}.environmentSeq || 0`),`${owner} health snapshots must acknowledge environmental damage`);
assert(source.includes("healthEvent: 'heal'"));
console.log('Server health sync: environmental damage, deduplication, validation, match isolation, lethal damage, mode HP and snapshot acknowledgements');
