// Hand-authored first-person models for roster entries that used to share the
// generic gun, melee, or utility factories. Every registered item assembles
// its own silhouette; only low-level primitive helpers are shared.
(function () {
  'use strict';

  const GUNS = Object.create(null);
  const MELEES = Object.create(null);
  const SUPPORTS = Object.create(null);
  const PI = Math.PI;

  const dark = new THREE.MeshLambertMaterial({ color: 0x151619 });
  const black = new THREE.MeshLambertMaterial({ color: 0x050607 });
  const rubber = new THREE.MeshLambertMaterial({ color: 0x202226 });
  const steel = new THREE.MeshPhongMaterial({ color: 0x707881, shininess: 85, specular: 0xdde6ee });
  const brightSteel = new THREE.MeshPhongMaterial({ color: 0xb9c1c8, shininess: 115, specular: 0xffffff });
  const brass = new THREE.MeshPhongMaterial({ color: 0xb78a35, shininess: 75, specular: 0xffe0a0 });
  const copper = new THREE.MeshPhongMaterial({ color: 0x9b4f2c, shininess: 65, specular: 0xffaa66 });
  const wood = new THREE.MeshLambertMaterial({ color: 0x65401f });
  const paleWood = new THREE.MeshLambertMaterial({ color: 0x9a6a34 });
  const olive = new THREE.MeshLambertMaterial({ color: 0x46513a });
  const tan = new THREE.MeshLambertMaterial({ color: 0x8a7656 });
  const white = new THREE.MeshLambertMaterial({ color: 0xe8ebed });
  const red = new THREE.MeshLambertMaterial({ color: 0xb72c25 });
  const orange = new THREE.MeshLambertMaterial({ color: 0xef721f });
  const yellow = new THREE.MeshLambertMaterial({ color: 0xe4bd32 });
  const blue = new THREE.MeshLambertMaterial({ color: 0x285d8f });
  const green = new THREE.MeshLambertMaterial({ color: 0x397047 });

  const lambert = color => new THREE.MeshLambertMaterial({ color });
  const phong = color => new THREE.MeshPhongMaterial({ color, shininess: 90, specular: 0xe8eef5 });
  const glow = color => new THREE.MeshBasicMaterial({ color });
  const glass = (color, opacity = 0.55) => new THREE.MeshPhongMaterial({
    color, shininess: 120, specular: 0xffffff, transparent: true, opacity,
  });

  function place(mesh, pos, rot) {
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function box(g, mat, size, pos, rot) {
    const mesh = place(new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat), pos, rot);
    g.add(mesh);
    return mesh;
  }

  function cyl(g, mat, radii, length, pos, rot = [PI / 2, 0, 0], segments = 12) {
    const r1 = Array.isArray(radii) ? radii[0] : radii;
    const r2 = Array.isArray(radii) ? radii[1] : radii;
    const mesh = place(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, length, segments), mat), pos, rot);
    g.add(mesh);
    return mesh;
  }

  function cone(g, mat, radius, length, pos, rot = [-PI / 2, 0, 0], segments = 10) {
    const mesh = place(new THREE.Mesh(new THREE.ConeGeometry(radius, length, segments), mat), pos, rot);
    g.add(mesh);
    return mesh;
  }

  function sphere(g, mat, radius, pos, scale = [1, 1, 1], segments = 10) {
    const mesh = place(new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(6, segments - 2)), mat), pos);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    g.add(mesh);
    return mesh;
  }

  function torus(g, mat, radius, tube, pos, rot = [0, 0, 0], arc = PI * 2) {
    const mesh = place(new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 7, 20, arc), mat), pos, rot);
    g.add(mesh);
    return mesh;
  }

  function triangle(g, mat, radius, length, pos, rot = [-PI / 2, 0, 0]) {
    return cone(g, mat, radius, length, pos, rot, 3);
  }

  function makeFlash(color) {
    const group = new THREE.Group();
    const coreMat = glow(color);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.023, 7, 5), coreMat);
    group.add(core);
    const flare = new THREE.Mesh(
      new THREE.ConeGeometry(0.032, 0.10, 7),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 }),
    );
    flare.rotation.x = -PI / 2;
    flare.position.z = -0.045;
    group.add(flare);
    group.material = coreMat;
    group.visible = false;
    return group;
  }

  function defineGun(id, colors, muzzle, kick, build, flashColor) {
    GUNS[id] = function () {
      const g = new THREE.Group();
      const body = lambert(colors[0]);
      const accent = lambert(colors[1]);
      const p = { body, accent, glow: glow(colors[1]), dark, black, rubber, steel, brightSteel, brass, copper, wood, paleWood, olive, tan, white, red, orange, yellow, blue, green };
      build(g, p);
      const flash = makeFlash(flashColor || colors[1] || 0xffcc55);
      flash.position.set(muzzle[0], muzzle[1], muzzle[2]);
      g.add(flash);
      g._flash = flash;
      g._kickZ = kick;
      g._bodyMat = body;
      g._accentMat = accent;
      g._origBody = colors[0];
      g._origAccent = colors[1];
      g.position.set(0.12, -0.10, -0.25);
      return g;
    };
  }

  function defineMelee(id, build) {
    MELEES[id] = function () {
      const g = new THREE.Group();
      build(g);
      g.position.set(0.14, -0.12, -0.30);
      return g;
    };
  }

  function defineSupport(id, build) {
    SUPPORTS[id] = function () {
      const g = new THREE.Group();
      build(g);
      g.position.set(0.12, -0.11, -0.20);
      return g;
    };
  }

  // Hyperburst AN-94: offset barrel, canted magazine, skeleton stock, and the
  // distinctive pulley housing under the receiver.
  defineGun('an94', [0x25282a, 0x696e73], [0, 0.014, -0.475], 0.014, (g, p) => {
    box(g, p.body, [0.052, 0.060, 0.30], [0, 0, -0.015]);
    box(g, p.accent, [0.046, 0.042, 0.17], [0, -0.004, -0.205], [0.04, 0, 0]);
    cyl(g, p.steel, 0.008, 0.25, [0.009, 0.014, -0.365]);
    box(g, p.dark, [0.028, 0.125, 0.045], [-0.004, -0.083, 0.025], [0.22, 0, -0.05]);
    torus(g, p.steel, 0.026, 0.005, [0.026, -0.035, -0.075], [0, PI / 2, 0]);
    box(g, p.rubber, [0.026, 0.075, 0.042], [0, -0.064, 0.105], [0.28, 0, 0]);
    box(g, p.dark, [0.008, 0.010, 0.19], [-0.015, 0.005, 0.235], [0.15, 0, 0]);
    box(g, p.dark, [0.008, 0.010, 0.19], [0.015, -0.022, 0.235], [-0.08, 0, 0]);
    box(g, p.rubber, [0.048, 0.066, 0.016], [0, -0.010, 0.325]);
    box(g, p.dark, [0.026, 0.012, 0.20], [0, 0.043, -0.035]);
    box(g, p.dark, [0.034, 0.030, 0.045], [0, 0.065, -0.06]);
    sphere(g, glow(0xff3322), 0.005, [0, 0.066, -0.083]);
  });

  // SPAS-12: vented heat shield, ribbed sliding pump, tube magazine, and the
  // folded hook stock over the receiver.
  defineGun('spas12', [0x1c1d1f, 0x5b5d61], [0, 0.022, -0.49], 0.028, (g, p) => {
    box(g, p.body, [0.060, 0.070, 0.30], [0, 0, -0.01]);
    cyl(g, p.steel, 0.014, 0.32, [0, 0.022, -0.335]);
    cyl(g, p.dark, 0.011, 0.28, [0, -0.010, -0.315]);
    box(g, p.accent, [0.057, 0.050, 0.13], [0, -0.008, -0.235]);
    for (let z = -0.28; z <= -0.19; z += 0.03) box(g, p.rubber, [0.063, 0.008, 0.012], [0, -0.030, z]);
    box(g, p.steel, [0.068, 0.014, 0.23], [0, 0.052, -0.19]);
    for (let z = -0.28; z <= -0.11; z += 0.042) box(g, p.dark, [0.072, 0.009, 0.018], [0, 0.054, z]);
    box(g, p.rubber, [0.030, 0.085, 0.045], [0, -0.072, 0.095], [0.30, 0, 0]);
    box(g, p.dark, [0.010, 0.012, 0.27], [0, 0.064, 0.145], [-0.14, 0, 0]);
    torus(g, p.dark, 0.055, 0.006, [0, 0.024, 0.28], [PI / 2, 0, 0], PI);
  });

  // M1 Garand: one continuous walnut stock, exposed receiver, handguard, clip
  // well, and protected front sight.
  defineGun('m1_garand', [0x6b431f, 0x3f4143], [0, 0.018, -0.61], 0.022, (g, p) => {
    box(g, p.wood, [0.055, 0.075, 0.56], [0, -0.012, -0.06]);
    box(g, p.wood, [0.060, 0.060, 0.20], [0, -0.010, 0.30], [-0.10, 0, 0]);
    box(g, p.dark, [0.062, 0.066, 0.16], [0, 0.014, 0.035]);
    box(g, p.steel, [0.052, 0.030, 0.15], [0, 0.054, -0.015]);
    cyl(g, p.steel, 0.008, 0.39, [0, 0.018, -0.425]);
    box(g, p.wood, [0.050, 0.042, 0.22], [0, 0.025, -0.245]);
    box(g, p.brass, [0.030, 0.010, 0.035], [0, 0.071, -0.005]);
    box(g, p.dark, [0.024, 0.032, 0.012], [0, 0.062, -0.47]);
    torus(g, p.dark, 0.018, 0.004, [0, 0.062, -0.485], [0, PI / 2, 0], PI);
    box(g, p.rubber, [0.063, 0.076, 0.015], [0, -0.014, 0.405], [-0.12, 0, 0]);
  });

  // Plasma Carbine: split shell around a visible plasma bottle and three
  // focusing vanes instead of a conventional barrel.
  defineGun('plasma_carbine', [0x173d28, 0x66ff99], [0, 0.012, -0.43], 0.012, (g, p) => {
    box(g, p.body, [0.065, 0.052, 0.23], [0, 0.025, 0.02], [0.08, 0, 0]);
    box(g, p.body, [0.050, 0.045, 0.20], [0, -0.030, 0.015], [-0.12, 0, 0]);
    cyl(g, glass(0x5dff9a, 0.48), 0.027, 0.18, [0, 0.003, -0.12]);
    cyl(g, p.glow, 0.012, 0.17, [0, 0.003, -0.12]);
    for (const x of [-0.033, 0.033]) box(g, p.accent, [0.012, 0.022, 0.24], [x, 0.014, -0.22], [0, 0, x * 2]);
    triangle(g, p.accent, 0.028, 0.16, [0, 0.014, -0.345]);
    torus(g, p.glow, 0.038, 0.005, [0, 0.014, -0.365], [PI / 2, 0, 0]);
    box(g, p.rubber, [0.034, 0.082, 0.045], [0, -0.075, 0.095], [0.36, 0, 0]);
    sphere(g, p.glow, 0.018, [0, 0.065, 0.055], [1.4, 0.65, 1.8]);
  }, 0x66ff99);

  // Arc Rifle: two insulated rails, a central lightning chamber, and a forked
  // electrode muzzle.
  defineGun('arc_rifle', [0x223340, 0x8bd9ee], [0, 0.018, -0.50], 0.013, (g, p) => {
    box(g, p.body, [0.060, 0.064, 0.29], [0, 0, 0.00]);
    sphere(g, glass(0x99eeff, 0.45), 0.043, [0, 0.015, -0.08], [0.8, 0.8, 1.4]);
    sphere(g, p.glow, 0.018, [0, 0.015, -0.08], [0.8, 0.8, 1.8]);
    for (const x of [-0.038, 0.038]) {
      box(g, p.accent, [0.014, 0.025, 0.31], [x, 0.018, -0.235], [0, x * 2.1, 0]);
      sphere(g, p.glow, 0.012, [x, 0.018, -0.405]);
    }
    for (const z of [-0.16, -0.23, -0.30]) torus(g, p.copper, 0.035, 0.004, [0, 0.018, z], [PI / 2, 0, 0]);
    box(g, p.rubber, [0.032, 0.080, 0.045], [0, -0.070, 0.10], [0.30, 0, 0]);
    box(g, p.body, [0.055, 0.045, 0.13], [0, -0.010, 0.21], [-0.10, 0, 0]);
  }, 0xaaeeff);

  // Gravity Launcher: a caged singularity chamber feeding a broad magnetic
  // muzzle, with no rifle-like stock or magazine silhouette.
  defineGun('gravity_launcher', [0x2b1539, 0x8153d8], [0, 0.015, -0.47], 0.032, (g, p) => {
    sphere(g, p.body, 0.085, [0, 0.010, -0.055], [1.05, 0.85, 1.35], 14);
    sphere(g, glow(0x210033), 0.045, [0, 0.010, -0.065], [1, 1, 1.3], 12);
    for (const rot of [[0,0,0],[PI/2,0,0],[0,PI/2,0]]) torus(g, p.glow, 0.080, 0.007, [0, 0.010, -0.055], rot);
    cyl(g, p.body, [0.075, 0.050], 0.20, [0, 0.015, -0.27]);
    torus(g, p.accent, 0.078, 0.012, [0, 0.015, -0.38], [PI / 2, 0, 0]);
    cyl(g, p.dark, 0.048, 0.035, [0, 0.015, -0.415]);
    box(g, p.rubber, [0.040, 0.095, 0.055], [0, -0.090, 0.025], [0.25, 0, 0]);
    box(g, p.body, [0.080, 0.055, 0.14], [0, -0.015, 0.16]);
    box(g, p.accent, [0.050, 0.012, 0.10], [0, 0.075, 0.07]);
  }, 0xaa44ff);

  // Potato Cannon: improvised PVC pipe, pressure bottle, hose, wood shoulder
  // brace, and a loaded potato visible in the muzzle.
  defineGun('potato_cannon', [0xddd6bd, 0x9b693d], [0, 0.025, -0.51], 0.027, (g, p) => {
    cyl(g, p.body, 0.040, 0.48, [0, 0.025, -0.20], [PI / 2, 0, 0], 16);
    cyl(g, p.accent, 0.047, 0.055, [0, 0.025, -0.435], [PI / 2, 0, 0], 16);
    sphere(g, lambert(0x9a6a43), 0.033, [0, 0.025, -0.470], [1, 1, 0.72]);
    cyl(g, lambert(0xb43a2b), 0.050, 0.19, [0, -0.055, 0.03], [PI / 2, 0, 0], 14);
    torus(g, p.dark, 0.055, 0.008, [0, -0.055, -0.065], [PI / 2, 0, 0]);
    box(g, p.wood, [0.045, 0.070, 0.24], [0, -0.035, 0.25], [-0.15, 0, 0]);
    box(g, p.rubber, [0.038, 0.085, 0.044], [0, -0.100, 0.095], [0.28, 0, 0]);
    torus(g, p.copper, 0.030, 0.004, [0.050, 0.000, -0.02], [0, PI / 2, 0], PI * 1.45);
    cyl(g, white, 0.024, 0.012, [0.052, 0.045, 0.04], [0, 0, PI / 2]);
    box(g, black, [0.004, 0.020, 0.004], [0.059, 0.048, 0.04], [0, 0, 0.7]);
  }, 0xd2a06a);

  // Sticker Blaster: toy-like shell, clear sticker roll, star-shaped muzzle,
  // and a bright winding crank.
  defineGun('sticker_blaster', [0xf05cb2, 0xffdf45], [0, 0.018, -0.37], 0.008, (g, p) => {
    box(g, p.body, [0.075, 0.070, 0.22], [0, 0, -0.02], [0.03, 0, 0]);
    sphere(g, glass(0xffeaff, 0.55), 0.065, [0.054, 0.025, 0.025], [0.35, 1, 1]);
    cyl(g, p.accent, 0.045, 0.020, [0.055, 0.025, 0.025], [0, 0, PI / 2]);
    for (let i = 0; i < 8; i++) {
      const a = i * PI / 4;
      box(g, glow([0xff5577,0xffdd33,0x55ddff,0x77ff66][i % 4]), [0.018, 0.006, 0.030], [Math.cos(a)*0.035, 0.050 + Math.sin(a)*0.035, -0.10], [0, 0, a]);
    }
    cyl(g, p.body, [0.032, 0.050], 0.15, [0, 0.018, -0.255]);
    torus(g, p.glow, 0.052, 0.008, [0, 0.018, -0.335], [PI / 2, 0, 0]);
    box(g, p.rubber, [0.035, 0.090, 0.050], [0, -0.080, 0.075], [0.35, 0, 0]);
    cyl(g, p.accent, 0.016, 0.060, [-0.055, -0.005, 0.08], [0, 0, PI / 2]);
  }, 0xff44ff);

  // Harpoon Gun: spear shaft and barbed head sit above the launch tube while a
  // line spool and guide rollers fill the underside.
  defineGun('harpoon_gun', [0x364853, 0xaeb7bd], [0, 0.046, -0.62], 0.025, (g, p) => {
    box(g, p.body, [0.058, 0.065, 0.37], [0, -0.005, -0.04]);
    cyl(g, p.steel, 0.018, 0.42, [0, 0.020, -0.37]);
    cyl(g, p.brightSteel, 0.005, 0.56, [0, 0.046, -0.30]);
    cone(g, p.brightSteel, 0.023, 0.10, [0, 0.046, -0.615]);
    triangle(g, p.brightSteel, 0.020, 0.08, [-0.020, 0.046, -0.57], [-PI/2, 0, -0.45]);
    triangle(g, p.brightSteel, 0.020, 0.08, [0.020, 0.046, -0.57], [-PI/2, 0, 0.45]);
    cyl(g, p.accent, 0.055, 0.045, [0, -0.060, -0.02], [0, 0, PI / 2], 18);
    for (let i = 0; i < 4; i++) torus(g, p.dark, 0.028 + i*0.005, 0.002, [0.024, -0.060, -0.02], [0, PI/2, 0]);
    box(g, p.rubber, [0.034, 0.085, 0.045], [0, -0.085, 0.12], [0.32, 0, 0]);
    box(g, p.body, [0.060, 0.045, 0.15], [0, -0.015, 0.22]);
  }, 0xdde5ea);

  // Mortar Rifle: short shell tube, elevation wheel, range drum, and stout
  // spade-like shoulder rest.
  defineGun('mortar_rifle', [0x3f4a34, 0x242b20], [0, 0.035, -0.46], 0.035, (g, p) => {
    box(g, p.body, [0.085, 0.085, 0.30], [0, 0, -0.01]);
    cyl(g, p.steel, 0.033, 0.24, [0, 0.035, -0.27]);
    cyl(g, p.dark, [0.048, 0.034], 0.060, [0, 0.035, -0.405]);
    cyl(g, p.accent, 0.060, 0.050, [0.055, -0.025, -0.05], [0, 0, PI/2], 16);
    for (let i=0;i<8;i++) box(g, p.steel, [0.006, 0.006, 0.052], [0.083, -0.025 + Math.sin(i*PI/4)*0.045, -0.05 + Math.cos(i*PI/4)*0.045], [0,0,i*PI/4]);
    box(g, p.rubber, [0.040, 0.090, 0.050], [0, -0.092, 0.09], [0.26, 0, 0]);
    box(g, p.body, [0.10, 0.060, 0.14], [0, -0.015, 0.20], [-0.18, 0, 0]);
    box(g, p.rubber, [0.12, 0.075, 0.018], [0, -0.020, 0.29], [-0.18, 0, 0]);
    cyl(g, p.brass, 0.020, 0.075, [-0.052, 0.055, 0.02], [0,0,PI/2]);
  }, 0xffbb66);

  // Machine Pistol: ported slide, oversized extended magazine, compact wire
  // brace, selector switch, and compensator keep it distinct from the Glock.
  defineGun('machine_pistol',[0x202225,0x555c62],[0,0.018,-0.34],0.008,(g,p)=>{
    box(g,p.accent,[0.050,0.045,0.19],[0,0.050,-0.025]);
    for(let z=-0.10;z<=0.03;z+=0.032) box(g,p.dark,[0.052,0.015,0.012],[0,0.058,z]);
    box(g,p.body,[0.055,0.060,0.14],[0,0.005,0.04]);
    cyl(g,p.steel,0.007,0.18,[0,0.018,-0.20]);
    box(g,p.dark,[0.056,0.050,0.050],[0,0.018,-0.31]);
    for(const x of [-0.022,0.022]) box(g,p.black,[0.009,0.018,0.032],[x,0.018,-0.335]);
    box(g,p.rubber,[0.045,0.11,0.052],[0,-0.085,0.10],[0.30,0,0]);
    box(g,p.accent,[0.024,0.19,0.036],[0,-0.18,0.095],[0.30,0,0]);
    for(const x of [-0.025,0.025]) box(g,p.steel,[0.006,0.008,0.16],[x,0.000,0.20],[-0.10,0,0]);
    box(g,p.rubber,[0.055,0.055,0.012],[0,-0.005,0.29]);
    box(g,red,[0.016,0.009,0.022],[0.032,0.028,0.045]);
  });

  // Sawed-Off: stacked over-under barrels, chopped wood fore-end, break hinge,
  // exposed shell rims, and a taped birds-head grip.
  defineGun('sawed_off',[0x3b2517,0x745035],[0,0.012,-0.32],0.038,(g,p)=>{
    box(g,p.steel,[0.060,0.085,0.13],[0,0,0.03]);
    for(const y of [-0.012,0.025]) {
      cyl(g,p.dark,0.017,0.25,[0,y,-0.21]);
      torus(g,p.brightSteel,0.018,0.004,[0,y,-0.335],[PI/2,0,0]);
      cyl(g,p.brass,0.013,0.009,[0,y,-0.075]);
    }
    cyl(g,p.brass,0.017,0.065,[0.040,0,-0.045],[0,0,PI/2]);
    box(g,p.wood,[0.065,0.060,0.16],[0,-0.010,0.15],[-0.16,0,0]);
    box(g,p.wood,[0.052,0.13,0.055],[0,-0.105,0.18],[0.42,0,0]);
    for(let i=0;i<5;i++) box(g,p.dark,[0.055,0.006,0.012],[0,-0.065-i*0.020,0.145+i*0.008],[0.42,0,0]);
    box(g,p.dark,[0.050,0.014,0.045],[0,0.060,0.025]);
  },0xffbb66);

  // Dart Gun: translucent tranquilizer vial, top dart carousel, compressed-gas
  // bulb, green polymer shell, and a loaded red-fletched dart.
  defineGun('dart_gun',[0x235238,0x55df73],[0,0.020,-0.37],0.004,(g,p)=>{
    box(g,p.body,[0.060,0.070,0.18],[0,0,0.04]);
    cyl(g,p.steel,0.006,0.25,[0,0.020,-0.25]);
    cyl(g,p.dark,0.015,0.18,[0,0.020,-0.31]);
    cyl(g,glass(0x77ff99,0.45),0.025,0.13,[0.045,-0.010,0.02],[0,0,PI/2]);
    cyl(g,p.glow,0.010,0.10,[0.045,-0.010,0.02],[0,0,PI/2]);
    cyl(g,p.accent,0.042,0.025,[0,0.075,0.00],[0,0,PI/2],10);
    for(let i=0;i<5;i++) {
      const a=i*2*PI/5;
      cyl(g,p.brightSteel,0.003,0.065,[0.014,0.075+0.028*Math.sin(a),0.028*Math.cos(a)],[0,0,PI/2]);
      triangle(g,red,0.008,0.025,[-0.022,0.075+0.028*Math.sin(a),0.028*Math.cos(a)],[0,0,PI/2]);
    }
    box(g,p.rubber,[0.042,0.105,0.050],[0,-0.085,0.10],[0.34,0,0]);
    triangle(g,red,0.010,0.030,[0,0.020,-0.39],[-PI/2,0,0]);
  },0x44ff66);

  // Laser Pointer: pen-sized emitter body, knurled focus ring, exposed battery
  // tube, red lens, thumb switch, and minimal folding grip.
  defineGun('laser_pointer',[0x111214,0xe33b33],[0,0.018,-0.38],0.002,(g,p)=>{
    cyl(g,p.body,0.018,0.32,[0,0.018,-0.14]);
    cyl(g,p.accent,0.023,0.040,[0,0.018,-0.31]);
    for(let i=0;i<8;i++) box(g,p.dark,[0.004,0.050,0.020],[0.024*Math.cos(i*PI/4),0.018+0.024*Math.sin(i*PI/4),-0.31],[0,0,i*PI/4]);
    cyl(g,p.glow,0.014,0.008,[0,0.018,-0.337]);
    cyl(g,p.steel,0.021,0.075,[0,0.018,0.045]);
    box(g,p.red,[0.022,0.012,0.035],[0,0.043,-0.02]);
    box(g,p.rubber,[0.028,0.080,0.036],[0,-0.060,0.065],[0.36,0,0]);
    torus(g,p.dark,0.018,0.003,[0,-0.020,0.02],[0,PI/2,0],PI*1.2);
    box(g,p.steel,[0.007,0.007,0.11],[0.025,0.000,0.10],[-0.10,0,0]);
  },0xff2222);

  // Coin Gun: brass receiver, visible rotating coin wheel, denomination slots,
  // fluted muzzle, ornate grip, and a spring-loaded feed ramp.
  defineGun('coin_gun',[0x9a6c20,0xf2ce50],[0,0.018,-0.35],0.007,(g,p)=>{
    box(g,p.body,[0.060,0.070,0.18],[0,0,0.04]);
    cyl(g,p.accent,0.060,0.035,[0.050,0.015,-0.02],[0,0,PI/2],20);
    torus(g,p.brass,0.048,0.006,[0.070,0.015,-0.02],[0,PI/2,0]);
    for(let i=0;i<8;i++) {
      const a=i*PI/4;
      box(g,p.dark,[0.004,0.026,0.010],[0.072,0.015+0.034*Math.sin(a),-0.02+0.034*Math.cos(a)],[0,0,a]);
    }
    cyl(g,p.brightSteel,0.010,0.21,[0,0.018,-0.25]);
    for(let z=-0.33;z<=-0.24;z+=0.03) torus(g,p.brass,0.016,0.003,[0,0.018,z],[PI/2,0,0]);
    box(g,p.brass,[0.030,0.12,0.045],[0,-0.09,0.01],[0.20,0,0]);
    for(let i=0;i<5;i++) cyl(g,p.accent,0.010,0.024,[0,-0.050-i*0.022,0.01+i*0.007],[0,0,PI/2],16);
    box(g,p.wood,[0.045,0.11,0.052],[0,-0.085,0.11],[0.34,0,0]);
    torus(g,p.brass,0.025,0.005,[0,-0.025,0.00],[0,PI/2,0],PI*1.2);
  },0xffd700);

  // Arc Torrent: a close-range electrical projector with exposed copper coil,
  // fork electrodes, and a backpack-style capacitor canister.
  defineGun('arc_torrent', [0x17354a, 0x9eeaff], [0, 0.010, -0.42], 0.010, (g, p) => {
    box(g, p.body, [0.070, 0.080, 0.24], [0, -0.005, 0.02]);
    cyl(g, glass(0x5bcfff, 0.40), 0.038, 0.20, [0, 0.008, -0.18]);
    for (let z=-0.26; z<=-0.10; z+=0.032) torus(g, p.copper, 0.040, 0.005, [0, 0.008, z], [PI/2,0,0]);
    for (const x of [-0.038,0.038]) {
      box(g, p.accent, [0.016, 0.020, 0.19], [x, 0.012, -0.315], [0, x*1.5, 0]);
      sphere(g, p.glow, 0.015, [x, 0.012, -0.405]);
    }
    cyl(g, p.body, 0.050, 0.18, [0.055, -0.030, 0.075], [0,0,PI/2]);
    box(g, p.rubber, [0.036, 0.090, 0.050], [0, -0.090, 0.10], [0.25,0,0]);
    torus(g, p.glow, 0.025, 0.004, [0, 0.060, 0.02], [PI/2,0,0]);
  }, 0xaaeeff);

  // Firework Launcher: five paper launch tubes tied to a metal cradle, each
  // with a different colored rocket cap.
  defineGun('firework_launcher', [0x512042, 0xff4fa3], [0, 0.015, -0.47], 0.030, (g, p) => {
    box(g, p.body, [0.10, 0.075, 0.26], [0, -0.010, 0.02]);
    const colors = [0xff3344,0xffcc33,0x44ccff,0x66ff77,0xdd55ff];
    [[-0.042,0.030],[0,0.050],[0.042,0.030],[-0.022,-0.012],[0.022,-0.012]].forEach((xy,i) => {
      cyl(g, lambert(colors[i]), 0.020, 0.30, [xy[0], xy[1], -0.29]);
      cone(g, glow(colors[i]), 0.023, 0.065, [xy[0], xy[1], -0.468]);
    });
    box(g, p.brass, [0.12, 0.018, 0.035], [0, 0.010, -0.19]);
    box(g, p.brass, [0.12, 0.018, 0.035], [0, 0.010, -0.34]);
    cyl(g, p.accent, 0.057, 0.055, [0, -0.075, 0.03], [0,0,PI/2], 16);
    box(g, p.rubber, [0.038, 0.090, 0.052], [0, -0.095, 0.12], [0.28,0,0]);
  }, 0xff66bb);

  // Switchblade Gun: compact receiver with two folded blades along the sides,
  // an exposed magazine, and a narrow central barrel.
  defineGun('switchblade_gun', [0x3c2454, 0xb95eed], [0, 0.014, -0.37], 0.009, (g, p) => {
    box(g, p.body, [0.058, 0.065, 0.22], [0, 0, 0.00]);
    box(g, p.dark, [0.046, 0.035, 0.14], [0, 0.040, -0.035], [0.05,0,0]);
    cyl(g, p.steel, 0.007, 0.22, [0, 0.014, -0.27]);
    for (const x of [-0.044,0.044]) {
      box(g, p.brightSteel, [0.009, 0.045, 0.25], [x, 0.010, -0.075], [0,0,x*2.2]);
      triangle(g, p.brightSteel, 0.026, 0.11, [x, 0.010, -0.255], [-PI/2,0,x*4]);
      cyl(g, p.accent, 0.010, 0.020, [x, 0.010, 0.08], [0,0,PI/2]);
    }
    box(g, p.accent, [0.030, 0.12, 0.040], [0, -0.090, 0.015], [0.18,0,0]);
    box(g, p.rubber, [0.032, 0.080, 0.044], [0, -0.070, 0.105], [0.30,0,0]);
    box(g, p.glow, [0.010, 0.010, 0.16], [0, 0.058, -0.03]);
  }, 0xcc66ff);

  // Flechette Rifle: needle-thin barrel nested inside a silver bullpup shell,
  // with a visible dart cassette behind the grip.
  defineGun('flechette', [0x9da4aa, 0xe4edf2], [0, 0.022, -0.62], 0.008, (g, p) => {
    box(g, p.body, [0.060, 0.075, 0.34], [0, 0, 0.03]);
    box(g, p.dark, [0.060, 0.055, 0.15], [0, -0.005, 0.24]);
    cyl(g, p.brightSteel, 0.004, 0.52, [0, 0.022, -0.38]);
    for (const x of [-0.026,0.026]) box(g, p.accent, [0.010, 0.018, 0.42], [x, 0.024, -0.30]);
    box(g, glass(0xaddfff,0.45), [0.045, 0.070, 0.090], [0, -0.040, 0.14]);
    for (let i=0;i<5;i++) cyl(g, p.brightSteel, 0.003, 0.065, [-0.016+i*0.008,-0.04,0.14]);
    box(g, p.rubber, [0.032, 0.082, 0.045], [0,-0.075,0.01],[0.28,0,0]);
    cyl(g, p.dark, 0.017, 0.16, [0,0.080,-0.04]);
    cyl(g, glow(0x99ccff), 0.013, 0.006, [0,0.080,-0.125]);
  }, 0xeeeeee);

  // Thermal LMG: glowing barrel jacket with cooling fins, side drum, carry
  // handle, and a heavy rear heat sink.
  defineGun('thermal_lmg', [0x541c1b, 0xff6544], [0, 0.018, -0.56], 0.018, (g, p) => {
    box(g, p.body, [0.085,0.085,0.34],[0,0,0.00]);
    cyl(g, p.dark, 0.022, 0.34, [0,0.018,-0.38]);
    cyl(g, glass(0xff5533,0.36), 0.040, 0.29, [0,0.018,-0.34]);
    for(let z=-0.46;z<=-0.22;z+=0.045) torus(g,p.glow,0.042,0.005,[0,0.018,z],[PI/2,0,0]);
    cyl(g,p.accent,0.068,0.055,[0.063,-0.060,0.02],[0,0,PI/2],18);
    box(g,p.dark,[0.030,0.018,0.26],[0,0.080,-0.02]);
    box(g,p.dark,[0.020,0.080,0.12],[0,0.105,-0.02]);
    box(g,p.rubber,[0.040,0.090,0.052],[0,-0.090,0.13],[0.24,0,0]);
    for(const x of [-0.035,0.035]) for(let z=0.13;z<=0.25;z+=0.04) box(g,p.steel,[0.012,0.070,0.018],[x,0.005,z]);
  },0xff6644);

  // Burst Cannon: three staggered barrels around a compact bullpup core and a
  // rotating triangular breech.
  defineGun('burst_cannon', [0x4c4033,0xe79b2d],[0,0.015,-0.49],0.020,(g,p)=>{
    box(g,p.body,[0.075,0.085,0.30],[0,0,0.02]);
    triangle(g,p.accent,0.074,0.075,[0,0.010,-0.13],[0,0,PI/2]);
    [[0,0.050],[-0.033,-0.010],[0.033,-0.010]].forEach(([x,y])=>{
      cyl(g,p.steel,0.011,0.31,[x,y,-0.34]);
      cyl(g,p.dark,0.017,0.045,[x,y,-0.47]);
    });
    box(g,p.dark,[0.056,0.055,0.16],[0,-0.010,0.23]);
    box(g,p.accent,[0.035,0.13,0.045],[0,-0.095,0.10],[0.20,0,0]);
    box(g,p.rubber,[0.034,0.082,0.045],[0,-0.075,-0.015],[0.28,0,0]);
    cyl(g,p.dark,0.018,0.10,[0,0.090,0.02]);
    cyl(g,glow(0xffaa33),0.014,0.006,[0,0.090,-0.035]);
  },0xffaa22);

  // Incendiary Shotgun: perforated heat shield, twin fuel ampoules, broad
  // muzzle, and a charred pump grip.
  defineGun('incendiary_shotgun',[0x2d130d,0xf2542d],[0,0.025,-0.50],0.030,(g,p)=>{
    box(g,p.body,[0.070,0.075,0.30],[0,0,0]);
    cyl(g,p.steel,0.015,0.31,[0,0.025,-0.34]);
    cyl(g,p.dark,0.025,0.25,[0,0.025,-0.31]);
    for(let z=-0.41;z<=-0.23;z+=0.045) box(g,p.glow,[0.055,0.008,0.018],[0,0.054,z]);
    box(g,p.rubber,[0.062,0.050,0.12],[0,-0.005,-0.23]);
    for(const x of [-0.040,0.040]) {
      cyl(g,glass(0xff5522,0.48),0.017,0.18,[x,-0.040,-0.08]);
      cyl(g,p.glow,0.009,0.14,[x,-0.040,-0.08]);
    }
    box(g,p.wood,[0.055,0.060,0.18],[0,-0.010,0.24],[-0.12,0,0]);
    box(g,p.rubber,[0.034,0.085,0.045],[0,-0.075,0.10],[0.30,0,0]);
    cyl(g,p.accent,[0.026,0.018],0.055,[0,0.025,-0.475]);
  },0xff5522);

  // Coilgun: long twin rails crossed by individual copper acceleration coils,
  // capacitor block, scope, and bipod.
  defineGun('coilgun',[0x1d2c38,0x55cdea],[0,0.020,-0.70],0.012,(g,p)=>{
    box(g,p.body,[0.055,0.065,0.38],[0,0,0.02]);
    for(const x of [-0.030,0.030]) box(g,p.steel,[0.012,0.020,0.55],[x,0.020,-0.38]);
    for(let z=-0.60;z<=-0.19;z+=0.06) torus(g,p.copper,0.040,0.005,[0,0.020,z],[PI/2,0,0]);
    box(g,glass(0x55ddff,0.38),[0.050,0.070,0.17],[0,-0.030,-0.02]);
    for(let i=0;i<4;i++) box(g,p.glow,[0.008,0.052,0.020],[-0.027+i*0.018,-0.028,-0.07+i*0.04]);
    cyl(g,p.dark,0.020,0.18,[0,0.090,-0.05]);
    cyl(g,p.glow,0.016,0.006,[0,0.090,-0.145]);
    box(g,p.rubber,[0.032,0.085,0.045],[0,-0.075,0.10],[0.30,0,0]);
    box(g,p.body,[0.055,0.050,0.18],[0,-0.010,0.28],[-0.10,0,0]);
    for(const x of [-0.035,0.035]) box(g,p.steel,[0.008,0.11,0.008],[x,-0.065,-0.37],[0,0,x>0?-0.25:0.25]);
  },0x66ddff);

  // Smart SMG: angular shell, camera eye, side display, compact magazine, and
  // a folding brace.
  defineGun('smart_smg',[0x16382d,0x7ee68d],[0,0.014,-0.40],0.007,(g,p)=>{
    box(g,p.body,[0.060,0.072,0.22],[0,0,0]);
    box(g,p.body,[0.050,0.050,0.17],[0,0.028,-0.16],[0.12,0,0]);
    cyl(g,p.steel,0.008,0.22,[0,0.014,-0.30]);
    box(g,p.dark,[0.050,0.035,0.060],[0,0.065,-0.04]);
    sphere(g,glow(0x77ff88),0.010,[0,0.066,-0.074],[1.2,1.2,0.5]);
    box(g,p.glow,[0.006,0.050,0.085],[0.034,0.010,0.015]);
    box(g,p.accent,[0.030,0.11,0.040],[0,-0.083,0.015],[0.18,0,0]);
    box(g,p.rubber,[0.032,0.080,0.044],[0,-0.070,0.095],[0.30,0,0]);
    box(g,p.dark,[0.010,0.010,0.17],[0,0.010,0.20],[0.10,0,0]);
    box(g,p.rubber,[0.050,0.055,0.014],[0,0.000,0.29],[0.10,0,0]);
  },0x99ff99);

  // Anti-material rifle: oversized muzzle brake, long free-float barrel,
  // heavy receiver, box magazine, scope, and deployed bipod.
  defineGun('amr',[0x403a2b,0xb98b3e],[0,0.018,-0.88],0.032,(g,p)=>{
    box(g,p.body,[0.070,0.075,0.43],[0,0,0.02]);
    cyl(g,p.steel,0.012,0.54,[0,0.018,-0.50]);
    box(g,p.dark,[0.060,0.055,0.20],[0,0.018,-0.39]);
    box(g,p.steel,[0.070,0.060,0.10],[0,0.018,-0.80]);
    for(const x of [-0.036,0.036]) for(const y of [0.035,0.000]) box(g,p.black,[0.010,0.012,0.060],[x,y,-0.805]);
    box(g,p.accent,[0.040,0.12,0.055],[0,-0.095,-0.02],[0.10,0,0]);
    cyl(g,p.dark,0.025,0.22,[0,0.105,-0.04]);
    cyl(g,glow(0x88aaff),0.020,0.008,[0,0.105,-0.155]);
    box(g,p.rubber,[0.035,0.090,0.050],[0,-0.080,0.13],[0.28,0,0]);
    box(g,p.body,[0.065,0.060,0.23],[0,-0.005,0.33],[-0.10,0,0]);
    for(const x of [-0.050,0.050]) box(g,p.steel,[0.010,0.15,0.010],[x,-0.085,-0.48],[0,0,x>0?-0.32:0.32]);
  });

  // Compressed Air Rifle: wooden sporting stock, long blued barrel, large blue
  // air bottle, bolt lever, and fine target sights.
  defineGun('air_rifle',[0x724a27,0x6aa8cf],[0,0.020,-0.72],0.006,(g,p)=>{
    box(g,p.wood,[0.055,0.070,0.38],[0,-0.010,0.03]);
    box(g,p.wood,[0.070,0.080,0.22],[0,-0.020,0.31],[-0.12,0,0]);
    cyl(g,p.dark,0.007,0.52,[0,0.020,-0.47]);
    cyl(g,p.accent,0.025,0.32,[0,-0.020,-0.30]);
    cyl(g,p.steel,0.006,0.080,[0.040,0.030,-0.02],[0,0,PI/2]);
    sphere(g,p.rubber,0.012,[0.083,0.030,-0.02]);
    box(g,p.dark,[0.020,0.038,0.012],[0,0.060,-0.55]);
    torus(g,p.dark,0.018,0.004,[0,0.066,-0.565],[0,PI/2,0]);
    box(g,p.rubber,[0.032,0.080,0.045],[0,-0.077,0.11],[0.30,0,0]);
    box(g,p.rubber,[0.072,0.085,0.016],[0,-0.020,0.43],[-0.12,0,0]);
  });

  // Shockwave Launcher: dish-shaped emitter, concentric compression rings,
  // exposed bellows, and a rear pressure tank.
  defineGun('shockwave_launcher',[0x30325f,0xc9d2ff],[0,0.015,-0.47],0.036,(g,p)=>{
    box(g,p.body,[0.090,0.080,0.25],[0,0,0.03]);
    cyl(g,p.steel,[0.075,0.040],0.16,[0,0.015,-0.24]);
    torus(g,p.accent,0.078,0.010,[0,0.015,-0.33],[PI/2,0,0]);
    cyl(g,p.glow,[0.015,0.060],0.045,[0,0.015,-0.365]);
    for(let z=-0.20;z<=-0.10;z+=0.035) torus(g,p.dark,0.052,0.007,[0,0.015,z],[PI/2,0,0]);
    cyl(g,p.body,0.055,0.18,[0.060,-0.025,0.10],[0,0,PI/2]);
    box(g,p.rubber,[0.040,0.090,0.052],[0,-0.090,0.08],[0.24,0,0]);
    box(g,p.body,[0.085,0.060,0.15],[0,-0.010,0.22],[-0.15,0,0]);
    box(g,p.glow,[0.010,0.040,0.11],[-0.052,0.015,0.02]);
  },0xddddff);

  // Twin Barrel AR: two complete upper receivers joined by a central grip and
  // bridge, with paired magazines and synchronized muzzles.
  defineGun('twin_ar',[0x30261d,0xd6a448],[0,0.016,-0.52],0.021,(g,p)=>{
    for(const x of [-0.036,0.036]) {
      box(g,p.body,[0.052,0.060,0.30],[x,0,0]);
      cyl(g,p.steel,0.008,0.30,[x,0.016,-0.37]);
      box(g,p.accent,[0.026,0.115,0.042],[x,-0.085,0.01],[0.20,0,0]);
      box(g,p.dark,[0.018,0.012,0.20],[x,0.043,-0.03]);
    }
    box(g,p.accent,[0.10,0.020,0.12],[0,0.048,-0.04]);
    box(g,p.rubber,[0.038,0.090,0.052],[0,-0.090,0.11],[0.28,0,0]);
    box(g,p.wood,[0.085,0.055,0.19],[0,-0.010,0.25],[-0.10,0,0]);
    torus(g,p.dark,0.027,0.005,[0,0.075,-0.04],[PI/2,0,0]);
    sphere(g,glow(0xff3322),0.006,[0,0.075,-0.068]);
  },0xffcc66);

  // Machine Revolver: deep fluted cylinder, reinforced top strap, cooling
  // shroud, compensator, and a folding foregrip.
  defineGun('machine_revolver',[0x232426,0x9aa0a6],[0,0.018,-0.34],0.015,(g,p)=>{
    box(g,p.body,[0.050,0.070,0.17],[0,0,0.02]);
    cyl(g,p.accent,0.050,0.065,[0,0.012,-0.06],[0,0,PI/2],8);
    for(let i=0;i<8;i++) cyl(g,p.dark,0.006,0.070,[0.034*Math.cos(i*PI/4),0.012+0.034*Math.sin(i*PI/4),-0.06],[0,0,PI/2],6);
    box(g,p.steel,[0.060,0.020,0.22],[0,0.065,-0.075]);
    cyl(g,p.steel,0.012,0.18,[0,0.018,-0.25]);
    box(g,p.dark,[0.055,0.050,0.060],[0,0.018,-0.315]);
    for(const x of [-0.025,0.025]) box(g,p.black,[0.010,0.020,0.035],[x,0.018,-0.33]);
    box(g,p.wood,[0.045,0.105,0.050],[0,-0.080,0.09],[0.28,0,0]);
    box(g,p.rubber,[0.026,0.060,0.030],[0,-0.060,-0.12],[0.12,0,0]);
  });

  // EMP Pistol: no conventional barrel; twin prongs surround a pulsing
  // capacitor, with battery cells built into the grip.
  defineGun('emp_pistol',[0x17364d,0x58c6f2],[0,0.018,-0.30],0.005,(g,p)=>{
    box(g,p.body,[0.055,0.070,0.16],[0,0,0.03]);
    sphere(g,glass(0x66ccff,0.45),0.036,[0,0.020,-0.08],[1,1,1.35]);
    sphere(g,p.glow,0.015,[0,0.020,-0.08],[1,1,1.5]);
    for(const x of [-0.035,0.035]) {
      box(g,p.accent,[0.014,0.022,0.20],[x,0.020,-0.19],[0,x*2,0]);
      sphere(g,p.glow,0.011,[x,0.020,-0.29]);
    }
    box(g,p.rubber,[0.045,0.105,0.052],[0,-0.085,0.09],[0.32,0,0]);
    for(let i=0;i<3;i++) box(g,p.glow,[0.050,0.008,0.012],[0,-0.057-i*0.022,0.08+i*0.007],[0.32,0,0]);
    torus(g,p.copper,0.026,0.004,[0,0.055,0.035],[PI/2,0,0]);
  },0x66ccff);

  // Swarm Rifle: a ribbed insectoid shell wrapped around six launch cells and
  // a translucent hive magazine.
  defineGun('swarm_rifle',[0x3d173f,0xed37e8],[0,0.020,-0.49],0.011,(g,p)=>{
    sphere(g,p.body,0.075,[0,0.005,0.00],[0.72,0.70,2.1],12);
    for(let z=-0.22;z<=0.14;z+=0.06) torus(g,p.accent,0.053,0.006,[0,0.006,z],[PI/2,0,0]);
    const cells=[[-0.034,0.032],[0,0.048],[0.034,0.032],[-0.034,-0.015],[0,-0.030],[0.034,-0.015]];
    cells.forEach(([x,y])=>{
      cyl(g,p.dark,0.012,0.22,[x,y,-0.34]);
      sphere(g,p.glow,0.010,[x,y,-0.46]);
    });
    sphere(g,glass(0xff55ee,0.42),0.058,[0,-0.055,0.03],[0.55,1,0.95]);
    for(let i=0;i<7;i++) sphere(g,p.glow,0.007,[0.030*Math.cos(i*0.9),-0.055+0.030*Math.sin(i*0.9),0.03+i*0.002]);
    box(g,p.rubber,[0.034,0.085,0.046],[0,-0.087,0.13],[0.28,0,0]);
    box(g,p.body,[0.060,0.050,0.14],[0,-0.008,0.22],[-0.10,0,0]);
  },0xff44ff);

  // Lazy Laser: an intentionally oversized rectangular emitter with one huge
  // lens, exposed battery bricks, and a relaxed low-mounted grip.
  defineGun('lazy_laser',[0x48144d,0xf04cf2],[0,0.015,-0.45],0.006,(g,p)=>{
    box(g,p.body,[0.105,0.090,0.31],[0,0,0]);
    box(g,p.dark,[0.090,0.070,0.13],[0,0.010,-0.22]);
    cyl(g,glass(0xff66ff,0.65),0.050,0.025,[0,0.015,-0.295]);
    cyl(g,p.glow,0.032,0.010,[0,0.015,-0.314]);
    for(const y of [-0.040,0.040]) box(g,p.accent,[0.112,0.010,0.25],[0,y,-0.02]);
    for(let i=0;i<3;i++) box(g,p.dark,[0.025,0.070,0.11],[-0.035+i*0.035,-0.065,0.03]);
    box(g,p.rubber,[0.040,0.080,0.060],[0,-0.095,0.15],[0.18,0,0]);
    box(g,p.body,[0.090,0.060,0.14],[0,-0.010,0.22]);
    sphere(g,p.glow,0.010,[0.055,0.030,0.07]);
  },0xff44ff);

  // Storm Cannon: a turbine muzzle, lightning vanes, copper generator coils,
  // and twin charged canisters.
  defineGun('storm_cannon',[0x16364d,0x8eddf2],[0,0.018,-0.50],0.024,(g,p)=>{
    box(g,p.body,[0.095,0.090,0.30],[0,0,0.03]);
    cyl(g,p.dark,0.052,0.22,[0,0.018,-0.30]);
    torus(g,p.accent,0.065,0.010,[0,0.018,-0.425],[PI/2,0,0]);
    for(let i=0;i<8;i++) {
      const a=i*PI/4;
      box(g,p.glow,[0.008,0.040,0.12],[Math.cos(a)*0.034,0.018+Math.sin(a)*0.034,-0.36],[0,0,a]);
    }
    for(let z=-0.23;z<=-0.08;z+=0.04) torus(g,p.copper,0.050,0.006,[0,0.018,z],[PI/2,0,0]);
    for(const x of [-0.060,0.060]) cyl(g,glass(0x77ddff,0.44),0.025,0.20,[x,-0.035,0.06]);
    box(g,p.rubber,[0.042,0.095,0.055],[0,-0.098,0.11],[0.25,0,0]);
    box(g,p.body,[0.090,0.060,0.16],[0,-0.010,0.23]);
  },0xaaeeff);

  // Royal Minigun: six polished barrels in a spinning gold cage, crown-like
  // rear fins, and an ornate side ammunition drum.
  defineGun('royal_minigun',[0x4f4215,0xf0c83d],[0,0.018,-0.61],0.017,(g,p)=>{
    box(g,p.body,[0.105,0.105,0.28],[0,0,0.05]);
    const cluster=new THREE.Group(); g.add(cluster);
    for(let i=0;i<6;i++) {
      const a=i*PI/3;
      cyl(cluster,p.brightSteel,0.008,0.44,[Math.cos(a)*0.035,0.018+Math.sin(a)*0.035,-0.40]);
      cyl(cluster,p.accent,0.014,0.035,[Math.cos(a)*0.035,0.018+Math.sin(a)*0.035,-0.61]);
    }
    torus(cluster,p.brass,0.057,0.008,[0,0.018,-0.24],[PI/2,0,0]);
    torus(cluster,p.brass,0.057,0.008,[0,0.018,-0.55],[PI/2,0,0]);
    g._barrelCluster=cluster; g._spinRate=12;
    cyl(g,p.accent,0.075,0.065,[0.075,-0.060,0.03],[0,0,PI/2],20);
    for(let i=0;i<5;i++) triangle(g,p.accent,0.025,0.08,[-0.06+i*0.03,0.092,0.12],[-PI,0,0]);
    box(g,p.rubber,[0.045,0.10,0.060],[0,-0.105,0.14],[0.20,0,0]);
    box(g,p.brass,[0.16,0.022,0.08],[0,0.075,0.03]);
  },0xffd700);

  // Pocket Rocket: a palm-sized launcher wrapped around a visible miniature
  // rocket, with folding fins and a thumb safety.
  defineGun('pocket_rocket',[0x32150d,0xf07b23],[0,0.018,-0.34],0.026,(g,p)=>{
    cyl(g,p.body,0.032,0.22,[0,0.018,-0.13]);
    cone(g,p.accent,0.030,0.10,[0,0.018,-0.30]);
    cyl(g,p.steel,0.013,0.15,[0,0.018,-0.21]);
    for(let i=0;i<4;i++) {
      const a=i*PI/2;
      triangle(g,p.accent,0.020,0.060,[Math.cos(a)*0.018,0.018+Math.sin(a)*0.018,-0.235],[-PI/2,0,a]);
    }
    box(g,p.body,[0.050,0.060,0.10],[0,-0.015,0.045]);
    box(g,p.rubber,[0.042,0.095,0.050],[0,-0.085,0.095],[0.30,0,0]);
    box(g,p.red,[0.018,0.010,0.035],[0.030,0.035,0.04]);
    torus(g,p.dark,0.022,0.004,[0,-0.035,0.02],[0,PI/2,0],PI*1.2);
  },0xff8800);

  // Auto Revolver: bottom-fed ammunition strip, shrouded cylinder, top optic,
  // and a compact counterweight under the muzzle.
  defineGun('auto_revolver',[0x23221d,0xd1ad77],[0,0.018,-0.38],0.012,(g,p)=>{
    box(g,p.body,[0.055,0.075,0.18],[0,0,0.02]);
    cyl(g,p.accent,0.047,0.062,[0,0.012,-0.05],[0,0,PI/2],10);
    torus(g,p.dark,0.049,0.006,[0,0.012,-0.05],[0,PI/2,0]);
    cyl(g,p.steel,0.010,0.22,[0,0.018,-0.27]);
    box(g,p.body,[0.060,0.040,0.13],[0,-0.015,-0.22]);
    box(g,p.brass,[0.024,0.11,0.038],[0,-0.088,-0.005]);
    for(let i=0;i<5;i++) sphere(g,p.brass,0.006,[0.013,-0.050-i*0.018,-0.005]);
    box(g,p.rubber,[0.045,0.11,0.052],[0,-0.085,0.10],[0.28,0,0]);
    box(g,p.dark,[0.038,0.030,0.050],[0,0.075,-0.02]);
    sphere(g,glow(0xff3322),0.005,[0,0.076,-0.048]);
  },0xffcc88);

  // Frost Blaster: broad cryogenic nozzle, crystalline fins, coolant capsule,
  // and insulated white grip.
  defineGun('frost_blaster',[0x193746,0x92e5f2],[0,0.018,-0.40],0.008,(g,p)=>{
    box(g,p.body,[0.075,0.080,0.22],[0,0,0.02]);
    cyl(g,p.steel,[0.050,0.025],0.18,[0,0.018,-0.23]);
    torus(g,p.glow,0.052,0.008,[0,0.018,-0.33],[PI/2,0,0]);
    for(let i=0;i<6;i++) {
      const a=i*PI/3;
      triangle(g,glass(0xb8f4ff,0.72),0.030,0.12,[Math.cos(a)*0.045,0.018+Math.sin(a)*0.045,-0.27],[-PI/2,0,a]);
    }
    cyl(g,glass(0x88ddff,0.45),0.032,0.18,[0.050,-0.025,0.04],[0,0,PI/2]);
    cyl(g,p.glow,0.014,0.14,[0.050,-0.025,0.04],[0,0,PI/2]);
    box(g,p.white,[0.038,0.090,0.050],[0,-0.090,0.11],[0.28,0,0]);
    box(g,p.body,[0.070,0.050,0.13],[0,0.000,0.20]);
  },0x99eeff);

  // Snubnose: compact rounded frame, six-chamber cylinder, two-inch barrel,
  // exposed hammer, and bulbous wood grip.
  defineGun('snub_revolver',[0x323438,0x858b91],[0,0.017,-0.22],0.016,(g,p)=>{
    box(g,p.body,[0.045,0.065,0.115],[0,0,0.02]);
    cyl(g,p.accent,0.038,0.050,[0,0.010,-0.04],[0,0,PI/2],6);
    for(let i=0;i<6;i++) sphere(g,p.dark,0.005,[0.027*Math.cos(i*PI/3),0.010+0.027*Math.sin(i*PI/3),-0.067]);
    cyl(g,p.steel,0.011,0.090,[0,0.017,-0.155]);
    box(g,p.body,[0.050,0.025,0.085],[0,0.050,-0.08]);
    box(g,p.wood,[0.048,0.10,0.052],[0,-0.080,0.08],[0.34,0,0]);
    triangle(g,p.dark,0.016,0.040,[0,0.045,0.085],[0,0,0]);
  });

  // Duelist: ornate single-shot target pistol with long octagonal barrel,
  // brass guard, swept walnut grip, and engraved side plates.
  defineGun('duelist_pistol',[0x3b1816,0xd0b68b],[0,0.020,-0.43],0.018,(g,p)=>{
    box(g,p.body,[0.050,0.060,0.15],[0,0,0.03]);
    cyl(g,p.brightSteel,0.011,0.34,[0,0.020,-0.27],undefined,8);
    box(g,p.accent,[0.055,0.030,0.30],[0,0.050,-0.20]);
    for(let z=-0.30;z<=-0.08;z+=0.055) box(g,p.brass,[0.058,0.006,0.018],[0,0.066,z]);
    box(g,p.wood,[0.052,0.12,0.060],[0,-0.090,0.09],[0.42,0,0]);
    torus(g,p.brass,0.027,0.005,[0,-0.035,0.005],[0,PI/2,0],PI*1.25);
    sphere(g,p.brass,0.009,[0.026,0.012,0.045]);
    triangle(g,p.steel,0.018,0.055,[0,0.052,0.10],[0,0,0]);
  },0xffddaa);

  // Mauser C96: box magazine ahead of the trigger, broomhandle grip, slab
  // receiver, tangent sight, and narrow barrel jacket.
  defineGun('mauser',[0x39302a,0x9a754a],[0,0.019,-0.39],0.012,(g,p)=>{
    box(g,p.body,[0.050,0.070,0.22],[0,0,-0.02]);
    box(g,p.dark,[0.055,0.045,0.18],[0,0.045,-0.05]);
    cyl(g,p.steel,0.009,0.25,[0,0.019,-0.29]);
    cyl(g,p.body,0.016,0.18,[0,0.019,-0.255]);
    box(g,p.body,[0.040,0.095,0.060],[0,-0.073,-0.075]);
    box(g,p.wood,[0.048,0.13,0.055],[0,-0.095,0.10],[0.36,0,0]);
    for(let i=0;i<5;i++) box(g,p.dark,[0.052,0.005,0.009],[0,-0.060-i*0.017,0.075+i*0.006],[0.36,0,0]);
    box(g,p.accent,[0.018,0.020,0.14],[0,0.082,0.00],[0.08,0,0]);
    triangle(g,p.dark,0.012,0.035,[0,0.087,-0.09],[0,0,0]);
  });

  // Mini Uzi: pressed-steel box receiver, magazine through the grip, folding
  // wire stock, side charging knob, and short protected barrel.
  defineGun('mini_uzi',[0x202225,0x555b60],[0,0.016,-0.33],0.008,(g,p)=>{
    box(g,p.body,[0.065,0.085,0.23],[0,0,0.00]);
    box(g,p.dark,[0.055,0.025,0.19],[0,0.055,0.00]);
    cyl(g,p.steel,0.009,0.13,[0,0.016,-0.27]);
    cyl(g,p.dark,0.016,0.080,[0,0.016,-0.315]);
    box(g,p.rubber,[0.045,0.13,0.055],[0,-0.10,0.07],[0.18,0,0]);
    box(g,p.accent,[0.025,0.18,0.038],[0,-0.145,0.045],[0.18,0,0]);
    cyl(g,p.steel,0.010,0.045,[0.045,0.045,0.03],[0,0,PI/2]);
    box(g,p.steel,[0.009,0.009,0.20],[-0.030,-0.020,0.18],[0.15,0,0]);
    box(g,p.steel,[0.009,0.009,0.20],[0.030,0.010,0.18],[-0.10,0,0]);
    box(g,p.rubber,[0.060,0.060,0.014],[0,-0.005,0.285]);
  });

  // Nail Gun: orange power-tool housing, top nail rail with visible fasteners,
  // battery shoe, depth guide, and square contact nose.
  defineGun('nail_gun',[0xb65d1e,0xd7d1b0],[0,0.005,-0.34],0.010,(g,p)=>{
    box(g,p.body,[0.080,0.10,0.21],[0,0,0.00],[0.08,0,0]);
    box(g,p.dark,[0.055,0.050,0.23],[0,0.055,-0.08]);
    box(g,p.accent,[0.035,0.025,0.28],[0,0.090,-0.11]);
    for(let z=-0.22;z<=0.00;z+=0.032) cyl(g,p.steel,0.004,0.040,[0,0.095,z],[0,0,PI/2]);
    box(g,p.steel,[0.035,0.040,0.11],[0,0.005,-0.265]);
    box(g,p.dark,[0.055,0.045,0.030],[0,0.005,-0.335]);
    box(g,p.rubber,[0.045,0.12,0.060],[0,-0.110,0.08],[0.25,0,0]);
    box(g,p.dark,[0.075,0.045,0.090],[0,-0.18,0.12]);
    box(g,p.red,[0.020,0.020,0.030],[0.043,0.025,0.05]);
  },0xffcc99);

  // Boomstick: twin chopped barrels, exposed break hinge, broad wooden pistol
  // grip, and shell extractors at the breech.
  defineGun('boomstick',[0x4a2b18,0x82603e],[0,0.022,-0.34],0.036,(g,p)=>{
    box(g,p.steel,[0.080,0.070,0.13],[0,0,0.02]);
    for(const x of [-0.020,0.020]) {
      cyl(g,p.dark,0.017,0.25,[x,0.022,-0.22]);
      torus(g,p.brightSteel,0.018,0.004,[x,0.022,-0.345],[PI/2,0,0]);
      cyl(g,p.brass,0.013,0.009,[x,0.022,-0.075]);
    }
    cyl(g,p.brass,0.016,0.090,[0,-0.010,-0.045],[0,0,PI/2]);
    box(g,p.wood,[0.065,0.065,0.13],[0,-0.015,0.12],[-0.14,0,0]);
    box(g,p.wood,[0.052,0.13,0.060],[0,-0.105,0.15],[0.40,0,0]);
    box(g,p.dark,[0.055,0.014,0.050],[0,0.060,0.02]);
  },0xffbb66);

  // Signal Pistol: chunky break-action frame, flared orange barrel, external
  // hammer, and lanyard ring.
  defineGun('signal_pistol',[0xdd7627,0xffcb54],[0,0.020,-0.30],0.024,(g,p)=>{
    box(g,p.body,[0.060,0.075,0.15],[0,0,0.03]);
    cyl(g,p.steel,0.021,0.16,[0,0.020,-0.20]);
    cyl(g,p.accent,[0.032,0.022],0.060,[0,0.020,-0.29]);
    cyl(g,p.brass,0.024,0.010,[0,0.020,-0.10]);
    cyl(g,p.steel,0.015,0.070,[0,-0.020,-0.055],[0,0,PI/2]);
    box(g,p.rubber,[0.048,0.12,0.055],[0,-0.095,0.10],[0.34,0,0]);
    triangle(g,p.dark,0.018,0.050,[0,0.052,0.10],[0,0,0]);
    torus(g,p.brass,0.016,0.004,[0,-0.155,0.135],[0,PI/2,0]);
  },0xff8800);

  // Event Horizon Rifle: a black singularity suspended in an accretion cage,
  // with split rails and no ordinary magazine.
  defineGun('event_horizon',[0x160c20,0x7045e8],[0,0.015,-0.55],0.025,(g,p)=>{
    box(g,p.body,[0.070,0.075,0.23],[0,-0.005,0.08]);
    sphere(g,glow(0x030006),0.065,[0,0.015,-0.13]);
    torus(g,glow(0x7c4dff),0.090,0.008,[0,0.015,-0.13],[0.35,0.20,0.20]);
    torus(g,glow(0xff55cc),0.075,0.004,[0,0.015,-0.13],[-0.40,0.15,-0.25]);
    for(const x of [-0.050,0.050]) box(g,p.accent,[0.014,0.024,0.36],[x,0.015,-0.33],[0,x*2.0,0]);
    torus(g,p.accent,0.060,0.009,[0,0.015,-0.48],[PI/2,0,0]);
    box(g,p.rubber,[0.036,0.090,0.050],[0,-0.090,0.11],[0.28,0,0]);
    box(g,p.body,[0.070,0.050,0.16],[0,-0.010,0.23],[-0.10,0,0]);
    box(g,p.glow,[0.008,0.050,0.13],[-0.043,-0.005,0.07]);
  },0x9966ff);

  // Storm Core: a levitating blue generator orb, four stabilizer arms, and a
  // turbine cannon fed by lightning rods.
  defineGun('storm_core',[0x133348,0x7ed8ef],[0,0.018,-0.52],0.023,(g,p)=>{
    box(g,p.body,[0.095,0.085,0.24],[0,-0.005,0.08]);
    sphere(g,glass(0x55cfff,0.38),0.072,[0,0.020,-0.09]);
    sphere(g,p.glow,0.030,[0,0.020,-0.09]);
    for(let i=0;i<4;i++) {
      const a=i*PI/2;
      box(g,p.accent,[0.025,0.022,0.24],[Math.cos(a)*0.052,0.020+Math.sin(a)*0.052,-0.12],[0,0,a]);
      sphere(g,p.glow,0.012,[Math.cos(a)*0.070,0.020+Math.sin(a)*0.070,-0.20]);
    }
    cyl(g,p.dark,0.044,0.22,[0,0.018,-0.38]);
    for(let z=-0.46;z<=-0.30;z+=0.05) torus(g,p.glow,0.046,0.005,[0,0.018,z],[PI/2,0,0]);
    box(g,p.rubber,[0.042,0.095,0.055],[0,-0.098,0.14],[0.24,0,0]);
  },0xaaeeff);

  // Absolute Zero Projector: frost chamber, triple coolant bottles, ice-tooth
  // nozzle, and a broad thermal shield.
  defineGun('abs_zero',[0x14323e,0x91e6ef],[0,0.018,-0.48],0.015,(g,p)=>{
    box(g,p.body,[0.090,0.080,0.27],[0,0,0.03]);
    cyl(g,glass(0xb8f7ff,0.42),0.045,0.24,[0,0.018,-0.25]);
    sphere(g,p.glow,0.030,[0,0.018,-0.25],[1,1,2.8]);
    torus(g,p.accent,0.055,0.009,[0,0.018,-0.385],[PI/2,0,0]);
    for(let i=0;i<8;i++) {
      const a=i*PI/4;
      triangle(g,glass(0xd8fbff,0.72),0.018,0.10,[Math.cos(a)*0.045,0.018+Math.sin(a)*0.045,-0.43],[-PI/2,0,a]);
    }
    for(const x of [-0.055,0,0.055]) cyl(g,glass(0x77ddee,0.46),0.018,0.17,[x,-0.045,0.08]);
    box(g,p.white,[0.040,0.095,0.055],[0,-0.098,0.15],[0.22,0,0]);
    box(g,p.body,[0.095,0.055,0.12],[0,0.060,0.06]);
  },0xaaffff);

  // Solar Lance: long golden emitter spine, mirrored collector petals, bright
  // sun core, and a narrow marksman stock.
  defineGun('solar_lance',[0x865015,0xffdf4b],[0,0.020,-0.76],0.014,(g,p)=>{
    box(g,p.body,[0.050,0.060,0.40],[0,0,0.02]);
    cyl(g,p.brass,0.007,0.52,[0,0.020,-0.50]);
    sphere(g,p.glow,0.050,[0,0.020,-0.26]);
    for(let i=0;i<6;i++) {
      const a=i*PI/3;
      triangle(g,p.accent,0.035,0.18,[Math.cos(a)*0.060,0.020+Math.sin(a)*0.060,-0.26],[-PI/2,0,a]);
    }
    for(const z of [-0.38,-0.50,-0.62]) torus(g,p.glow,0.025,0.004,[0,0.020,z],[PI/2,0,0]);
    cyl(g,p.dark,0.018,0.19,[0,0.090,-0.02]);
    cyl(g,glow(0xffee88),0.014,0.006,[0,0.090,-0.12]);
    box(g,p.rubber,[0.032,0.085,0.045],[0,-0.078,0.10],[0.30,0,0]);
    box(g,p.body,[0.050,0.045,0.19],[0,-0.010,0.31],[-0.08,0,0]);
  },0xffee88);

  // Phase Driver: layered violet plates sliding over a central phase rail, with
  // a stepped magazine and floating sight frame.
  defineGun('phase_driver',[0x2d173e,0xa563ed],[0,0.017,-0.50],0.013,(g,p)=>{
    box(g,p.body,[0.060,0.065,0.31],[0,0,0]);
    for(let i=0;i<5;i++) {
      box(g,i%2?p.accent:p.body,[0.078-i*0.006,0.018,0.16],[0,0.045-i*0.018,-0.16+i*0.06],[i*0.05,0,0]);
    }
    box(g,p.glow,[0.010,0.010,0.46],[0,0.017,-0.28]);
    torus(g,p.glow,0.035,0.005,[0,0.017,-0.43],[PI/2,0,0]);
    box(g,p.accent,[0.036,0.14,0.045],[0,-0.10,0.01],[0.18,0,0]);
    for(let i=0;i<4;i++) box(g,p.glow,[0.040,0.006,0.010],[0,-0.055-i*0.025,0.00+i*0.008],[0.18,0,0]);
    box(g,p.rubber,[0.034,0.085,0.046],[0,-0.078,0.11],[0.30,0,0]);
    torus(g,p.accent,0.040,0.006,[0,0.085,-0.02],[PI/2,0,0],PI);
  },0xcc99ff);

  // Quantum Repeater: nested gyroscope rings, two alternating emitter rails,
  // and a transparent probability chamber.
  defineGun('quantum_repeater',[0x203f4a,0x55e7be],[0,0.017,-0.53],0.010,(g,p)=>{
    box(g,p.body,[0.070,0.070,0.25],[0,0,0.06]);
    sphere(g,glass(0x66ffcc,0.42),0.060,[0,0.017,-0.12]);
    for(const rot of [[0,0,0],[PI/2,0,0],[0,PI/2,0]]) torus(g,p.glow,0.065,0.005,[0,0.017,-0.12],rot);
    for(const x of [-0.035,0.035]) box(g,p.accent,[0.014,0.020,0.32],[x,0.017,-0.34],[0,x*1.7,0]);
    for(const z of [-0.28,-0.38,-0.47]) torus(g,p.glow,0.040,0.004,[0,0.017,z],[PI/2,0,0]);
    box(g,glass(0x66ffcc,0.35),[0.050,0.12,0.055],[0,-0.09,0.03]);
    box(g,p.rubber,[0.036,0.090,0.050],[0,-0.088,0.13],[0.28,0,0]);
    box(g,p.body,[0.070,0.050,0.15],[0,-0.005,0.23]);
  },0x88ffdd);

  // Magnetar Cannon: opposed horseshoe magnets squeeze a glowing projectile
  // lane, backed by a huge side capacitor drum.
  defineGun('magnetar',[0x3d1730,0xee6bbd],[0,0.018,-0.54],0.033,(g,p)=>{
    box(g,p.body,[0.100,0.090,0.30],[0,0,0.04]);
    for(const x of [-0.060,0.060]) {
      torus(g,p.accent,0.060,0.014,[x,0.018,-0.28],[0,PI/2,0],PI);
      box(g,p.brightSteel,[0.025,0.035,0.16],[x,0.018,-0.40]);
    }
    box(g,p.glow,[0.012,0.012,0.42],[0,0.018,-0.34]);
    for(const z of [-0.22,-0.34,-0.46]) torus(g,p.glow,0.050,0.005,[0,0.018,z],[PI/2,0,0]);
    cyl(g,p.accent,0.080,0.070,[0.075,-0.055,0.04],[0,0,PI/2],20);
    box(g,p.rubber,[0.044,0.10,0.060],[0,-0.105,0.13],[0.23,0,0]);
    box(g,p.body,[0.095,0.060,0.16],[0,-0.005,0.25]);
  },0xff99dd);

  // Nebula Mortar: a bulbous star-cloud chamber feeds a trumpet muzzle, while
  // orbiting rings and a saddle grip keep it visually unlike the other heavies.
  defineGun('nebula_mortar',[0x2a173d,0x8d65df],[0,0.020,-0.54],0.041,(g,p)=>{
    sphere(g,p.body,0.095,[0,0.010,-0.02],[1.0,0.82,1.25],14);
    sphere(g,glass(0xaa77ff,0.38),0.060,[0,0.010,-0.08],[1,1,1.3]);
    for(let i=0;i<10;i++) sphere(g,glow(i%2?0x9966ff:0xff88dd),0.007,[0.045*Math.cos(i*0.63),0.010+0.040*Math.sin(i*0.63),-0.08+(i%3)*0.02]);
    cyl(g,p.body,[0.090,0.045],0.24,[0,0.020,-0.34]);
    torus(g,p.accent,0.092,0.012,[0,0.020,-0.475],[PI/2,0,0]);
    torus(g,p.glow,0.115,0.006,[0,0.010,-0.04],[0.30,0.10,0.20]);
    box(g,p.rubber,[0.045,0.11,0.060],[0,-0.11,0.12],[0.20,0,0]);
    box(g,p.body,[0.11,0.060,0.15],[0,-0.010,0.22]);
  },0xaa88ff);

  // Prism Engine: a real central crystal splits into three color-coded emitter
  // branches, with a faceted energy reservoir beneath.
  defineGun('prism_engine',[0x3a2056,0xef9eea],[0,0.020,-0.52],0.017,(g,p)=>{
    box(g,p.body,[0.075,0.070,0.24],[0,0,0.06]);
    triangle(g,glass(0xffffff,0.68),0.065,0.22,[0,0.020,-0.11],[0,0,PI/2]);
    const rays=[[0xff5577,-0.045],[0x66ddff,0],[0xffdd55,0.045]];
    rays.forEach(([c,x],i)=>{
      box(g,glow(c),[0.012,0.012,0.34],[x,0.020,-0.34],[0,x*1.8,0]);
      torus(g,glow(c),0.025,0.004,[x,0.020,-0.49],[PI/2,0,0]);
    });
    triangle(g,glass(0xffaaff,0.45),0.065,0.13,[0,-0.065,0.02],[0,0,PI]);
    box(g,p.rubber,[0.036,0.090,0.050],[0,-0.090,0.13],[0.28,0,0]);
    torus(g,p.accent,0.042,0.006,[0,0.085,0.02],[PI/2,0,0],PI);
  },0xffccff);

  // Void Harvester: four claw arms close around a dark core and taper into a
  // broad extractor throat, backed by a ribbed containment pack.
  defineGun('void_harvester',[0x100b13,0x45225f],[0,0.018,-0.53],0.038,(g,p)=>{
    box(g,p.body,[0.105,0.090,0.29],[0,0,0.06]);
    sphere(g,glow(0x050006),0.065,[0,0.018,-0.18]);
    for(let i=0;i<4;i++) {
      const a=i*PI/2;
      box(g,p.accent,[0.026,0.022,0.28],[Math.cos(a)*0.060,0.018+Math.sin(a)*0.060,-0.30],[0,0,a]);
      triangle(g,p.accent,0.030,0.13,[Math.cos(a)*0.035,0.018+Math.sin(a)*0.035,-0.49],[-PI/2,0,a]);
    }
    torus(g,glow(0x6633aa),0.083,0.006,[0,0.018,-0.18],[0.20,0.25,0]);
    for(let z=0.02;z<=0.23;z+=0.045) box(g,p.dark,[0.11,0.012,0.025],[0,0.04,z]);
    box(g,p.rubber,[0.045,0.105,0.060],[0,-0.105,0.12],[0.22,0,0]);
  },0x6633aa);

  // Pulse Needle: a slim sidearm whose ammunition is a visible rack of energy
  // needles, with a single focusing spine instead of a barrel.
  defineGun('pulse_needle',[0x321a31,0xef72bd],[0,0.020,-0.33],0.004,(g,p)=>{
    box(g,p.body,[0.045,0.060,0.17],[0,0,0.04]);
    box(g,p.glow,[0.007,0.007,0.31],[0,0.020,-0.20]);
    for(let i=0;i<7;i++) {
      const x=-0.027+(i%2)*0.054;
      const z=0.02-Math.floor(i/2)*0.035;
      cyl(g,p.brightSteel,0.003,0.12,[x,0.040,z]);
      sphere(g,p.glow,0.006,[x,0.040,z-0.065]);
    }
    triangle(g,p.accent,0.020,0.09,[0,0.020,-0.31]);
    box(g,p.rubber,[0.040,0.105,0.048],[0,-0.085,0.10],[0.32,0,0]);
    box(g,p.glow,[0.045,0.008,0.055],[0,-0.060,0.08],[0.32,0,0]);
  },0xff99dd);

  // Phase Pistol: offset emitter, floating upper slide, purple phase window,
  // and asymmetric side stabilizer.
  defineGun('phase_pistol',[0x20203c,0x9a62e2],[0.018,0.020,-0.31],0.006,(g,p)=>{
    box(g,p.body,[0.055,0.065,0.16],[0,0,0.04]);
    box(g,p.accent,[0.045,0.025,0.22],[0.012,0.065,-0.07],[0.06,0,0]);
    cyl(g,p.glow,0.010,0.20,[0.018,0.020,-0.21]);
    box(g,glass(0xaa66ff,0.42),[0.010,0.050,0.13],[-0.033,0.015,-0.02]);
    torus(g,p.glow,0.027,0.004,[0.018,0.020,-0.29],[PI/2,0,0]);
    box(g,p.rubber,[0.043,0.11,0.052],[0,-0.088,0.10],[0.34,0,0]);
    sphere(g,p.glow,0.008,[-0.033,0.050,0.03]);
    box(g,p.dark,[0.018,0.020,0.07],[0,0.090,0.00]);
  },0xcc99ff);

  // Ion Revolver: six glowing ion chambers orbit the barrel axis inside an
  // open-frame revolver and feed a forked emitter.
  defineGun('ion_revolver',[0x154052,0x59bfe8],[0,0.018,-0.34],0.009,(g,p)=>{
    box(g,p.body,[0.050,0.065,0.15],[0,0,0.04]);
    torus(g,p.accent,0.050,0.008,[0,0.018,-0.06],[0,PI/2,0]);
    for(let i=0;i<6;i++) {
      const a=i*PI/3;
      cyl(g,glass(0x66ccff,0.45),0.009,0.060,[0.034*Math.cos(a),0.018+0.034*Math.sin(a),-0.06],[0,0,PI/2]);
      sphere(g,p.glow,0.006,[0.034*Math.cos(a),0.018+0.034*Math.sin(a),-0.095]);
    }
    for(const x of [-0.024,0.024]) box(g,p.accent,[0.012,0.020,0.22],[x,0.018,-0.23],[0,x*1.4,0]);
    sphere(g,p.glow,0.012,[0,0.018,-0.34]);
    box(g,p.rubber,[0.045,0.11,0.052],[0,-0.085,0.10],[0.32,0,0]);
    box(g,p.dark,[0.045,0.020,0.12],[0,0.070,-0.03]);
  },0x99ddff);

  // Prism Launcher: a triangular crystal cylinder rotates between three
  // color-coded launch rails and a faceted muzzle cage.
  defineGun('prism_launcher',[0x3b1745,0xe991e8],[0,0.020,-0.51],0.019,(g,p)=>{
    box(g,p.body,[0.085,0.075,0.27],[0,0,0.05]);
    const prism=triangle(g,glass(0xffffff,0.66),0.070,0.22,[0,0.020,-0.12],[0,0,PI/2]);
    prism.rotation.z=PI/6;
    const colors=[0xff5577,0x55ddff,0xffdd44];
    colors.forEach((c,i)=>{
      const a=-PI/2+i*2*PI/3;
      box(g,glow(c),[0.012,0.018,0.32],[Math.cos(a)*0.045,0.020+Math.sin(a)*0.045,-0.34],[0,0,a]);
      triangle(g,glow(c),0.018,0.08,[Math.cos(a)*0.045,0.020+Math.sin(a)*0.045,-0.50],[-PI/2,0,a]);
    });
    torus(g,p.accent,0.070,0.008,[0,0.020,-0.43],[PI/2,0,0]);
    box(g,p.rubber,[0.040,0.095,0.055],[0,-0.098,0.13],[0.24,0,0]);
    box(g,p.body,[0.080,0.050,0.15],[0,-0.005,0.23]);
  },0xffaaff);

  // Foam Cannon: paired pressure tanks, braided hose, mixing chamber, and a
  // broad nozzle with a mound of foam at its lip.
  defineGun('foam_cannon',[0x40505e,0xd9e0e8],[0,0.018,-0.48],0.029,(g,p)=>{
    box(g,p.body,[0.095,0.085,0.25],[0,0,0.05]);
    for(const x of [-0.055,0.055]) {
      cyl(g,p.accent,0.038,0.24,[x,-0.030,0.03]);
      sphere(g,white,0.030,[x,-0.030,-0.095]);
    }
    torus(g,p.dark,0.070,0.007,[0,-0.015,-0.03],[0,PI/2,0],PI*1.4);
    sphere(g,p.body,0.060,[0,0.018,-0.16],[1,0.8,1.15]);
    cyl(g,p.steel,[0.050,0.028],0.19,[0,0.018,-0.34]);
    for(let i=0;i<7;i++) sphere(g,white,0.018,[0.030*Math.cos(i*0.9),0.018+0.025*Math.sin(i*0.9),-0.45+(i%2)*0.008]);
    box(g,p.rubber,[0.043,0.10,0.058],[0,-0.105,0.14],[0.22,0,0]);
    box(g,p.body,[0.09,0.055,0.14],[0,-0.005,0.22]);
  },0xeeeeff);

  // Airburst Projector: concentric radar dishes, range antenna, and a short
  // pressure chamber make it read as a projector rather than a rifle.
  defineGun('airburst_projector',[0x1f4251,0x92eef1],[0,0.020,-0.48],0.022,(g,p)=>{
    box(g,p.body,[0.080,0.080,0.24],[0,0,0.07]);
    cyl(g,p.steel,[0.075,0.030],0.13,[0,0.020,-0.22]);
    cyl(g,p.accent,[0.095,0.018],0.060,[0,0.020,-0.325]);
    cyl(g,p.glow,[0.060,0.008],0.028,[0,0.020,-0.375]);
    sphere(g,p.glow,0.012,[0,0.020,-0.398]);
    for(let i=0;i<4;i++) torus(g,p.accent,0.035+i*0.010,0.003,[0,0.020,-0.39-i*0.012],[PI/2,0,0]);
    cyl(g,p.steel,0.004,0.16,[0.052,0.095,0.04],[0.10,0,0]);
    sphere(g,p.glow,0.008,[0.052,0.175,0.03]);
    cyl(g,p.body,0.050,0.17,[0.055,-0.030,0.08],[0,0,PI/2]);
    box(g,p.rubber,[0.038,0.095,0.055],[0,-0.095,0.13],[0.25,0,0]);
  },0xaaffff);

  // Glassmaker: transparent furnace chamber, molten core, glass rod magazine,
  // and a diamond-shaped scoring muzzle.
  defineGun('glassmaker',[0x286247,0xbaf5dd],[0,0.018,-0.51],0.014,(g,p)=>{
    box(g,p.body,[0.070,0.070,0.24],[0,0,0.08]);
    cyl(g,glass(0xcffff0,0.30),0.050,0.28,[0,0.018,-0.22]);
    cyl(g,glow(0xffb94c),0.022,0.24,[0,0.018,-0.22]);
    for(let z=-0.34;z<=-0.10;z+=0.055) torus(g,p.brightSteel,0.052,0.005,[0,0.018,z],[PI/2,0,0]);
    for(const x of [-0.035,-0.012,0.012,0.035]) cyl(g,glass(0xdffff8,0.58),0.006,0.18,[x,-0.055,0.045]);
    triangle(g,p.brightSteel,0.058,0.055,[0,0.018,-0.405],[-PI/2,0,PI/4]);
    torus(g,p.glow,0.036,0.004,[0,0.018,-0.46],[PI/2,0,0]);
    box(g,p.rubber,[0.036,0.090,0.050],[0,-0.09,0.14],[0.28,0,0]);
    box(g,p.body,[0.070,0.045,0.15],[0,-0.005,0.24]);
  },0xccffee);

  // Magnet Rifle: opposed red and blue horseshoes flank a polished projectile
  // rail, with a bar-magnet magazine below.
  defineGun('magnet_rifle',[0x3b1932,0xeb69bd],[0,0.018,-0.53],0.012,(g,p)=>{
    box(g,p.body,[0.070,0.070,0.29],[0,0,0.03]);
    box(g,p.brightSteel,[0.010,0.010,0.48],[0,0.018,-0.30]);
    const poleMats=[lambert(0xd94343),lambert(0x3f68d7)];
    [-1,1].forEach((side,idx)=>{
      torus(g,poleMats[idx],0.055,0.012,[side*0.050,0.018,-0.25],[0,PI/2,0],PI);
      box(g,p.brightSteel,[0.025,0.030,0.18],[side*0.050,0.018,-0.38]);
    });
    for(const z of [-0.21,-0.34,-0.47]) torus(g,p.glow,0.035,0.004,[0,0.018,z],[PI/2,0,0]);
    box(g,lambert(0xd94343),[0.032,0.12,0.045],[0,-0.09,0.01],[0.18,0,0]);
    box(g,lambert(0x3f68d7),[0.032,0.12,0.045],[0,-0.09,0.055],[0.18,0,0]);
    box(g,p.rubber,[0.036,0.090,0.050],[0,-0.085,0.13],[0.28,0,0]);
  },0xff77cc);

  // Seismic Hammer: a reciprocating piston and stacked impact plates turn the
  // heavy weapon into a shoulder-fired jackhammer.
  defineGun('seismic_hammer',[0x3c2619,0x8e5c32],[0,0.012,-0.48],0.040,(g,p)=>{
    box(g,p.body,[0.105,0.095,0.28],[0,0,0.06]);
    cyl(g,p.steel,0.026,0.34,[0,0.012,-0.31]);
    for(let z=-0.43;z<=-0.23;z+=0.05) box(g,p.accent,[0.10,0.065,0.025],[0,0.012,z],[0,0,(z+0.43)*2]);
    box(g,p.brightSteel,[0.13,0.085,0.050],[0,0.012,-0.475]);
    for(const x of [-0.055,0.055]) sphere(g,p.brass,0.012,[x,0.012,-0.50]);
    cyl(g,p.copper,0.050,0.18,[0.060,-0.025,0.08],[0,0,PI/2]);
    box(g,p.rubber,[0.045,0.105,0.060],[0,-0.105,0.14],[0.22,0,0]);
    box(g,p.body,[0.105,0.060,0.15],[0,-0.005,0.24]);
    for(let i=0;i<4;i++) box(g,p.dark,[0.11,0.008,0.018],[0,0.055,0.01+i*0.045]);
  },0xaa5522);

  // Painter Beam: paint can reservoir, clear color hose, spray-gun body, and a
  // six-color nozzle wheel.
  defineGun('painter_beam',[0x4a561e,0xe6df42],[0,0.018,-0.43],0.007,(g,p)=>{
    box(g,p.body,[0.075,0.070,0.22],[0,0,0.06]);
    cyl(g,lambert(0xe8e8e8),0.060,0.18,[0.060,-0.025,0.06],[0,0,PI/2],16);
    for(let i=0;i<6;i++) {
      const a=i*PI/3;
      box(g,glow([0xff3344,0xffaa22,0xffee33,0x55dd66,0x44aaff,0xcc55ff][i]),[0.010,0.060,0.035],[0.062,-0.025+Math.sin(a)*0.035,0.06+Math.cos(a)*0.035],[0,0,a]);
    }
    torus(g,glow(0x55ccff),0.075,0.006,[0.025,-0.010,-0.04],[0,PI/2,0],PI*1.5);
    cyl(g,p.steel,[0.030,0.012],0.25,[0,0.018,-0.30]);
    torus(g,p.accent,0.040,0.008,[0,0.018,-0.425],[PI/2,0,0]);
    box(g,p.rubber,[0.036,0.095,0.052],[0,-0.095,0.13],[0.27,0,0]);
    box(g,p.glow,[0.008,0.050,0.11],[-0.043,0.010,0.05]);
  },0xffff44);

  // Portal Launcher: two white structural prongs hold separate blue and orange
  // cores around an open oval muzzle.
  defineGun('portal_launcher',[0xe1e5e7,0x4ab9ef],[0,0.018,-0.50],0.012,(g,p)=>{
    box(g,p.body,[0.070,0.075,0.25],[0,0,0.08]);
    sphere(g,glass(0xbdeeff,0.34),0.050,[0,0.018,-0.10],[1,0.8,1.35]);
    sphere(g,glow(0x44aaff),0.018,[-0.022,0.018,-0.10]);
    sphere(g,glow(0xff8a33),0.018,[0.022,0.018,-0.10]);
    for(const x of [-0.055,0.055]) {
      box(g,p.body,[0.025,0.035,0.36],[x,0.018,-0.30],[0,x*2.0,0]);
      sphere(g,x<0?glow(0x44aaff):glow(0xff8a33),0.014,[x,0.018,-0.47]);
    }
    torus(g,glass(0xffffff,0.7),0.075,0.010,[0,0.018,-0.45],[PI/2,0,0]);
    box(g,p.rubber,[0.038,0.095,0.052],[0,-0.095,0.14],[0.26,0,0]);
    box(g,p.dark,[0.055,0.045,0.15],[0,-0.005,0.24]);
  },0x66ccff);

  // Pulse Disc Launcher: an exposed vertical stack of discs feeds a flat pair
  // of launch rails with a spinning capture ring.
  defineGun('pulse_disc',[0x12263e,0x40c9e5],[0,0.018,-0.48],0.010,(g,p)=>{
    box(g,p.body,[0.070,0.065,0.25],[0,0,0.06]);
    for(let i=0;i<6;i++) {
      cyl(g,i%2?p.accent:p.dark,0.048,0.010,[0,-0.050-i*0.014,0.04],[0,0,PI/2],18);
      torus(g,p.glow,0.038,0.003,[0.006,-0.050-i*0.014,0.04],[0,PI/2,0]);
    }
    for(const x of [-0.038,0.038]) box(g,p.accent,[0.014,0.018,0.34],[x,0.018,-0.31]);
    torus(g,p.glow,0.065,0.007,[0,0.018,-0.43],[PI/2,0,0]);
    box(g,p.rubber,[0.036,0.090,0.050],[0,-0.09,0.14],[0.28,0,0]);
    box(g,p.body,[0.070,0.045,0.14],[0,-0.005,0.23]);
  },0x44ddff);

  // Gravity Paint: a spherical paint reservoir floats in a gyroscope and feeds
  // a brush-shaped anti-gravity nozzle.
  defineGun('gravity_paint',[0x2d183d,0x9d4be1],[0,0.018,-0.46],0.013,(g,p)=>{
    box(g,p.body,[0.075,0.070,0.20],[0,0,0.10]);
    sphere(g,glass(0xbc77ff,0.42),0.070,[0,0.018,-0.08]);
    sphere(g,p.glow,0.028,[0,0.018,-0.08]);
    for(const rot of [[0,0,0],[PI/2,0,0],[0,PI/2,0]]) torus(g,p.accent,0.075,0.006,[0,0.018,-0.08],rot);
    cyl(g,p.dark,0.025,0.18,[0,0.018,-0.28]);
    box(g,p.accent,[0.11,0.020,0.085],[0,0.018,-0.40]);
    for(let x=-0.045;x<=0.045;x+=0.018) box(g,p.glow,[0.010,0.045,0.065],[x,0.018,-0.45],[0,0,x*3]);
    box(g,p.rubber,[0.038,0.095,0.052],[0,-0.095,0.14],[0.26,0,0]);
  },0xaa44ff);

  // Traffic Controller: a portable traffic-light stack drives a striped signal
  // barrel and cone-shaped muzzle.
  defineGun('traffic_controller',[0x342a1c,0xe84a24],[0,0.018,-0.41],0.009,(g,p)=>{
    box(g,p.body,[0.075,0.11,0.20],[0,0,0.05]);
    [0xe53935,0xf4c430,0x35b85a].forEach((c,i)=>{
      sphere(g,glow(c),0.020,[0,0.040-i*0.040,-0.055],[1,1,0.45]);
      box(g,p.dark,[0.055,0.032,0.035],[0,0.040-i*0.040,-0.035]);
    });
    cyl(g,p.steel,0.018,0.21,[0,0.018,-0.29]);
    for(let z=-0.36;z<=-0.22;z+=0.04) torus(g,z%0.08?p.white:p.red,0.025,0.006,[0,0.018,z],[PI/2,0,0]);
    cone(g,p.orange,0.050,0.09,[0,0.018,-0.415]);
    box(g,p.rubber,[0.040,0.095,0.055],[0,-0.105,0.13],[0.28,0,0]);
    cyl(g,p.accent,0.014,0.060,[0.052,0.025,0.05],[0,0,PI/2]);
  },0xffaa00);

  // Pinball Launcher: chrome balls roll through a clear hopper into a spring
  // plunger and flared arcade-cannon muzzle.
  defineGun('pinball_launcher',[0x4b1b1c,0xe49b3f],[0,0.018,-0.50],0.034,(g,p)=>{
    box(g,p.body,[0.105,0.090,0.28],[0,0,0.06]);
    box(g,glass(0xffffff,0.30),[0.10,0.075,0.19],[0,0.075,0.02]);
    const balls=[[-0.030,0.075,-0.02],[0.030,0.075,-0.02],[0,0.075,0.035],[-0.028,0.075,0.078],[0.030,0.075,0.078]];
    balls.forEach(pos=>sphere(g,p.brightSteel,0.024,pos));
    cyl(g,p.steel,0.032,0.26,[0,0.018,-0.34]);
    cyl(g,p.accent,[0.060,0.032],0.065,[0,0.018,-0.485]);
    for(let z=-0.20;z<=-0.06;z+=0.028) torus(g,p.copper,0.040,0.004,[0,0.018,z],[PI/2,0,0]);
    box(g,p.brightSteel,[0.015,0.015,0.24],[0,-0.060,0.13]);
    sphere(g,p.accent,0.028,[0,-0.060,0.27]);
    box(g,p.rubber,[0.045,0.105,0.060],[0,-0.11,0.12],[0.22,0,0]);
  },0xffaa44);

  // GAU-19 Heavy: three large barrels, triangular support cage, ammunition box,
  // and prominent top carry handles.
  defineGun('gau19',[0x2f392b,0x686e67],[0,0.018,-0.70],0.022,(g,p)=>{
    box(g,p.body,[0.12,0.11,0.33],[0,0,0.08]);
    const cluster=new THREE.Group(); g.add(cluster);
    [[0,0.055],[-0.045,-0.020],[0.045,-0.020]].forEach(([x,y])=>{
      cyl(cluster,p.steel,0.013,0.52,[x,0.018+y,-0.47]);
      cyl(cluster,p.dark,0.020,0.060,[x,0.018+y,-0.70]);
    });
    triangle(cluster,p.accent,0.085,0.040,[0,0.018,-0.24],[0,0,PI/2]);
    triangle(cluster,p.accent,0.085,0.040,[0,0.018,-0.58],[0,0,PI/2]);
    g._barrelCluster=cluster; g._spinRate=9;
    box(g,p.dark,[0.105,0.13,0.18],[0.11,-0.055,0.06]);
    for(let i=0;i<5;i++) box(g,p.brass,[0.012,0.028,0.020],[0.055+i*0.025,0.010,0.00+i*0.008]);
    box(g,p.dark,[0.035,0.022,0.24],[0,0.10,0.05]);
    for(const z of [-0.02,0.12]) box(g,p.dark,[0.025,0.10,0.025],[0,0.13,z]);
    box(g,p.rubber,[0.050,0.11,0.065],[0,-0.12,0.18],[0.18,0,0]);
  });

  // MK-44 Bushmaster: one huge autocannon barrel, rectangular recoil cradle,
  // linked shell belt, armored sight, and rear shoulder yoke.
  defineGun('mk44',[0x3b3b2b,0x6d6b39],[0,0.020,-0.82],0.039,(g,p)=>{
    box(g,p.body,[0.13,0.12,0.42],[0,0,0.06]);
    cyl(g,p.steel,0.020,0.61,[0,0.020,-0.58]);
    cyl(g,p.dark,0.038,0.34,[0,0.020,-0.46]);
    for(let z=-0.58;z<=-0.34;z+=0.055) torus(g,p.accent,0.040,0.005,[0,0.020,z],[PI/2,0,0]);
    box(g,p.steel,[0.10,0.085,0.11],[0,0.020,-0.77]);
    for(const x of [-0.038,0.038]) box(g,p.black,[0.012,0.030,0.070],[x,0.020,-0.805]);
    box(g,p.dark,[0.12,0.15,0.18],[0.13,-0.040,0.02]);
    for(let i=0;i<6;i++) cyl(g,p.brass,0.010,0.055,[0.055+i*0.025,0.025,0.00+i*0.006],[0,0,PI/2]);
    box(g,p.dark,[0.060,0.055,0.080],[0,0.11,-0.02]);
    sphere(g,glow(0x77aa44),0.012,[0,0.115,-0.065],[1,1,0.5]);
    box(g,p.rubber,[0.14,0.070,0.17],[0,-0.020,0.32],[-0.12,0,0]);
  });

  // XM7: tan two-part receiver, full-length handguard, suppressor, curved
  // magazine, low-power optic, and adjustable skeleton stock.
  defineGun('xm7',[0x393631,0x9a8463],[0,0.018,-0.61],0.015,(g,p)=>{
    box(g,p.body,[0.060,0.065,0.30],[0,0,0.04]);
    box(g,p.accent,[0.065,0.055,0.24],[0,0.010,-0.23]);
    for(let z=-0.32;z<=-0.14;z+=0.045) box(g,p.dark,[0.070,0.008,0.020],[0,0.042,z]);
    cyl(g,p.steel,0.009,0.26,[0,0.018,-0.45]);
    cyl(g,p.dark,0.016,0.18,[0,0.018,-0.57]);
    box(g,p.dark,[0.032,0.13,0.045],[0,-0.095,0.01],[0.20,0,0]);
    box(g,p.rubber,[0.034,0.088,0.047],[0,-0.078,0.12],[0.30,0,0]);
    cyl(g,p.dark,0.020,0.16,[0,0.090,-0.02]);
    cyl(g,glow(0x66aa55),0.016,0.006,[0,0.090,-0.105]);
    for(const x of [-0.020,0.020]) box(g,p.dark,[0.008,0.010,0.20],[x,0.005,0.27],[-0.08,0,0]);
    box(g,p.rubber,[0.060,0.070,0.018],[0,-0.002,0.38],[-0.08,0,0]);
  });

  // Barrett M82: long rectangular receiver, fluted barrel, massive two-port
  // brake, detachable magazine, carry handle, scope, and bipod.
  defineGun('barrett',[0x38372d,0xac8c46],[0,0.020,-0.94],0.037,(g,p)=>{
    box(g,p.body,[0.085,0.085,0.48],[0,0,0.04]);
    box(g,p.dark,[0.075,0.045,0.34],[0,0.050,-0.18]);
    cyl(g,p.steel,0.013,0.55,[0,0.020,-0.64]);
    for(let z=-0.75;z<=-0.43;z+=0.06) torus(g,p.dark,0.017,0.003,[0,0.020,z],[PI/2,0,0]);
    box(g,p.steel,[0.11,0.075,0.12],[0,0.020,-0.88]);
    for(const x of [-0.047,0.047]) for(const y of [-0.020,0.030]) box(g,p.black,[0.015,0.018,0.075],[x,y,-0.90]);
    box(g,p.accent,[0.050,0.14,0.065],[0,-0.105,-0.02],[0.08,0,0]);
    cyl(g,p.dark,0.026,0.24,[0,0.115,-0.03]);
    cyl(g,glow(0x667799),0.021,0.008,[0,0.115,-0.155]);
    torus(g,p.dark,0.055,0.008,[0,0.115,0.13],[0,PI/2,0],PI);
    for(const x of [-0.055,0.055]) box(g,p.steel,[0.010,0.16,0.010],[x,-0.09,-0.50],[0,0,x>0?-0.30:0.30]);
    box(g,p.rubber,[0.085,0.075,0.20],[0,-0.010,0.38],[-0.10,0,0]);
  });

  // M134 Minigun: six barrels, two support rings, electric motor, top spade
  // grips, and flexible ammunition feed chute.
  defineGun('m134',[0x303236,0x202225],[0,0.018,-0.69],0.019,(g,p)=>{
    box(g,p.body,[0.13,0.12,0.30],[0,0,0.09]);
    const cluster=new THREE.Group(); g.add(cluster);
    for(let i=0;i<6;i++) {
      const a=i*PI/3;
      cyl(cluster,p.steel,0.009,0.50,[Math.cos(a)*0.037,0.018+Math.sin(a)*0.037,-0.45]);
    }
    for(const z of [-0.24,-0.58]) torus(cluster,p.dark,0.060,0.010,[0,0.018,z],[PI/2,0,0]);
    g._barrelCluster=cluster; g._spinRate=14;
    cyl(g,p.dark,0.070,0.22,[0.070,-0.035,0.08],[0,0,PI/2],18);
    cyl(g,p.copper,0.050,0.17,[-0.060,-0.025,0.08],[0,0,PI/2],16);
    for(let i=0;i<6;i++) box(g,p.brass,[0.014,0.024,0.020],[0.090+i*0.020,0.010,0.00+i*0.010]);
    box(g,p.dark,[0.14,0.020,0.12],[0,0.105,0.08]);
    for(const x of [-0.045,0.045]) box(g,p.rubber,[0.030,0.10,0.045],[x,0.145,0.11],[0.10,0,0]);
  });

  // HK MP7 Operator: compact PDW shell, vertical foregrip, translucent slim
  // magazine, suppressor, flip sights, and telescoping stock rails.
  defineGun('hkmp7',[0x1b1d20,0x555b61],[0,0.016,-0.48],0.006,(g,p)=>{
    box(g,p.body,[0.060,0.075,0.25],[0,0,0.02]);
    box(g,p.dark,[0.052,0.030,0.22],[0,0.050,-0.01]);
    cyl(g,p.steel,0.007,0.22,[0,0.016,-0.31]);
    cyl(g,p.dark,0.014,0.18,[0,0.016,-0.43]);
    box(g,p.accent,[0.026,0.14,0.038],[0,-0.10,0.045],[0.08,0,0]);
    box(g,p.rubber,[0.035,0.095,0.045],[0,-0.087,0.12],[0.25,0,0]);
    box(g,p.rubber,[0.028,0.080,0.035],[0,-0.075,-0.14]);
    for(const x of [-0.024,0.024]) box(g,p.steel,[0.007,0.008,0.20],[x,0.000,0.25]);
    box(g,p.rubber,[0.060,0.065,0.014],[0,0.000,0.36]);
    box(g,p.dark,[0.040,0.035,0.050],[0,0.078,-0.035]);
    sphere(g,glow(0xff3322),0.005,[0,0.080,-0.062]);
  });

  // FN P90 Special: rounded bullpup body, horizontal translucent magazine,
  // thumb-hole grip, elevated optic bridge, and short integrated muzzle.
  defineGun('p90_spec',[0x1a1c1e,0x43484d],[0,0.015,-0.43],0.005,(g,p)=>{
    sphere(g,p.body,0.095,[0,-0.005,0.02],[0.62,0.75,2.05],14);
    box(g,glass(0x667788,0.48),[0.050,0.028,0.32],[0,0.070,0.04]);
    for(let z=-0.09;z<=0.14;z+=0.035) cyl(g,p.brass,0.006,0.040,[0,0.070,z],[0,0,PI/2]);
    torus(g,p.dark,0.055,0.012,[0,-0.055,0.055],[0,PI/2,0],PI*1.55);
    box(g,p.rubber,[0.035,0.085,0.045],[0,-0.080,-0.08],[0.18,0,0]);
    cyl(g,p.steel,0.008,0.19,[0,0.015,-0.33]);
    cyl(g,p.dark,0.016,0.080,[0,0.015,-0.425]);
    box(g,p.dark,[0.028,0.015,0.25],[0,0.092,0.00]);
    torus(g,p.dark,0.032,0.006,[0,0.11,-0.025],[PI/2,0,0],PI);
    sphere(g,glow(0xff3322),0.005,[0,0.110,-0.055]);
  });

  // Desert Eagle: oversized faceted slide, ribbed barrel, polygonal trigger
  // guard, heavy grip panels, and pronounced rear hammer.
  defineGun('desert_eagle',[0x9c812f,0xe0c15c],[0,0.020,-0.37],0.024,(g,p)=>{
    box(g,p.body,[0.062,0.070,0.23],[0,0.035,-0.04]);
    box(g,p.accent,[0.055,0.035,0.19],[0,0.078,-0.04]);
    cyl(g,p.dark,0.012,0.18,[0,0.020,-0.27]);
    for(let z=-0.28;z<=-0.16;z+=0.035) torus(g,p.brass,0.015,0.003,[0,0.020,z],[PI/2,0,0]);
    box(g,p.body,[0.055,0.065,0.12],[0,-0.010,0.06]);
    box(g,p.rubber,[0.052,0.13,0.060],[0,-0.105,0.11],[0.35,0,0]);
    for(let i=0;i<5;i++) box(g,p.body,[0.056,0.006,0.012],[0,-0.062-i*0.020,0.085+i*0.007],[0.35,0,0]);
    torus(g,p.dark,0.030,0.005,[0,-0.025,-0.015],[0,PI/2,0],PI*1.2);
    triangle(g,p.dark,0.018,0.045,[0,0.072,0.095],[0,0,0]);
  });

  // M1911 Match: slim steel slide, separate frame, wood grip scales, external
  // hammer, beavertail, and match sights.
  defineGun('m1911',[0x25272a,0x8c9297],[0,0.018,-0.30],0.012,(g,p)=>{
    box(g,p.accent,[0.050,0.045,0.22],[0,0.050,-0.035]);
    box(g,p.body,[0.052,0.060,0.16],[0,0.005,0.02]);
    cyl(g,p.dark,0.008,0.19,[0,0.018,-0.20]);
    box(g,p.wood,[0.050,0.12,0.055],[0,-0.09,0.095],[0.30,0,0]);
    for(const x of [-0.027,0.027]) box(g,p.brass,[0.004,0.075,0.042],[x,-0.09,0.095],[0.30,0,0]);
    torus(g,p.dark,0.026,0.004,[0,-0.025,-0.01],[0,PI/2,0],PI*1.2);
    triangle(g,p.dark,0.017,0.045,[0,0.064,0.09],[0,0,0]);
    box(g,p.dark,[0.030,0.018,0.012],[0,0.080,0.05]);
    box(g,p.dark,[0.012,0.020,0.010],[0,0.080,-0.13]);
  });

  // Walther PPK: short rounded slide, compact curved grip, tiny fixed sights,
  // magazine heel catch, and narrow suppressor.
  defineGun('ppk',[0x1b1d20,0x4e5358],[0,0.017,-0.38],0.007,(g,p)=>{
    box(g,p.accent,[0.045,0.040,0.17],[0,0.045,-0.01]);
    box(g,p.body,[0.046,0.055,0.13],[0,0.000,0.04]);
    cyl(g,p.steel,0.007,0.14,[0,0.017,-0.17]);
    cyl(g,p.dark,0.013,0.19,[0,0.017,-0.32]);
    box(g,p.rubber,[0.044,0.11,0.052],[0,-0.085,0.09],[0.38,0,0]);
    for(let i=0;i<4;i++) box(g,p.body,[0.048,0.005,0.010],[0,-0.055-i*0.021,0.07+i*0.008],[0.38,0,0]);
    torus(g,p.dark,0.022,0.004,[0,-0.022,0.00],[0,PI/2,0],PI*1.2);
    box(g,p.dark,[0.012,0.013,0.008],[0,0.070,-0.06]);
    box(g,p.steel,[0.045,0.010,0.014],[0,-0.145,0.13],[0.38,0,0]);
  });

  // Glock-18 Auto: squared polymer frame, long extended magazine, ported slide,
  // selector lever, and muzzle compensator.
  defineGun('glock18',[0x202225,0x5a6065],[0,0.018,-0.34],0.009,(g,p)=>{
    box(g,p.accent,[0.052,0.045,0.20],[0,0.050,-0.025]);
    box(g,p.body,[0.055,0.060,0.15],[0,0.005,0.03]);
    for(let z=-0.05;z<=0.055;z+=0.028) box(g,p.dark,[0.057,0.015,0.010],[0,0.060,z]);
    cyl(g,p.dark,0.008,0.19,[0,0.018,-0.20]);
    box(g,p.dark,[0.060,0.055,0.055],[0,0.018,-0.31]);
    for(const x of [-0.023,0.023]) box(g,p.black,[0.010,0.020,0.032],[x,0.018,-0.335]);
    box(g,p.rubber,[0.047,0.12,0.055],[0,-0.09,0.09],[0.30,0,0]);
    box(g,p.accent,[0.025,0.19,0.038],[0,-0.18,0.09],[0.30,0,0]);
    box(g,p.red,[0.018,0.010,0.025],[0.032,0.025,0.045]);
    torus(g,p.dark,0.026,0.004,[0,-0.025,-0.005],[0,PI/2,0],PI*1.2);
  });

  // Five-seveN: angular polymer shell, tapered slide, high-capacity grip,
  // under-barrel rail, and raised reflex optic.
  defineGun('five_seven',[0x303338,0xc4ced8],[0,0.018,-0.33],0.008,(g,p)=>{
    box(g,p.body,[0.056,0.060,0.18],[0,0.005,0.03]);
    box(g,p.accent,[0.050,0.040,0.22],[0,0.055,-0.035],[0.04,0,0]);
    triangle(g,p.accent,0.035,0.10,[0,0.055,-0.19],[-PI/2,0,PI/4]);
    cyl(g,p.dark,0.007,0.18,[0,0.018,-0.20]);
    box(g,p.rubber,[0.048,0.13,0.058],[0,-0.10,0.10],[0.32,0,0]);
    for(let i=0;i<5;i++) box(g,p.body,[0.052,0.005,0.011],[0,-0.065-i*0.021,0.076+i*0.007],[0.32,0,0]);
    box(g,p.dark,[0.030,0.012,0.12],[0,-0.030,-0.06]);
    box(g,p.dark,[0.042,0.030,0.045],[0,0.095,-0.025]);
    sphere(g,glow(0xff3322),0.005,[0,0.097,-0.052]);
    torus(g,p.dark,0.026,0.004,[0,-0.025,-0.005],[0,PI/2,0],PI*1.2);
  });

  // M4A1: split upper/lower receiver, quad rail with vent slots, front sight
  // tower, curved STANAG magazine, red dot, and six-position stock.
  defineGun('m4a1',[0x292b2e,0x4e5358],[0,0.018,-0.57],0.013,(g,p)=>{
    box(g,p.body,[0.055,0.060,0.29],[0,0,0.04]);
    box(g,p.accent,[0.060,0.052,0.24],[0,0.008,-0.22]);
    for(let z=-0.31;z<=-0.13;z+=0.038) box(g,p.dark,[0.065,0.008,0.018],[0,0.038,z]);
    cyl(g,p.steel,0.008,0.26,[0,0.018,-0.43]);
    box(g,p.dark,[0.030,0.060,0.018],[0,0.045,-0.38]);
    torus(g,p.dark,0.018,0.004,[0,0.070,-0.39],[0,PI/2,0],PI);
    box(g,p.accent,[0.030,0.13,0.045],[0,-0.095,0.00],[0.22,0,0]);
    box(g,p.rubber,[0.034,0.088,0.047],[0,-0.078,0.12],[0.30,0,0]);
    box(g,p.dark,[0.036,0.032,0.050],[0,0.075,-0.03]);
    sphere(g,glow(0xff3322),0.005,[0,0.077,-0.058]);
    for(const x of [-0.020,0.020]) box(g,p.dark,[0.008,0.010,0.20],[x,0.00,0.28],[-0.08,0,0]);
    box(g,p.rubber,[0.066,0.075,0.020],[0,-0.005,0.39],[-0.08,0,0]);
  });

  // Lancer: full walnut stock, long blued barrel, leaf sights, steel nose cap,
  // fixed spear bayonet, and leather sling points.
  defineGun('lancer',[0x60401f,0x8e6b3f],[0,0.018,-0.82],0.021,(g,p)=>{
    box(g,p.wood,[0.055,0.070,0.50],[0,-0.010,-0.02]);
    box(g,p.wood,[0.070,0.080,0.23],[0,-0.020,0.35],[-0.12,0,0]);
    box(g,p.steel,[0.055,0.038,0.18],[0,0.045,0.02]);
    cyl(g,p.dark,0.008,0.52,[0,0.018,-0.53]);
    box(g,p.wood,[0.050,0.045,0.25],[0,0.020,-0.30]);
    box(g,p.dark,[0.018,0.035,0.012],[0,0.065,-0.34]);
    box(g,p.dark,[0.018,0.025,0.012],[0,0.060,-0.55]);
    cyl(g,p.steel,0.015,0.035,[0,0.005,-0.68]);
    triangle(g,p.brightSteel,0.025,0.28,[0,-0.005,-0.79]);
    box(g,p.brass,[0.040,0.012,0.030],[0,-0.005,-0.66]);
    torus(g,p.dark,0.020,0.004,[0,-0.055,0.18],[0,PI/2,0]);
    torus(g,p.dark,0.020,0.004,[0,-0.045,-0.28],[0,PI/2,0]);
    box(g,p.rubber,[0.072,0.085,0.016],[0,-0.020,0.47],[-0.12,0,0]);
  });

  // Crowbar: red forged shaft, flattened pry foot, hooked claw, and scuffed
  // steel edges at both working ends.
  defineMelee('crowbar', g => {
    const paint=lambert(0xa62f2b);
    cyl(g,paint,0.014,0.48,[0,0,-0.13]);
    torus(g,paint,0.060,0.014,[0,0,-0.39],[0,PI/2,0],PI*0.72);
    box(g,brightSteel,[0.045,0.020,0.085],[-0.035,0,-0.435],[0,-0.32,0]);
    box(g,paint,[0.060,0.018,0.12],[0,0,0.13],[0,0.28,0]);
    box(g,brightSteel,[0.075,0.020,0.035],[0.032,0,0.18],[0,0.35,0]);
    for(let z=-0.24;z<=0.03;z+=0.045) torus(g,lambert(0x70201d),0.016,0.003,[0,0,z],[PI/2,0,0]);
  });

  // Fire Axe: lacquered wood haft, red pick head, broad polished blade, collar,
  // and rubberized lower grip.
  defineMelee('fire_axe', g => {
    cyl(g,paleWood,[0.016,0.022],0.52,[0,0,-0.10]);
    cyl(g,rubber,0.025,0.17,[0,0,0.08]);
    box(g,red,[0.15,0.075,0.045],[0,0.035,-0.37]);
    triangle(g,brightSteel,0.080,0.14,[-0.105,0.035,-0.37],[0,0,PI/2]);
    triangle(g,steel,0.045,0.12,[0.105,0.035,-0.37],[0,0,-PI/2]);
    cyl(g,dark,0.026,0.070,[0,0,-0.37]);
    box(g,yellow,[0.035,0.012,0.080],[0,-0.020,-0.12]);
  });

  // Nunchucks: two ribbed hardwood batons joined by a visible articulated
  // chain, with metal end caps instead of one generic shaft.
  defineMelee('nunchucks', g => {
    const handleMat=lambert(0x292326);
    for(const x of [-0.055,0.055]) {
      cyl(g,handleMat,[0.020,0.016],0.23,[x,0,-0.02],[PI/2,0,x>0?0.16:-0.16]);
      for(let z=-0.10;z<=0.06;z+=0.035) torus(g,lambert(0x8b6a26),0.021,0.003,[x,0,z],[PI/2,0,0]);
      cyl(g,brass,0.021,0.018,[x,0,-0.145]);
    }
    const links=[[-0.050,-0.15],[-0.030,-0.17],[0,-0.18],[0.030,-0.17],[0.050,-0.15]];
    links.forEach(([x,z],i)=>torus(g,steel,0.013,0.003,[x,0,z],[i%2?0:PI/2,PI/2,0]));
  });

  // Combat Axe: skeletonized tactical haft, hooked beard, rear spike, wrapped
  // grip, and three cutout holes in the head.
  defineMelee('combat_axe', g => {
    cyl(g,dark,[0.014,0.020],0.45,[0,0,-0.08]);
    cyl(g,rubber,0.025,0.18,[0,0,0.07]);
    for(let z=-0.01;z<=0.13;z+=0.035) torus(g,lambert(0x41464b),0.027,0.003,[0,0,z],[PI/2,0,0]);
    box(g,steel,[0.15,0.090,0.030],[-0.015,0.025,-0.35]);
    triangle(g,brightSteel,0.085,0.16,[-0.11,0.020,-0.35],[0,0,PI/2]);
    triangle(g,steel,0.045,0.13,[0.11,0.040,-0.35],[0,0,-PI/2]);
    for(const x of [-0.045,0,0.045]) cyl(g,dark,0.012,0.035,[x,0.030,-0.35],[0,0,PI/2]);
    box(g,orange,[0.020,0.016,0.060],[0,-0.020,-0.12]);
  });

  // Karambit: finger ring, curved talon blade, textured compact handle, guard,
  // and sharpened inner edge.
  defineMelee('karambit', g => {
    const grip=lambert(0x17191b);
    box(g,grip,[0.045,0.045,0.17],[0,0,0.04],[0,0.15,0]);
    for(let z=-0.02;z<=0.10;z+=0.03) box(g,lambert(0x34383c),[0.050,0.010,0.012],[0,0,z],[0,0.15,0]);
    torus(g,steel,0.037,0.009,[0,0,0.15],[PI/2,0,0]);
    torus(g,steel,0.10,0.018,[-0.035,0,-0.13],[0,PI/2,0],PI*0.68);
    torus(g,brightSteel,0.078,0.006,[-0.040,0,-0.15],[0,PI/2,0],PI*0.62);
    triangle(g,brightSteel,0.030,0.10,[-0.10,0,-0.22],[-PI/2,0,-0.65]);
    box(g,steel,[0.075,0.018,0.025],[0,0,-0.055]);
  });

  // Trench Bayonet: grooved wood scales, steel pommel and crossguard, long
  // fuller blade, needle point, and rifle mounting ring.
  defineMelee('bayonet', g => {
    box(g,wood,[0.050,0.045,0.18],[0,0,0.09]);
    for(let z=0.02;z<=0.15;z+=0.033) box(g,dark,[0.054,0.008,0.012],[0,0,z]);
    box(g,steel,[0.12,0.020,0.030],[0,0,-0.025]);
    torus(g,steel,0.028,0.006,[0.050,0,-0.025],[PI/2,0,0]);
    box(g,brightSteel,[0.050,0.018,0.42],[0,0,-0.245]);
    box(g,steel,[0.010,0.022,0.34],[0.018,0,-0.23]);
    triangle(g,brightSteel,0.035,0.13,[0,0,-0.52]);
    box(g,steel,[0.058,0.055,0.030],[0,0,0.19]);
  });

  // Tactical Tomahawk: one-piece dark skeleton frame, flared chopping edge,
  // rear breaching spike, finger choil, and paracord wrap.
  defineMelee('tomahawk', g => {
    cyl(g,lambert(0x303438),[0.013,0.022],0.42,[0,0,-0.06]);
    for(let z=-0.02;z<=0.14;z+=0.025) torus(g,lambert(0x596047),0.024,0.004,[0,0,z],[PI/2,0,0]);
    box(g,steel,[0.14,0.080,0.035],[-0.015,0.025,-0.33]);
    triangle(g,brightSteel,0.080,0.15,[-0.105,0.020,-0.33],[0,0,PI/2]);
    triangle(g,steel,0.042,0.16,[0.11,0.035,-0.33],[0,0,-PI/2]);
    cyl(g,dark,0.017,0.045,[0,0,-0.33]);
    torus(g,dark,0.025,0.007,[0,0,0.17],[PI/2,0,0]);
  });

  // OTs-04 Bayonet: compact black combat handle, clipped spear blade, sawback,
  // finger guard, and blue-black retention ring.
  defineMelee('ots04', g => {
    box(g,lambert(0x202334),[0.052,0.050,0.19],[0,0,0.08]);
    for(let z=0.00;z<=0.14;z+=0.03) box(g,rubber,[0.056,0.010,0.014],[0,0,z]);
    box(g,steel,[0.10,0.022,0.030],[0,0,-0.035]);
    box(g,brightSteel,[0.052,0.015,0.29],[0,0,-0.19]);
    triangle(g,brightSteel,0.038,0.12,[0,0,-0.39]);
    for(let z=-0.29;z<=-0.10;z+=0.032) triangle(g,steel,0.012,0.035,[0.030,0,z],[0,0,-PI/2]);
    torus(g,lambert(0x272b46),0.030,0.007,[0.046,0,-0.035],[PI/2,0,0]);
    box(g,steel,[0.060,0.050,0.025],[0,0,0.195]);
  });

  // Brass Knuckles: four separate finger rings, palm bar, finger bridge, and a
  // wrapped inner grip.
  defineMelee('brass_knuckles', g => {
    for(let i=0;i<4;i++) {
      const x=-0.060+i*0.040;
      torus(g,brass,0.022,0.008,[x,0,-0.08],[PI/2,0,0]);
      sphere(g,brightSteel,0.006,[x,0.020,-0.102]);
    }
    box(g,brass,[0.17,0.022,0.030],[0,0,-0.045]);
    box(g,brass,[0.13,0.035,0.035],[0,0,0.045],[0.15,0,0]);
    cyl(g,rubber,0.018,0.13,[0,-0.015,0.045],[0,0,PI/2]);
    for(const x of [-0.080,0.080]) box(g,brass,[0.018,0.028,0.10],[x,0,0.00],[0,x>0?-0.25:0.25,0]);
  });

  // Hatchet: short ash handle, wedge-shaped head, hammer poll, leather grip,
  // and steel eye collar.
  defineMelee('hatchet', g => {
    cyl(g,paleWood,[0.014,0.022],0.34,[0,0,-0.02]);
    cyl(g,lambert(0x4c2c18),0.025,0.13,[0,0,0.08]);
    box(g,steel,[0.12,0.070,0.040],[-0.01,0.025,-0.24]);
    triangle(g,brightSteel,0.072,0.13,[-0.085,0.020,-0.24],[0,0,PI/2]);
    box(g,steel,[0.055,0.050,0.055],[0.075,0.025,-0.24]);
    cyl(g,dark,0.023,0.055,[0,0,-0.24]);
    torus(g,brass,0.022,0.004,[0,0,0.15],[PI/2,0,0]);
  });

  // Machete: broad forward-weighted blade, clipped point, long wood scales,
  // rivets, guard, and lanyard hole.
  defineMelee('machete', g => {
    box(g,wood,[0.055,0.045,0.20],[0,0,0.10]);
    for(const x of [-0.018,0.018]) for(const z of [0.04,0.11,0.17]) sphere(g,brass,0.006,[x,0.024,z]);
    box(g,steel,[0.10,0.022,0.030],[0,0,-0.02]);
    box(g,lambert(0x636a63),[0.085,0.018,0.37],[-0.015,0,-0.22]);
    box(g,brightSteel,[0.010,0.021,0.34],[-0.055,0,-0.22]);
    triangle(g,lambert(0x636a63),0.065,0.16,[-0.005,0,-0.48],[-PI/2,0,0.30]);
    torus(g,dark,0.014,0.004,[0,0,0.19],[PI/2,0,0]);
  });

  // Walking Cane: polished hardwood shaft, hooked brass handle, ferrule,
  // rubber foot, and decorative collar.
  defineMelee('cane', g => {
    cyl(g,phong(0x6d341b),[0.010,0.015],0.55,[0,0,-0.10]);
    torus(g,brass,0.070,0.016,[0,0,-0.40],[0,PI/2,0],PI*1.18);
    cyl(g,brass,0.017,0.055,[0,0,-0.33]);
    cyl(g,steel,0.017,0.045,[0,0,0.20]);
    cyl(g,rubber,0.020,0.040,[0,0,0.245]);
    torus(g,brass,0.018,0.004,[0,0,0.13],[PI/2,0,0]);
    for(let z=-0.25;z<=0.05;z+=0.06) torus(g,lambert(0x8f552b),0.013,0.002,[0,0,z],[PI/2,0,0]);
  });

  // Cricket Bat: flat willow blade with shoulders and spine, wrapped handle,
  // toe guard, and a red maker stripe.
  defineMelee('cricket_bat', g => {
    box(g,paleWood,[0.10,0.040,0.38],[0,0,-0.22]);
    box(g,wood,[0.040,0.050,0.16],[0,0,0.05]);
    cyl(g,lambert(0x9c2632),0.027,0.18,[0,0,0.14]);
    for(let z=0.06;z<=0.20;z+=0.03) torus(g,white,0.028,0.003,[0,0,z],[PI/2,0,0]);
    box(g,lambert(0xd53e2f),[0.104,0.045,0.035],[0,0,-0.40]);
    box(g,white,[0.104,0.044,0.020],[0,0,-0.18]);
    box(g,wood,[0.022,0.045,0.32],[0,0.022,-0.22]);
  });

  // Lead Pipe: galvanized tube, threaded couplers, bent elbow, open bore, and
  // tape-wrapped hand grip.
  defineMelee('pipe', g => {
    cyl(g,steel,0.020,0.48,[0,0,-0.10]);
    for(const z of [-0.30,0.12]) cyl(g,brightSteel,0.029,0.055,[0,0,z]);
    torus(g,steel,0.070,0.020,[0,0,-0.38],[0,PI/2,0],PI/2);
    cyl(g,steel,0.020,0.13,[0.065,0,-0.44],[0,0,PI/2]);
    torus(g,dark,0.018,0.006,[0.13,0,-0.44],[0,PI/2,0]);
    cyl(g,rubber,0.025,0.17,[0,0,0.08]);
    for(let z=0.01;z<=0.14;z+=0.03) torus(g,black,0.027,0.003,[0,0,z],[PI/2,0,0]);
  });

  // Wrench: long forged handle, open crescent jaw, box-end ring, thumb screw,
  // and measurement grooves.
  defineMelee('wrench', g => {
    box(g,steel,[0.045,0.022,0.42],[0,0,-0.08]);
    for(let z=-0.20;z<=0.07;z+=0.045) box(g,brightSteel,[0.050,0.006,0.020],[0,0.014,z]);
    torus(g,steel,0.060,0.018,[0,0,-0.34],[0,PI/2,0],PI*1.40);
    box(g,steel,[0.065,0.024,0.11],[-0.045,0,-0.37],[0,-0.30,0]);
    box(g,steel,[0.065,0.024,0.11],[0.045,0,-0.37],[0,0.30,0]);
    cyl(g,dark,0.012,0.060,[0,0,-0.30],[0,0,PI/2]);
    for(let i=0;i<8;i++) box(g,dark,[0.006,0.025,0.010],[-0.025+i*0.007,0,-0.30],[0,0,i*0.2]);
    torus(g,steel,0.035,0.012,[0,0,0.18],[0,PI/2,0]);
  });

  // Shovel: D-grip, ash shaft, steel socket, broad pointed spade, and folded
  // foot steps.
  defineMelee('shovel', g => {
    cyl(g,paleWood,0.015,0.48,[0,0,-0.06]);
    cyl(g,steel,[0.020,0.030],0.10,[0,0,-0.34]);
    box(g,steel,[0.16,0.025,0.20],[0,0,-0.47]);
    triangle(g,brightSteel,0.115,0.15,[0,0,-0.64]);
    for(const x of [-0.065,0.065]) box(g,steel,[0.055,0.035,0.025],[x,0.010,-0.38]);
    box(g,dark,[0.10,0.020,0.11],[0,0,0.21]);
    for(const x of [-0.045,0.045]) box(g,dark,[0.018,0.020,0.13],[x,0,0.15],[0,x>0?-0.20:0.20,0]);
  });

  // Golf Club: slim steel shaft, rubber grip, angled hosel, polished iron head,
  // and grooved striking face.
  defineMelee('golf_club', g => {
    cyl(g,brightSteel,[0.006,0.010],0.62,[0,0,-0.13]);
    cyl(g,rubber,0.018,0.20,[0,0,0.16]);
    for(let z=0.08;z<=0.23;z+=0.025) torus(g,lambert(0x33383a),0.019,0.002,[0,0,z],[PI/2,0,0]);
    cyl(g,steel,0.012,0.11,[0.030,0,-0.45],[0,0,0.55]);
    box(g,brightSteel,[0.13,0.045,0.060],[0.075,0,-0.50],[0,0.35,0]);
    for(let x=0.025;x<=0.12;x+=0.020) box(g,dark,[0.004,0.048,0.050],[x,0.024,-0.50],[0,0.35,0]);
  });

  // Tennis Racket: oval frame, throat yoke, dense crossed string bed, wrapped
  // grip, and frame guard tape.
  defineMelee('tennis_racket', g => {
    const frame=lambert(0xd98b37);
    cyl(g,dark,0.013,0.30,[0,0,0.08]);
    cyl(g,rubber,0.022,0.18,[0,0,0.18]);
    torus(g,frame,0.12,0.012,[0,0,-0.30],[0,PI/2,0]);
    for(const x of [-0.035,0.035]) box(g,frame,[0.012,0.018,0.20],[x,0,-0.13],[0,x>0?-0.20:0.20,0]);
    for(let x=-0.09;x<=0.09;x+=0.022) box(g,white,[0.002,0.006,0.20],[x,0,-0.30]);
    for(let z=-0.39;z<=-0.21;z+=0.022) box(g,white,[0.20,0.006,0.002],[0,0,z]);
    torus(g,white,0.121,0.003,[0,0,-0.30],[0,PI/2,0],PI);
  });

  // Fire Poker: twisted iron shaft, leather grip, hooked tip, ember-bright end,
  // and hanging ring.
  defineMelee('fire_poker', g => {
    cyl(g,phong(0x32363a),0.011,0.60,[0,0,-0.15]);
    for(let z=-0.34;z<=0.08;z+=0.035) torus(g,steel,0.013,0.002,[0,0,z],[PI/2,0,(z+0.34)*8]);
    cyl(g,lambert(0x4a281b),0.021,0.18,[0,0,0.14]);
    torus(g,steel,0.060,0.011,[0,0,-0.47],[0,PI/2,0],PI*0.75);
    sphere(g,glow(0xff5a22),0.015,[-0.04,0,-0.52]);
    torus(g,steel,0.028,0.006,[0,0,0.25],[PI/2,0,0]);
  });

  // Meat Cleaver: broad rectangular blade, clipped nose, sharpening edge,
  // hanging hole, wood scales, and brass rivets.
  defineMelee('meat_cleaver', g => {
    box(g,wood,[0.055,0.050,0.20],[0,0,0.11]);
    for(const z of [0.05,0.12,0.18]) sphere(g,brass,0.007,[0.030,0,z]);
    box(g,steel,[0.10,0.025,0.035],[0,0,-0.02]);
    box(g,lambert(0x8b9196),[0.18,0.018,0.30],[-0.025,0,-0.19]);
    box(g,brightSteel,[0.010,0.021,0.29],[-0.115,0,-0.19]);
    triangle(g,lambert(0x8b9196),0.065,0.11,[0.055,0,-0.36],[-PI/2,0,-0.35]);
    torus(g,dark,0.020,0.006,[0.050,0,-0.10],[PI/2,0,0]);
  });

  // Phase Blade: separated hilt rings project a translucent violet edge around
  // a dark central void, with floating guard fins.
  defineMelee('phase_blade', g => {
    const violet=glow(0xa96cff);
    cyl(g,dark,0.020,0.20,[0,0,0.11]);
    for(let z=0.03;z<=0.18;z+=0.035) torus(g,violet,0.022,0.004,[0,0,z],[PI/2,0,0]);
    box(g,steel,[0.13,0.018,0.025],[0,0,-0.02]);
    for(const x of [-0.055,0.055]) triangle(g,violet,0.026,0.09,[x,0,-0.04],[-PI/2,0,x>0?0.5:-0.5]);
    box(g,glass(0xb98aff,0.45),[0.065,0.015,0.43],[0,0,-0.26]);
    box(g,glow(0xe1c8ff),[0.010,0.019,0.40],[-0.033,0,-0.26]);
    triangle(g,violet,0.050,0.15,[0,0,-0.55]);
  });

  // Gravity Hammer: huge twin-faced head around a gyroscopic singularity,
  // reinforced haft, shock plates, and counterweight pommel.
  defineMelee('gravity_hammer', g => {
    const purple=lambert(0x5b36ad), purpleGlow=glow(0x9b69ff);
    cyl(g,dark,[0.018,0.028],0.50,[0,0,-0.05]);
    cyl(g,rubber,0.032,0.19,[0,0,0.13]);
    sphere(g,glow(0x14001f),0.070,[0,0,-0.39]);
    for(const rot of [[0,0,0],[PI/2,0,0],[0,PI/2,0]]) torus(g,purpleGlow,0.078,0.006,[0,0,-0.39],rot);
    for(const x of [-0.13,0.13]) {
      box(g,purple,[0.15,0.11,0.12],[x,0,-0.39]);
      box(g,steel,[0.025,0.13,0.14],[x+(x>0?0.085:-0.085),0,-0.39]);
    }
    for(const z of [-0.20,-0.27]) box(g,steel,[0.09,0.028,0.025],[0,0,z]);
    sphere(g,purpleGlow,0.025,[0,0,0.25]);
  });

  // Volt Whip: segmented conductor with individually glowing joints, insulated
  // baton grip, capacitor pommel, and forked electric tip.
  defineMelee('volt_whip', g => {
    const cyan=glow(0x62dfff);
    cyl(g,rubber,0.025,0.24,[0,0,0.13]);
    for(let z=0.03;z<=0.21;z+=0.035) torus(g,steel,0.027,0.003,[0,0,z],[PI/2,0,0]);
    sphere(g,glass(0x66ddff,0.45),0.038,[0,0,0.27]);
    const points=[];
    for(let i=0;i<12;i++) points.push([0.055*Math.sin(i*0.75),0.020*Math.cos(i*0.55),-0.02-i*0.045]);
    points.forEach((pt,i)=>{
      sphere(g,cyan,0.010,pt);
      if(i<points.length-1){
        const next=points[i+1];
        const mid=[(pt[0]+next[0])/2,(pt[1]+next[1])/2,(pt[2]+next[2])/2];
        const seg=box(g,steel,[0.012,0.012,0.052],mid,[0,(next[0]-pt[0])*8,0]);
        seg.rotation.x=(next[1]-pt[1])*8;
      }
    });
    triangle(g,cyan,0.025,0.08,[points[11][0]-0.02,points[11][1],points[11][2]-0.06],[-PI/2,0,-0.25]);
    triangle(g,cyan,0.025,0.08,[points[11][0]+0.02,points[11][1],points[11][2]-0.06],[-PI/2,0,0.25]);
  });

  // Flashbang: vented aluminum body, black base, spoon lever, split ring, and
  // a yellow warning band.
  defineSupport('flashbang_basic', g => {
    cyl(g,lambert(0xbfc4c7),0.040,0.12,[0,0,0],undefined,14);
    cyl(g,dark,0.042,0.018,[0,0,0.065]);
    cyl(g,dark,0.032,0.020,[0,0,-0.068]);
    for(let i=0;i<8;i++) {
      const a=i*PI/4;
      cyl(g,black,0.005,0.018,[0.030*Math.cos(a),0.030*Math.sin(a),-0.052],[PI/2,0,0],6);
    }
    box(g,steel,[0.020,0.020,0.095],[0.040,0.025,-0.005],[0.20,0,0.12]);
    torus(g,steel,0.025,0.004,[0.055,0.055,-0.050],[0,PI/2,0]);
    torus(g,yellow,0.042,0.006,[0,0,0.020],[PI/2,0,0]);
  });

  // Proximity Mine: low armored disc, rotating sensor eye, four fold-out feet,
  // status lamps, and a raised pressure ring.
  defineSupport('proximity_mine', g => {
    cyl(g,dark,[0.075,0.060],0.035,[0,0,0],[PI/2,0,0],16);
    torus(g,red,0.060,0.007,[0,0,-0.020],[0,0,0]);
    sphere(g,glow(0xff4444),0.018,[0,0.020,-0.025],[1,0.65,0.55]);
    for(let i=0;i<4;i++) {
      const a=i*PI/2;
      box(g,steel,[0.018,0.012,0.090],[Math.cos(a)*0.075,Math.sin(a)*0.075,0.010],[0,0,a]);
      sphere(g,dark,0.010,[Math.cos(a)*0.115,Math.sin(a)*0.115,0.010]);
    }
    for(let i=0;i<3;i++) sphere(g,glow(i===0?0x55ff66:0xffcc33),0.006,[-0.018+i*0.018,-0.030,-0.024]);
  });

  // Dynamite Bundle: six distinct paper-wrapped sticks, steel timer, braided
  // fuse, binding straps, and a glowing fuse tip.
  defineSupport('dynamite', g => {
    const paper=lambert(0xb9342d);
    [[-0.028,-0.025],[0,-0.025],[0.028,-0.025],[-0.014,0.018],[0.014,0.018],[0,0.052]].forEach(([x,y])=>{
      cyl(g,paper,0.014,0.13,[x,y,0]);
      cyl(g,lambert(0xd9b18b),0.013,0.008,[x,y,-0.069]);
    });
    for(const z of [-0.040,0.040]) box(g,dark,[0.095,0.018,0.020],[0,0.010,z]);
    box(g,steel,[0.055,0.040,0.045],[0,0.060,0.010]);
    sphere(g,glow(0xff3322),0.007,[0.018,0.082,-0.015]);
    torus(g,lambert(0x6d4a2a),0.050,0.004,[0.035,0.075,-0.035],[0,PI/2,0],PI*1.3);
    sphere(g,glow(0xffaa22),0.008,[0.055,0.095,-0.070]);
  });

  // Mini Drone Strike: rugged controller with dual thumb sticks, luminous
  // tactical screen, folding antenna, and a tiny delta drone docked on top.
  defineSupport('drone_strike', g => {
    box(g,lambert(0x39444e),[0.13,0.070,0.075],[0,0,0]);
    box(g,glow(0x6bdeff),[0.080,0.006,0.045],[0,0.038,-0.010]);
    for(const x of [-0.045,0.045]) {
      cyl(g,dark,0.012,0.025,[x,0.050,0.035],[0,0,0]);
      sphere(g,rubber,0.012,[x,0.065,0.035]);
    }
    box(g,dark,[0.045,0.055,0.045],[-0.075,-0.030,0.015],[0,0,-0.25]);
    box(g,dark,[0.045,0.055,0.045],[0.075,-0.030,0.015],[0,0,0.25]);
    cyl(g,steel,0.004,0.12,[0.060,0.090,0.030],[0.25,0,0]);
    triangle(g,lambert(0x24292e),0.055,0.090,[0,0.085,-0.035],[0,0,PI/2]);
    for(const x of [-0.040,0.040]) sphere(g,glow(0xff5544),0.005,[x,0.086,-0.050]);
  });

  // Healing Pulse: medical emitter with a suspended green core, four petal
  // vanes, dosage ring, and unmistakable cross plate.
  defineSupport('healing_pulse', g => {
    sphere(g,glass(0x77ffaa,0.42),0.060,[0,0,0]);
    sphere(g,glow(0x42e582),0.025,[0,0,0]);
    for(let i=0;i<4;i++) {
      const a=i*PI/2;
      box(g,white,[0.045,0.018,0.075],[Math.cos(a)*0.055,Math.sin(a)*0.055,0],[0,0,a]);
      sphere(g,glow(0x77ffaa),0.008,[Math.cos(a)*0.085,Math.sin(a)*0.085,0]);
    }
    for(const rot of [[0,0,0],[PI/2,0,0],[0,PI/2,0]]) torus(g,lambert(0x42a870),0.065,0.005,[0,0,0],rot);
    box(g,white,[0.050,0.010,0.018],[0,0.070,-0.010]);
    box(g,red,[0.018,0.012,0.050],[0,0.070,-0.010]);
  });

  // Teleport Beacon: three folding legs hold a bright crystal over a concentric
  // pad, with an antenna and directional chevrons.
  defineSupport('teleport_beacon', g => {
    cyl(g,lambert(0x374254),[0.070,0.055],0.025,[0,-0.030,0],[0,0,0],16);
    torus(g,glow(0x55d9ff),0.060,0.005,[0,-0.015,0],[PI/2,0,0]);
    for(let i=0;i<3;i++) {
      const a=-PI/2+i*2*PI/3;
      box(g,steel,[0.012,0.075,0.012],[Math.cos(a)*0.055,-0.060,Math.sin(a)*0.055],[0,0,a]);
      triangle(g,glow(0x55d9ff),0.012,0.040,[Math.cos(a)*0.075,-0.020,Math.sin(a)*0.075],[0,0,a]);
    }
    triangle(g,glass(0x77e8ff,0.62),0.040,0.13,[0,0.055,0],[0,0,0]);
    sphere(g,glow(0x88eeff),0.015,[0,0.060,0]);
    cyl(g,steel,0.004,0.10,[0.050,0.070,0],[0,0,0]);
    sphere(g,glow(0xffcc44),0.006,[0.050,0.122,0]);
  });

  // Cloak: a compact belt projector unfurls a translucent faceted mantle around
  // a dark control buckle and twin field emitters.
  defineSupport('cloak', g => {
    box(g,dark,[0.085,0.050,0.060],[0,-0.015,0.020]);
    box(g,steel,[0.045,0.032,0.070],[0,0.025,0.020]);
    sphere(g,glow(0x8b9cff),0.010,[0,0.043,-0.018],[1,1,0.5]);
    for(const x of [-0.055,0.055]) {
      cyl(g,lambert(0x4c536b),0.016,0.070,[x,0,0.020]);
      torus(g,glow(0x8b9cff),0.020,0.003,[x,0,0.020],[0,PI/2,0]);
    }
    const mantle=new THREE.Mesh(
      new THREE.ConeGeometry(0.13,0.16,8,1,true),
      new THREE.MeshPhongMaterial({color:0x7788aa,transparent:true,opacity:0.22,side:THREE.DoubleSide}),
    );
    mantle.position.set(0,0.030,0.025); mantle.rotation.x=PI; g.add(mantle);
    for(let i=0;i<5;i++) box(g,glow(0x6177ff),[0.004,0.06,0.004],[-0.06+i*0.03,0.03,0.02]);
  });

  // Berserker Serum: armored injector with twin red ampoules, pressure gauge,
  // thumb plunger, and a guarded needle.
  defineSupport('berserker_serum', g => {
    for(const x of [-0.022,0.022]) {
      cyl(g,glass(0xff4d42,0.52),0.016,0.13,[x,0,0]);
      cyl(g,glow(0xd91f24),0.008,0.10,[x,0,0.010]);
    }
    box(g,dark,[0.075,0.060,0.050],[0,0,0.055]);
    box(g,steel,[0.075,0.040,0.040],[0,0,-0.075]);
    cyl(g,brightSteel,0.004,0.070,[0,0,-0.130]);
    cone(g,brightSteel,0.007,0.035,[0,0,-0.183]);
    cyl(g,steel,0.020,0.035,[0,0,0.120]);
    box(g,red,[0.060,0.010,0.030],[0,0,0.145]);
    cyl(g,white,0.020,0.010,[0.048,0.020,0.020],[0,0,PI/2]);
    box(g,dark,[0.004,0.014,0.004],[0.054,0.022,0.020],[0,0,0.65]);
  });

  // Taser Grenade: insulated sphere, six electrode studs, copper equator coil,
  // pull ring, and a pulsing blue charge window.
  defineSupport('taser_grenade', g => {
    sphere(g,lambert(0x28455a),0.058,[0,0,0],undefined,12);
    for(let i=0;i<6;i++) {
      const a=i*PI/3;
      cyl(g,steel,0.007,0.030,[0.058*Math.cos(a),0.058*Math.sin(a),0],[0,0,a]);
      sphere(g,glow(0x77ddff),0.009,[0.075*Math.cos(a),0.075*Math.sin(a),0]);
    }
    torus(g,copper,0.060,0.006,[0,0,0],[PI/2,0,0]);
    sphere(g,glow(0x66ccff),0.020,[0,0,-0.052],[1,1,0.4]);
    box(g,dark,[0.030,0.030,0.045],[0,0.065,0]);
    torus(g,steel,0.025,0.004,[0.020,0.095,0],[0,PI/2,0]);
  });

  // Ink Bomb: reinforced glass bottle of sloshing black ink, cork pressure cap,
  // splash fins, pull tab, and a dripping nozzle.
  defineSupport('ink_bomb', g => {
    sphere(g,glass(0x34415a,0.52),0.060,[0,0.005,0],[1,1.1,1],14);
    sphere(g,glow(0x080910),0.048,[0,-0.005,0],[1,0.9,1]);
    for(let i=0;i<5;i++) {
      const a=i*2*PI/5;
      triangle(g,lambert(0x11131a),0.025,0.080,[0.055*Math.cos(a),0.055*Math.sin(a),0],[0,0,a]);
    }
    cyl(g,lambert(0x6b4a2d),[0.020,0.028],0.045,[0,0.075,0],[0,0,0]);
    box(g,steel,[0.040,0.008,0.060],[0.025,0.105,0],[0,0,0.25]);
    torus(g,steel,0.022,0.004,[0.050,0.125,0],[0,PI/2,0]);
    sphere(g,glow(0x080910),0.009,[0,-0.072,0.015],[0.8,1.5,0.8]);
  });

  // Distraction Siren: red flared horn, rotating beacon, speaker grille, crank,
  // rubber feet, and carry handle.
  defineSupport('siren', g => {
    box(g,lambert(0x3a3c40),[0.10,0.065,0.075],[0,-0.020,0.020]);
    cyl(g,red,[0.070,0.025],0.11,[0,0.025,-0.075]);
    torus(g,dark,0.070,0.008,[0,0.025,-0.132],[PI/2,0,0]);
    for(let i=0;i<7;i++) {
      const a=i*2*PI/7;
      box(g,dark,[0.006,0.040,0.060],[0.030*Math.cos(a),0.025+0.030*Math.sin(a),-0.136],[0,0,a]);
    }
    cyl(g,glass(0xff3333,0.55),0.035,0.050,[0,0.065,0.045],[0,0,0]);
    sphere(g,glow(0xff2222),0.025,[0,0.090,0.045]);
    torus(g,dark,0.060,0.009,[0,0.075,0.065],[0,PI/2,0],PI);
    cyl(g,steel,0.008,0.070,[0.075,-0.005,0.020],[0,0,PI/2]);
    sphere(g,rubber,0.015,[0.115,-0.005,0.020]);
  });

  // Caltrops: a leather pouch spills three four-point steel caltrops, each with
  // a distinct orientation and sharpened tips.
  defineSupport('caltrops', g => {
    box(g,lambert(0x5a3b25),[0.10,0.045,0.085],[0,-0.035,0.035],[0.25,0,0]);
    torus(g,lambert(0x332116),0.045,0.006,[0,0.005,0.065],[0,PI/2,0],PI);
    const centers=[[-0.055,0.025,-0.025],[0.020,0.030,-0.045],[0.065,0.010,0.025]];
    centers.forEach((c,index)=>{
      for(let i=0;i<4;i++) {
        const a=i*PI/2+index*0.35;
        const spike=cone(g,brightSteel,0.012,0.080,[c[0]+Math.cos(a)*0.025,c[1]+Math.sin(a)*0.025,c[2]],[0,0,a]);
        spike.rotation.y=a;
      }
      sphere(g,steel,0.016,c);
    });
  });

  // Nano Swarm: a transparent hive capsule containing many bright motes,
  // surrounded by a rotor ring and medical docking clips.
  defineSupport('nano_swarm', g => {
    cyl(g,glass(0x77ffdd,0.34),0.050,0.13,[0,0,0],undefined,16);
    for(let i=0;i<18;i++) {
      const a=i*2.399;
      const r=0.010+(i%4)*0.009;
      sphere(g,glow(i%3?0x66ffcc:0xffffff),0.004,[r*Math.cos(a),r*Math.sin(a),-0.045+(i%7)*0.015],undefined,6);
    }
    torus(g,lambert(0x2a6a5a),0.068,0.007,[0,0,0],[0.35,0.20,0]);
    for(const z of [-0.070,0.070]) cyl(g,steel,0.035,0.018,[0,0,z]);
    for(const x of [-0.055,0.055]) box(g,white,[0.020,0.050,0.025],[x,0,0]);
    box(g,red,[0.050,0.010,0.014],[0,0.054,0]);
    box(g,red,[0.014,0.012,0.050],[0,0.054,0]);
  });

  // Warp Beacon: stacked gyroscope rings, black central aperture, four anchor
  // pylons, and an upward focusing crystal.
  defineSupport('warp_beacon', g => {
    cyl(g,lambert(0x302047),[0.075,0.060],0.028,[0,-0.035,0],[0,0,0],18);
    sphere(g,glow(0x050008),0.035,[0,0.015,0]);
    for(const rot of [[0,0,0],[PI/2,0,0],[0,PI/2,0]]) torus(g,glow(0xa56aff),0.062,0.006,[0,0.015,0],rot);
    for(let i=0;i<4;i++) {
      const a=i*PI/2;
      box(g,steel,[0.018,0.095,0.018],[Math.cos(a)*0.075,-0.050,Math.sin(a)*0.075],[0,0,a]);
      sphere(g,glow(0xa56aff),0.008,[Math.cos(a)*0.075,0.005,Math.sin(a)*0.075]);
    }
    triangle(g,glass(0xbc8aff,0.58),0.030,0.10,[0,0.100,0],[0,0,0]);
    sphere(g,glow(0xd5b4ff),0.009,[0,0.150,0]);
  });

  // Stasis Mine: clock-face pressure plate, twelve luminous hour markers,
  // crossed hands, rewind coil, and four magnetic feet.
  defineSupport('stasis_mine', g => {
    cyl(g,lambert(0x293a50),[0.078,0.066],0.030,[0,0,0],[PI/2,0,0],18);
    cyl(g,glass(0xaaddff,0.38),0.060,0.010,[0,0,-0.022],[PI/2,0,0],18);
    for(let i=0;i<12;i++) {
      const a=i*PI/6;
      sphere(g,glow(0x77ddff),0.004,[0.050*Math.cos(a),0.050*Math.sin(a),-0.030]);
    }
    box(g,glow(0xffffff),[0.006,0.004,0.045],[0.013,0.010,-0.034],[0,0,-0.55]);
    box(g,glow(0x66ccff),[0.006,0.004,0.035],[-0.010,0.014,-0.035],[0,0,0.80]);
    torus(g,copper,0.070,0.006,[0,0,0.018],[0.20,0.10,0]);
    for(let i=0;i<4;i++) {
      const a=i*PI/2;
      box(g,dark,[0.022,0.020,0.055],[Math.cos(a)*0.078,Math.sin(a)*0.078,0.020],[0,0,a]);
    }
  });

  // Specter Drone: stealth delta wing, recessed violet core, folding winglets,
  // sensor eye, and two silent ducted fans.
  defineSupport('specter_drone', g => {
    triangle(g,lambert(0x25263a),0.095,0.14,[0,0,0],[0,0,PI/2]);
    box(g,lambert(0x30314a),[0.18,0.018,0.060],[0,0,0.025]);
    for(const x of [-0.060,0.060]) {
      torus(g,dark,0.030,0.006,[x,0.010,0.020],[PI/2,0,0]);
      sphere(g,glow(0x8e66ff),0.014,[x,0.010,0.020],[1,0.4,1]);
      triangle(g,lambert(0x3b3d5c),0.030,0.090,[x,0,0.075],[0,0,x>0?-0.55:0.55]);
    }
    sphere(g,glow(0xaa77ff),0.016,[0,0.020,-0.045],[1,0.7,0.5]);
    box(g,glass(0x7788aa,0.24),[0.15,0.006,0.10],[0,0.016,0.015]);
    for(const x of [-0.085,0.085]) sphere(g,glow(0x55ccff),0.005,[x,0,-0.010]);
  });

  // Quantum Barrier: hexagonal field projector, transparent shield shard,
  // gyroscope core, anchor clamps, and a charge meter.
  defineSupport('quantum_barrier', g => {
    cyl(g,lambert(0x334c5e),[0.070,0.055],0.035,[0,-0.035,0],[0,0,0],6);
    sphere(g,glass(0xaaddff,0.38),0.050,[0,0.010,0]);
    for(const rot of [[0,0,0],[PI/2,0,0],[0,PI/2,0]]) torus(g,glow(0x88ddff),0.052,0.004,[0,0.010,0],rot);
    for(let i=0;i<6;i++) {
      const a=i*PI/3;
      box(g,steel,[0.015,0.060,0.022],[Math.cos(a)*0.065,-0.040,Math.sin(a)*0.065],[0,0,a]);
      sphere(g,glow(0x66ccff),0.006,[Math.cos(a)*0.070,0.002,Math.sin(a)*0.070]);
    }
    const shield=new THREE.Mesh(
      new THREE.CylinderGeometry(0.12,0.12,0.006,6),
      new THREE.MeshBasicMaterial({color:0x88ddff,transparent:true,opacity:0.20,side:THREE.DoubleSide}),
    );
    shield.rotation.x=PI/2; shield.position.set(0,0.065,-0.035); g.add(shield);
    for(let i=0;i<5;i++) box(g,glow(i<4?0x66ffbb:0x223344),[0.012,0.005,0.025],[-0.030+i*0.015,0.032,0.060]);
  });

  window.HandcraftedModels = Object.freeze({
    hasWeapon: id => Object.prototype.hasOwnProperty.call(GUNS, id),
    hasMelee: id => Object.prototype.hasOwnProperty.call(MELEES, id),
    hasSupport: id => Object.prototype.hasOwnProperty.call(SUPPORTS, id),
    buildWeapon(id) {
      if (!GUNS[id]) throw new Error('No handcrafted weapon model for ' + id);
      return GUNS[id]();
    },
    buildMelee(id) {
      if (!MELEES[id]) throw new Error('No handcrafted melee model for ' + id);
      return MELEES[id]();
    },
    buildSupport(id) {
      if (!SUPPORTS[id]) throw new Error('No handcrafted support model for ' + id);
      return SUPPORTS[id]();
    },
    weaponIds: Object.freeze(Object.keys(GUNS)),
    meleeIds: Object.freeze(Object.keys(MELEES)),
    supportIds: Object.freeze(Object.keys(SUPPORTS)),
  });
}());
