const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {io}=require('socket.io-client');
const port=41000+Math.floor(Math.random()*1000),dir=fs.mkdtempSync(path.join(os.tmpdir(),'pvp-deflect-'));
const server=spawn(process.execPath,[path.join(__dirname,'../server.js')],{env:{...process.env,PORT:String(port),DATA_DIR:dir,ADMIN_MASTER_PASS:''},stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sockets=[];
function event(socket,name,filter=()=>true){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off(name,on);reject(Error('Timeout: '+name));},4000);function on(data){if(!filter(data))return;clearTimeout(timer);socket.off(name,on);resolve(data);}socket.on(name,on);});}
(async()=>{
  try{
    let ready=false;for(let i=0;i<60;i++){try{if((await fetch('http://localhost:'+port)).ok){ready=true;break;}}catch{}await sleep(100);}assert(ready,'Test server failed to start');
    const a=io('http://localhost:'+port,{transports:['websocket'],autoConnect:false}),b=io('http://localhost:'+port,{transports:['websocket'],autoConnect:false});sockets.push(a,b);
    const initA=event(a,'init'),initB=event(b,'init');a.connect();b.connect();const [A,B]=await Promise.all([initA,initB]);
    a.emit('enterMatch',{matchId:'reflection-test',mode:'ffa5'});b.emit('enterMatch',{matchId:'reflection-test',mode:'ffa5'});
    a.emit('move',{x:0,y:1.65,z:0,rotY:0,rotX:0});b.emit('move',{x:0,y:1.65,z:10,rotY:0,rotX:0});
    b.emit('setWeapon',{weaponId:'katana'});await sleep(100);
    // a katana held with its Deflect NOT on returns nothing: the shot is an ordinary hit on it
    const idleSeen=[];a.on('playerHit',d=>idleSeen.push(d));b.on('playerHit',d=>idleSeen.push(d));
    const idleHit=event(b,'playerHit',d=>d.targetId===B.id&&!d.reflected);
    a.emit('hit',{targetId:B.id,weapon:'ak20',bulletId:'idle_shot',damageOverride:40});
    const idle=await idleHit;await sleep(150);
    assert(idle.hp<300,'An idle katana was not hit like anybody else');assert.equal(idleSeen.filter(d=>d.reflected).length,0,'An idle katana returned a shot');
    assert.equal(idleSeen.filter(d=>d.targetId===A.id).length,0,'The shooter was hurt by an idle katana');
    // switch the Deflect on: now it returns them
    b.emit('deflectGuard',{weapon:'katana'});await sleep(60);
    const reflected=event(a,'playerHit',d=>d.targetId===A.id&&d.reflected),guard=event(b,'projectileDeflected');
    const hits=[];a.on('playerHit',d=>hits.push(d));
    a.emit('hit',{targetId:B.id,weapon:'srx',bulletId:'lethal_sniper',damageOverride:190,headshot:true});
    const [damage,block]=await Promise.all([reflected,guard]);
    assert.equal(damage.hp,110);assert.equal(damage.shooterId,B.id);assert.equal(block.defenderId,B.id);assert(block.remainingMs>0&&block.remainingMs<=1100,'The deflect window is 1 s (+0.1 s a block): '+block.remainingMs);
    a.emit('hit',{targetId:B.id,weapon:'srx',bulletId:'lethal_sniper',damageOverride:190,headshot:true});await sleep(100);
    assert.equal(hits.filter(d=>d.targetId===A.id).length,1,'Duplicate network return damage');assert.equal(hits.filter(d=>d.targetId===B.id).length,0,'Defender took damage');
    const death=event(a,'playerDied',d=>d.targetId===A.id);
    a.emit('hit',{targetId:B.id,weapon:'srx',bulletId:'second_sniper',damageOverride:190,headshot:true});
    const killed=await death;assert.equal(killed.killerId,B.id);assert(killed.reflected);
    console.log('PASS: real two-client server: an idle katana returns nothing; with Deflect on, reflection, defender immunity, native damage, duplicate suppression, reflected kill credit');
  }finally{
    for(const socket of sockets)socket.close();
    server.kill();await new Promise(resolve=>{if(server.exitCode!==null||server.signalCode!==null)return resolve();server.once('exit',resolve);});
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
