// EPIC and MYTHIC in the Gen 2 skin case, as server.js deals them: both new skins are in the Gen 2 pool (and not in Gen 1), a case always deals a skin you are missing first, and the odds put MYTHIC rarest of all,
// EPIC next, then the rest as before: slice the lists and the roll out of server.js into a vm and roll the case a few hundred thousand times.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const from = source.indexOf('const GEN1_SKIN_IDS = ['), to = source.indexOf('for (const id of Object.keys(WEAPON_COSTS))', from);
assert(from > 0 && to > from, 'the skin lists were not found in server.js');
const fnStart = source.indexOf('function pickWeighted('), fnEnd = source.indexOf('\n}\n', fnStart) + 3;
assert(fnStart > 0 && fnEnd > fnStart, 'pickWeighted not found');
const context = { SKIN_CASE_GEN1_COST: 1500, SKIN_CASE_GEN2_COST: 5000, Math, Set };
vm.createContext(context);
vm.runInContext(source.slice(from, to) + '\n' + source.slice(fnStart, fnEnd), context);
const { GEN1_SKIN_IDS, GEN2_SKIN_IDS, GEN2_SKIN_WEIGHTS, SKIN_CASES, GEN2_EPIC_SKIN_IDS, GEN2_NEW_MYTHIC_SKIN_IDS, GEN2_RARE_SKIN_IDS, GEN2_GOOD_SKIN_IDS, GEN2_LEGENDARY_SKIN_IDS, DONUT_SKIN_IDS } = vm.runInContext('({ GEN1_SKIN_IDS, GEN2_SKIN_IDS, GEN2_SKIN_WEIGHTS, SKIN_CASES, GEN2_EPIC_SKIN_IDS, GEN2_NEW_MYTHIC_SKIN_IDS, GEN2_RARE_SKIN_IDS, GEN2_GOOD_SKIN_IDS, GEN2_LEGENDARY_SKIN_IDS, DONUT_SKIN_IDS })', context);

assert.equal(JSON.stringify(GEN2_EPIC_SKIN_IDS), '["revolver_midas"]'); assert.equal(JSON.stringify(GEN2_NEW_MYTHIC_SKIN_IDS), '["ak20_xerror"]');   // (arrays made inside the vm are not this realm's: compare as text)
for (const id of ['revolver_midas', 'ak20_xerror']) {
  assert(GEN2_SKIN_IDS.includes(id), id + ' is in the Gen 2 skins');
  assert(SKIN_CASES.gen2_entrances.pool.includes(id), id + ' is dealt by the Gen 2 case');
  assert(!GEN1_SKIN_IDS.includes(id) && !SKIN_CASES.gen1_basic.pool.includes(id), id + ' is not in Gen 1');
}
assert.equal(new Set(GEN2_SKIN_IDS).size, GEN2_SKIN_IDS.length, 'no skin is listed twice');
assert(!DONUT_SKIN_IDS.includes('ak20_xerror') && !DONUT_SKIN_IDS.includes('revolver_midas'), 'the donut list (an admin login grants it all) is untouched');
const W = GEN2_SKIN_WEIGHTS, w = id => W[id] || 1;
assert(w('ak20_xerror') < w(DONUT_SKIN_IDS[0]), 'MYTHIC is rarer than any one donut gun');
assert(w('revolver_midas') < w(GEN2_LEGENDARY_SKIN_IDS[0]) && w('revolver_midas') < w(GEN2_RARE_SKIN_IDS[0]), 'EPIC is rarer than a rare skin and the Rainbow AK');
assert(w('ak20_xerror') < w('revolver_midas') && w(GEN2_RARE_SKIN_IDS[0]) < w(GEN2_GOOD_SKIN_IDS[0]), 'MYTHIC < EPIC < rare < good');

// roll it: a fresh player (owns nothing) opening a case, many times
const pool = SKIN_CASES.gen2_entrances.pool, N = 400000, hits = {};
for (let i = 0; i < N; i++) { const id = context.pickWeighted(pool, SKIN_CASES.gen2_entrances.weights); hits[id] = (hits[id] || 0) + 1; }
const total = pool.reduce((a, id) => a + w(id), 0), expect = id => w(id) / total;
const freq = id => (hits[id] || 0) / N;
for (const id of ['revolver_midas', 'ak20_xerror', GEN2_RARE_SKIN_IDS[0], GEN2_GOOD_SKIN_IDS[0], DONUT_SKIN_IDS[0], 'ak20_rainbow']) {
  assert(Math.abs(freq(id) - expect(id)) < Math.max(0.0015, expect(id) * 0.15), `${id}: rolled ${(freq(id) * 100).toFixed(2)}%, the weights say ${(expect(id) * 100).toFixed(2)}%`);
}
assert(freq('ak20_xerror') < freq(DONUT_SKIN_IDS[0]) && freq('ak20_xerror') < freq('revolver_midas') && freq('revolver_midas') < freq(GEN2_RARE_SKIN_IDS[0]) && freq(GEN2_RARE_SKIN_IDS[0]) < freq(GEN2_GOOD_SKIN_IDS[0]), 'as rolled: MYTHIC < EPIC < rare < good');
console.log(`Rarity server: EPIC and MYTHIC in the Gen 2 case only, MYTHIC ${(expect('ak20_xerror') * 100).toFixed(2)}% and EPIC ${(expect('revolver_midas') * 100).toFixed(2)}% of a fresh pull, against ${(expect(GEN2_RARE_SKIN_IDS[0]) * 100).toFixed(2)}% for a rare skin and ${(expect(GEN2_GOOD_SKIN_IDS[0]) * 100).toFixed(2)}% for a good one`);
