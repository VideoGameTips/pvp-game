#!/usr/bin/env node
// The word filter, and what the server does with it: chat from a hand-made client is cleaned before anybody else sees it
// (text filtered, colour a plain hex, no letters in the emoji slot, no crash on an empty message), accounts cannot be
// registered with names the filter refuses, ordinary names and chat pass untouched, and admin login codes come from the
// environment or admin-codes.txt (never from the repository). Starts its own server on a spare port. ~8 s.
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const { io } = require('socket.io-client');
const filter = require('../content-filter');
const rot13 = s => s.replace(/[a-z]/gi, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));
const BAD_CHAT = ["s.h.p.x lbh", "lbh ner n o1gpu", "a.v.t.t.n", "x l f", "trg encrq", "c b e a"].map(rot13);
const BAD_NAMES = ["kK_phz_Kk", "s_h_p_x_re", "anmv_obl", "C0ea", "ergneqrq1"].map(rot13);
const GOOD = ['Andy', 'Pizza', 'assassin', 'class', 'Grape', 'Essex', 'Peacock', 'Dickens', 'Pakistan', 'Raccoon', 'therapist', 'Penistone', 'gg wp', 'nice shot!', 'Skyline', 'night', 'Mikey', 'Cocktail', 'i a m ready'];
const issues = [];
for (const t of BAD_CHAT.concat(BAD_NAMES)) if (!filter.isBlocked(t)) issues.push('the filter let one through: ' + t.replace(/./g, (c, i) => i < 2 ? c : '*'));
for (const t of GOOD) if (filter.isBlocked(t)) issues.push('the filter blocked an innocent word: ' + t);
if (filter.cleanChat(BAD_CHAT[0]) !== filter.REPLACEMENT) issues.push('a blocked line should become the harmless one');
if (filter.cleanChat('gg wp') !== 'gg wp') issues.push('a clean line should be relayed untouched');
if (/(.)/.test(filter.safeDisplayName(BAD_NAMES[0])) && filter.isBlocked(filter.safeDisplayName(BAD_NAMES[0]))) issues.push('a refused name should be shown as a harmless one');

const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-filter-'));
const CODE = 'test-code-' + Math.random().toString(36).slice(2);
fs.writeFileSync(path.join(DATA, 'admin-codes.txt'), '# a comment\n' + CODE + '\n');
const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA, ADMIN_MASTER_PASS: '' }, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = 'http://localhost:' + PORT;
const post = (p, body) => fetch(URL + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));
(async () => {
  await sleep(2500);
  // names
  for (const n of BAD_NAMES) { const r = await post('/auth/register', { username: n.slice(0, 16), password: 'a-fine-password-1' }); if (r.status !== 400) issues.push('an account was registered with a refused name (status ' + r.status + ')'); }
  const av = await fetch(URL + '/auth/available?username=' + encodeURIComponent(BAD_NAMES[0])).then(r => r.json());
  if (av.available !== false || !av.error) issues.push('the nickname check should refuse a refused name: ' + JSON.stringify(av));
  const ok = await post('/auth/register', { username: 'FriendlyAndy', password: 'a-fine-password-1' });
  if (ok.status !== 200 || !ok.body.ok) issues.push('an ordinary name should register: ' + ok.status);
  // chat
  const a = io(URL, { transports: ['websocket'], forceNew: true }), b = io(URL, { transports: ['websocket'], forceNew: true });
  const got = []; b.on('chatLine', d => got.push(d));
  await sleep(800);
  const say = async d => { a.emit('chatLine', d); await sleep(900); };
  await say({ text: BAD_CHAT[0], color: '#66ccff', emoji: '💬' });
  await say({ text: 'gg wp', color: 'url(javascript:alert(1))', emoji: 'xxx' });
  await say({ text: 'hello', color: '#ff0000', emoji: '👍' });
  await say(undefined);                                    // an empty message must not take the server down
  await say({ text: BAD_NAMES[0] });
  await sleep(300);
  if (got.length < 3) issues.push('chat lines did not arrive: ' + got.length);
  else {
    if (got[0].text !== filter.REPLACEMENT) issues.push('a refused chat line reached other players: ' + JSON.stringify(got[0].text));
    if (got[1].color !== '#fff' || got[1].emoji !== '') issues.push('an odd colour or letters in the emoji slot got through: ' + JSON.stringify(got[1]));
    if (got[2].text !== 'hello' || got[2].color !== '#ff0000' || got[2].emoji !== '👍') issues.push('a clean line was changed: ' + JSON.stringify(got[2]));
  }
  const alive = await fetch(URL + '/status').then(r => r.ok).catch(() => false);
  if (!alive) issues.push('the server fell over on a chat message with no body');
  // admin codes: from admin-codes.txt only
  const wrong = await post('/auth/login', { username: 'Intruder', password: 'not-the-code-at-all' });
  if (wrong.status === 200 && wrong.body.ok) issues.push('a wrong code logged in');
  const right = await post('/auth/login', { username: 'TheOwner', password: CODE });
  if (!(right.status === 200 && right.body.ok)) issues.push('a code from admin-codes.txt should log in as an admin: ' + right.status);
  a.close(); b.close(); server.kill(); fs.rmSync(DATA, { recursive: true, force: true });
  if (issues.length) { console.log(issues.join('\n')); process.exit(1); }
  console.log('content filter checks: slurs, sex and swearing blocked in chat and names (look-alikes too), innocent words untouched, chat cleaned on the server, admin codes from admin-codes.txt');
  process.exit(0);
})().catch(e => { console.log('content filter check crashed: ' + e.message); try { server.kill(); } catch (x) {} process.exit(1); });
