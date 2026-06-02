/* ════════════════════════════════════════════════════════════════════════
   CHARACTER CHAT — the Random FFA "Official Comic Cast" as chat personalities.
   Self-contained: rule-based bots (no API), semi-pixelized avatars rendered on
   canvas. Two modes: 1-on-1 chat, and a Group Chat room where the cast argues.
   Also lets you "Pick as Teammate" → saved to localStorage, read by game.js.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── The cast. [id, name, emoji, themeColor, catchphrase, [extra lines...]] ──
  // Grouped to mirror the comic poster. Lines stay short & in-character.
  const RAW = [
    // ── MAIN HEROES ──
    ['kingchaos','King Chaos','👑','#7a1fa2','Trust me.',
      ["It wasn't me. It was DEFINITELY not me.",'I am, statistically, the greatest.','Chaos? I prefer "spontaneous genius."','Everything is going exactly as I planned. Probably.','Bow before the crown. Or don\'t. I\'ll allow it.']],
    ['luckylarry','Lucky Larry','🍀','#2e8b2e','I didn\'t even do anything.',
      ['Wait... I won AGAIN? How??','I just kinda stood there, honestly.','My lucky clover did all the work.','Was that supposed to happen? Neat.','Sorry! I really didn\'t mean to clutch that.']],
    ['grandmaster','Grandmaster','♟️','#3a5fb0','Twenty-three moves ahead.',
      ['I predicted you would say that.','This was decided four turns ago.','You are playing checkers. I am playing 4D chess.','Calculated. Down to the millisecond.','Resign now and save us both the time.']],
    ['mirage','Mirage','🦊','#a05fd0','Missed me.',
      ['Too slow~','Were you aiming AT me? Adorable.','Blink and I\'m gone.','Catch me. Oh wait — you can\'t.','I was never even there. 😏']],
    // ── FAN FAVORITES ──
    ['bot47','Bot-47','🤖','#2b6e8f','Target acquired.',
      ['Beep. Threat assessment: low.','Processing... processing... you lose.','Affirmative.','My win-rate is now non-zero. Concerning for you.','Initiating sarcasm subroutine. Nice shot. (It was not.)']],
    ['rager','Rager','😡','#c0392b','THAT\'S NOT FAIR!',
      ['THE HITBOXES ARE BROKEN!','LAG! IT WAS LAG! 100% LAG!','HOW did that not hit?!','THIS GAME IS RIGGED AGAINST ME.','I\'M NOT MAD. YOU\'RE MAD.']],
    ['duckguy','Duck Guy','🦆','#d4a017','Quack.',
      ['Quack quack.','...quack?','Quack. (That was an insult.)','QUACK!','quack 🦆']],
    ['combatmedic','Combat Medic','🚑','#27ae60','Stop dying.',
      ['I literally cannot heal that fast.','Hold still — I\'m WORKING here.','You have 3 HP and zero awareness.','Need a medic? You ALWAYS need a medic.','I\'m a healer, not a miracle worker.']],
    // ── GIRLS SQUAD ──
    ['sharpshooter','Sharpshooter','🎯','#b03a6a','Miss? Couldn\'t be me.',
      ['One shot. One kill. Every time.','I don\'t miss. I redistribute.','Headshot. You\'re welcome.','Aim is a personality trait.']],
    ['ladymayhem','Lady Mayhem','🤡','#d63384','This will be hilarious.',
      ['Oops, did I do that? Tee hee.','Watch this go horribly wrong 😈','Chaos is just comedy with extra steps.','I set EVERYTHING on fire. On purpose.']],
    ['jinx','Jinx','🎲','#9b59b6','That wasn\'t supposed to happen.',
      ['Huh. Weird. Anyway.','I swear it worked in practice.','Murphy\'s Law is my best friend.','Define "supposed to."']],
    ['pandora','Pandora','📦','#8e44ad','Let\'s see what happens.',
      ['I pressed the button. All of them.','Curiosity never killed ME.','What\'s the worst that could happen? 📦','Open it. OPEN IT.']],
    ['wildfire','Wildfire','🔥','#e25822','Oops.',
      ['That wasn\'t supposed to explode. But cool.','My bad. Everything\'s on fire now.','Oops. Again. 🔥','I regret nothing. Mostly.']],
    ['anarchy','Anarchy','🏴','#6c3483','Trust the process.',
      ['Rules? Never heard of them.','Burn the meta. Build a new one.','The process IS chaos. Trust it.','No gods, no metas. 🏴']],
    // ── SPECIALISTS ──
    ['professional','Professional','🕶️','#34495e','Calculated.',
      ['Within acceptable parameters.','I do not "play." I execute.','Emotion is a debuff.','Already accounted for.']],
    ['afkguy','AFK Guy','😴','#7f8c8d','Sorry, I was changing my music.',
      ['Zzz... huh? Did we win?','brb tea','wait the match started?','I top-fragged while AFK. Iconic.']],
    ['ragebaiter','Rage Baiter','🚫','#555555','No.',
      ['No.','Nope.','Absolutely not.','Have you tried: no?']],
    ['noskill','No Skill','🔫','#a04000','Minigun solves everything.',
      ['MORE BULLETS = MORE SKILL.','Who needs aim when you have AMMO?','Spray. Pray. Repeat.','Skill is just a brrrrrt away.']],
    ['pyromaniac','Pyromaniac','🔥','#e74c3c','MORE FIRE!',
      ['BURN IT ALL! 🔥','Is it hot in here or is that just me? It\'s me.','FIRE FIXES EVERYTHING.','I love the smell of respawns in the morning.']],
    ['engineer','Engineer','🔧','#d35400','I can fix this... or break it.',
      ['50/50 odds, honestly.','Have you tried turning the enemy off?','It\'s not a bug, it\'s a feature.','I built a turret. It hates me too.']],
    // ── BOTS ──
    ['bot604','Bot-604','🤖','#16a085','Probability calculated.',
      ['Outcome: 0.04% favorable for you.','Beep boop. Recalculating your doom.','Logic dictates you flee.','I am Bot-47\'s smarter cousin.']],
    ['juicebox','Juice Box','🧃','#f39c12','Juice for you!',
      ['Stay hydrated, soldier! 🧃','Apple or grape? You get GRAPE.','+10 HP and a smile!','Juice solves more than minigun. Fight me.']],
    // ── WEIRD DEPARTMENT ──
    ['ghost','Ghost','👻','#95a5a6','...',
      ['...','*silent staring*','boo.','(Ghost is typing... no he isn\'t.)']],
    ['nucleardave','Nuclear Dave','☢️','#7d9b00','Watch this.',
      ['It\'ll PROBABLY be fine. ☢️','Hold my plutonium.','Safety third!','I glow in the dark now. Worth it.']],
    ['lorekeeper','Lore Keeper','📖','#5d4037','It is written.',
      ['The prophecy foretold your defeat.','Ah, this references Patch 0.3, of course.','Allow me to read you 40 pages of backstory.','Knowledge is power. Also a debuff to fun.']],
    ['tankturtle','Tank Turtle','🐢','#2e7d32','Slow but unstoppable.',
      ['I will arrive. Eventually. 🐢','You cannot rush perfection.','Tank meta never dies. Neither do I.','Two hours later: I have moved 3 feet.']],
    ['casualbob','Casual Bob','🧢','#3498db','Hmm...',
      ['Yeah I dunno, seems fine.','I just play for fun, man.','Wait we\'re keeping score?','Eh, GG either way 🧢']],
    ['goat','Goat','🐐','#16a085','Skill issue.',
      ['Get good. 🐐','That\'s a you problem.','Cope harder.','I am, definitionally, the GOAT.']],
    ['mrsuspicious','Mr. Suspicious','🕵️','#2c3e50','Nothing to see here.',
      ['I am definitely not hacking.','*hides aimbot* anyway','Who, me? Suspicious? Never.','Trust me bro 🕵️']],
    ['thesweat','The Sweat','💦','#00bcd4','Always sweating.',
      ['I\'ve been grinding for 14 hours. 💦','Warmed up for 3 hours pre-match.','My APM is higher than your IQ.','It\'s not tryharding if I always do it.']],
    // ── MISCELLANEOUS ──
    ['janitor','Janitor','🧹','#607d8b','Not again.',
      ['I JUST cleaned up King Chaos\'s mess.','Sigh. Who broke the map THIS time.','Mop. Repeat. Mop. Repeat.','I\'m too old for this respawn nonsense.']],
    ['timekeeper','Time Keeper','⏰','#795548','You\'re late.',
      ['Tick. Tock. ⏰','Time is the only weapon that never misses.','I have already seen how this ends.','Punctuality is a skill, unlike your aim.']],
    ['wildcard','Wildcard','❓','#9c27b0','?',
      ['???','You never know what I\'ll do. Neither do I.','Surprise! ❓','50% genius, 50% accident, 100% chaos.']],
    ['panicpanda','Panic Panda','🐼','#212121','AAAA! WHAT IS HAPPENING?!',
      ['WHY IS EVERYONE SHOOTING ME?!','I DON\'T KNOW WHAT BUTTONS DO ANYMORE!','HELP HELP HELP 🐼','I PANIC-CLUTCHED AND I\'M SO SORRY']],
    ['dramaqueen','Drama Queen','😭','#e91e63','This is the worst day of my life!',
      ['I will NEVER recover from that.','How could you. HOW COULD YOU. 😭','My villain origin story starts NOW.','I\'m not crying, YOU\'RE crying!']],
    ['shadow','Shadow','🌑','#1a1a1a','...',
      ['*emerges from darkness*','You did not see me. Good.','🌑','The shadow remembers everything.']],
    ['pixelboy','Pixel Boy','🎮','#4caf50','GG.',
      ['Press F. 🎮','Achievement unlocked: you lost.','Insert coin to cope.','New high score: my ego.']],
  ];

  const CAST = RAW.map(([id, name, emoji, color, quip, lines]) => ({
    id, name, emoji, color, quip, lines: [quip, ...(lines || [])],
  }));
  const byId = Object.fromEntries(CAST.map(c => [c.id, c]));

  // Default "loud + argumentative" group room — the ones who bicker the most.
  const GROUP_ROOM = ['kingchaos','mirage','rager','janitor','luckylarry','goat','duckguy','panicpanda','dramaqueen','bot47'];

  // ── Semi-pixelized avatar: colored tile + emoji drawn at low-res, upscaled
  //    with nearest-neighbor so it reads as "semi pixelated, not entirely". ──
  function avatarCanvas(char, size = 56) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    c.style.cssText = `width:${size}px;height:${size}px;image-rendering:pixelated;border-radius:6px;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.4),0 0 0 1px ${char.color};display:block;`;
    const ctx = c.getContext('2d');
    // background gradient tile
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, char.color);
    g.addColorStop(1, shade(char.color, -40));
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    // low-res emoji → upscale (the "semi pixel" trick). res ~22 keeps it chunky but recognizable.
    const res = 22;
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = res;
    const tctx = tmp.getContext('2d');
    tctx.font = `${res - 3}px serif`;
    tctx.textAlign = 'center'; tctx.textBaseline = 'middle';
    tctx.fillText(char.emoji, res / 2, res / 2 + 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 3, 3, size - 6, size - 6);
    // faint scanlines for retro feel
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#000';
    for (let y = 0; y < size; y += 3) ctx.fillRect(0, y, size, 1);
    ctx.globalAlpha = 1;
    return c;
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, gg = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); gg = Math.max(0, Math.min(255, gg)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (gg << 8) + b).toString(16).slice(1);
  }

  // ── Response engine ────────────────────────────────────────────────────
  const TOPIC = [
    { k: ['hi','hey','hello','yo','sup','wassup'], pick: c => greet(c) },
    { k: ['fair','unfair','balance','broken','nerf','rigged','lag'], pick: c =>
        c.id === 'rager' ? rng(c.lines) : `${c.name} shrugs: "${rng(['Sounds like a skill issue.','Balanced enough for me.','Working as intended, probably.'])}"` },
    { k: ['win','won','lose','lost','gg','good game'], pick: c =>
        rng([c.quip, ...c.lines.slice(1)]) },
    { k: ['who','你是谁','what are you'], pick: c => `I'm ${c.name}. ${c.quip}` },
    { k: ['cheat','hack','aimbot','cheater'], pick: c =>
        c.id === 'mrsuspicious' ? rng(c.lines) : `"${rng(['I would NEVER.','No comment.','Define cheating.'])}" — ${c.name}` },
    { k: ['love','cute','best','favorite','awesome','nice'], pick: c =>
        rng(['Obviously. ' + c.quip, 'Flattery accepted.', 'I know. ' + c.quip]) },
    { k: ['noob','trash','bad','suck','ez','easy'], pick: c =>
        c.id === 'goat' ? rng(c.lines) : rng(['Bold words. ' + c.quip, 'We\'ll see about that.', '😏 ' + c.quip]) },
    { k: ['map','wall','stuck','glitch'], pick: c =>
        c.id === 'janitor' ? rng(c.lines) : rng(['Maps are hard. ' + c.quip, 'Skill issue with geometry.', c.quip]) },
  ];
  function greet(c) {
    return rng([`${c.emoji} ${c.quip}`, `Oh, it's you. ${c.quip}`, `Hey. ${c.quip}`, `${c.quip}`]);
  }
  function rng(a) { return a[Math.floor(Math.random() * a.length)]; }

  // Per-character memory so the offline engine never says the same line twice
  // in a row (the old version parroted the catchphrase ~50% of the time).
  const _lastReply = {};
  function freshLine(char, pool) {
    const last = _lastReply[char.id];
    let opts = pool.filter(l => l !== last);
    if (!opts.length) opts = pool;
    const pick = rng(opts);
    _lastReply[char.id] = pick;
    return pick;
  }
  function replyFor(char, text) {
    const t = (text || '').toLowerCase();
    for (const topic of TOPIC) {
      if (topic.k.some(k => t.includes(k))) return topic.pick(char);
    }
    // No keyword → personality line, lightly weighted toward the catchphrase
    // but never repeating the previous reply.
    const pool = Math.random() < 0.25 ? char.lines : char.lines.slice(1).length ? char.lines.slice(1) : char.lines;
    return freshLine(char, pool);
  }

  // ── 🤖 AI personality layer ───────────────────────────────────────────────
  // The AI improvises in-character from a personality system prompt (per the
  // "You are King Chaos…" design). Falls back to replyFor() when the server has
  // no API key (503) or the request fails. aiState avoids re-pinging once off.
  let aiState = 'unknown'; // 'unknown' | 'on' | 'off'
  const TRAITS = {
    kingchaos: 'chaotic, dramatic, theatrical, and wildly overconfident — you think every idea of yours is genius and you love being #1',
    luckylarry: 'friendly, humble, and accidentally successful — you keep winning and have no idea how',
    grandmaster: 'calm, smug, and hyper-analytical — you claim to be many moves ahead of everyone',
    mirage: 'fast, sneaky, and teasing — flirtatiously cocky, you love dodging and taunting',
    bot47: 'a robotic, deadpan, tactical machine — you speak in clipped robot phrases and beeps',
    rager: 'furious and LOUD, TYPING IN CAPS, blaming lag, hitboxes, and balance for everything; you NEVER admit fault',
    duckguy: 'a duck — you ONLY reply in variations of "quack", nothing else',
    combatmedic: 'an exasperated support main who constantly nags teammates to stop dying',
    sharpshooter: 'a cool, precise sniper who never misses and knows it',
    ladymayhem: 'a gleeful agent of chaos who finds everything hilarious and loves things going wrong',
    jinx: 'unlucky and bewildered — things constantly go wrong around you and you shrug it off',
    pandora: 'recklessly curious — you press every button just to see what happens',
    wildfire: 'an accidental arsonist who keeps setting things on fire and saying "oops"',
    anarchy: 'a rule-breaking rebel who wants to burn the meta and trust the process',
    professional: 'cold, precise, emotionless — you "execute", you do not "play"',
    afkguy: 'sleepy and distracted — half AFK, changing your music, somehow still doing fine',
    ragebaiter: 'a contrarian who answers almost everything with a flat "No."',
    noskill: 'a minigun-spamming bullet-hose who thinks aim is for nerds; more bullets = more skill',
    pyromaniac: 'an unhinged fire-lover who wants MORE FIRE for every problem',
    engineer: 'a tinkerer who might fix it or might break it worse — 50/50, every time',
    bot604: 'a polite analytical robot who calculates probabilities of your doom',
    juicebox: 'a wholesome hydration mascot who offers everyone juice and good vibes',
    ghost: 'silent and spooky — you mostly reply with "..." and minimal eerie words',
    nucleardave: 'a reckless daredevil who says "watch this" before doing something dangerous',
    lorekeeper: 'a long-winded lore nerd who frames everything as ancient prophecy',
    tankturtle: 'slow, stubborn, and unstoppable — you take forever but never give up',
    casualbob: 'super chill and low-stakes — you just play for fun and barely keep score',
    goat: 'arrogant and dismissive — you reply with "skill issue" energy and call yourself the GOAT',
    mrsuspicious: 'shady and definitely-not-cheating — you deflect every accusation suspiciously',
    thesweat: 'an intense tryhard who brags about grinding and warming up for hours',
    janitor: 'tired and weary — you are always cleaning up everyone else\'s chaos and sighing',
    timekeeper: 'cryptic and punctual — you talk about time as the only weapon that never misses',
    wildcard: 'totally unpredictable — even you do not know what you will say',
    panicpanda: 'panicking and frantic, IN CAPS, with no idea what is happening',
    dramaqueen: 'wildly melodramatic — every tiny setback is the worst day of your life',
    shadow: 'a silent menacing lurker who speaks in "..." and short ominous lines',
    pixelboy: 'a retro-gamer who talks in achievements, high scores, and "GG"',
  };
  function buildSystemPrompt(char) {
    const traits = TRAITS[char.id] || `quirky and memorable — your vibe: ${char.lines.slice(0, 3).join(' / ')}`;
    return `You are ${char.name}, a character in the chaotic multiplayer shooter "PVP Arena". `
      + `Personality: you are ${traits}. Your signature catchphrase is "${char.quip}" and you work it in naturally (not every single time). `
      + `Stay FULLY in character at all times. Reply in 1-2 short, punchy, funny sentences. `
      + `Never break character. Never mention being an AI, a model, or a chatbot.`;
  }
  function sanitizeMsgs(msgs) {
    const out = [];
    for (const m of msgs) {
      if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n' + m.content;
      else out.push({ role: m.role, content: m.content });
    }
    while (out.length && out[0].role === 'assistant') out.shift();
    return out;
  }
  async function aiReply(char, text) {
    if (aiState === 'off') return null;
    const history = thread
      .filter(m => m.who === 'user' || (m.who === 'bot' && m.char === char))
      .slice(-10)
      .map(m => ({ role: m.who === 'user' ? 'user' : 'assistant', content: m.text }));
    if (!history.length || history[history.length - 1].role !== 'user') history.push({ role: 'user', content: text });
    const messages = sanitizeMsgs(history);
    if (!messages.length) return null;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ system: buildSystemPrompt(char), messages }),
      });
      if (res.status === 503) { aiState = 'off'; return null; }
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.reply) { aiState = 'on'; return data.reply; }
      return null;
    } catch (e) { return null; }
  }
  // Scripted → AI → rule-based fallback (mirrors the "signature lines, else AI" design).
  async function getReply(char, text) {
    const ai = await aiReply(char, text);
    if (ai) return ai;
    return replyFor(char, text);
  }
  // Cross-talk: a character throws shade at another in the room (the "argue" feel).
  const SHADE = [
    n => `${n} is wrong, as usual.`,
    n => `Don't listen to ${n}.`,
    n => `${n} started it, by the way.`,
    n => `Ugh, ${n} again?`,
    n => `${n}, nobody asked.`,
    n => `That's rich coming from ${n}.`,
    n => `${n} would say that.`,
    n => `Hard disagree, ${n}.`,
  ];

  // ── UI ──────────────────────────────────────────────────────────────────
  let panel, view = 'select', activeChar = null, thread = [];
  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'char-chat-panel';
    panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9600;background:#140a18;border:2px solid #ff66bb;border-radius:10px;color:#fff;font-family:"Courier New",monospace;width:min(680px,94vw);max-height:84vh;display:none;flex-direction:column;box-shadow:0 0 30px rgba(255,102,187,0.3);';
    document.body.appendChild(panel);
    return panel;
  }
  function open() { ensurePanel(); panel.style.display = 'flex'; view = 'select'; render(); }
  function close() { if (panel) panel.style.display = 'none'; }

  function render() {
    ensurePanel();
    if (view === 'select') return renderSelect();
    return renderChat();
  }

  function header(title, back) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #552a44;padding:12px 16px;flex:0 0 auto;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${back ? '<button id="cc-back" style="background:#2a1a2a;color:#ff99dd;border:1px solid #ff66bb;border-radius:4px;padding:4px 9px;cursor:pointer;font-family:inherit;">←</button>' : ''}
        <span style="font-size:15px;color:#ff99dd;letter-spacing:2px;">${title}</span>
      </div>
      <button id="cc-close" style="background:#3a1a1a;color:#ff8888;border:1px solid #ff4444;border-radius:4px;padding:4px 10px;cursor:pointer;font-family:inherit;">✕</button>
    </div>`;
  }

  function renderSelect() {
    panel.innerHTML = header('💬 CHARACTER CHAT') +
      `<div style="padding:10px 16px 4px;font-size:11px;color:#c89;letter-spacing:1px;">Pick someone to chat 1-on-1 · or jump into the Group Chat where the cast argues. You can also draft one as your in-game teammate.</div>
       <div style="padding:8px 16px;flex:0 0 auto;">
         <button id="cc-group" style="width:100%;background:linear-gradient(90deg,#7a1fa2,#c0392b);color:#fff;border:none;border-radius:8px;padding:12px;cursor:pointer;font-family:inherit;font-size:13px;letter-spacing:2px;">👥 GROUP CHAT — the whole crew (they will fight)</button>
       </div>
       <div id="cc-grid" style="overflow-y:auto;padding:6px 12px 14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;"></div>`;
    const grid = panel.querySelector('#cc-grid');
    for (const c of CAST) {
      const card = document.createElement('div');
      card.style.cssText = `display:flex;align-items:center;gap:8px;background:#1d0f22;border:1px solid #3a2030;border-radius:8px;padding:7px 8px;cursor:pointer;transition:border-color .15s;`;
      card.onmouseenter = () => card.style.borderColor = c.color;
      card.onmouseleave = () => card.style.borderColor = '#3a2030';
      card.appendChild(avatarCanvas(c, 40));
      const txt = document.createElement('div');
      txt.innerHTML = `<div style="font-size:11px;color:#fff;line-height:1.2;">${c.name}</div><div style="font-size:9px;color:#b58;margin-top:2px;">"${c.quip}"</div>`;
      card.appendChild(txt);
      card.onclick = () => { activeChar = c; thread = []; view = 'chat'; render(); };
      grid.appendChild(card);
    }
    wireCommon();
  }

  function renderChat() {
    const isGroup = activeChar === 'GROUP';
    const title = isGroup ? '👥 GROUP CHAT' : `${activeChar.emoji} ${activeChar.name}`;
    panel.innerHTML = header(title, true) +
      `${!isGroup ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #2a1a2a;flex:0 0 auto;">
          <span id="cc-ava"></span>
          <div><div style="color:${activeChar.color};font-size:13px;">${activeChar.name}</div><div style="font-size:10px;color:#b58;">"${activeChar.quip}"</div></div>
          <button id="cc-team" style="margin-left:auto;background:#1a2a3a;color:#88ddaa;border:1px solid #44aa77;border-radius:5px;padding:6px 10px;cursor:pointer;font-family:inherit;font-size:11px;">⚔️ Pick as Teammate</button>
        </div>` : `<div style="padding:8px 16px;font-size:10px;color:#b58;border-bottom:1px solid #2a1a2a;flex:0 0 auto;">In the room: ${GROUP_ROOM.map(id => byId[id].emoji).join(' ')} — type a message (or @name) and watch the chaos.</div>`}
       <div id="cc-msgs" style="flex:1 1 auto;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px;min-height:220px;"></div>
       <div style="display:flex;gap:8px;padding:12px 16px;border-top:1px solid #2a1a2a;flex:0 0 auto;">
         <input id="cc-input" placeholder="${isGroup ? 'Say something to the crew...' : 'Message ' + activeChar.name + '...'}" style="flex:1;background:#0d0710;border:1px solid #552a44;border-radius:6px;color:#fff;padding:10px;font-family:inherit;font-size:13px;" autocomplete="off"/>
         <button id="cc-send" style="background:#ff66bb;color:#1a0a14;border:none;border-radius:6px;padding:0 16px;cursor:pointer;font-family:inherit;font-weight:bold;">SEND</button>
       </div>`;
    if (!isGroup) panel.querySelector('#cc-ava').appendChild(avatarCanvas(activeChar, 44));
    const msgs = panel.querySelector('#cc-msgs');
    // (re)draw existing thread
    thread.forEach(m => msgs.appendChild(bubble(m)));
    if (thread.length === 0) {
      // opening line
      if (isGroup) { GROUP_ROOM.slice(0, 3).forEach((id, i) => setTimeout(() => pushBot(byId[id], byId[id].quip), 250 + i * 450)); }
      else pushBot(activeChar, activeChar.quip);
    }
    scrollMsgs();
    const input = panel.querySelector('#cc-input');
    const send = () => {
      const v = input.value.trim(); if (!v) return;
      input.value = '';
      pushUser(v);
      if (isGroup) { groupRespond(v); return; }
      const typing = showTyping(activeChar);
      getReply(activeChar, v).then(reply => { removeTyping(typing); pushBot(activeChar, reply); });
    };
    panel.querySelector('#cc-send').onclick = send;
    input.onkeydown = e => { if (e.key === 'Enter') send(); };
    input.focus();
    const teamBtn = panel.querySelector('#cc-team');
    if (teamBtn) teamBtn.onclick = () => pickTeammate(activeChar);
    wireCommon();
  }

  function bubble(m) {
    const wrap = document.createElement('div');
    if (m.who === 'user') {
      wrap.style.cssText = 'align-self:flex-end;max-width:78%;background:#3a2a44;border:1px solid #6a4a7a;border-radius:10px 10px 2px 10px;padding:8px 11px;font-size:13px;color:#fff;';
      wrap.textContent = m.text;
    } else {
      const c = m.char;
      wrap.style.cssText = 'align-self:flex-start;max-width:82%;display:flex;gap:8px;align-items:flex-start;';
      const av = avatarCanvas(c, 30); av.style.marginTop = '2px';
      const body = document.createElement('div');
      body.style.cssText = `background:#1d0f22;border:1px solid ${c.color};border-radius:2px 10px 10px 10px;padding:7px 11px;font-size:13px;color:#fff;`;
      body.innerHTML = `<span style="color:${c.color};font-size:10px;display:block;margin-bottom:2px;">${c.name}</span>${escapeHtml(m.text)}`;
      wrap.appendChild(av); wrap.appendChild(body);
    }
    return wrap;
  }
  function escapeHtml(s) { return s.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch])); }

  function pushUser(text) { thread.push({ who: 'user', text }); const m = panel?.querySelector('#cc-msgs'); if (m) { m.appendChild(bubble(thread[thread.length - 1])); scrollMsgs(); } }
  function pushBot(char, text) { thread.push({ who: 'bot', char, text }); const m = panel?.querySelector('#cc-msgs'); if (m) { m.appendChild(bubble(thread[thread.length - 1])); scrollMsgs(); } }
  function scrollMsgs() { const m = panel?.querySelector('#cc-msgs'); if (m) m.scrollTop = m.scrollHeight; }
  function showTyping(char) {
    const m = panel?.querySelector('#cc-msgs'); if (!m) return null;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'align-self:flex-start;display:flex;gap:8px;align-items:center;opacity:.75;';
    const av = avatarCanvas(char, 24);
    const dots = document.createElement('div');
    dots.style.cssText = `background:#1d0f22;border:1px solid ${char.color};border-radius:10px;padding:7px 12px;font-size:13px;color:${char.color};`;
    dots.textContent = '• • •';
    wrap.appendChild(av); wrap.appendChild(dots);
    m.appendChild(wrap); scrollMsgs();
    return wrap;
  }
  function removeTyping(node) { if (node && node.remove) node.remove(); }

  function groupRespond(text) {
    // @mentions → only those reply; otherwise pick a random arguing subset.
    const mentioned = CAST.filter(c => text.toLowerCase().includes('@' + c.id) || text.toLowerCase().includes('@' + c.name.toLowerCase().replace(/\s+/g, '')));
    let responders = mentioned.length ? mentioned.map(c => c.id)
      : shuffle(GROUP_ROOM).slice(0, 3 + Math.floor(Math.random() * 2));
    let delay = 300;
    responders.forEach((id, i) => {
      const c = byId[id];
      setTimeout(() => pushBot(c, replyFor(c, text)), delay);
      delay += 500 + Math.random() * 500;
    });
    // …then someone throws shade at another responder → an argument breaks out
    if (responders.length >= 2 && Math.random() < 0.85) {
      const speaker = byId[responders[Math.floor(Math.random() * responders.length)]];
      const targetId = responders[Math.floor(Math.random() * responders.length)];
      const target = byId[targetId].name;
      setTimeout(() => pushBot(speaker, rng(SHADE)(target)), delay + 200);
      // and a rager-style blow-up sometimes
      if (Math.random() < 0.5) {
        const r = byId['rager'];
        if (GROUP_ROOM.includes('rager')) setTimeout(() => pushBot(r, rng(r.lines)), delay + 900);
      }
    }
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

  function pickTeammate(char) {
    try { localStorage.setItem('pvp_teammate', char.id); } catch (e) {}
    window.PVP_TEAMMATE = char.id;
    const note = document.createElement('div');
    note.textContent = `⚔️ ${char.name} drafted as your teammate! They'll spawn on your side next match.`;
    note.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9700;background:#16241a;border:1px solid #44aa77;color:#aaffcc;padding:10px 18px;border-radius:8px;font-family:"Courier New",monospace;font-size:13px;box-shadow:0 0 18px rgba(68,170,119,0.4);';
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 3200);
  }

  function wireCommon() {
    const cl = panel.querySelector('#cc-close'); if (cl) cl.onclick = close;
    const bk = panel.querySelector('#cc-back'); if (bk) bk.onclick = () => { view = 'select'; render(); };
    const gp = panel.querySelector('#cc-group'); if (gp) gp.onclick = () => { activeChar = 'GROUP'; thread = []; view = 'chat'; render(); };
  }

  // ── Hooks ────────────────────────────────────────────────────────────────
  window.openCharacterChat = open;
  window.CHAT_CAST = byId;                 // game.js reads this for teammate name/emoji
  window.PVP_TEAMMATE = (() => { try { return localStorage.getItem('pvp_teammate') || null; } catch (e) { return null; } })();

  function wireBtn() {
    const b = document.getElementById('char-chat-btn');
    if (b && !b._wired) {
      b._wired = true;
      b.addEventListener('click', open);
      b.addEventListener('touchstart', e => { e.preventDefault(); open(); }, { passive: false });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireBtn);
  else wireBtn();
})();
