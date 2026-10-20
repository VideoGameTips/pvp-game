# Backrooms expedition

Access: Special -> Backrooms. Solo, with a temporary fists-only kit. Uses the game's
existing camera, player movement, collision physics, hands, punch animations,
slide/slide-jump, wall climbing, uppercut and mobile joystick/action controls.
The previous loadout is restored when leaving; no purchases or account unlocks change.
Levels 0-9 are a first playable adaptation, not an exhaustive simulation of an
infinite setting. All ten can be traversed in one run. Each entrance is a device-local,
per-username checkpoint (`pvp_backrooms_v1:<username>`); cleared levels can be replayed.
No server-side progression or multiplayer is implied. Death retries the current
level. Exiting or refreshing restarts at the latest unlocked entrance.

## Research / attribution

Based consistently on the **Backrooms Wiki on Wikidot**, researched October 19,
2026. These pages have been rewritten over time: Level 0 currently calls itself
Threshold, and Level 2 currently calls itself Abandoned Utility Halls (often known
as Pipe Dreams). There is no single universal Backrooms canon.

Setting concepts and their adaptations in `public/backrooms-data.js` and
`public/backrooms.js` are shared under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
Changes: original geometry, procedural textures and layouts, original interface
and prose, finite playable routes, shorter travel distances, simplified hazards,
and game-specific objectives. No wiki images, audio, or article passages are copied.
These credits are also accessible in the in-game expedition journal.

| Level / source | Authors credited by source | Implementation |
|---|---|---|
| [0: Threshold](https://backrooms-wiki.wikidot.com/level-0) | DivineAtlas, DrAkimoto, RobertGoerman; original concept adapted by u/Deveyerr | Yellow patterned walls, damp carpet, low tiled ceiling, fluorescent hum, flickering-wall exit. No confirmed entities, so none spawned. |
| [1: Habitable Zone](https://backrooms-wiki.wikidot.com/level-1) | Praetor3005, DivineAtlas | Concrete warehouse halls, supply crates, puddles, blackouts enabling aggressive entities. |
| [2: Abandoned Utility Halls](https://backrooms-wiki.wikidot.com/level-2) | Greggita Mahayfaio | Tight maintenance passages, pipes, valves and telegraphed hot-steam cycles. Orthogonal simplified layout rather than the article's 45-degree turns. |
| [3: Electrical Station](https://backrooms-wiki.wikidot.com/level-3) | Natedagreat563 | Brick utility rooms, electrical cabinets, patrols, warning plates and three breakers. |
| [4: Abandoned Office](https://backrooms-wiki.wikidot.com/level-4) | u/M654zy | Pale office partitions, sparse furniture, blacked-out windows, route document and recovery. No hostile entities in this respite. |
| [5: Terror Hotel](https://backrooms-wiki.wikidot.com/level-5) | Stretchsterz; original Discord13; contributions ratscrapz | Burgundy/gold wallpaper, numbered doors, brass key, boiler valve, light-attracted moths. |
| [6: Lights Out](https://backrooms-wiki.wikidot.com/level-6) | Bart0nius | Black, silent concrete passages; flashlight disabled. A short, non-diegetic tactile trace makes navigation playable; optional route assistance is explicitly an accessibility/game adaptation, not a lore claim. |
| [7: Thalassophobia](https://backrooms-wiki.wikidot.com/level-7) | Bart0nius | Enclosed ocean, entrance platform/room, swimming and diving, air management, a large submerged threat and underwater cave exit. Depth and travel distance heavily compressed. Not Poolrooms. |
| [8: Cave Systems](https://backrooms-wiki.wikidot.com/level-8) | C-Graph, kai4C | Faceted rock passages, stalactites, spiders, dark pools and lost trail tags. |
| [9: The Suburbs](https://backrooms-wiki.wikidot.com/level-9) | Stretchsterz; original Bart0nius | Midnight houses, wet unpainted roads, fog, roaming watchers, street signs and a field gate. The field gate ends this ten-level expedition, not the Backrooms. |

Sequential 0 -> 9 progression is a game structure, not a claim that wiki exits
always follow that order. Entities here are simplified gameplay representations,
not full simulations of every creature listed on each source page.

## Controls / lifecycle

Normal game controls apply: WASD moves, mouse/arrows look, Space jumps, Shift
slides, Ctrl/C crouches (or initiates a slide while moving), mouse/fire punches,
E uses the existing fist uppercut, T inspects. F interacts, L toggles the flashlight,
Tab opens the journal. In Level 6 F feels the passage; underwater in Level 7,
Space/held Jump ascends and Ctrl/C/Crouch descends. Swimming only replaces the
vertical gravity step while submerged; horizontal movement still uses the game
controller. Touch uses the existing joystick, look, fire, jump, slide and crouch
controls, with the normal interaction button wired to objectives. Fists can hurt
and stagger small entities; the ocean creature can only be briefly staggered.
Escape only releases the cursor; Journal explicitly
pauses. Hidden tabs pause and clear held input. Continue/Retry restore supplies.

The layout generator uses a seeded spanning maze plus level-specific rooms or
streets. A flood fill selects reachable objectives and exits. Entity paths use
the same walkable grid; diagonals do not cut walls. Hazards provide a warning
phase and never occupy the starting square, objectives or exits.

The expedition calls the game's existing movement and equipment update functions
from the normal loop, and uses the same camera, renderer and scene. Other map
visibility, colliders, scene lighting, controls and loadout are restored on exit.
Rendering is capped at 45 FPS and 1.25 pixel ratio in this mode; walls and cave
surfaces use instancing. Only the current level is retained. Leaving disposes
only expedition geometry, materials, textures and ambient audio, never the shared
renderer or player models. No extra WebGL context, movement controller, animation
loop or timers are created.
