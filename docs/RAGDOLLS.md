# Character ragdolls

Deaths now use a connected 15-body / 14-joint ragdoll instead of the old rigid
tip-over and random death-body transformations. Original character geometry,
clothing, head gear and held weapon are retained. Only lethal explosions launch
death ragdolls; surviving a blast keeps ordinary knockback and control. The local
camera stays at the ragdoll's eyes, with its head hidden to avoid clipping. In
team elimination, this death view lasts three seconds before first-person ally
spectating if the round is still active. A finished 1v1 round waits six seconds
before the next round resets. No killcam or blocking death overlay is added.
Ordinary health, self-damage and friendly-fire rules are unchanged.

The physics runs through [cannon-es 0.20.0](https://github.com/pmndrs/cannon-es),
vendored unchanged from the npm release in `public/vendor/cannon-es.js`, with
the MIT license alongside it. No backend dependency/install is required.

`public/ragdoll.js` owns a lazily created physics world. It uses nearby map
colliders and actual map floor/void definitions. Characters use cone/twist
constraints with self-collision disabled. Physics is cosmetic for dead bodies.
Each observer simulates the articulated visual locally rather than sending
fifteen joint transforms through the server.

The killing weapon determines whether to launch, so a nearby explosion cannot
turn an unrelated bullet kill into an explosion death. Respawn resets
the corresponding simulation; local kit resets clear the local body. Match
teardown releases all bodies and constraints. At most eight articulated bodies
are retained, and corpses expire after five seconds. Character assets belonging
to remote players are never disposed by the ragdoll cleanup.

The engine loads from a relative local URL, including in the itch bundle. If it
cannot load, the existing tip-over animation remains the fallback.
