# Nightmare Bot: handoff (research done, nothing implemented)

Written for whoever picks this up. Line numbers drift, so everything below is named by function or constant.

## What was asked

A bot difficulty above Expert, called **Nightmare**:
- very strong aim, but with human-like reaction delays (no instant lock-on, no wallhack);
- advanced movement: strafing, dodging, slide jumps, double jumps, **scythe dashes**;
- priorities, in order: **damage, high ground, self-preservation**; "stupid combos" are out of scope for now (keep it professional);
- weapon mastery (Crossbow, Revolver, Katana deflects, utilities);
- adaptive: changes tactics when the player repeats the same trick;
- an **optional ranked challenge**, not a replacement for human opponents. Win rewards by rank:

| Rank | Expert bot win | Nightmare bot win |
|---|---|---|
| Platinum | +4 | +8 |
| Amethyst | +2 | +6 |
| Sapphire | +1 | +4 |
| Obsidian | +1 | +3 |
| Diamond | +1 | +2 |
| Master and above | +1 | +1 |

- a **daily cap** on bot-earned ELO, with a visible counter (example given: Obsidian 15 per day);
- not wanting to fight it carries no penalty.

## What already exists (verified in `public/game.js`)

**Difficulty.** `selectedDifficulty` is `'easy' | 'medium' | 'hard' | 'expert'`. The tuning lives in `BOT_DIFFICULTY_TUNING` (aimMin, aimRand, reactMin, reactRand, fireMin, fireRand, reloadMin, reloadRand, hitRunChance, initialShotDelay). `botTuning(diff)` reads it, and `botAimProfile(diff)` returns `{follow, drift, settle}`.
- Expert today: `reactMin 130 / reactRand 160`, `aimMin 1.14`, `fireMin 560`, aim profile `follow 11.5, drift 0.16, settle 0.88`.
- The picker is in `public/index.html` (`.diff-card` elements with `data-diff`). `selectDifficulty()` and `DIFFICULTY_DESCS` are in `game.js`. `selectDifficulty` colours cards by name, and an unknown name falls through to purple.

**Bot creation.** Difficulty is assigned in a few places: the main bot spawn (`const diff = selectedDifficulty; const tune = botTuning(diff);`), plus three `difficulty: selectedDifficulty, tune: botTuning(selectedDifficulty)` sites in `game.js`, and `botPickMap(..., selectedDifficulty)` for map picking.

**Expert logic is keyed on `bot.difficulty === 'expert'`** (about 19 places): aim trajectory prediction (`updateBotAimCrosshair`), the flee thresholds (`getFleeReason`, near `lowHpThresh` / `panicDmg`), team comms, weapon-aware pressure.

**Bot AI** is one function, `updateBotAI(dt, simulation)`, about 1,240 lines. It already has:
- states: `cover`, `melee_charge`, hit-and-run, flee, `strafeDir` / `strafeFlipTimer`, `findBotCover`;
- vertical physics (`bot.yVel`, `bot.y`, `GRAVITY`, `botGroundYAt`);
- **slide** (`bot._slideUntil`), **slide jump** that uses ramps (`MAP_RAMPS`, `rampSurfaceAt`), and a plain **jump** (`bot._nextJumpAt`);
- nav (`bot._navWp`), stuck detection, and knockback (`bot.kbVX/kbVZ`) that a dash can reuse.

Bots do **not** currently: double jump, dash, deliberately take high ground, or deflect with a katana.

**Player constants worth reusing:** `AIR_JUMP_VEL` (12.3), `DASH_SPEED` (17, blade dash), `GRAVITY` (33).

**Ranked** (`public/rank-core.js`, `public/ranked.js`, server in `server.js`):
- It's humans-only. 1v1 and 2v2, signed-in players, zero-sum Elo (`RANK.settle`, K=40), and the server owns ratings (`u.rank.points`).
- Rank names, from `RANK.RANKS`: Copper, Bronze, Silver, Gold, Platinum, Amethyst, Sapphire, Obsidian, Diamond, Master, Grandmaster, Legend, at 100 points per division.
- The ranked panel is `PVP_RANKED.open()`. The server's ranked match records are `rankedMatches`, and the `rankedReport` socket event is how clients report results.
- Nothing about bots exists in ranked. The "Expert bot win" column in the table above would be new too.

## Recommended design

**1. Nightmare as a flag on Expert, so all existing Expert logic applies for free.**
- Add `nightmare` to the picker (a new `.diff-card`, plus a new colour in `selectDifficulty` and a `DIFFICULTY_DESCS` line).
- Add a helper `aiDifficulty(d) { return d === 'nightmare' ? 'expert' : d; }`.
- At every bot creation site set `difficulty: aiDifficulty(selectedDifficulty)` and `nightmare: selectedDifficulty === 'nightmare'`, and keep `tune: botTuning(selectedDifficulty)` so the Nightmare numbers apply.
- Add `BOT_DIFFICULTY_TUNING.nightmare`. Suggested: `aimMin ~1.5, aimRand 0.25, reactMin ~105, reactRand ~55` (**never below about 100 ms: human-like, not instant**), `fireMin ~330, fireRand 170, reloadMin ~650, reloadRand 200, hitRunChance ~0.22, initialShotDelay ~380`.
- `botAimProfile`: `{follow ~15, drift ~0.08, settle ~0.55}`. In `updateBotAimCrosshair` use `botAimProfile(bot.nightmare ? 'nightmare' : bot.difficulty)` and a bigger lead (`leadScale` ~0.9, add acceleration from `playerPosHistory`).
- No wallhack: aim only with `hasLOS`; when it has no line of sight use only `lastSeenPos` / `lastSeenAt` (which already exist).

**2. Movement tech (in the "Bots use JUMP + SLIDE" block near the end of `updateBotAI`).** For `bot.nightmare` only:
- slide more often, with a slide-jump chance near 1.0 and shorter cooldowns;
- **double jump:** when airborne, `yVel < 2`, engaging, and `!bot._airJumpUsed`, set `bot.yVel = AIR_JUMP_VEL`, then reset the flag on landing;
- **dash dodge:** cooldown about 5 s. Trigger when hit, or when the player's crosshair is within about 6° of the bot at under 35 m. Apply an impulse of `DASH_SPEED` sideways via `bot.kbVX / kbVZ`, plus a small `spawnAbilityAOEFX`. Give Nightmare bots the Scythe as `botMeleeId` so it's "scythe dashes";
- shorter, more random strafe flips.

**3. Priorities.**
- **Damage:** the tuning above.
- **High ground:** every ~1.2 s while engaged and healthy, pick the nearest ramp top (from `MAP_RAMPS`: `x0 + ux*run`, `z0 + uz*run`, height `rise`) that is at least 1.5 m above the target within about 22 m and has LOS to them. Set `bot._hgGoal = {x, z, until}` and steer toward it, slide-jumping at the ramp foot. Time-box it (about 4 s) so a bot never gets stuck.
- **Self-preservation:** make `getFleeReason` stricter for `bot.nightmare` (retreat to cover at about 40% HP when behind in the trade; use a medkit utility if it has one).

**4. Adaptive tactics (simple version).** Keep an EMA of the player's lateral strafe direction relative to the bot. If it is strongly one-sided, bias the lead that way. Detect a camper (standing in the same grid cell for more than 3 s) and flank or take high ground. Count repeated weapon or position tricks and vary strafe and cover choices.

**5. Loadout.** Primary Crossbow (or Railgun), secondary Revolver (check the ids: `auto_revolver`, `machine_revolver` and `gunslinger` exist), melee Scythe (for the dash). Katana deflection for bots does not exist; leave it for later.

## Ranked challenge (server-owned)

Everything below is new.
- Table above in `server.js`: `BOT_ELO[rankName] = { expert, nightmare }`, "Master+" meaning Master, Grandmaster and Legend. **Ranks below Platinum were not specified**: suggest Copper–Gold at +6 / +10, still bounded by the cap. Ask Andy.
- Daily cap per account per UTC day: `u.rank.botToday = { day, elo }`. Suggested: Platinum 30, Amethyst 25, Sapphire 20, **Obsidian 15** (given), Diamond 10, Master and above 6. Send the counter to the client.
- Socket events: `rankedBotStart {difficulty}` creates one active challenge per account, with a nonce and a start time, and returns `{id, cap, earnedToday, reward}`. `rankedBotEnd {id, won}` awards points only if the challenge is real, belongs to that account, lasted at least about 45 s, and the cap isn't reached. It adds the points to `u.rank.points` (this is **not** zero-sum, which is why the cap matters), saves, and emits the existing `rankUpdate` with `result: 'botwin'`. A loss changes nothing.
- Client (`public/ranked.js`): a "BOT CHALLENGE" section in the ranked panel with EXPERT and NIGHTMARE buttons, the reward for your rank, and a counter like `Bot ELO today 8/15`. Starting one sets `selectedDifficulty` and launches a 1v1 against a bot, then calls `rankedBotEnd` from `endMatch`.
- **Honest limitation:** bot matches are simulated on the client, so a modified client can lie about a win. The nonce, minimum duration, one-active-challenge rule and the daily cap bound the damage, but do not eliminate it. Say this to Andy; do not claim it is cheat-proof.

## Commit and test notes

- New `.diff-card` markup needs an `index.html` hunk, so commit it in the same commit as the JS.
- Test: spawn a Nightmare bot and check, in the browser, that its reaction time is at least 100 ms, that it double jumps and dashes, and that it never aims without LOS. Server: simulate the start and end events for each rank, hit the cap, try a replayed or expired id, and try a too-short match.
- Remember `tools/verify-boot.js` and the itch zip (`tools/build-itch.sh --head`) after changes; the working-tree `verify-boot.js` is newer than the committed one.

## Open questions for Andy

1. Rewards below Platinum, and does a loss cost anything (the brief says no penalty)?
2. Should the Expert-bot challenge also be offered, or only Nightmare?
3. Katana deflection for bots: in scope now, or later?
