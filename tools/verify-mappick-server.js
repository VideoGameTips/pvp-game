#!/usr/bin/env node
// The 1v1 map vote, end to end against a real server: two people with different votes (a coin flip), a person against
// a bot (the bot's pick travels with the vote), an opponent leaving the vote, and nobody voting (random after 15 s).
// Starts its own server on a spare port with an empty data directory. Takes about 25 s. Needs socket.io-client
// (a dev dependency of the server's own socket.io install).
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const { io } = require('socket.io-client');
const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-mappick-'));
const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA }, stdio: 'ignore' });
const URL = 'http://localhost:' + PORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
const fail = m => { log.push('FAIL: ' + m); };
function client(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  s.ev = {};
  for (const e of ['mapPickStart', 'mapPickLocked', 'mapPickResult', 'lobbyStart']) s.on(e, d => { s.ev[e] = d; s.ev[e + '_t'] = Date.now(); });
  s.nm = name;
  return s;
}
const until = async (f, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(50); } return false; };
(async () => {
  await sleep(2500);   // the server is starting
  // A: two humans, different votes
  {
    const a = client('A'), b = client('B');
    await until(() => a.connected && b.connected);
    a.emit('joinStagingLobby', { mode: '1v1', map: null }); b.emit('joinStagingLobby', { mode: '1v1', map: null });
    await sleep(300);
    a.emit('setLobbyReady', { ready: true, fillBots: true }); b.emit('setLobbyReady', { ready: true, fillBots: true });
    if (!await until(() => a.ev.mapPickStart && b.ev.mapPickStart, 3000)) fail('A: no mapPickStart for two humans');
    else {
      if (!a.ev.mapPickStart.vs || !b.ev.mapPickStart.vs) fail('A: vs should be a person');
      if (a.ev.lobbyStart) fail('A: lobbyStart arrived before the vote');
      a.emit('mapPickVote', { mapId: 'duel_grid' });
      await sleep(150);
      if (!b.ev.mapPickLocked) fail('A: b was not told a locked in');
      b.emit('mapPickVote', { mapId: 'duel_platform' });
      if (!await until(() => a.ev.mapPickResult && b.ev.mapPickResult, 3000)) fail('A: no result');
      else {
        const r = a.ev.mapPickResult;
        if (!r.coin) fail('A: different votes should be a coin flip');
        if (!['duel_grid', 'duel_platform'].includes(r.mapId)) fail('A: winner not one of the votes: ' + r.mapId);
        if (a.ev.mapPickResult.mapId !== b.ev.mapPickResult.mapId) fail('A: players got different results');
      }
      if (!await until(() => a.ev.lobbyStart && b.ev.lobbyStart, 5000)) fail('A: no lobbyStart after the result');
      else {
        if (a.ev.lobbyStart.mapId !== a.ev.mapPickResult.mapId || b.ev.lobbyStart.mapId !== a.ev.mapPickResult.mapId) fail('A: match map is not the voted one');
        if (a.ev.lobbyStart.opponents.length !== 1) fail('A: should have 1 human opponent');
        if (a.ev.lobbyStart.enemyBots + a.ev.lobbyStart.allyBots !== 0) fail('A: no bots expected');
      }
    }
    a.close(); b.close();
  }
  await sleep(300);
  // B: one human, bot opponent
  {
    const a = client('A');
    await until(() => a.connected);
    a.emit('joinStagingLobby', { mode: '1v1', map: 'duel_grid' });   // a pre-pick must be ignored now
    await sleep(100);
    a.emit('setLobbyReady', { ready: true, fillBots: true });
    if (!await until(() => a.ev.mapPickStart, 3000)) fail('B: no mapPickStart vs bot');
    else {
      if (a.ev.mapPickStart.vs !== null) fail('B: vs should be null for a bot');
      if (JSON.stringify(a.ev.mapPickStart.options.slice().sort()) !== JSON.stringify(['duel_crossroads', 'duel_grid', 'duel_pillars', 'duel_platform'])) fail('B: options ' + a.ev.mapPickStart.options);
      const t0 = Date.now();
      a.emit('mapPickVote', { mapId: 'duel_pillars', botMapId: 'duel_crossroads' });
      a.emit('mapPickVote', { mapId: 'duel_grid', botMapId: 'duel_grid' });   // a second vote must be ignored
      if (!await until(() => a.ev.mapPickResult, 5000)) fail('B: no result');
      else {
        const r = a.ev.mapPickResult;
        if (Date.now() - t0 < 1500) fail('B: the bot was not given time to be seen deciding');
        if (!r.coin || !r.picks.some(p => p.bot && p.mapId === 'duel_crossroads') || !r.picks.some(p => !p.bot && p.mapId === 'duel_pillars')) fail('B: picks wrong ' + JSON.stringify(r));
      }
      if (!await until(() => a.ev.lobbyStart, 5000)) fail('B: no lobbyStart');
      else {
        const l = a.ev.lobbyStart;
        if (l.mapId !== a.ev.mapPickResult.mapId) fail('B: map mismatch');
        if (l.enemyBots + l.allyBots !== 1) fail('B: want exactly one bot, got ' + (l.enemyBots + l.allyBots));
      }
    }
    a.close();
  }
  await sleep(300);
  // C: an opponent leaves the vote
  {
    const a = client('A'), b = client('B');
    await until(() => a.connected && b.connected);
    a.emit('joinStagingLobby', { mode: '1v1', map: null }); b.emit('joinStagingLobby', { mode: '1v1', map: null });
    await sleep(300);
    a.emit('setLobbyReady', { ready: true, fillBots: true }); b.emit('setLobbyReady', { ready: true, fillBots: true });
    await until(() => a.ev.mapPickStart && b.ev.mapPickStart, 3000);
    a.emit('mapPickVote', { mapId: 'duel_pillars' });
    await sleep(200);
    b.emit('leaveMapPick');
    if (!await until(() => a.ev.lobbyStart, 7000)) fail('C: nobody started after the opponent left');
    else if (a.ev.lobbyStart.mapId !== 'duel_pillars') fail('C: the remaining vote should stand, got ' + a.ev.lobbyStart.mapId);
    else if (a.ev.lobbyStart.enemyBots + a.ev.lobbyStart.allyBots !== 1) fail('C: a bot should take the place');
    if (b.ev.lobbyStart) fail('C: the leaver was started anyway');
    a.close(); b.close();
  }
  await sleep(300);
  // D: nobody votes: random after the timer
  {
    const a = client('A');
    await until(() => a.connected);
    a.emit('joinStagingLobby', { mode: '1v1', map: null }); await sleep(100);
    a.emit('setLobbyReady', { ready: true, fillBots: true });
    await until(() => a.ev.mapPickStart, 3000);
    const t0 = Date.now();
    if (!await until(() => a.ev.lobbyStart, 25000)) fail('D: never started');
    else {
      const dt = Date.now() - t0;
      if (dt < 14000 || dt > 21000) fail('D: started after ' + dt + ' ms, want about 15 s + reveal');
      if (!a.ev.lobbyStart.mapId.startsWith('duel_')) fail('D: map ' + a.ev.lobbyStart.mapId);
    }
    a.close();
  }
  server.kill();
  try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {}
  console.log(log.length ? log.join('\n') : 'map vote server checks: two humans, a bot, a leaver, a timeout: all OK');
  process.exit(log.length ? 1 : 0);
})();
