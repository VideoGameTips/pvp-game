const assert = require('node:assert/strict');
const { once } = require('node:events');
const { io } = require('socket.io-client');
const { setTimeout: delay } = require('node:timers/promises');

function event(client, name) {
  return once(client, name, { signal: AbortSignal.timeout(2500) });
}

(async () => {
  const url = process.env.PVP_TEST_URL || 'http://localhost:3001/';
  const clients = Array.from({ length: 3 }, () => io(url, { reconnection: false }));
  try {
    const [shooter, victim, outsider] = clients;
    await Promise.all(clients.map(client => event(client, 'init')));
    const match = 'javelin-test-' + shooter.id;
    const shots = [], flights = [], outside = [];
    victim.on('bulletFired', shot => shots.push(shot));
    victim.on('javelinFlight', flight => flights.push(flight));
    outsider.on('javelinFlight', flight => outside.push(flight));
    for (const client of [shooter, victim]) {
      const joined = event(client, 'matchRoster');
      client.emit('enterMatch', { matchId: match, mode: 'ffa' });
      await joined;
    }
    const id = `local_${shooter.id}_javelin_test`;
    const origin = { x: 0, y: 2, z: 0, dx: 0, dy: 1, dz: 0 };
    shooter.emit('move', { x: 0, y: 2, z: 0, rotX: 0, rotY: 0 });
    victim.emit('move', { x: 0, y: 8, z: 1, rotX: 0, rotY: 0 });
    const fired = event(victim, 'bulletFired');
    shooter.emit('shoot', { ...origin, weapon: 'javelin_launcher', projectileId: id });
    assert.equal((await fired)[0].id, id);
    await delay(80);
    shooter.emit('shoot', { ...origin, weapon: 'javelin_launcher', projectileId: id + '2' });
    const update = event(victim, 'javelinFlight');
    shooter.emit('javelinFlight', { ...origin, id, y: 6, speed: 55 });
    assert.equal((await update)[0].y, 6);
    victim.emit('javelinFlight', { ...origin, id, exploded: true });
    const boom = event(victim, 'javelinFlight');
    shooter.emit('javelinFlight', { ...origin, id, y: 8, exploded: true });
    assert.equal((await boom)[0].y, 8);
    shooter.emit('javelinFlight', { ...origin, id, y: 8, exploded: true });
    const hitData = { targetId: victim.id, bulletId: id, damageOverride: 999, headshot: true };
    const damage = [];
    victim.on('playerHit', e => damage.push(e.hp));
    for (const [weapon, hp, bulletId] of [['javelin_launcher', 210, id], ['javelin_launcher_splash', 140, id + '3']]) {
      if (bulletId !== id) {
        await delay(1400);
        const next = event(victim, 'bulletFired');
        shooter.emit('shoot', { ...origin, weapon: 'javelin_launcher', projectileId: bulletId });
        await next;
        const blast = event(victim, 'javelinFlight');
        shooter.emit('javelinFlight', { ...origin, id: bulletId, y: 8, exploded: true });
        await blast;
      }
      const hit = event(victim, 'playerHit');
      shooter.emit('hit', { ...hitData, weapon, bulletId });
      assert.equal((await hit)[0].hp, hp);
      shooter.emit('hit', { ...hitData, weapon: 'javelin_launcher_splash', bulletId });
    }
    await delay(100);
    assert.deepEqual(damage, [210, 140], 'A victim took both direct and splash from one missile');
    assert.equal(shots.length, 2, 'Second airborne launch was accepted');
    assert.equal(flights.length, 3, 'An unowned or duplicate detonation was relayed');
    assert.equal(outside.length, 0, 'Flight leaked into another match');
    console.log('PASS: stable flight ID, one missile at a time, match-scoped relay, 90 direct and 70 splash damage');
  } finally {
    clients.forEach(client => client.disconnect());
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
