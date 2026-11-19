const assert = require('node:assert/strict');
const symbols = require('../public/damage-symbols.js');

assert.equal(Object.keys(symbols.catalog).length,66);
for (const def of Object.values(symbols.catalog)) {
  assert.ok(symbols.svg(def.id).includes('<svg'));
  assert.ok(!symbols.svg(def.id).includes('undefined'),def.id);
  assert.match(def.color,/^#[a-f\d]{6}$/i);
}
const cases = [
  [{},120,false,false,'hit'],
  [{},10,false,false,'light'],
  [{},190,false,false,'heavy'],
  [{},999,true,false,'head'],
  [{critical:true},240,false,false,'critical'],
  [{kind:'explosion'},90,false,false,'explosion'],
  [{kind:'poison'},12,false,false,'poison'],
  [{reflected:true},80,false,false,'reflection'],
  [{ricochet:true},65,false,false,'ricochet'],
  [{pierced:true},60,false,false,'pierce'],
  [{shield:true},75,false,false,'shield'],
  [{airborne:true},100,false,false,'air'],
  [{longRange:true},210,false,false,'longshot'],
  [{},125,false,true,'kill'],
  [{},999,true,true,'headKill'],
  [{melee:true,kind:'slash'},58,false,true,'meleeElim'],
  [{kind:'explosion'},90,false,true,'explosionKill'],
  [{kind:'burning'},12,false,true,'burnKill'],
  [{kind:'electric'},18,false,true,'electricKill'],
  [{airborne:true},58,false,true,'airKill'],
  [{longRange:true},120,false,true,'longshotKill'],
];
for (const [meta,damage,head,lethal,expected] of cases) assert.equal(symbols.look(damage,head,lethal,meta).kind,expected);
assert.equal(symbols.look(108,false,false,{},3,true,36).text,'36\u00d73');
assert.equal(symbols.look(108,false,false,{},3,true,36).kind,'multi');
assert.equal(symbols.look(108,false,false,{kind:'fire'},3,true,36).kind,'fire');
assert.equal(symbols.look(125,false,true,{reflected:true}).secondary,'reflection');
assert.equal(symbols.look(1234,false,false).text,'1234','Do not truncate real damage totals to 999');
assert.equal(symbols.look(999,true,false).color,'#ff6775','Use the replacement reference, not the gold headshot from the old chart');
console.log('PASS: 66 symbols; hit, status and elimination priorities; correct chain arithmetic; no artificial damage cap.');
