const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public', 'assets', 'models');
const objPath = path.join(outDir, 'ak20.obj');
const mtlPath = path.join(outDir, 'ak20.mtl');

const materials = {
  black_steel: [0.035, 0.038, 0.043],
  worn_steel: [0.42, 0.45, 0.48],
  dark_rubber: [0.015, 0.016, 0.018],
  walnut: [0.34, 0.17, 0.055],
  walnut_light: [0.55, 0.31, 0.10],
  red_mark: [0.72, 0.18, 0.10],
};

let vertices = [];
let faces = [];
let currentMaterial = null;

function mat(name) {
  currentMaterial = name;
}

function addVertex(x, y, z) {
  vertices.push([x, y, z]);
  return vertices.length;
}

function rotX([x, y, z], a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
}

function rotY([x, y, z], a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}

function rotZ([x, y, z], a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c, z];
}

function transform(p, pos, rot = [0, 0, 0]) {
  let q = rotX(p, rot[0]);
  q = rotY(q, rot[1]);
  q = rotZ(q, rot[2]);
  return [q[0] + pos[0], q[1] + pos[1], q[2] + pos[2]];
}

function face(indices) {
  faces.push({ material: currentMaterial, indices });
}

function box(name, material, size, pos, rot) {
  mat(material);
  const [w, h, d] = size.map(v => v / 2);
  const base = [
    [-w,-h,-d],[ w,-h,-d],[ w, h,-d],[-w, h,-d],
    [-w,-h, d],[ w,-h, d],[ w, h, d],[-w, h, d],
  ].map(p => addVertex(...transform(p, pos, rot)));
  face([base[0], base[1], base[2], base[3]]);
  face([base[4], base[7], base[6], base[5]]);
  face([base[0], base[4], base[5], base[1]]);
  face([base[1], base[5], base[6], base[2]]);
  face([base[2], base[6], base[7], base[3]]);
  face([base[3], base[7], base[4], base[0]]);
}

function sidePlate(name, material, pts, width, x = 0) {
  mat(material);
  const a = [], b = [];
  pts.forEach(p => a.push(addVertex(x - width / 2, p[1], p[0])));
  pts.forEach(p => b.push(addVertex(x + width / 2, p[1], p[0])));
  const n = pts.length;
  for (let i = 1; i < n - 1; i++) {
    face([a[0], a[i], a[i + 1]]);
    face([b[0], b[i + 1], b[i]]);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    face([a[i], a[j], b[j], b[i]]);
  }
}

function cylinder(name, material, radius, length, pos, rot = [Math.PI / 2, 0, 0], segments = 16) {
  mat(material);
  const a = [], b = [];
  for (let i = 0; i < segments; i++) {
    const t = i / segments * Math.PI * 2;
    a.push(addVertex(...transform([Math.cos(t) * radius, Math.sin(t) * radius, -length / 2], pos, rot)));
    b.push(addVertex(...transform([Math.cos(t) * radius, Math.sin(t) * radius, length / 2], pos, rot)));
  }
  const centerA = addVertex(...transform([0, 0, -length / 2], pos, rot));
  const centerB = addVertex(...transform([0, 0, length / 2], pos, rot));
  for (let i = 0; i < segments; i++) {
    const n = (i + 1) % segments;
    face([a[i], a[n], b[n], b[i]]);
    face([centerA, a[i], a[n]]);
    face([centerB, b[n], b[i]]);
  }
}

function curve(a, b, steps, bend = 0) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * bend;
    pts.push([z, y]);
  }
  return pts;
}

function stripPlate(name, material, centers, height, width, x = 0) {
  mat(material);
  const left = [], right = [];
  for (let i = 0; i < centers.length; i++) {
    const prev = centers[Math.max(0, i - 1)];
    const next = centers[Math.min(centers.length - 1, i + 1)];
    const dz = next[0] - prev[0], dy = next[1] - prev[1];
    const len = Math.hypot(dz, dy) || 1;
    const nz = -dy / len, ny = dz / len;
    left.push([centers[i][0] + nz * height / 2, centers[i][1] + ny * height / 2]);
    right.push([centers[i][0] - nz * height / 2, centers[i][1] - ny * height / 2]);
  }
  const n = centers.length;
  const lf = [], rf = [], lb = [], rb = [];
  left.forEach(p => lf.push(addVertex(x - width / 2, p[1], p[0])));
  right.forEach(p => rf.push(addVertex(x - width / 2, p[1], p[0])));
  left.forEach(p => lb.push(addVertex(x + width / 2, p[1], p[0])));
  right.forEach(p => rb.push(addVertex(x + width / 2, p[1], p[0])));
  for (let i = 0; i < n - 1; i++) {
    face([lf[i], lf[i + 1], rf[i + 1], rf[i]]);
    face([lb[i], rb[i], rb[i + 1], lb[i + 1]]);
    face([lf[i], lb[i], lb[i + 1], lf[i + 1]]);
    face([rf[i], rf[i + 1], rb[i + 1], rb[i]]);
  }
  face([lf[0], rf[0], rb[0], lb[0]]);
  face([lf[n - 1], lb[n - 1], rb[n - 1], rf[n - 1]]);
}

function addAk20() {
  sidePlate('one_piece_ak47_silhouette', 'black_steel', [
    [-5.90,0.10],[-4.85,0.10],[-4.80,0.58],[-4.68,0.68],[-4.52,0.58],
    [-4.30,0.20],[-3.40,0.18],[-3.12,0.40],[-1.76,0.40],
    [-1.56,0.60],[-0.64,0.60],[0.96,0.58],[1.50,0.32],
    [1.50,-0.38],[2.10,0.16],[3.32,0.20],[4.06,-0.14],
    [3.72,-0.52],[2.14,-0.54],[1.26,-0.46],[0.94,-0.56],
    [1.28,-0.84],[1.32,-1.54],[1.00,-1.80],[0.66,-1.08],
    [0.50,-0.60],[-0.60,-0.58],[-0.70,-0.64],[-0.96,-0.96],
    [-1.22,-1.54],[-1.54,-2.24],[-1.82,-2.86],[-1.50,-3.02],
    [-1.08,-2.50],[-0.80,-1.80],[-0.62,-1.02],[-0.82,-0.60],
    [-1.60,-0.52],[-1.90,-0.12],[-3.24,-0.10],[-3.52,0.14],
  ], 0.52);
  cylinder('barrel', 'worn_steel', 0.062, 3.45, [0, 0.18, -3.98], [Math.PI / 2, 0, 0], 32);
  cylinder('gas_tube', 'worn_steel', 0.050, 2.70, [0, 0.45, -3.42], [Math.PI / 2, 0, 0], 28);
  cylinder('muzzle_brake', 'worn_steel', 0.095, 0.38, [0, 0.18, -5.75], [Math.PI / 2, 0, 0], 28);
  sidePlate('smooth_dust_cover', 'worn_steel', [[-1.50,0.38],[-1.18,0.58],[0.96,0.56],[1.36,0.38],[0.78,0.30],[-1.28,0.30]], 0.46);
  sidePlate('lower_receiver_shadow', 'dark_rubber', [[-0.24,-0.16],[0.92,-0.14],[1.10,-0.34],[-0.12,-0.38]], 0.53);
  sidePlate('wood_stock_panel', 'walnut', [[1.54,-0.38],[2.14,0.12],[3.26,0.14],[3.90,-0.14],[3.60,-0.44],[2.18,-0.48]], 0.47);
  sidePlate('wood_grip_panel', 'walnut', [[0.80,-0.64],[1.12,-0.90],[1.16,-1.48],[0.98,-1.64],[0.76,-1.08],[0.68,-0.70]], 0.35);
  stripPlate('flush_magazine_inset', 'dark_rubber', curve([-0.80,-0.96],[-1.58,-2.58],12,-0.10), 0.28, 0.54, 0.01);
  sidePlate('wood_handguard_panel', 'walnut', [[-3.36,0.02],[-3.04,0.30],[-1.86,0.30],[-1.66,0.10],[-1.92,-0.02],[-3.20,-0.02]], 0.52);
  box('gas_block', 'worn_steel', [0.18,0.26,0.18], [0,0.34,-4.16]);
  box('rear_sight', 'dark_rubber', [0.26,0.09,0.38], [0,0.64,-0.62]);
  box('top_red_mark', 'red_mark', [0.12,0.03,0.46], [0,0.61,0.46]);
  box('trigger', 'worn_steel', [0.04,0.13,0.05], [0,-0.64,0.18], [0.18,0,0]);
}

fs.mkdirSync(outDir, { recursive: true });
addAk20();

const obj = [
  '# AK-20 fictional PvP rifle model',
  '# Generated by tools/generate-ak20-model.js',
  'mtllib ak20.mtl',
  'o AK20',
  ...vertices.map(v => `v ${v[0].toFixed(5)} ${v[1].toFixed(5)} ${v[2].toFixed(5)}`),
  ...faces.flatMap(f => [`usemtl ${f.material}`, `f ${f.indices.join(' ')}`]),
  '',
].join('\n');

const mtl = Object.entries(materials).flatMap(([name, color]) => [
  `newmtl ${name}`,
  `Kd ${color.map(v => v.toFixed(3)).join(' ')}`,
  'Ks 0.350 0.350 0.350',
  'Ns 56.000',
  '',
]).join('\n');

fs.writeFileSync(objPath, obj);
fs.writeFileSync(mtlPath, mtl);
console.log(`Wrote ${objPath}`);
console.log(`Wrote ${mtlPath}`);
