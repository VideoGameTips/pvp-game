const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const storage = new Map(), events = {};
const context = {
  window: {addEventListener() {}}, document: {hidden:false,addEventListener(name,fn){events[name]=fn;}},
  localStorage: {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  currentUser: {username:'Alpha'}, gameStarted:true,inLobby:false,isDead:false,
  match:{type:'ffa',roundActive:true,over:false},currentEquippedId:()=> 'vector',
  performance:{now:()=>0},setInterval(){},console,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/player-record.js'),'utf8'),context);
const api = context.window.PVP_PLAYER_RECORD;
api.tick(0); api.tick(1000);api.tick(2000);api.kill('vector');
assert.equal(api.snapshot.seconds,2);assert.equal(api.snapshot.weapons.vector.seconds,2);assert.equal(api.snapshot.kills,1);
context.document.hidden=true;api.tick(3000);assert.equal(api.snapshot.seconds,2);
context.document.hidden=false;context.gameStarted=false;api.tick(4000);assert.equal(api.snapshot.seconds,2);
const first={type:'ffa'};api.result(first,true,false);api.result(first,true,false);
api.result({type:'ffa'},true,false);api.result({type:'ffa'},false,false);api.result({type:'ffa'},false,true);
api.result({type:'range'},true,false);
const alpha=api.snapshot;
assert.equal(alpha.wins,2);assert.equal(alpha.losses,1);assert.equal(alpha.draws,1);assert.equal(alpha.streak,0);assert.equal(alpha.best,2);
context.currentUser={username:'Beta'};assert.equal(api.snapshot.wins,0);assert.equal(api.snapshot.seconds,0);
api.result({type:'ffa'},true,false);assert.equal(api.snapshot.wins,1);
context.currentUser={username:'Alpha'};assert.equal(api.snapshot.wins,2);assert.equal(api.snapshot.seconds,2);assert.equal(api.snapshot.weapons.vector.kills,1);
console.log('PASS: foreground playtime, weapon use and kills, match deduplication, training exclusion, win/loss/draw streaks, persistence and profile isolation');
