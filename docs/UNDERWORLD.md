# PVP Arena: Underworld

Underworld is a separate single-player campaign. PvP, its equipment ownership,
and its matchmaking remain available. Open **Special > Underworld** on the mode
page, or **Underworld Campaign** at the lobby arcade.

## Campaign

Four chapters contain sixteen ordered missions. Each mission has its own
briefing, conversations, objectives and aftermath. Objectives include fighting,
retrieval, investigation, rescue, recruitment, zone defense, escort and escape.
Mission 16 adds Dante's boss encounter and a different final objective for each
ending: hold territory, broadcast a ceasefire, or extract with Jax.

The existing maps are reused rather than replaced. The outline's Classic means
`blank`, Cyber Alley means `cyber`, and Super Big Arena means `super_arena`.
Objective terminals, supply cases, contacts, rescue NPCs and defense beacons are
mission-local props. Their locations and enemy spawns are selected from connected
walkable navigation cells, excluding map edges, water and known hazard areas.

Jax follows connected routes, helps fight, and waits for the player on escort
missions. Some operations require him to survive. On other operations he can
recover from a knockdown, but loses that mission's optional reputation bonus.
Enemies are deployed in squads, with at most seven living hostiles at once.
Campaign bots do not automatically respawn. The campaign runs in its own server
match room; it never enters the multiplayer staging queue.

## Progression

- First completion: 90 REP.
- Bring Jax home without a knockdown: another 20 REP, awarded once.
- Replays cannot farm reputation. A missed optional bonus can be earned later.
- Promotions require both REP and the corresponding story gate.

| Rank | Minimum REP | Required completed mission |
| --- | ---: | ---: |
| Recruit | 0 | none |
| Runner | 100 | 4 |
| Soldier | 250 | 8 |
| Enforcer | 500 | 9 |
| Lieutenant | 800 | 14 |
| Underboss | 1200 | 15 |

Trust improves Jax's health and can recruit extra help. Evidence reduces Dante's
health and the resistance to a ceasefire. Loyalty reduces the final resistance
when taking control. Sparing Marcus can bring him back as an ally. All three
endings can be collected by replaying the final mission.

## Saves and Checkpoints

Progress is **device-local**, separated by username under
`pvp_underworld_v1:<username>` in localStorage. It does not sync across computers
or grant purchased equipment, donuts, or PvP rank. Clearing browser storage also
clears campaign progress. The journal labels the device save explicitly.

Every objective starts a checkpoint. A retry restarts that objective with a
restored kit and health, rather than restoring a potentially unwinnable battle.
Conversations and the pause menu stop simulation; the full-screen menus also
skip world rendering. Showing the cursor or pressing Escape does not pause the
operation; use Journal to pause explicitly. Losing browser visibility still
pauses the operation. The journal's New Campaign action requires confirmation and resets only this
account's campaign data on this device.

## Source Layout

- `public/underworld-data.js`: mission scripts, choices, ending routes, rank gates,
  save validation and pure progression functions; also importable from Node.
- `public/underworld.js`: journal, dialogue, checkpoints and objective state machine.
- `public/underworld-adapter.js`: combat, actors, navigation, portraits and world props.
- `public/underworld.css`: responsive campaign interface.
- `public/game.js`: narrow lifecycle, pause, death, targeting and respawn hooks.
- `server.js`: campaign room/team registration and no automatic bot respawn.

The itch bundle explicitly includes all four campaign assets. Narrative text is
English; the shared translation table covers the main new interface controls.
