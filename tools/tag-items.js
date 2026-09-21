#!/usr/bin/env node
// Semantic tagging for the weapon / melee catalogue, run at BUILD TIME.
//
// The game decides a lot about an item by sniffing its id and type strings with
// regexes: which swing sound a melee makes, which projectile it fires, which
// finisher plays, whether it counts as electric or fire for the secret map
// synergies. Those regexes were written when there were a dozen items. There
// are 141 now, and they have drifted:
//
//   - "OTs-04 Bayonet · Spetsnaz Blade" swings with the generic blunt sound,
//     because the blade regex only looks at item.id ('ots04').
//   - "Storm Cannon · Lightning Explosive" is matched by /Explosive/ before
//     /Lightning/, so it is a grenade and never gets the lightning finisher.
//   - The plain Pistol and Revolver are in ELECTRIC_WEAPONS, which getSecretSynergy
//     uses to hand out x1.5 damage on ice. That is a balance table.
//
// This tool asks TypeSafe (jev) the same questions the regexes are guessing at,
// one batched request per item, and reports where the model and the shipped
// behaviour disagree. Nothing here runs in the game: the point is to bake the
// answers into the tables so the runtime stays deterministic and offline —
// the itch.io build is a static bundle with no server to call.
//
//   node tools/tag-items.js                     every weapon and melee
//   node tools/tag-items.js --kind melee        just the melees
//   node tools/tag-items.js --only ots04        one item, verbose
//   node tools/tag-items.js --limit 10          a cheap smoke run
//   node tools/tag-items.js --json out.json     full answers, for a diff later
//   node tools/tag-items.js --min-confidence 0.5   loosen the bar on what gets reported
//
// Needs TYPESAFE_API_KEY in the environment. No npm dependency: Node 20's fetch.

const fs = require('fs');
const path = require('path');

const GAME = path.join(__dirname, '..', 'public', 'game.js');
const src = fs.readFileSync(GAME, 'utf8');

const API = process.env.TYPESAFE_API_URL || 'https://api.typesafe.ai/v1/systemone';
const KEY = process.env.TYPESAFE_API_KEY;
const MODEL = process.env.TYPESAFE_MODEL || 'jev-latest';

// ── CLI ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
// `--json` with nothing after it used to yield `true`, and writeFileSync(String(true))
// then created a file called "true"; `--min-confidence --verbose` yielded NaN, which
// made every comparison false and printed "0 confident disagreements" over a
// catalogue full of them. A flag followed by another flag has no value.
const flag = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const v = argv[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : v;
};
// `true` is what flag() returns when a flag has no value, and Number(true) is 1 —
// which is finite, so checking only isFinite let `--min-confidence --verbose`
// quietly set the bar to 100% and hide every disagreement. Reject the sentinel
// itself, not just the arithmetic.
const valueFlag = (name, fallback, what) => {
  const v = flag(name, fallback);
  if (v === true) { console.error(`--${name} needs ${what}`); process.exit(2); }
  return v;
};
const numFlag = (name, fallback) => {
  const v = valueFlag(name, fallback, 'a number');
  const n = Number(v);
  if (!Number.isFinite(n)) { console.error(`--${name} needs a number (got ${v})`); process.exit(2); }
  return n;
};
const enumFlag = (name, fallback, allowed) => {
  const v = String(valueFlag(name, fallback, 'one of: ' + allowed.join(', ')));
  if (!allowed.includes(v)) {
    console.error(`--${name} must be one of: ${allowed.join(', ')} (got ${v})`);
    process.exit(2);
  }
  return v;
};
const OPTS = {
  // The error string used to advertise three legal values without checking for
  // them, so `--kind weapon` — the natural typo, and the singular the header
  // documents — silently tagged all 141 items at full cost.
  kind: enumFlag('kind', 'all', ['all', 'weapons', 'melee']),
  only: valueFlag('only', null, 'an item id'),
  // A negative limit used to clamp to 0, which means "no limit" — the opposite
  // of what someone typing `--limit -5` is asking for.
  limit: numFlag('limit', 0),
  json: valueFlag('json', null, 'a file path'),
  concurrency: Math.max(1, numFlag('concurrency', 6)),
  verbose: argv.includes('--verbose'),
  minConfidence: numFlag('min-confidence', 0.75),
  dryRun: argv.includes('--dry-run'),
};
if (OPTS.limit < 0) { console.error('--limit cannot be negative'); process.exit(2); }

// ── Lifting the catalogue out of game.js ───────────────────────────────────
// Same approach as verify-weapons.js: game.js is one flat script meant for a
// <script> tag, so a top-level literal is found by its declaration and eval'd.
// These are all plain data literals, not code.
function literal(name, open, close) {
  const re = new RegExp('^const ' + name + '\\s*=\\s*' + open + '[\\s\\S]*?\\n' + close, 'm');
  const m = src.match(re);
  return m ? m[0].replace(/^const\s+\w+\s*=\s*/, '').replace(/;\s*$/, '') : null;
}
function arrayLiteral(name) {
  const s = literal(name, '\\[', '\\];');
  if (!s) throw new Error('could not find array ' + name + ' in game.js');
  return eval(s);
}
function objectLiteral(name) {
  const s = literal(name, '\\{', '\\};');
  if (!s) throw new Error('could not find object ' + name + ' in game.js');
  return eval('(' + s + ')');
}
function setLiteral(name) {
  const m = src.match(new RegExp('^const ' + name + '\\s*=\\s*new Set\\(\\[[\\s\\S]*?\\]\\);', 'm'));
  if (!m) throw new Error('could not find Set ' + name + ' in game.js');
  return eval(m[0].replace(/^const\s+\w+\s*=\s*/, '').replace(/;\s*$/, ''));
}

const WEAPONS = arrayLiteral('WEAPONS');
const MELEE_ITEMS = arrayLiteral('MELEE_ITEMS');
const MELEE_SWING_TYPES = arrayLiteral('MELEE_SWING_TYPES');
const FINISHERS = arrayLiteral('FINISHERS');
const PROJECTILE_KIND_BY_ID = objectLiteral('PROJECTILE_KIND_BY_ID');
const PROJECTILE_SPEED_SCALE = objectLiteral('PROJECTILE_SPEED_SCALE');
const SOLID_PROJECTILES = setLiteral('SOLID_PROJECTILES');
const ELECTRIC_WEAPONS = setLiteral('ELECTRIC_WEAPONS');
const FIRE_WEAPONS = setLiteral('FIRE_WEAPONS');
const FROST_WEAPONS = setLiteral('FROST_WEAPONS');
const GRAVITY_WEAPONS = setLiteral('GRAVITY_WEAPONS');

// ── What the game does TODAY ───────────────────────────────────────────────
// Copied verbatim from game.js so the report is a diff against shipped
// behaviour, not against what the code is supposed to do. If you change the
// game, change these too — or the disagreements stop meaning anything.

// game.js: projectileKind()
function currentProjectileKind(id, weapon) {
  if (SOLID_PROJECTILES.has(id)) return 'solid';
  const k = PROJECTILE_KIND_BY_ID[id];
  if (k) return k;
  const t = (weapon && weapon.type) || '';
  if (/Rocket/i.test(t)) return 'rocket';
  if (/Explosive|Indirect|Mortar|Launcher/i.test(t)) return 'grenade';
  if (/Beam|Energy|Plasma|Lightning|Refract|Painter|Light|Void|Spatial/i.test(t)) return 'energy';
  if (/Cryo/i.test(t)) return 'ice';
  if (/Projectile/i.test(t)) return 'bolt';
  if (/Paint/i.test(t)) return 'blob';
  if (/Thrown/i.test(t)) return 'solid';
  return 'bullet';
}
// Was the kind an explicit table entry, or did the regex ladder guess it?
const kindWasExplicit = id => SOLID_PROJECTILES.has(id) || !!PROJECTILE_KIND_BY_ID[id];

// game.js: _pickFinisher()
function currentFinisher(id, weapon) {
  const kind = currentProjectileKind(id, weapon);
  if (kind === 'ice' || FROST_WEAPONS.has(id)) return 'shatter';
  if (kind === 'energy' || ELECTRIC_WEAPONS.has(id)) return 'lightning';
  if (/black|void|gravity|event_horizon|magnetar|quantum/.test(id)) return 'collapse';
  if (/confetti|paintball|sticker|firework/.test(id)) return 'confetti';
  if (/melee|knife|katana|sabre|axe|blade|chainsaw|fists|bat|sledge|hammer/.test(id)) return 'spin';
  return '(random)';
}

// game.js: MELEE_SWING_SOUND, the table the melee fire path reads. Lifted from
// the source rather than retyped, for the same reason as the words above.
const MELEE_SWING_SOUND = objectLiteral('MELEE_SWING_SOUND');
function currentSwingSound(item) {
  if (item.id === 'chainsaw') return '(chainsaw)';
  return MELEE_SWING_SOUND[item.id] || 'generic';
}

// game.js: isExplosiveKill(), which the Kill Log writer uses to pick a graphic.
// Kept in step with game.js by lifting its word list straight out of the source
// rather than retyping it — this mirror went stale once already, within an hour
// of being written, and a stale mirror turns the whole report into fiction.
const EXPLOSIVE_KILL_WORDS = new Set(
  eval(src.match(/^const EXPLOSIVE_KILL_WORDS = new Set\((\[[\s\S]*?\n\])\);/m)[1])
);
function namedAsExplosive(id, type) {
  return (String(id || '') + ' ' + String(type || '')).toLowerCase()
    .split(/[^a-z0-9]+/)
    .some(w => EXPLOSIVE_KILL_WORDS.has(w));
}
function currentKillLogKind(id, weapon, isMelee) {
  if (isMelee) return 'melee';
  if (!weapon) return namedAsExplosive(id, null) ? 'explosive' : 'gun';
  const k = currentProjectileKind(id, weapon);
  if (k === 'grenade' || k === 'rocket' || weapon.splashRadius) return 'explosive';
  return namedAsExplosive(id, weapon.type) ? 'explosive' : 'gun';
}

// ── Question vocabularies, derived from the game's own tables ──────────────
// Every option the game can actually act on, so the model is never able to
// answer something the code has no branch for.
const PROJECTILE_KINDS = [...new Set([
  ...Object.keys(PROJECTILE_SPEED_SCALE),
  ...Object.values(PROJECTILE_KIND_BY_ID),
])].sort();

// Short rubrics for the kinds. A kind with no entry is sent as null, which the
// API accepts — the option name has to carry its own meaning then, so add a
// line here when you add a kind.
const KIND_DESC = {
  bullet: 'An ordinary metal firearm round. The default for rifles, SMGs, pistols, shotguns and machine guns.',
  slug: 'A hypervelocity solid slug flung by an electromagnetic rail or coil. Near-instant, straight line.',
  energy: 'A coherent beam or bolt of directed energy: laser, plasma, particle beam.',
  spark: 'An arcing electrical discharge that jumps to its target. Tasers, arc guns, tesla weapons.',
  ice: 'A freezing or cryogenic projectile that chills and slows what it hits.',
  paintball: 'A marker shell full of paint that bursts into a coloured splat.',
  bolt: 'An arrow, bolt, dart or flechette shot from a bow, crossbow or dart launcher. Flies nearly flat.',
  blob: 'A wet lobbed glob — foam, goo, glue, paint, slime — that splatters on impact.',
  solid: 'A generic thrown solid object with no more specific shape of its own.',
  stone: 'A rock or pebble, slung rather than fired.',
  flame: 'A continuous gout of burning fuel, not a discrete projectile.',
  rocket: 'A self-propelled rocket or missile that builds thrust and explodes on impact.',
  grenade: 'A lobbed explosive shell that arcs under gravity: grenade launcher, mortar, firework, airburst.',
  nail: 'A nail, spike or needle driven by a nailer or pneumatic gun.',
  phase: 'A reality-bending round that phases, blinks or teleports through space.',
  drone: 'A small guided drone or swarm munition that flies itself to the target.',
  void: 'A gravitational or void projectile that collapses space around it.',
  shock: 'A concussive shockwave or seismic pulse rather than a solid object.',
  flare: 'A burning signal flare that glows brightly and trails smoke.',
  axe: 'A thrown axe or hatchet that tumbles end over end.',
  boomerang: 'A thrown boomerang that curves and returns.',
  cone: 'A thrown traffic cone. Comedy ordnance.',
  knife: 'A thrown knife or blade that tumbles point over pommel.',
  pie: 'A thrown pie or other soft comedy food item.',
};

const SWING_TYPES = [...new Set(MELEE_SWING_TYPES)].sort();
const SWING_DESC = {
  slash: 'A wide horizontal or diagonal cut across the body. Swords, bats, long blades.',
  slam: 'A heavy two-handed overhead smash straight down. Sledges, mauls, pans.',
  thrust: 'A long forward lunge with the weapon extended. Spears, pokers, polearms.',
  stab: 'A short, fast forward jab with a small blade. Knives, shivs, daggers.',
  spin: 'A full rotation of the whole weapon or body. Chainsaws, whips, flails.',
  bash: 'A medium shove or clubbing blow with a flat face. Shields, rackets, blunt tools.',
  chop: 'A downward cut with a short heavy edge. Cleavers, hatchets, axes.',
  punch: 'A bare-handed or fist-weapon jab. Fists, knuckles, gauntlets.',
};

const FINISHER_IDS = FINISHERS.map(f => f.id);
const FINISHER_DESC = {
  launch: 'The body is launched away with force. Fits heavy kinetic impacts and knockback weapons.',
  spin: 'The body spins out. Fits melee weapons and anything that hits with rotational force.',
  shatter: 'The body freezes and shatters. Fits ice, frost and cryogenic weapons.',
  confetti: 'The body bursts into confetti. Fits joke, party, paint and firework weapons.',
  lightning: 'The body is electrocuted. Fits electric, arc, tesla and plasma weapons.',
  collapse: 'The body collapses inward into a point. Fits gravity, void and black-hole weapons.',
  raincloud: 'A sad little raincloud appears over the body. Fits pathetic, comedic or humiliating weapons.',
};

// ── Building the questions ─────────────────────────────────────────────────
// Everything about one item goes in one request. The questions are independent
// judgments over the same state, so they run in parallel and cost only their
// own tokens. Asking one we might not use is close to free.

// The elemental tags are four labels that can each independently be true of the
// same weapon (a frost gun can also be electric), so they are four Nouls rather
// than one Choice. These feed getSecretSynergy, which is a DAMAGE table — the
// report never proposes flipping them silently, it only surfaces them.
function elementQuestions(what) {
  return {
    is_electric: {
      type: 'noul',
      instructions: `Does ${what} deal damage by electricity — arcing current, tesla discharge, shock, plasma or lightning?`,
      criteria: {
        true: 'Electricity is how the weapon actually hurts you: arcs, tasers, shocks, electrifies, or fires plasma/lightning.',
        false: 'It hurts you some other way — metal, explosive, fire, cold, gravity, or blunt force. A plain ballistic firearm is false however modern it is.',
      },
    },
    is_fire: {
      type: 'noul',
      instructions: `Does ${what} deal damage by fire — burning, incendiary, thermite or explosive flame?`,
      criteria: {
        true: 'It sets things alight or burns them: flamethrowers, incendiary rounds, thermite, molotovs, fireworks.',
        false: 'No burning involved. A plain explosive blast without an incendiary element is false.',
      },
    },
    is_frost: {
      type: 'noul',
      instructions: `Does ${what} deal damage by cold — freezing, cryogenic or ice?`,
      criteria: {
        true: 'It freezes, chills or encases the target in ice.',
        false: 'No cold involved.',
      },
    },
    is_gravity: {
      type: 'noul',
      instructions: `Does ${what} work by manipulating gravity, mass or spacetime — singularities, void, magnetism that crushes?`,
      criteria: {
        true: 'It pulls, crushes, warps space, or creates a singularity or void.',
        false: 'It works by ordinary physics: ballistics, chemistry, electricity, cold or fire.',
      },
    },
  };
}

// The finisher is two questions, not one. The first run asked only the Choice,
// and it duly picked a finisher for every plain rifle and pistol — p90 got
// "spinout" at 91% while the near-identical hkmp7 got "none" at 79%. That is a
// badly posed question, not a bad model: most ballistic guns have no natural
// finishing animation, so forcing a pick produces noise. The Noul gates it —
// code only reads the Choice when the weapon is distinctive enough to deserve one.
function finisherQuestions() {
  return {
    finisher_is_distinctive: {
      type: 'noul',
      instructions: 'Does this weapon kill in a visually distinctive way that deserves its own special finishing animation, rather than just doing damage like any other weapon?',
      criteria: {
        true: 'It kills through a striking, specific effect: freezing, electrocuting, imploding, exploding into confetti, launching the body away.',
        false: 'It is an ordinary weapon that kills by ordinary damage. A standard rifle, SMG, pistol or shotgun is false however good it is.',
      },
    },
    finisher: {
      type: 'choice',
      instructions: 'If this weapon were given a special finishing animation on the victim, which one would suit how it kills?',
      criteria: {
        ...Object.fromEntries(FINISHER_IDS.map(f => [f, FINISHER_DESC[f] ?? null])),
        none: 'No finisher suits this weapon in particular; any of them would look arbitrary.',
      },
    },
  };
}

function weaponQuestions() {
  return {
    projectile_kind: {
      type: 'choice',
      instructions: 'What does this weapon actually put in the air when it fires? Judge it from the weapon\'s own name, type and description, not from how powerful it is.',
      criteria: Object.fromEntries(PROJECTILE_KINDS.map(k => [k, KIND_DESC[k] ?? null])),
    },
    ...finisherQuestions(),
    killlog_kind: {
      type: 'choice',
      instructions: 'The Kill Log shows a different bragging graphic per kind of kill. Which kind of kill is this weapon\'s?',
      criteria: {
        gun: 'A shot from a firearm or other direct-fire ranged weapon.',
        explosive: 'A blast: the damage comes from an explosion, not from the projectile hitting you.',
        melee: 'A hand-to-hand strike at arm\'s length.',
      },
    },
    ...elementQuestions('this weapon'),
  };
}

function meleeQuestions() {
  return {
    swing_sound: {
      type: 'choice',
      instructions: 'Which swing sound should play when this melee weapon is swung through the air?',
      criteria: {
        blade: 'A sharp edge cutting air — swords, knives, axes, cleavers, bayonets, anything with a cutting edge.',
        heavy: 'A heavy mass being hauled around — sledges, mauls, hammers, bats, pipes, anything weighty and blunt.',
        generic: 'A light, unremarkable swish — small, light or improvised objects with neither an edge nor much mass.',
      },
    },
    swing_animation: {
      type: 'choice',
      instructions: 'Which swing animation matches how a person would actually use this weapon?',
      criteria: Object.fromEntries(SWING_TYPES.map(s => [s, SWING_DESC[s] ?? null])),
    },
    ...finisherQuestions(),
    ...elementQuestions('this melee weapon'),
  };
}

// ── State: the item's own record, trimmed to what a judgment needs ─────────
// A WEAPONS entry has no prose description, but it does carry ~40 behaviour
// flags — gravityPull, chainLightning, tracking, frostSlow, paintEffect — and
// those ARE the description. The first run of this tool left them out and got
// 'bullet' for the Swarm Rifle, whose whole point is that it fires drones.
// Everything below is a tuning number rather than a behaviour, so it is dropped
// and the rest is passed through: a flag added to game.js tomorrow shows up here
// without anyone editing this list.
const TUNING_FIELDS = new Set([
  'id', 'name', 'type', 'slot', 'ability',
  'mag', 'reserve', 'damage', 'fireRate', 'reloadTime', 'headshotMult', 'auto',
  'pellets', 'spread', 'adsZoom', 'bulletSpeed', 'noReload', 'perfectAccuracy',
  'recoil', 'spreadBloom', 'maxRange', 'weight', 'adsWeight', 'falloffLift',
  'heatShots', 'heatCooldown', 'heatWindow', 'heatSkipADS', 'burstSize', 'burstDelay',
  'ammoRegen', 'moveBoost', 'bulletSize', 'bulletColor', 'randomBulletColor',
  'adminItem', 'ddayOnly', 'range', 'cooldown', 'knockbackOnHit',
]);
function behaviours(item) {
  const out = {};
  for (const [k, v] of Object.entries(item)) {
    if (TUNING_FIELDS.has(k) || !v) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function weaponState(w) {
  return {
    item: {
      id: w.id,
      name: w.name,
      type: w.type,
      slot: w.slot,
      damage: w.damage,
      fire_rate_ms: w.fireRate,
      magazine: w.mag,
      pellets_per_shot: w.pellets,
      declared_bullet_speed: w.bulletSpeed,
      ...(w.ability ? { special_ability: { name: w.ability.name, description: w.ability.desc } } : {}),
      ...(behaviours(w) ? { behaviours: behaviours(w) } : {}),
    },
    game: 'PVP Arena, a fast arcade first-person shooter with a mix of realistic and joke weapons.',
  };
}
function meleeState(m) {
  return {
    item: {
      id: m.id,
      name: m.name,
      type: m.type,
      damage: m.damage,
      reach_metres: m.range,
      cooldown_ms: m.cooldown,
      ...(m.ability ? { special_ability: { name: m.ability.name, description: m.ability.desc } } : {}),
      ...(behaviours(m) ? { behaviours: behaviours(m) } : {}),
    },
    game: 'PVP Arena, a fast arcade first-person shooter with a mix of realistic and joke melee weapons.',
  };
}

// ── The API call ───────────────────────────────────────────────────────────
const usage = { input_tokens: 0, output_tokens: 0, requests: 0 };

async function ask(state, questions, label) {
  const body = JSON.stringify({ state, model: MODEL, questions });
  let lastErr;
  const LAST = 3;
  for (let attempt = 0; attempt <= LAST; attempt++) {
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
        body,
      });
      usage.requests++;   // count what was sent, not what came back
      // 408 and 425 are transient by definition, like 429 and the 5xx family.
      if (r.status === 408 || r.status === 425 || r.status === 429 || r.status >= 500) {
        lastErr = new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
        if (attempt === LAST) break;
        // Honour Retry-After when the service sends one, otherwise back off. Capped:
        // an uncapped Retry-After on a 141-item run is a very long, very quiet stall.
        const after = Number(r.headers.get('retry-after')) * 1000;
        await new Promise(res => setTimeout(res, Math.min(after || 500 * 2 ** attempt, 30000)));
        continue;
      }
      // Anything else — 400, 401, 403, 404 — will say exactly the same thing next
      // time. Retrying a bad API key four times per item sent 564 doomed requests.
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
      const data = await r.json();
      usage.input_tokens += data.usage?.input_tokens || 0;
      usage.output_tokens += data.usage?.output_tokens || 0;
      return data.answers;
    } catch (e) {
      lastErr = e;
      // A non-OK status we decided not to retry rethrows straight out.
      if (/^\d{3} /.test(e.message) && !/^(408|425|429|5\d\d) /.test(e.message)) break;
      if (attempt === LAST) break;
      await new Promise(res => setTimeout(res, 500 * 2 ** attempt));
    }
  }
  throw new Error(`${label}: ${lastErr && lastErr.message}`);
}

// Bounded parallelism. The requests are independent, so the only reason to cap
// them is to stay polite to the service.
async function mapLimit(items, limit, fn, label) {
  const out = new Array(items.length);
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
      done++;
      if (!OPTS.verbose) process.stderr.write(`\r  ${label}: ${done}/${items.length}   `);
    }
  }));
  if (!OPTS.verbose) process.stderr.write(`\r  ${label}: ${done}/${items.length} done\n`);
  return out;
}

// ── Report ─────────────────────────────────────────────────────────────────
const C = process.stdout.isTTY
  ? { dim: s => `\x1b[2m${s}\x1b[0m`, red: s => `\x1b[31m${s}\x1b[0m`, yellow: s => `\x1b[33m${s}\x1b[0m`, green: s => `\x1b[32m${s}\x1b[0m`, bold: s => `\x1b[1m${s}\x1b[0m` }
  : { dim: s => s, red: s => s, yellow: s => s, green: s => s, bold: s => s };

const pct = n => (n * 100).toFixed(0) + '%';

// A disagreement is only worth a person's attention if the model is actually
// sure. Confidence summarises how peaked the distribution is; a spread-out
// answer between two equally good finishers is not evidence the code is wrong.
const SURE = OPTS.minConfidence;

function section(title) { console.log('\n' + C.bold('── ' + title + ' ' + '─'.repeat(Math.max(0, 62 - title.length)))); }

async function main() {
  if (!KEY && !OPTS.dryRun) {
    console.error('TYPESAFE_API_KEY is not set. Export it, or run with --dry-run to see the questions.');
    process.exit(2);
  }

  // ── Structural checks that need no model at all ──────────────────────────
  section('structural');
  const gap = MELEE_ITEMS.length - MELEE_SWING_TYPES.length;
  if (gap !== 0) {
    console.log(C.red(`  MELEE_SWING_TYPES has ${MELEE_SWING_TYPES.length} entries for ${MELEE_ITEMS.length} MELEE_ITEMS.`));
    if (gap > 0) {
      console.log(C.red('  These fall off the end and silently get the default \'slash\':'));
      for (const m of MELEE_ITEMS.slice(MELEE_SWING_TYPES.length)) {
        console.log(C.red(`    ${m.id.padEnd(18)} ${m.name}  [${m.type}]`));
      }
    }
  } else {
    console.log(C.green('  MELEE_ITEMS and MELEE_SWING_TYPES are aligned.'));
  }

  let weapons = OPTS.kind === 'melee' ? [] : WEAPONS;
  let melees = OPTS.kind === 'weapons' ? [] : MELEE_ITEMS;
  if (OPTS.only) {
    weapons = weapons.filter(w => w.id === OPTS.only);
    melees = melees.filter(m => m.id === OPTS.only);
    // Otherwise a typo'd id printed "tagging 0 weapons + 0 melees" and exited 0,
    // which reads to a wrapper script as a clean pass over the whole catalogue.
    if (!weapons.length && !melees.length) {
      console.error(`--only ${OPTS.only} matches no weapon or melee`);
      return 2;
    }
  }
  if (OPTS.limit) { weapons = weapons.slice(0, OPTS.limit); melees = melees.slice(0, OPTS.limit); }

  if (OPTS.dryRun) {
    section('dry run — one weapon request');
    console.log(JSON.stringify({ state: weaponState(weapons[0] || WEAPONS[0]), model: MODEL, questions: weaponQuestions() }, null, 2));
    section('dry run — one melee request');
    console.log(JSON.stringify({ state: meleeState(melees[0] || MELEE_ITEMS[0]), model: MODEL, questions: meleeQuestions() }, null, 2));
    return;
  }

  console.error(`\ntagging ${weapons.length} weapons + ${melees.length} melees against ${MODEL} …`);
  const t0 = Date.now();

  const wq = weaponQuestions(), mq = meleeQuestions();
  const results = [];
  const failures = [];

  const wRows = await mapLimit(weapons, OPTS.concurrency, async w => {
    try { return { item: w, kind: 'weapon', answers: await ask(weaponState(w), wq, w.id) }; }
    catch (e) { failures.push(e.message); return null; }
  }, 'weapons');
  const mRows = await mapLimit(melees, OPTS.concurrency, async m => {
    try { return { item: m, kind: 'melee', answers: await ask(meleeState(m), mq, m.id) }; }
    catch (e) { failures.push(e.message); return null; }
  }, 'melees');
  results.push(...wRows.filter(Boolean), ...mRows.filter(Boolean));

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  // ── Diff against the shipped behaviour ───────────────────────────────────
  const rows = results.map(r => {
    const a = r.answers;
    const isMelee = r.kind === 'melee';
    const idx = isMelee ? MELEE_ITEMS.indexOf(r.item) : -1;
    const now = isMelee ? {
      swing_sound: currentSwingSound(r.item),
      swing_animation: idx >= 0 && idx < MELEE_SWING_TYPES.length ? MELEE_SWING_TYPES[idx] : '(missing → slash)',
      finisher: currentFinisher(r.item.id, null),
      is_electric: ELECTRIC_WEAPONS.has(r.item.id),
      is_fire: FIRE_WEAPONS.has(r.item.id),
      is_frost: FROST_WEAPONS.has(r.item.id),
      is_gravity: GRAVITY_WEAPONS.has(r.item.id),
    } : {
      projectile_kind: currentProjectileKind(r.item.id, r.item),
      finisher: currentFinisher(r.item.id, r.item),
      killlog_kind: currentKillLogKind(r.item.id, r.item, false),
      is_electric: ELECTRIC_WEAPONS.has(r.item.id),
      is_fire: FIRE_WEAPONS.has(r.item.id),
      is_frost: FROST_WEAPONS.has(r.item.id),
      is_gravity: GRAVITY_WEAPONS.has(r.item.id),
    };
    const model = {};
    for (const [k, v] of Object.entries(a)) {
      model[k] = v.type === 'noul' ? v.noul : v.choice;
      if (v.confidence != null) model[k + '_confidence'] = v.confidence;
    }
    return { id: r.item.id, name: r.item.name, type: r.item.type, kind: r.kind, now, model, answers: a };
  });

  // Choice-typed disagreements, only where the model is confident.
  const choiceFields = ['projectile_kind', 'finisher', 'killlog_kind', 'swing_sound', 'swing_animation'];
  const disagreements = [];
  for (const r of rows) {
    for (const f of choiceFields) {
      if (!(f in r.now) || !(f in r.model)) continue;
      const conf = r.model[f + '_confidence'] ?? 0;
      const guessed = f === 'projectile_kind' ? !kindWasExplicit(r.id) : true;
      if (r.now[f] === r.model[f]) continue;
      // A '(random)' finisher or a missing swing type is a gap, not a conflict:
      // the code has no opinion there, so any confident answer is an improvement.
      // Only surface a finisher when the weapon actually warrants one.
      if (f === 'finisher' && (r.model.finisher_is_distinctive ?? 0) < 0.6) continue;
      const isGap = String(r.now[f]).startsWith('(');
      disagreements.push({ ...r, field: f, conf, guessed, isGap, was: r.now[f], proposed: r.model[f] });
    }
  }

  const sure = disagreements.filter(d => d.conf >= SURE);
  const unsure = disagreements.filter(d => d.conf < SURE);

  const byField = f => sure.filter(d => d.field === f).sort((a, b) => b.conf - a.conf);

  const printGroup = (title, list, note) => {
    if (!list.length) return;
    section(title + ` (${list.length})`);
    if (note) console.log(C.dim('  ' + note));
    for (const d of list) {
      const tag = d.isGap ? C.yellow('gap ') : C.red('diff');
      console.log(`  ${tag} ${d.id.padEnd(20)} ${C.dim((d.type || '').padEnd(24))} ${String(d.was).padEnd(16)} → ${C.green(d.proposed.padEnd(12))} ${C.dim(pct(d.conf))}`);
    }
  };

  printGroup('melee swing sound', byField('swing_sound'),
    'against MELEE_SWING_SOUND in game.js — entries there carry a comment when the call was deliberate');
  printGroup('melee swing animation', byField('swing_animation'),
    'a "gap" here is an item past the end of MELEE_SWING_TYPES, defaulting to slash');
  printGroup('projectile kind', byField('projectile_kind').filter(d => d.guessed),
    'only items the regex ladder guessed; ones listed in PROJECTILE_KIND_BY_ID are left alone');
  printGroup('finisher', byField('finisher'),
    'gated on finisher_is_distinctive ≥ 0.6 — plain ballistic guns are not asked to have one');
  printGroup('kill log kind', byField('killlog_kind'), null);

  // The elemental tags are separate: they change damage, so they are reported
  // as questions for a person, never as a proposed edit.
  const elemFields = ['is_electric', 'is_fire', 'is_frost', 'is_gravity'];
  const elemFlags = [];
  for (const r of rows) {
    for (const f of elemFields) {
      const p = r.model[f];
      if (typeof p !== 'number') continue;
      // Only the clear cases: the table says one thing and the model is sure of the other.
      if (r.now[f] && p < 0.15) elemFlags.push({ ...r, field: f, p, dir: 'tagged but looks wrong' });
      if (!r.now[f] && p > 0.85) elemFlags.push({ ...r, field: f, p, dir: 'untagged but looks right' });
    }
  }
  if (elemFlags.length) {
    section(`elemental synergy tables (${elemFlags.length})`);
    console.log(C.dim('  ⚠ these feed getSecretSynergy, which multiplies DAMAGE. Nothing here is auto-applied —'));
    console.log(C.dim('    they are balance decisions and want your eyes on them.'));
    for (const e of elemFlags.sort((a, b) => a.field.localeCompare(b.field))) {
      const arrow = e.dir === 'tagged but looks wrong' ? C.red('remove?') : C.yellow('add?   ');
      console.log(`  ${arrow} ${e.field.replace('is_', '').padEnd(9)} ${e.id.padEnd(20)} ${C.dim((e.type || '').padEnd(24))} p=${pct(e.p)}`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  section('summary');
  console.log(`  ${rows.length} items tagged in ${elapsed}s · ${usage.requests} requests · ${usage.input_tokens + usage.output_tokens} tokens`);
  console.log(`  ${sure.length} confident disagreements (≥${pct(SURE)}), ${unsure.length} below the confidence bar (not shown)`);
  console.log(`  ${elemFlags.length} elemental-table flags for review`);
  if (failures.length) {
    console.log(C.red(`  ${failures.length} items failed:`));
    for (const f of failures.slice(0, 10)) console.log(C.red('    ' + f));
  }

  if (OPTS.json) {
    fs.writeFileSync(String(OPTS.json), JSON.stringify({ model: MODEL, usage, rows }, null, 2));
    console.log(`  full answers written to ${OPTS.json}`);
  }
  console.log('');
  return failures.length ? 1 : 0;
}

// A run that could not tag everything has not answered the question it was asked,
// so it must not look like a clean pass to whatever called it.
main().then(code => process.exit(code || 0))
      .catch(e => { console.error('\n' + (e && e.stack || e)); process.exit(1); });
