# Character ragdolls

Deaths now use a connected 15-body / 14-joint ragdoll instead of the old rigid
tip-over and random death-body transformations. Original character geometry,
clothing, head gear and held weapon are retained. Living characters caught by
an explosion temporarily tumble, then recover. The local player gets a following
third-person camera during the launch; normal death spectating is not replaced
with another killcam. Ordinary health, self-damage and friendly-fire rules are
unchanged. Movement, firing and abilities cannot fight the local ragdoll.

The physics runs through [cannon-es 0.20.0](https://github.com/pmndrs/cannon-es),
vendored unchanged from the npm release in `public/vendor/cannon-es.js`, with
the MIT license alongside it. No backend dependency/install is required.

`public/ragdoll.js` owns a lazily created physics world. It uses nearby map
colliders and actual map floor/void definitions. Characters use cone/twist
constraints with self-collision disabled. Physics is cosmetic for dead bodies;
the local player and locally owned bots publish their existing root movement
while alive. Each observer simulates the articulated visual locally rather
than sending fifteen joint transforms through the server. Ordinary remote-player
snapshots resume when the tumble finishes.

Bullet CCD intersects the living ragdoll's oriented body boxes, including the
head, so its hidden standing model does not grant invulnerability. Death during
a launch keeps the existing articulated body and its velocity. Respawn resets
the corresponding simulation; local kit resets clear the local body. Match
teardown releases all bodies and constraints. At most eight articulated bodies
are retained, and corpses expire after five seconds. Character assets belonging
to remote players are never disposed by the ragdoll cleanup.

The engine loads from a relative local URL, including in the itch bundle. If it
cannot load, the existing tip-over animation remains the fallback.
