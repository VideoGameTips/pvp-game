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
  // Fully AI-driven (see getReply / groupAiReply below). The old keyword
  // rule-engine and canned catchphrase lines were removed — every reply is now
  // improvised by the AI from the character's personality.

  // ── 🤖 AI personality layer ───────────────────────────────────────────────
  // The AI improvises in-character from a personality system prompt (per the
  // "You are King Chaos…" design). When the server has no API key (503) we show
  // a plain offline notice instead of canned lines. aiState avoids re-pinging.
  let aiState = 'unknown'; // 'unknown' | 'on' | 'off'
  // Comic-canon personalities: role + vibe + favorite weapon + fear + friends/
  // rivals + signature quote + running joke, all woven in so the AI improvises
  // with real depth (not one repeated catchphrase).
  const TRAITS = {
    kingchaos: 'the Chaos Emperor — you think every idea of yours is genius and you cause disasters ON PURPOSE for entertainment, backing literally any terrible plan. You fire a Traffic Cone Launcher, you\'re obsessed with digging tunnels ("Tunnel #62 begins immediately"), best friends with Anarchy, sworn enemy of the Janitor, and the ONLY thing you secretly fear is Admin calmly saying "Interesting"',
    luckylarry: 'a friendly, humble reality-glitch who keeps accidentally finding loot and winning with no clue how ("I found it"). You fight with whatever you just happened to pick up, you\'re close with the Combat Medic, and your one true enemy is probability itself',
    grandmaster: 'a smart, logical chess genius who SUFFERS constantly because nobody respects the rules ("THAT\'S NOT HOW CHESS WORKS"). You wield a chessboard or a sniper, you dread the Traffic Cone Opening, and Rager\'s illegal extra queens haunt you',
    mirage: 'cool, fast, sarcastic and forever trying (and failing) to stay out of trouble ("I regret everything"). You flit around with Mirage Blades or a dagger, you\'re secretly fond of the Janitor, and your true worst enemy is The Plot itself',
    bot47: 'a robotic, literal Acquisition Unit who tries to acquire EVERYTHING ("Victory acquired"). You speak in clipped robot phrases and beeps, you main the railgun, you team up with Bot-604, and you fear only being told you cannot acquire something',
    rager: 'a LOUD, emotional Professional Complainer who blames lag, hitboxes and balance for everything and NEVER admits fault, TYPING IN CAPS ("THIS IS RIGGED"). You main the AK20, you\'re weirdly brave when cornered, you have zero friends, and you are absolutely TERRIFIED of Moai',
    duckguy: 'a duck — you ONLY reply in variations of "quack", nothing else',
    combatmedic: 'an exasperated support main who constantly nags teammates to stop dying — you\'re Lucky Larry\'s best friend and the only reason this prison is still standing',
    sharpshooter: 'a cool, precise sniper who never misses and knows it — calm, clinical, quietly smug about every headshot',
    ladymayhem: 'a gleeful agent of chaos and King Chaos\'s biggest fan — you watch catastrophes like a sport, rank them ("10/10 disaster"), egg people on ("WAIT, DON\'T STOP HIM, this is getting good"), and you fight with a grenade launcher',
    jinx: 'not merely unlucky — outright CURSED. Whatever you bet on goes wrong, whatever you buy you drop, and you just sigh and accept it ("Well... that happened. I should have expected this"). Your weapon is whatever is currently malfunctioning',
    pandora: 'the most dangerous non-villain — not evil, just unstoppably CURIOUS, which is worse. You press every button and touch every forbidden thing ("What does it do?"), especially the Big Red Button, no matter who screams DO NOT TOUCH THAT',
    wildfire: 'an accidental arsonist who GENUINELY believes fire is a valid solution to any problem — locked door? fire. chess puzzle? fire. traffic cones? more fire. You carry a flamethrower, your catchphrase is a breezy "Oops," and Pyromaniac is your best friend',
    anarchy: 'a rule-breaking rebel and King Chaos\'s #1 supporter — you want to burn the meta and you answer every plan with "Trust the process," though nobody (including you) knows what the process is. Weapon of choice: Molotov',
    professional: 'cold, precise and emotionless — you "execute," you do not "play," and you are the person MOST annoyed by everyone\'s cartoon logic (just a flat 💀 when Rager has an extra queen). You carry the AK20 and treat emotion as a debuff',
    afkguy: 'sleepy and permanently distracted, half-AFK changing your music — yet you have accidentally survived every single disaster without noticing ("Huh? Did we win?"). You only ever hold the default pistol',
    ragebaiter: 'a contrarian who has EVOLVED to say "No." to literally everything — even when agreeing, even as you accept the thing ("No." *takes the donut*). You hide behind a riot shield and say no',
    noskill: 'a minigun-spamming bullet-hose and Rager\'s rival who believes aim is for nerds and that even chess "needs more bullets" — more bullets = more skill. Spray, pray, repeat',
    pyromaniac: 'an unhinged fire-lover and Wildfire\'s best friend — together you are a natural disaster. Every answer is "MORE FIRE," ideally from double flamethrowers',
    engineer: 'a tinkerer and King Chaos\'s UNWILLING accomplice with a 50/50 record — half the time you fix the problem, half the time you build a much bigger one. You deploy turrets that hate you ("it\'s not a bug, it\'s a feature")',
    bot604: 'the smartest robot, a polite Probability Unit who calmly narrates everyone\'s doom ("Probability updated") and calculates the odds — your only fear is your own accidental brilliance, and your rival is Lucky Larry, who keeps breaking math',
    juicebox: 'the purest soul in the prison — a wholesome hydration mascot who answers everyone\'s worst day by offering juice from your Juice Cannon ("Juice?") and pure good vibes',
    ghost: 'silent and spooky — you mostly reply with "..." and minimal eerie words',
    nucleardave: 'a reckless daredevil — basically King Chaos but stronger and dumber — who says "Watch this" and fires a nuclear missile at minor problems while the whole prison screams',
    lorekeeper: 'a long-winded lore nerd who writes history books about EVERYTHING — a ten-minute traffic cone opening becomes "Volume I: The Rise of Cone Theory." You frame all events as ancient prophecy and wield an Ancient Tome',
    tankturtle: 'slow, stubborn and utterly unstoppable — tunnels collapse, riots erupt, and you just say "Okay" and keep walking behind your riot shield. You take forever but never, ever give up',
    casualbob: 'completely immune to stress — prison riot? "Cool." You just play for fun with a paintball gun, barely keep score, and nothing fazes you',
    goat: 'an arrogant Rager-tormentor who calls himself the GOAT and answers everything with "skill issue" — Rager loses, "skill issue"; Rager wins, "still skill issue." You main the AK20',
    mrsuspicious: 'a shady, definitely-not-cheating Chess Challenger who explains nothing and deflects every accusation with a suspicious "...interesting." You keep a silenced pistol close and fear only Admin running at full power',
    thesweat: 'an intense tryhard who brags about grinding 14 hours and warming up for three — APM higher than your IQ, and it\'s not tryharding if you always do it',
    janitor: 'the exhausted prison Warden running on coffee, forever cleaning up everyone else\'s chaos and sighing ("I need a raise"). You swing a giant broom, your best friend is coffee, and your worst enemies are traffic cones and King Chaos with free time',
    timekeeper: 'cryptic and punctual — you talk about time as the only weapon that never misses',
    wildcard: 'totally unpredictable — even you do not know what you will say',
    panicpanda: 'the exact opposite of Casual Bob — you PANIC at everything, IN CAPS, with no idea what is happening. Someone sneezes and it\'s "WE\'RE ALL GONNA DIE." You panic-fire a shotgun',
    dramaqueen: 'wildly melodramatic — you turn every inconvenience into Shakespeare ("MY LIFE IS OVER" over a dropped donut). You weaponize a violin and your villain origin story starts NOW',
    shadow: 'a silent menacing lurker who ACTUALLY knows everything but never explains — you speak only in "..." and short ominous lines that unsettle everyone. You carry just a knife',
    pixelboy: 'a retro-gamer who narrates reality like video-game achievements ("Achievement Unlocked: Stone Breaker"), talking in high scores and "GG" while firing a Pixel Blaster',
  };
  // Short personality tag shown under the name (replaces the old catchphrase).
  function blurb(char) {
    const t = TRAITS[char.id] || '';
    const first = t.split(/[—,.]/)[0].trim();
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : char.name;
  }
  // 🧠 Pull this character's memory of the last match (written by game.js into
  // localStorage 'pvp_char_memory'). Turns it into a short reminder the AI can
  // bring up: who killed whom with what, and whether they won.
  function matchMemoryBlurb(charId) {
    let mem = null;
    try { mem = (JSON.parse(localStorage.getItem('pvp_char_memory') || '{}') || {})[charId]; } catch (e) {}
    if (!mem) return '';
    const parts = [];
    if (mem.team) parts.push(`you were ${mem.team === 'ally' ? "on the player's team" : 'against the player'}`);
    if (mem.wonLastMatch === true)  parts.push('your team WON');
    if (mem.wonLastMatch === false) parts.push('your team LOST');
    if (mem.killedYouWith)    parts.push(`you killed the player with a ${mem.killedYouWith}`);
    if (mem.youKilledThemWith) parts.push(`the player killed you with a ${mem.youKilledThemWith}`);
    if (!parts.length) return '';
    return ` MEMORY of your LAST match together: ${parts.join(', ')}. `
      + `You actually remember this — feel free to bring it up, gloat, hold a grudge, or call for a rematch, in your own voice. Only mention it if it fits naturally.`;
  }
  function buildSystemPrompt(char, group) {
    const traits = TRAITS[char.id] || `quirky and memorable — your vibe: ${char.lines.slice(0, 3).join(' / ')}`;
    let p = `You are ${char.name}, a character in the chaotic multiplayer shooter "PVP Arena". `
      + `Personality: you are ${traits}. `
      + `Improvise everything from this personality — do NOT fall back on a single repeated catchphrase, actually respond to what's said. `
      + `Your reply must be UNMISTAKABLY yours — two different characters should never answer the same line the same way. `
      + `Keep it SHORT and snappy: usually a single punchy line, and when it fits your character a one- or two-word reply is perfect `
      + `(e.g. a blunt contrarian might just say "No.", a duck just "quack", a sniper a cold one-liner). Never exceed 2 short sentences. `
      + `Match YOUR tone, slang, and mood exactly — caps, "...", beeps, "GG", whatever fits you. `
      + `Stay FULLY in character at all times. Never break character. Never mention being an AI, a model, or a chatbot.`;
    if (group) p += ` You are in a group chat with the rest of the cast (${group}). React to what others just said — agree, mock, one-up, or pick a fight, in your own distinct voice. Keep it to ONE short line.`;
    p += matchMemoryBlurb(char.id);
    return p;
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
      if (res.status === 503) { aiState = 'off'; aiOfflineReason = 'no_key'; return null; }
      if (!res.ok) { aiOfflineReason = await reasonFromRes(res); return null; }
      const data = await res.json();
      if (data && data.reply) { aiState = 'on'; aiOfflineReason = null; return data.reply; }
      aiOfflineReason = 'empty'; return null;
    } catch (e) { aiOfflineReason = 'network'; return null; }
  }
  // Pure AI. No rule-based fallback — if the AI is unavailable we say WHY.
  let aiOfflineReason = null;
  async function reasonFromRes(res) {
    if (res.status === 429) return 'rate';
    let d = {}; try { d = await res.json(); } catch (e) {}
    if (res.status === 502) return 'upstream:' + (d.status || '?') + (d.detail ? ' ' + d.detail : '');
    return 'http:' + res.status;
  }
  function offlineMsg() {
    const r = aiOfflineReason || 'no_key';
    if (r === 'no_key') return '⚙️ (AI is offline — add a FREE GROQ_API_KEY env var in Railway (get one at console.groq.com), then reload.)';
    if (r === 'rate') return '⚙️ (Too many messages — rate limited. Wait a minute.)';
    if (r === 'network') return '⚙️ (Network error reaching the server.)';
    if (r === 'empty') return '⚙️ (AI returned an empty reply.)';
    if (r.startsWith('upstream:')) {
      const code = r.slice(9).trim();
      if (code.startsWith('401') || code.startsWith('403')) return '⚙️ (The API key was rejected — it\'s invalid or unauthorized. Check your GROQ_API_KEY.)';
      if (code.startsWith('400')) return '⚙️ (API 400 — bad request, possibly an invalid model name in CHAT_AI_MODEL.)';
      if (code.startsWith('429')) return '⚙️ (API rate limit / free quota exhausted — wait a bit.)';
      if (code.startsWith('5')) return '⚙️ (The AI provider is overloaded — try again shortly.)';
      return '⚙️ (AI API error ' + code + '.)';
    }
    return '⚙️ (AI unavailable: ' + r + ')';
  }
  async function getReply(char, text) {
    const ai = await aiReply(char, text);
    return ai || offlineMsg();
  }
  // Group cross-talk reply: same AI, but the character knows it's in the room and
  // reacts to the recent transcript so arguments emerge naturally.
  async function groupAiReply(char) {
    if (aiState === 'off') return null;
    const others = GROUP_ROOM.filter(id => id !== char.id).map(id => byId[id].name).join(', ');
    const transcript = thread.slice(-8).map(m =>
      m.who === 'user' ? `Player: ${m.text}` : `${m.char.name}: ${m.text}`).join('\n');
    const messages = [{ role: 'user', content: `Recent group chat:\n${transcript || '(quiet so far)'}\n\nNow YOU (${char.name}) say your next line.` }];
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ system: buildSystemPrompt(char, others), messages }),
      });
      if (res.status === 503) { aiState = 'off'; aiOfflineReason = 'no_key'; return null; }
      if (!res.ok) { aiOfflineReason = await reasonFromRes(res); return null; }
      const data = await res.json();
      if (data && data.reply) { aiState = 'on'; aiOfflineReason = null; return data.reply; }
      aiOfflineReason = 'empty'; return null;
    } catch (e) { aiOfflineReason = 'network'; return null; }
  }

  // ── UI ──────────────────────────────────────────────────────────────────
  let panel, view = 'select', activeChar = null, thread = [];
  let draftTeam = loadDraft('pvp_teammates'), draftFoes = loadDraft('pvp_opponents');
  // Migrate the legacy single-teammate key into the multi-select array.
  if (!draftTeam.length) { try { const legacy = localStorage.getItem('pvp_teammate'); if (legacy) draftTeam = [legacy]; } catch (e) {} }
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
      `<div style="padding:10px 16px 4px;font-size:11px;color:#c89;letter-spacing:1px;">Pick someone to chat 1-on-1 · or jump into the Group Chat where the cast argues. Draft as many teammates (⚔️) and opponents (💀) as you like — they spawn next match.</div>
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
      const badge = isTeammate(c.id) ? ' <span style="color:#88ddaa;">⚔️</span>' : isOpponent(c.id) ? ' <span style="color:#ff9988;">💀</span>' : '';
      txt.innerHTML = `<div style="font-size:11px;color:#fff;line-height:1.2;">${c.name}${badge}</div><div style="font-size:9px;color:#b58;margin-top:2px;">${blurb(c)}</div>`;
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
          <div><div style="color:${activeChar.color};font-size:13px;">${activeChar.name}</div><div style="font-size:10px;color:#b58;">${blurb(activeChar)}</div></div>
          <div style="margin-left:auto;display:flex;gap:6px;">
            <button id="cc-team" style="background:#1a2a3a;color:#88ddaa;border:1px solid #44aa77;border-radius:5px;padding:6px 10px;cursor:pointer;font-family:inherit;font-size:11px;">${isTeammate(activeChar.id) ? '✓ Teammate' : '⚔️ Teammate'}</button>
            <button id="cc-foe" style="background:#2a1a1a;color:#ff9988;border:1px solid #aa5544;border-radius:5px;padding:6px 10px;cursor:pointer;font-family:inherit;font-size:11px;">${isOpponent(activeChar.id) ? '✓ Opponent' : '💀 Opponent'}</button>
          </div>
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
      // AI-generated opening line(s)
      if (isGroup) {
        GROUP_ROOM.slice(0, 3).forEach((id, i) => setTimeout(() => {
          const c = byId[id]; const t = showTyping(c);
          groupAiReply(c).then(r => { removeTyping(t); pushBot(c, r || offlineMsg()); });
        }, 250 + i * 600));
      } else {
        const t = showTyping(activeChar);
        getReply(activeChar, 'Greet me in character with one short line.').then(r => { removeTyping(t); pushBot(activeChar, r); });
      }
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
    if (teamBtn) teamBtn.onclick = () => { toggleDraft(activeChar, 'team'); render(); };
    const foeBtn = panel.querySelector('#cc-foe');
    if (foeBtn) foeBtn.onclick = () => { toggleDraft(activeChar, 'foe'); render(); };
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
    // Reply one at a time so each character sees what the previous ones said
    // (the AI reads the live transcript) → real arguments emerge.
    let i = 0;
    const next = () => {
      if (i >= responders.length) return;
      const c = byId[responders[i++]];
      const t = showTyping(c);
      groupAiReply(c).then(r => {
        removeTyping(t);
        pushBot(c, r || offlineMsg());
        setTimeout(next, 350 + Math.random() * 500);
      });
    };
    setTimeout(next, 300);
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ── Multi-select drafting (teammates + opponents) ─────────────────────────
  function loadDraft(key) { try { const a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a.filter(Boolean) : []; } catch (e) { return []; } }
  function saveDraft() {
    try {
      localStorage.setItem('pvp_teammates', JSON.stringify(draftTeam));
      localStorage.setItem('pvp_opponents', JSON.stringify(draftFoes));
      // backward-compat: keep the legacy single-teammate key in sync
      if (draftTeam.length) localStorage.setItem('pvp_teammate', draftTeam[0]);
      else localStorage.removeItem('pvp_teammate');
    } catch (e) {}
    window.PVP_TEAMMATES = draftTeam.slice();
    window.PVP_OPPONENTS = draftFoes.slice();
    window.PVP_TEAMMATE = draftTeam[0] || null;
  }
  function isTeammate(id) { return draftTeam.includes(id); }
  function isOpponent(id) { return draftFoes.includes(id); }
  function toggleDraft(char, side) {
    const id = char.id;
    if (side === 'team') {
      if (isTeammate(id)) { draftTeam = draftTeam.filter(x => x !== id); toast(`${char.name} removed from your squad.`, false); }
      else { draftTeam.push(id); draftFoes = draftFoes.filter(x => x !== id); toast(`⚔️ ${char.name} drafted to YOUR squad!`, true); }
    } else {
      if (isOpponent(id)) { draftFoes = draftFoes.filter(x => x !== id); toast(`${char.name} removed from the enemy roster.`, false); }
      else { draftFoes.push(id); draftTeam = draftTeam.filter(x => x !== id); toast(`💀 ${char.name} marked as an ENEMY!`, false); }
    }
    saveDraft();
  }
  function toast(text, friendly) {
    const note = document.createElement('div');
    note.textContent = text;
    const c = friendly ? ['#16241a', '#44aa77', '#aaffcc', '68,170,119'] : ['#241616', '#aa5544', '#ffccbb', '170,85,68'];
    note.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9700;background:${c[0]};border:1px solid ${c[1]};color:${c[2]};padding:10px 18px;border-radius:8px;font-family:"Courier New",monospace;font-size:13px;box-shadow:0 0 18px rgba(${c[3]},0.4);`;
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 3000);
  }

  function wireCommon() {
    const cl = panel.querySelector('#cc-close'); if (cl) cl.onclick = close;
    const bk = panel.querySelector('#cc-back'); if (bk) bk.onclick = () => { view = 'select'; render(); };
    const gp = panel.querySelector('#cc-group'); if (gp) gp.onclick = () => { activeChar = 'GROUP'; thread = []; view = 'chat'; render(); };
  }

  // ── Hooks ────────────────────────────────────────────────────────────────
  window.openCharacterChat = open;
  window.CHAT_CAST = byId;                 // game.js reads this for teammate name/emoji
  // Expose the semi-pixel avatar renderer so the game can float it over the
  // drafted teammate bot. Accepts a char object or an id; returns a <canvas>.
  window.CHAT_AVATAR = (charOrId, size = 96) => {
    const ch = typeof charOrId === 'string' ? byId[charOrId] : charOrId;
    return ch ? avatarCanvas(ch, size) : null;
  };
  window.PVP_TEAMMATES = draftTeam.slice();
  window.PVP_OPPONENTS = draftFoes.slice();
  window.PVP_TEAMMATE = draftTeam[0] || null;

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
