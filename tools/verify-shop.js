#!/usr/bin/env node
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const catalog=require('../public/shop-catalog.js');
const source=fs.readFileSync(require.resolve('../server.js'),'utf8');
const begin=source.indexOf("app.post('/shop/buy-bundle'");
const end=source.indexOf("app.get('/shop/bundles'",begin);
const handlerSource=source.slice(begin,end);
const free=vm.runInNewContext(source.match(/const FREE_WEAPONS = new Set\(\[[\s\S]*?\]\);/)[0]+';FREE_WEAPONS');
// ── What a bundle is allowed to be (#77) ───────────────────────────────────
// server.js:600-602 refuses to BOOT on a bundle that is not three items, or
// that sells something archived, admin-only or unpriced, or a skin outside
// GEN1/GEN2/exclusive. That is the strongest guard there is and it needs no
// help: a bad catalog cannot start a server, so it cannot be deployed.
//
// I tried mirroring the skin rule here and got it wrong twice — first against
// MODEL_SKINS, which is a different list, then by scraping GEN1/GEN2 out of
// server.js, which under-read them and failed a bundle the server is perfectly
// happy with. A check that re-derives someone else's rule by regex is worse
// than no check, because it fails on correct code. Left to the server.
//
// What the server CANNOT see is the shape the 26 -> 16 rebuild chose and never
// wrote down: packs are weapons and melee, never support items, and each
// carries a skin. Six packs were lost beside that rule and nothing noticed,
// because the only existing check compared the catalog against a server built
// from the same catalog.
const gameSrc = fs.readFileSync(require.resolve('../public/game.js'), 'utf8');
const supportBlock = gameSrc.match(/const SUPPORT_ITEMS = \[[\s\S]*?\n\];/);
assert.ok(supportBlock, 'could not find SUPPORT_ITEMS in game.js');
const SUPPORT = new Set([...supportBlock[0].matchAll(/\bid:\s*'([a-z0-9_]+)'/g)].map(x => x[1]));
assert.ok(SUPPORT.size > 10, 'SUPPORT_ITEMS parsed as nearly empty — the regex has drifted');

for (const b of catalog.bundles) {
  for (const id of b.items)
    assert.ok(!SUPPORT.has(id), `bundle ${b.id} contains the support item ${id}; packs are weapons and melee`);
  assert.ok(b.skins.length >= 1, `bundle ${b.id} has no skin`);
}
const dupe = catalog.bundles.map(b => b.id).filter((x, i, a2) => a2.indexOf(x) !== i);
assert.deepEqual(dupe, [], 'duplicate bundle ids: ' + dupe);

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
  console.log('shop checks: no support items, every pack has a skin, no duplicate ids, shared catalog, three-item packs, authoritative skin grants, duplicate purchases, insufficient funds and authentication');
})().catch(e=>{console.error(e);process.exitCode=1;});
