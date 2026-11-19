// EPIC and MYTHIC in the Gen 2 skin case, as server.js deals them: both new skins are in the Gen 2 pool (and not in Gen 1), a case always deals a skin you are missing first, and the odds put MYTHIC rarest of all,
// EPIC next, then the rest as before: slice the lists and the roll out of server.js into a vm and roll the case a few hundred thousand times.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const from = source.indexOf('const GEN1_SKIN_IDS = ['), to = source.indexOf('for (const id of Object.keys(WEAPON_COSTS))', from);
assert(from > 0 && to > from, 'the skin lists were not found in server.js');
const fnStart = source.indexOf('function pickWeighted('), fnEnd = source.indexOf('\n}\n', fnStart) + 3;
assert(fnStart > 0 && fnEnd > fnStart, 'pickWeighted not found');
const context = { SKIN_CASE_GEN1_COST: 1500, SKIN_CASE_GEN2_COST: 5000, SKIN_CASE_GEN3_COST: 8000, Math, Set };
vm.createContext(context);
vm.runInContext(source.slice(from, to) + '\n' + source.slice(fnStart, fnEnd), context);
const { GEN1_SKIN_IDS, GEN2_SKIN_IDS, GEN2_SKIN_WEIGHTS, SKIN_CASES, GEN2_EPIC_SKIN_IDS, GEN2_NEW_MYTHIC_SKIN_IDS, GEN2_RARE_SKIN_IDS, GEN2_GOOD_SKIN_IDS, GEN2_LEGENDARY_SKIN_IDS, DONUT_SKIN_IDS } = vm.runInContext('({ GEN1_SKIN_IDS, GEN2_SKIN_IDS, GEN2_SKIN_WEIGHTS, SKIN_CASES, GEN2_EPIC_SKIN_IDS, GEN2_NEW_MYTHIC_SKIN_IDS, GEN2_RARE_SKIN_IDS, GEN2_GOOD_SKIN_IDS, GEN2_LEGENDARY_SKIN_IDS, DONUT_SKIN_IDS })', context);

const seasonId = 'ak20_phoenix_reign', relicId = 'revolver_relic_six';
const seasonDecl = source.match(/^const SEASON_SKIN_IDS = .*?;/m)?.[0];
assert.ok(seasonDecl);
assert.equal(vm.runInNewContext(seasonDecl + '\nSEASON_SKIN_IDS[0]'), seasonId);
assert.ok(Object.values(SKIN_CASES).every(c => !c.pool.includes(seasonId)), 'Phoenix Reign must stay exclusive to Season 1');
assert.equal(SKIN_CASES.gen3_clockwork.weights[relicId], 2);
assert.ok(SKIN_CASES.gen3_clockwork.pool.includes(relicId), 'Relic Six is awarded from Gen 3');
assert.ok(SKIN_CASES.gen3_clockwork.pool.includes('revolver_broken_promise'), 'The Broken Promise is awarded from Gen 3');
assert.equal(SKIN_CASES.gen3_clockwork.weights.revolver_broken_promise, SKIN_CASES.gen3_clockwork.weights[relicId]);
assert.equal(SKIN_CASES.gen3_clockwork.weights.m1_garand_paradox, SKIN_CASES.gen3_clockwork.weights.amr_event_horizon);
assert.ok(SKIN_CASES.gen3_clockwork.pool.includes('m1_garand_paradox'), 'Paradox is a Gen 3 Mythic');
assert.equal(SKIN_CASES.gen3_clockwork.pool.filter(id => id === 'minigun_hungry_garden').length, 1);
assert.equal(SKIN_CASES.gen3_clockwork.weights.minigun_hungry_garden, .75);
for (const id of ['srx_railbreaker','ak20_phantom_protocol','minigun_iron_tempest','revolver_blackbox','javelin_ghost_lance','p90_zero_recoil']) {
  assert.ok(SKIN_CASES.gen3_clockwork.pool.includes(id), id + ' must drop in Gen 3');
  assert.equal(SKIN_CASES.gen3_clockwork.weights[id], id === 'srx_railbreaker' ? .75 : 2);
}
for (const id of ['p90_nullspace','rpg_leviathan','revolver_crown_of_thorns','lever_afterimage','spear_hollow_king','srx_glass_cathedral']) {
  assert.equal(SKIN_CASES.gen3_clockwork.pool.filter(s => s === id).length, 1, id + ' is a Gen 3 drop');
  assert.equal(SKIN_CASES.gen3_clockwork.weights[id], .75, id + ' is Mythic');
  assert.ok(Object.values(SKIN_CASES).filter(c => c !== SKIN_CASES.gen3_clockwork).every(c => !c.pool.includes(id)));
}
for (const [id, weight] of [['srx_dead_frequency',.75], ['hand_cannon_hourglass',.75], ['ak20_paper_kingdom',2], ['rpg_false_sun',.75]]) {
  assert.ok(SKIN_CASES.gen3_clockwork.pool.includes(id), id + ' must drop in Gen 3');
  assert.equal(SKIN_CASES.gen3_clockwork.weights[id], weight);
}
const weaponStart = source.indexOf("socket.on('setWeapon',");
const weaponEnd = source.indexOf('\n  });', weaponStart) + 7;
assert.ok(weaponStart > 0 && weaponEnd > weaponStart);
const owner = { account: 'test', matchId: 'test-match' };
const account = { skinInventory: [] };
let setWeapon;
vm.runInNewContext(seasonDecl + '\n' + source.slice(weaponStart, weaponEnd), {
  players: { sid: owner }, users: { test: account },
  socket: { id: 'sid', on(name, fn) { setWeapon = fn; } },
  hellfireWeapon: () => false, emitToMatch() {},
});
setWeapon({ weaponId: 'ak20', skin: seasonId });
assert.equal(owner.weaponSkin, null, 'Unowned Phoenix Reign cannot be shown to others');
account.skinInventory.push(seasonId);
setWeapon({ weaponId: 'ak20', skin: seasonId });
assert.equal(owner.weaponSkin, seasonId);
setWeapon({ weaponId: 'revolver', skin: seasonId });
assert.equal(owner.weaponSkin, null, 'Phoenix Reign must be AK20-only');

const gen3 = SKIN_CASES.gen3_clockwork;
assert.equal(gen3.weights.amr_event_horizon, .75);
assert.ok(!gen3.pool.includes('amr_event_horizon'), 'No drops for the archived AMR');
for (const [ids, weight] of [
  [['revolver_deadeye', 'm1_garand_thunderclap', 'katana_glass_fang'], 1.4],
  [['flamethrower_dragons_maw', 'crossbow_permafrost', 'chain_hammer_bonebreaker', 'minigun_iron_behemoth'], 2],
]) for (const id of ids) {
  assert.equal(gen3.pool.filter(entry => entry === id).length, 1, id + ' is a Gen 3 drop');
  assert.equal(gen3.weights[id], weight);
}

for (const id of ['revolver_midas', 'pistol_frost', 'machine_pistol_overclocked']) assert.ok(GEN2_EPIC_SKIN_IDS.includes(id));
for (const id of ['ak20_xerror', 'revolver_shatterpoint']) assert.ok(GEN2_NEW_MYTHIC_SKIN_IDS.includes(id));
for (const id of ['revolver_midas', 'pistol_frost', 'machine_pistol_overclocked', 'ak20_xerror', 'revolver_shatterpoint']) {
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
for (const id of ['revolver_midas', 'pistol_frost', 'ak20_xerror', 'revolver_shatterpoint', GEN2_RARE_SKIN_IDS[0], GEN2_GOOD_SKIN_IDS[0], DONUT_SKIN_IDS[0], 'ak20_rainbow']) {
  assert(Math.abs(freq(id) - expect(id)) < Math.max(0.0015, expect(id) * 0.15), `${id}: rolled ${(freq(id) * 100).toFixed(2)}%, the weights say ${(expect(id) * 100).toFixed(2)}%`);
}
assert(freq('ak20_xerror') < freq(DONUT_SKIN_IDS[0]) && freq('ak20_xerror') < freq('revolver_midas') && freq('revolver_midas') < freq(GEN2_RARE_SKIN_IDS[0]) && freq(GEN2_RARE_SKIN_IDS[0]) < freq(GEN2_GOOD_SKIN_IDS[0]), 'as rolled: MYTHIC < EPIC < rare < good');
console.log(`Rarity server: EPIC and MYTHIC in the Gen 2 case only, MYTHIC ${(expect('ak20_xerror') * 100).toFixed(2)}% and EPIC ${(expect('revolver_midas') * 100).toFixed(2)}% each (two of them) of a fresh pull, against ${(expect(GEN2_RARE_SKIN_IDS[0]) * 100).toFixed(2)}% for a rare skin and ${(expect(GEN2_GOOD_SKIN_IDS[0]) * 100).toFixed(2)}% for a good one`);
