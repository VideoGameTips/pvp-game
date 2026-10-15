#!/usr/bin/env node
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const catalog=require('../public/shop-catalog.js');
const source=fs.readFileSync(require.resolve('../server.js'),'utf8');
const begin=source.indexOf("app.post('/shop/buy-bundle'");
const end=source.indexOf("app.get('/shop/bundles'",begin);
const handlerSource=source.slice(begin,end);
const free=vm.runInNewContext(source.match(/const FREE_WEAPONS = new Set\(\[[\s\S]*?\]\);/)[0]+';FREE_WEAPONS');
(async()=>{
  const response=await fetch((process.env.PVP_URL||'http://localhost:3001')+'/shop/bundles');
  const {bundles}=await response.json();
  assert.equal(Object.keys(bundles).length,catalog.bundles.length);
  for(const b of Object.values(bundles)){
    const definition=catalog.bundles.find(x=>x.id===b.id);
    assert.deepEqual(b.items,definition.items);assert.deepEqual(b.skins,definition.skins);
    assert.equal(b.items.length,3);assert.ok(b.price>0);
    let handler,saves=0,user={credits:1000000,purchased:[],unlocks:[],skinInventory:[]},result,status=200;
    vm.runInNewContext(handlerSource,{app:{post:(_,fn)=>handler=fn},BUNDLES:bundles,FREE_WEAPONS:free,
      authedUser:()=>user,saveUsers:()=>saves++});
    const res={status:n=>{status=n;return res;},json:value=>result=JSON.parse(JSON.stringify(value))};
    handler({body:{bundleId:b.id}},res);
    assert.equal(status,200);assert.equal(user.credits,1000000-b.price);
    assert.deepEqual(user.purchased,b.items.filter(id=>!free.has(id)));
    assert.deepEqual(user.skinInventory,b.skins);assert.deepEqual(result.addedSkins,b.skins);
    const balance=user.credits;handler({body:{bundleId:b.id}},res);
    assert.equal(user.credits,balance);assert.equal(result.already,true);assert.equal(saves,1);
    user={credits:0,purchased:[],unlocks:[],skinInventory:[]};handler({body:{bundleId:b.id}},res);
    assert.equal(status,402);assert.equal(user.skinInventory.length,0);assert.equal(user.purchased.length,0);
    user=null;handler({body:{bundleId:b.id}},res);assert.equal(status,401);
  }
  console.log('shop checks: shared catalog, three-item packs, authoritative skin grants, duplicate purchases, insufficient funds and authentication');
})().catch(e=>{console.error(e);process.exitCode=1;});
