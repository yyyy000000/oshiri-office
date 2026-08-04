import * as THREE from "three";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export const SLAP_ITEMS = [
  { id: "hand", name: "素手", points: 10, unlock: 0, sound: "hand" },
  { id: "slipper", name: "スリッパ", points: 30, unlock: 500, sound: "slipper" },
  { id: "harisen", name: "ハリセン", points: 80, unlock: 3000, sound: "harisen" },
  { id: "bachi", name: "太鼓のバチ", points: 200, unlock: 10000, sound: "drum" },
  { id: "pan", name: "フライパン", points: 500, unlock: 30000, sound: "pan" },
  { id: "golden", name: "金の孫の手", points: 1200, unlock: 60000, sound: "gold" },
  { id: "pawpunch", name: "もふもふクマパンチ", points: 3000, unlock: -1, sound: "paw" }, // 隠し
];

export const COSTUMES = [
  { id: "suit", name: "いつものスーツ", unlock: 0 },
  { id: "nurse", name: "ナース服", unlock: 8000 },
  { id: "dino", name: "恐竜の着ぐるみ", unlock: 20000 },
  { id: "space", name: "宇宙服", unlock: 45000 },
  { id: "magical", name: "魔法少女", unlock: 75000 },
  { id: "bear", name: "クマの着ぐるみ", unlock: -1 }, // 隠し
  { id: "gold", name: "黄金スーツ", unlock: -1 }, // 隠し
];

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const SELECT_GLOW = 0xffe680;
const POP_DURATION = 0.5;

function mesh(geo, color, opts = {}) {
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      metalness: opts.metalness ?? 0.15,
      roughness: opts.roughness ?? 0.6,
      emissive: new THREE.Color(opts.emissive ?? 0x000000),
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    })
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// A small wrapper group lets a cylinder "lie flat" locally (rotation.z) while
// still being free to yaw within the floor plane via the wrapper's rotation.y.
function flatHolder(child, yaw) {
  const holder = new THREE.Group();
  holder.add(child);
  holder.rotation.y = yaw;
  return holder;
}

// Thin cylinder stretched between two points in the local XY plane. Used for
// wire-hanger frames and rail brackets.
function wireSegment(x1, y1, x2, y2, radius = 0.005, color = 0xbbbbbb) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 0.001;
  const cyl = mesh(new THREE.CylinderGeometry(radius, radius, len, 8), color, {
    metalness: 0.7,
    roughness: 0.3,
  });
  cyl.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
  cyl.rotation.z = Math.atan2(-dx, dy);
  return cyl;
}

function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// ---------------------------------------------------------------------------
// Item builders (each returns { group, restY })
// ---------------------------------------------------------------------------

function buildSlipper() {
  const g = new THREE.Group();
  const sole = mesh(new THREE.CapsuleGeometry(0.075, 0.18, 8, 24), 0x4a90e2);
  sole.rotation.z = Math.PI / 2;
  sole.scale.set(1, 0.4, 1.3);
  g.add(sole);
  const strap = mesh(new THREE.TorusGeometry(0.085, 0.014, 12, 24, Math.PI), 0xffffff);
  strap.rotation.x = Math.PI / 2;
  strap.position.set(0, 0.03, 0.02);
  g.add(strap);
  // stitching line along the sole rim
  const stitch = mesh(new THREE.TorusGeometry(0.088, 0.003, 6, 32, Math.PI * 1.6), 0x2a5faa, {
    roughness: 0.8,
  });
  stitch.rotation.x = Math.PI / 2;
  stitch.rotation.z = 0.3;
  stitch.position.set(0, 0.006, -0.01);
  g.add(stitch);
  return { group: g, restY: 0.035 };
}

function buildHarisen() {
  const g = new THREE.Group();
  const pleatCount = 8;
  const colors = [0xffffff, 0xd32f2f];
  for (let i = 0; i < pleatCount; i++) {
    const pleat = mesh(new THREE.BoxGeometry(0.22, 0.008, 0.036), colors[i % 2]);
    const angle = (i - (pleatCount - 1) / 2) * 0.1;
    pleat.position.set(Math.cos(angle) * 0.11, 0, Math.sin(angle) * 0.11);
    pleat.rotation.y = angle;
    g.add(pleat);
    // fold crease line on each pleat
    const crease = mesh(new THREE.BoxGeometry(0.2, 0.009, 0.004), 0x00000, { roughness: 0.9 });
    crease.material.color.set(colors[i % 2]).multiplyScalar(0.55);
    crease.position.set(Math.cos(angle) * 0.11, 0, Math.sin(angle) * 0.11);
    crease.rotation.y = angle;
    g.add(crease);
  }
  const handle = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 16), 0x8b5a2b);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-0.14, 0, 0);
  g.add(handle);
  // binding ferrule where paper meets handle
  const ferrule = mesh(new THREE.TorusGeometry(0.018, 0.006, 8, 16), 0x5a3a1a);
  ferrule.rotation.y = Math.PI / 2;
  ferrule.position.set(-0.065, 0, 0);
  g.add(ferrule);
  return { group: g, restY: 0.01 };
}

function makeBachiStick() {
  const grp = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.32, 16), 0xb5754a);
  body.rotation.z = Math.PI / 2;
  grp.add(body);
  // wood-grain rings along the stick
  const ringColor = 0x8a5a35;
  for (let i = -1; i <= 1; i++) {
    const ring = mesh(new THREE.TorusGeometry(0.0085, 0.0015, 6, 16), ringColor);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = i * 0.09;
    grp.add(ring);
  }
  return grp;
}

function buildBachi() {
  const g = new THREE.Group();
  g.add(flatHolder(makeBachiStick(), 0.4));
  g.add(flatHolder(makeBachiStick(), -0.4));
  return { group: g, restY: 0.01 };
}

function buildPan() {
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.035, 32), 0x1a1a1a, {
    metalness: 0.4,
    roughness: 0.5,
  });
  g.add(body);
  const handle = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 16), 0x222222);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0.16, 0, 0);
  g.add(handle);
  // rivets joining handle to body
  const rivetGeo = new THREE.SphereGeometry(0.012, 12, 10);
  const rivet1 = mesh(rivetGeo, 0x333333, { metalness: 0.6, roughness: 0.4 });
  rivet1.position.set(0.075, 0.012, 0.02);
  g.add(rivet1);
  const rivet2 = mesh(rivetGeo.clone(), 0x333333, { metalness: 0.6, roughness: 0.4 });
  rivet2.position.set(0.075, 0.012, -0.02);
  g.add(rivet2);
  // hanging hole at the handle's end
  const hole = mesh(new THREE.TorusGeometry(0.012, 0.004, 8, 16), 0x111111);
  hole.rotation.y = Math.PI / 2;
  hole.position.set(0.245, 0, 0);
  g.add(hole);
  return { group: g, restY: 0.02 };
}

function buildGolden() {
  const g = new THREE.Group();
  const goldOpts = { metalness: 1, roughness: 0.25 };
  const stick = mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.3, 20), 0xffd700, goldOpts);
  stick.rotation.z = Math.PI / 2;
  g.add(stick);
  // grip grooves along the shaft
  for (let i = -2; i <= 2; i++) {
    const groove = mesh(new THREE.TorusGeometry(0.011, 0.0015, 6, 16), 0xe6c200, goldOpts);
    groove.rotation.y = Math.PI / 2;
    groove.position.set(-0.05 + i * 0.03, 0, 0);
    g.add(groove);
  }
  const palm = mesh(new THREE.BoxGeometry(0.05, 0.012, 0.03), 0xffd700, goldOpts);
  palm.position.set(0.17, 0, 0);
  g.add(palm);
  for (let i = -1; i <= 1; i++) {
    const finger = mesh(new THREE.BoxGeometry(0.025, 0.01, 0.008), 0xffd700, goldOpts);
    finger.position.set(0.2, 0, i * 0.011);
    g.add(finger);
    // knuckle joint detail
    const knuckle = mesh(new THREE.SphereGeometry(0.006, 10, 8), 0xffd700, goldOpts);
    knuckle.position.set(0.188, 0, i * 0.011);
    g.add(knuckle);
  }
  return { group: g, restY: 0.01 };
}

function buildPawpunch() {
  const g = new THREE.Group();
  const fur = 0x8b5e34;
  const pad = 0xd9b48f;
  const palm = mesh(new THREE.SphereGeometry(0.09, 24, 18), fur, { roughness: 0.95 });
  palm.scale.set(1, 0.85, 1.1);
  g.add(palm);
  // four toe pads
  const toeOffsets = [-0.06, -0.02, 0.02, 0.06];
  for (const ox of toeOffsets) {
    const toe = mesh(new THREE.SphereGeometry(0.022, 16, 12), pad, { roughness: 0.7 });
    toe.position.set(ox, -0.02, 0.1);
    g.add(toe);
  }
  // big center pad
  const centerPad = mesh(new THREE.SphereGeometry(0.03, 16, 12), pad, { roughness: 0.7 });
  centerPad.position.set(0, -0.04, 0.03);
  centerPad.scale.set(1, 0.7, 1);
  g.add(centerPad);
  // claws
  for (const ox of toeOffsets) {
    const claw = mesh(new THREE.ConeGeometry(0.008, 0.025, 8), 0xf2ede1, { roughness: 0.4 });
    claw.rotation.x = -Math.PI / 2.2;
    claw.position.set(ox, -0.015, 0.14);
    g.add(claw);
  }
  // fluffy cuff
  const cuff = mesh(new THREE.TorusGeometry(0.075, 0.035, 12, 24), fur, { roughness: 0.95 });
  cuff.rotation.x = Math.PI / 2;
  cuff.position.set(0, 0, -0.09);
  g.add(cuff);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tuft = mesh(new THREE.SphereGeometry(0.02, 8, 6), fur, { roughness: 1 });
    tuft.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.055, -0.09 + (i % 2 === 0 ? 0.01 : -0.01));
    g.add(tuft);
  }
  return { group: g, restY: 0.09 };
}

const ITEM_BUILDERS = {
  slipper: buildSlipper,
  harisen: buildHarisen,
  bachi: buildBachi,
  pan: buildPan,
  golden: buildGolden,
  pawpunch: buildPawpunch,
};

// ---------------------------------------------------------------------------
// Costume toppers (mounted above the hanger hook)
// ---------------------------------------------------------------------------

function nurseTopper() {
  const t = new THREE.Group();
  const cap = mesh(new THREE.SphereGeometry(0.06, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xffffff, {
    emissive: 0xffffff,
  });
  t.add(cap);
  const cross1 = mesh(new THREE.BoxGeometry(0.06, 0.015, 0.015), 0xe53935, { emissive: 0xe53935 });
  cross1.position.y = 0.03;
  t.add(cross1);
  const cross2 = mesh(new THREE.BoxGeometry(0.015, 0.015, 0.06), 0xe53935, { emissive: 0xe53935 });
  cross2.position.y = 0.03;
  t.add(cross2);
  return t;
}

function dinoTopper() {
  const t = new THREE.Group();
  const hood = mesh(
    new THREE.SphereGeometry(0.065, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65),
    0x4caf50,
    { emissive: 0x4caf50 }
  );
  t.add(hood);
  for (let i = -2; i <= 2; i++) {
    const tooth = mesh(new THREE.ConeGeometry(0.008, 0.02, 6), 0xffffff, { emissive: 0xffffff });
    tooth.position.set(i * 0.018, 0, 0.055);
    tooth.rotation.x = Math.PI;
    t.add(tooth);
  }
  const eyeGeo = new THREE.SphereGeometry(0.008, 8, 6);
  const eyeL = mesh(eyeGeo, 0xffffff, { emissive: 0xffffff });
  eyeL.position.set(-0.03, 0.02, 0.045);
  t.add(eyeL);
  const eyeR = mesh(eyeGeo.clone(), 0xffffff, { emissive: 0xffffff });
  eyeR.position.set(0.03, 0.02, 0.045);
  t.add(eyeR);
  return t;
}

function spaceTopper() {
  const t = new THREE.Group();
  const helmet = mesh(new THREE.SphereGeometry(0.065, 20, 16), 0xe8e8ec, {
    emissive: 0xe8e8ec,
    metalness: 0.3,
    roughness: 0.3,
  });
  t.add(helmet);
  const visor = mesh(
    new THREE.SphereGeometry(0.045, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    0x2a6ee0,
    { emissive: 0x2a6ee0, metalness: 0.5, roughness: 0.15 }
  );
  visor.rotation.x = Math.PI * 0.55;
  visor.position.set(0, 0, 0.02);
  t.add(visor);
  return t;
}

function magicalTopper() {
  const t = new THREE.Group();
  const loopGeo = new THREE.SphereGeometry(0.03, 14, 10);
  const loopL = mesh(loopGeo, 0xff4fa3, { emissive: 0xff4fa3 });
  loopL.scale.set(1, 0.6, 0.4);
  loopL.position.set(-0.028, 0, 0);
  loopL.rotation.z = 0.4;
  t.add(loopL);
  const loopR = mesh(loopGeo.clone(), 0xff4fa3, { emissive: 0xff4fa3 });
  loopR.scale.set(1, 0.6, 0.4);
  loopR.position.set(0.028, 0, 0);
  loopR.rotation.z = -0.4;
  t.add(loopR);
  const knot = mesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), 0xffe14d, { emissive: 0xffe14d });
  t.add(knot);
  const tailGeo = new THREE.BoxGeometry(0.012, 0.03, 0.004);
  const tailL = mesh(tailGeo, 0xff4fa3, { emissive: 0xff4fa3 });
  tailL.position.set(-0.01, -0.025, 0);
  tailL.rotation.z = 0.3;
  t.add(tailL);
  const tailR = mesh(tailGeo.clone(), 0xff4fa3, { emissive: 0xff4fa3 });
  tailR.position.set(0.01, -0.025, 0);
  tailR.rotation.z = -0.3;
  t.add(tailR);
  return t;
}

function bearTopper() {
  const t = new THREE.Group();
  const band = mesh(new THREE.TorusGeometry(0.06, 0.007, 10, 20), 0x6b4423, { emissive: 0x6b4423 });
  band.rotation.x = Math.PI / 2;
  t.add(band);
  const earGeo = new THREE.SphereGeometry(0.022, 14, 10);
  const earL = mesh(earGeo, 0x6b4423, { emissive: 0x6b4423 });
  earL.position.set(-0.045, 0.02, 0);
  t.add(earL);
  const earR = mesh(earGeo.clone(), 0x6b4423, { emissive: 0x6b4423 });
  earR.position.set(0.045, 0.02, 0);
  t.add(earR);
  const innerGeo = new THREE.SphereGeometry(0.011, 10, 8);
  const innerL = mesh(innerGeo, 0xd9b48f, { emissive: 0xd9b48f });
  innerL.position.set(-0.045, 0.02, 0.012);
  t.add(innerL);
  const innerR = mesh(innerGeo.clone(), 0xd9b48f, { emissive: 0xd9b48f });
  innerR.position.set(0.045, 0.02, 0.012);
  t.add(innerR);
  return t;
}

function goldTopper() {
  const t = new THREE.Group();
  const goldOpts = { metalness: 1, roughness: 0.25 };
  const band = mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.03, 20), 0xffd700, {
    ...goldOpts,
    emissive: 0xffd700,
  });
  t.add(band);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spike = mesh(new THREE.ConeGeometry(0.01, 0.03, 6), 0xffd700, {
      ...goldOpts,
      emissive: 0xffd700,
    });
    spike.position.set(Math.cos(a) * 0.05, 0.03, Math.sin(a) * 0.05);
    t.add(spike);
  }
  const gem = mesh(new THREE.SphereGeometry(0.008, 10, 8), 0xd32f2f, {
    emissive: 0xd32f2f,
    emissiveIntensity: 0.3,
  });
  gem.position.set(0, 0.005, 0.05);
  t.add(gem);
  return t;
}

// ---------------------------------------------------------------------------
// Costume hangers: wire hanger + flat garment silhouette + topper
// ---------------------------------------------------------------------------

function garmentShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.16, -0.13);
  s.lineTo(-0.19, -0.22);
  s.lineTo(-0.13, -0.25);
  s.lineTo(-0.12, -0.5);
  s.lineTo(-0.17, -0.57);
  s.lineTo(0.17, -0.57);
  s.lineTo(0.12, -0.5);
  s.lineTo(0.13, -0.25);
  s.lineTo(0.19, -0.22);
  s.lineTo(0.16, -0.13);
  s.lineTo(0, -0.1);
  s.closePath();
  return s;
}
const GARMENT_GEO = new THREE.ExtrudeGeometry(garmentShape(), { depth: 0.02, bevelEnabled: false, curveSegments: 1 });

const COSTUME_CFG = {
  nurse: { color: 0xffffff, roughness: 0.7, topper: nurseTopper },
  dino: { color: 0x4caf50, roughness: 0.85, topper: dinoTopper },
  space: { color: 0xd8d8e0, roughness: 0.35, metalness: 0.3, topper: spaceTopper },
  magical: { color: 0xff69b4, roughness: 0.6, topper: magicalTopper },
  bear: { color: 0x8b5e34, roughness: 0.95, topper: bearTopper },
  gold: { color: 0xffd700, roughness: 0.25, metalness: 0.9, topper: goldTopper },
};

function buildHanger(id) {
  const cfg = COSTUME_CFG[id];
  const g = new THREE.Group();
  const hookCurl = mesh(new THREE.TorusGeometry(0.022, 0.004, 8, 16, Math.PI * 1.4), 0xaaaaaa, {
    metalness: 0.8,
    roughness: 0.3,
  });
  hookCurl.rotation.z = 2.4;
  hookCurl.position.y = 0.015;
  g.add(hookCurl);
  g.add(wireSegment(0, 0, -0.16, -0.13));
  g.add(wireSegment(0, 0, 0.16, -0.13));
  const garment = mesh(GARMENT_GEO, cfg.color, {
    metalness: cfg.metalness ?? 0.1,
    roughness: cfg.roughness ?? 0.75,
    emissive: cfg.color,
  });
  garment.position.z = -0.01;
  g.add(garment);
  const topperHolder = new THREE.Group();
  topperHolder.position.y = 0.04;
  topperHolder.add(cfg.topper());
  g.add(topperHolder);
  return { group: g, restY: 0, topperHolder };
}

// ---------------------------------------------------------------------------
// Furniture: item shelf (left wall) + costume hanger rail (front wall)
// ---------------------------------------------------------------------------

function buildShelf() {
  const g = new THREE.Group();
  const wood = 0x8b5a2b;
  const darkWood = 0x6b4423;
  const backPanel = mesh(new THREE.BoxGeometry(0.04, 1.3, 1.7), darkWood, { roughness: 0.8 });
  backPanel.position.set(-2.93, 0.75, -0.75);
  g.add(backPanel);
  const tierGeo = new THREE.BoxGeometry(0.35, 0.04, 1.7);
  const tier1 = mesh(tierGeo, wood, { roughness: 0.7 });
  tier1.position.set(-2.75, 0.46, -0.75);
  g.add(tier1);
  const tier2 = mesh(tierGeo.clone(), wood, { roughness: 0.7 });
  tier2.position.set(-2.75, 1.06, -0.75);
  g.add(tier2);
  const supGeo = new THREE.BoxGeometry(0.35, 1.3, 0.04);
  const supA = mesh(supGeo, darkWood, { roughness: 0.8 });
  supA.position.set(-2.75, 0.75, -1.58);
  g.add(supA);
  const supB = mesh(supGeo.clone(), darkWood, { roughness: 0.8 });
  supB.position.set(-2.75, 0.75, 0.08);
  g.add(supB);
  return g;
}

function buildHangerRail() {
  const g = new THREE.Group();
  const rod = mesh(new THREE.CylinderGeometry(0.015, 0.015, 3.3, 16), 0xaaaaaa, {
    metalness: 0.8,
    roughness: 0.3,
  });
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 2.0, 2.85);
  g.add(rod);
  const bracketGeo = new THREE.BoxGeometry(0.03, 0.15, 0.05);
  const b1 = mesh(bracketGeo, 0x888888, { metalness: 0.7, roughness: 0.4 });
  b1.position.set(-1.68, 2.0, 2.87);
  g.add(b1);
  const b2 = mesh(bracketGeo.clone(), 0x888888, { metalness: 0.7, roughness: 0.4 });
  b2.position.set(1.68, 2.0, 2.87);
  g.add(b2);
  return g;
}

// ---------------------------------------------------------------------------
// Fixed slot layout
// ---------------------------------------------------------------------------

const ITEM_ORDER = SLAP_ITEMS.filter((it) => it.id !== "hand").map((it) => it.id);
const COSTUME_ORDER = COSTUMES.filter((c) => c.id !== "suit").map((c) => c.id);

const ITEM_SLOT_Z = [-1.35, -0.75, -0.15];
function itemSlotPos(id) {
  const idx = ITEM_ORDER.indexOf(id);
  if (idx < 0) return null;
  const tier = idx < 3 ? 0 : 1;
  return { x: -2.7, y: tier === 0 ? 0.5 : 1.1, z: ITEM_SLOT_Z[idx % 3] };
}

const COSTUME_SLOT_X = [-1.6, -0.96, -0.32, 0.32, 0.96, 1.6];
function costumeSlotPos(id) {
  const idx = COSTUME_ORDER.indexOf(id);
  if (idx < 0) return null;
  return { x: COSTUME_SLOT_X[idx], y: 2.0, z: 2.8 };
}

// ---------------------------------------------------------------------------
// 叩き演出用: アイテムの3Dモデルだけを複製生成する(素手は対象外)
// ---------------------------------------------------------------------------

export function buildWeaponModel(id) {
  const b = ITEM_BUILDERS[id];
  return b ? b().group : null;
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export function createItemManager(scene) {
  const activeObjects = [];
  const spawned = new Set();

  scene.add(buildShelf());
  scene.add(buildHangerRail());

  function spawn(kind, id) {
    const key = kind + ":" + id;
    if (spawned.has(key)) return;
    if (kind === "item" && id === "hand") return;
    if (kind === "costume" && id === "suit") return;

    let built;
    let slot;
    if (kind === "item") {
      const fn = ITEM_BUILDERS[id];
      if (!fn) return;
      slot = itemSlotPos(id);
      if (!slot) return;
      built = fn();
    } else if (kind === "costume") {
      if (!COSTUME_CFG[id]) return;
      slot = costumeSlotPos(id);
      if (!slot) return;
      built = buildHanger(id);
    } else {
      return;
    }

    const group = built.group;
    const baseY = slot.y + (built.restY || 0);
    group.position.set(slot.x, baseY, slot.z);
    group.scale.setScalar(0.0001);

    const meshes = [];
    group.traverse((o) => {
      if (o.isMesh) {
        o.userData.kind = kind;
        o.userData.id = id;
        meshes.push(o);
      }
    });

    scene.add(group);

    activeObjects.push({
      group,
      meshes,
      kind,
      id,
      baseY,
      popping: true,
      popT: 0,
      selected: false,
      isCostume: kind === "costume",
      topperHolder: built.topperHolder || null,
      phase: Math.random() * Math.PI * 2,
    });
    spawned.add(key);
  }

  function clickableMeshes() {
    const out = [];
    for (const o of activeObjects) {
      if (!o.group.visible) continue;
      out.push(...o.meshes);
    }
    return out;
  }

  function setEquipped(itemId) {
    for (const o of activeObjects) {
      if (o.kind !== "item") continue;
      o.group.visible = !(itemId !== "hand" && o.id === itemId);
      o.selected = itemId !== "hand" && o.id === itemId ? false : o.selected;
    }
  }

  function setWornCostume(costumeId) {
    for (const o of activeObjects) {
      if (o.kind !== "costume") continue;
      o.group.visible = !(costumeId !== "suit" && o.id === costumeId);
    }
  }

  function update(t, dt) {
    for (const o of activeObjects) {
      const g = o.group;

      if (o.popping) {
        o.popT += dt;
        const x = Math.min(o.popT / POP_DURATION, 1);
        const s = Math.max(easeOutBack(x), 0);
        g.scale.setScalar(s);
        const flash = Math.max(0, 1 - x) * 1.4;
        for (const m of o.meshes) m.material.emissiveIntensity = flash;
        if (x >= 1) {
          o.popping = false;
          g.scale.setScalar(1);
          for (const m of o.meshes) m.material.emissiveIntensity = 0;
        }
        continue;
      }

      if (o.kind === "item") {
        g.position.y = o.baseY + Math.sin(t * 1.6 + o.phase) * 0.012;
        g.rotation.y += dt * 0.25;
      } else {
        g.rotation.z = Math.sin(t * 1.1 + o.phase) * 0.05;
        if (o.topperHolder) o.topperHolder.rotation.y = Math.sin(t * 0.8 + o.phase) * 0.15;
      }
    }
  }

  return { spawn, clickableMeshes, setEquipped, setWornCostume, update };
}
