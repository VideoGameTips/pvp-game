// Throw Spear (five a life, each landing stays) and the Satchel cap (two out at a time), as server.js enforces them: the same
// slice-the-handlers-into-a-vm trick as verify-hellfire-server.js.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const handlers = {}, events = [], p = { id: 'self', account: 'regular', matchId: 'test', x: 0, y: 1, z: 0, hp: 300, dead: false, lastShot: 0 };
const context = {
  users: { regular: { isAdmin: false } }, players: { self: p }, HUB_MATCH: 'hub',
  socket: { id: 'self', on: (name, fn) => handlers[name] = fn },
  Date, Math, Number, String, Set, Map,
  emitToMatch: (room, event, data) => events.push({ room, event, data, to: 'all' }),
  emitToMatchExcept: (room, except, event, data) => events.push({ room, event, data, to: 'others' }),
  hellfireWeapon: () => false, canUseHellfire: () => false, blocksFriendlyFire: () => false,
  nextSpawn: () => ({ x: 0, y: 1, z: 0 }), maxHpFor: () => 300, SPAWN_SHIELD_MS: 1500,
};
vm.createContext(context);
for (const name of ['shoot', 'satchelEvent', 'spearPlant', 'readyRespawn', 'resetSelf']) {
  const start = source.indexOf(`socket.on('${name}',`), end = source.indexOf('\n  });', start) + 7;
  assert(start > 0 && end > start, `handler ${name} not found`);
  vm.runInContext(source.slice(start, end), context);
}
const count = (event) => events.filter(e => e.event === event).length;
const throwSpear = (spear = true) => { p.lastShot = 0; handlers.shoot({ x: 0, y: 1.6, z: 0, dx: 0, dy: 0, dz: -1, weapon: 'spear_throw', spear }); };

// five spears a life: the sixth is not even shown to the others
for (let i = 0; i < 6; i++) throwSpear();
assert.equal(count('bulletFired'), 5, 'five spears are relayed, not six');
assert.equal(p._spearsLeft, 0);
// a fresh life (a respawn, or a new round's reset) hands the five back
p.dead = true; handlers.readyRespawn({}); assert.equal(p._spearsLeft, 5);
events.length = 0; for (let i = 0; i < 5; i++) throwSpear(); assert.equal(count('bulletFired'), 5);
handlers.resetSelf({}); assert.equal(p._spearsLeft, 5);
// the Hatchet and the Tomahawk throw the same projectile without being the spear: not counted
events.length = 0; p._spearsLeft = 0; for (let i = 0; i < 3; i++) throwSpear(false); assert.equal(count('bulletFired'), 3); assert.equal(p._spearsLeft, 0);
// other weapons are not counted against them
events.length = 0; p._spearsLeft = 0; p.lastShot = 0; handlers.shoot({ x: 0, y: 1, z: 0, dx: 0, dy: 0, dz: -1, weapon: 'pistol' }); assert.equal(count('bulletFired'), 1);

// a spear that lands is told to everyone else, direction normalised, and only if it is plausibly this player's own
const land = { id: 'spear_self_1000', x: 3, y: 0.2, z: -8, dx: 0, dy: -2, dz: 0, floorY: 0 };
events.length = 0; p._spearPlantedAt = 0; handlers.spearPlant(land);
const told = events.filter(e => e.event === 'spearPlant');
assert.equal(told.length, 1); assert.equal(told[0].to, 'others');
assert.equal(told[0].data.ownerId, 'self'); assert.equal(told[0].data.dy, -1); assert.equal(told[0].data.id, land.id);
events.length = 0; p._spearPlantedAt = 0; handlers.spearPlant({ ...land, id: 'spear_somebody_else_1' }); assert.equal(count('spearPlant'), 0, "someone else's spear id");
p._spearPlantedAt = 0; handlers.spearPlant({ ...land, x: Infinity }); assert.equal(count('spearPlant'), 0, 'not a number');
p._spearPlantedAt = 0; handlers.spearPlant({ ...land, dx: 0, dy: 0, dz: 0 }); assert.equal(count('spearPlant'), 0, 'no direction');
p._spearPlantedAt = 0; handlers.spearPlant({ ...land, y: 99999 }); assert.equal(count('spearPlant'), 0, 'off the map');
events.length = 0; p._spearPlantedAt = 0; handlers.spearPlant(land); handlers.spearPlant({ ...land, id: 'spear_self_1001' }); assert.equal(count('spearPlant'), 1, 'a burst of landings is rate limited');
p.matchId = 'hub'; p._spearPlantedAt = 0; events.length = 0; handlers.spearPlant(land); assert.equal(count('spearPlant'), 0, 'not in the hub'); p.matchId = 'test';
console.log('Spear server: five a life (respawn / reset refills), landings relayed to the others and validated');

// satchels: two out at a time, not five
const sat = (n) => ({ action: 'throw', id: `satchel_self_${n}`, x: 0, y: 1.6, z: 0, dx: 0, dy: 0, dz: -1 });
events.length = 0; p.dead = false;
for (let i = 0; i < 5; i++) { p._satchelThrownAt = 0; handlers.satchelEvent(sat(i)); }
assert.equal(count('satchelEvent'), 2, 'only two satchels may be out');
assert.equal(p._satchelIds.size, 2);
handlers.satchelEvent({ action: 'detonate' }); assert.equal(p._satchelIds.size, 0);
events.length = 0; p._satchelThrownAt = 0; handlers.satchelEvent(sat(9)); assert.equal(count('satchelEvent'), 1, 'after a detonation there is room again');
console.log('Satchel server: capped at two out at a time');
