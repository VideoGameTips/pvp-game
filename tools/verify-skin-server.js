#!/usr/bin/env node
// Painted skins, end to end against a real server. A painted skin is a picture the painter chose, shown on every screen in
// the match, so the server must not take one from just any client: a player who is not a verified admin account wears
// the default skin whatever the client claims (even claiming to be an admin), and an admin account's painted skin goes through.
// Starts its own server on a spare port with its own data directory and a throwaway master password. ~8 s.
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const { io } = require('socket.io-client');
const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-skin-'));
const MASTER = 'test-master-' + Math.random().toString(36).slice(2);
const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA, ADMIN_MASTER_PASS: MASTER }, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = 'http://localhost:' + PORT;
const picture = JSON.stringify({ p: ['808080', 'ff0000'], d: Buffer.alloc(11 * 256).toString('base64'), h: 'f0c8a0', f: '14161a' });
(async () => {
  await sleep(2500);
  const issues = [];
  const client = () => { const s = io(URL, { transports: ['websocket'], forceNew: true }); s.skins = []; s.on('init', d => { s.myId = d.id; }); s.on('skinChanged', d => s.skins.push(d)); return s; };
  const watcher = client(), plain = client(), claimant = client(), artist = client();
  await sleep(700);
  // the admin account: created by logging in with the master password, then this socket proves it
  await fetch(URL + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'artist', password: MASTER }) });
  artist.emit('setName', { username: 'artist', password: MASTER });
  await sleep(500);
  plain.emit('setSkin', { skin: 'px_plain', skinData: picture, isAdmin: false }); await sleep(400);
  claimant.emit('setSkin', { skin: 'px_claim', skinData: picture, isAdmin: true }); await sleep(400);   // "I am an admin", says the client
  artist.emit('setSkin', { skin: 'px_artist', skinData: picture, isAdmin: true }); await sleep(600);
  const got = id => watcher.skins.filter(d => d.id === id).pop();
  const a = got(plain.myId), b = got(claimant.myId), c = got(artist.myId);
  if (!a || a.skin !== 'default' || a.skinData !== null) issues.push('an ordinary player got a painted skin onto everyone\'s screen: ' + JSON.stringify(a && { skin: a.skin, data: !!a.skinData }));
  if (!b || b.skin !== 'default' || b.skinData !== null) issues.push('a player who only CLAIMED to be an admin got a painted skin through: ' + JSON.stringify(b && { skin: b.skin, data: !!b.skinData }));
  if (!c || c.skin !== 'px_artist' || typeof c.skinData !== 'string') issues.push('an admin account\'s painted skin should go through: ' + JSON.stringify(c && { skin: c.skin, data: !!c.skinData }));
  // a standard skin is anybody's to wear
  plain.emit('setSkin', { skin: 'soldier', isAdmin: false }); await sleep(500);
  const d = got(plain.myId); if (!d || d.skin !== 'soldier') issues.push('a standard skin should be wearable by anyone: ' + JSON.stringify(d && d.skin));
  for (const s of [watcher, plain, claimant, artist]) s.close();
  server.kill(); fs.rmSync(DATA, { recursive: true, force: true });
  if (issues.length) { console.log(issues.join('\n')); process.exit(1); }
  console.log('skin server checks: painted skins only from a verified admin account (a claim is not enough); standard skins for everyone');
  process.exit(0);
})().catch(e => { console.log('skin check crashed: ' + e.message); try { server.kill(); } catch (x) {} process.exit(1); });
