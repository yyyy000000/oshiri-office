import * as THREE from "three";

// ---- colors ----
const PINK = 0xff9ecf;
const PINK_DARK = 0xff7fc0;
const PINK_CHEEK = 0xff5c9c;
const EMISSIVE_PINK = 0xff6fa5;
const DARK = 0x2a1c22;
const WHITE = 0xffffff;

function mat(color, roughness = 0.85, metalness = 0.02, emissive = null, emissiveIntensity = 0.15) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  if (emissive !== null) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = emissiveIntensity;
  }
  return m;
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function ease(x) {
  return x * x * (3 - 2 * x);
}

// 5-pointed star outline, first vertex pointing straight up (+Y in shape-local space)
function buildStarShape(outerR, innerR, points) {
  const shape = new THREE.Shape();
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step + Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export function createHoshi() {
  const group = new THREE.Group();
  const clickableMeshes = [];

  function addMesh(geo, material, parent, pos, scaleV, rot) {
    const m = new THREE.Mesh(geo, material);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (scaleV) m.scale.set(scaleV[0], scaleV[1], scaleV[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(m);
    return m;
  }

  // ---- sizing (overall height must stay <= 0.35m) ----
  const OUTER_R = 0.14;
  const INNER_R = 0.058;
  const DEPTH = 0.07;
  const BEVEL_T = 0.012;
  const BEVEL_S = 0.01;
  const LEG_H = 0.03;

  // dancer: root for hop / spin (idle hop + react jump-spin)
  const dancer = new THREE.Group();
  group.add(dancer);

  // squish: root for squash/stretch + sway, sits on top of the little feet
  const squish = new THREE.Group();
  squish.position.set(0, LEG_H, 0);
  dancer.add(squish);

  // ---- materials ----
  const bodyMat = mat(PINK, 0.85, 0.02, EMISSIVE_PINK, 0.15);
  const limbMat = mat(PINK_DARK, 0.85, 0.02, EMISSIVE_PINK, 0.1);
  const cheekMat = mat(PINK_CHEEK, 0.55, 0);
  const eyeMat = mat(DARK, 0.35, 0.05);
  const mouthMat = mat(DARK, 0.35, 0.05);
  const highlightMat = mat(WHITE, 0.2, 0);

  // ================= STAR BODY =================
  const starShape = buildStarShape(OUTER_R, INNER_R, 5);
  const starGeo = new THREE.ExtrudeGeometry(starShape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL_T,
    bevelSize: BEVEL_S,
    bevelSegments: 3,
    curveSegments: 8,
  });
  starGeo.translate(0, 0, -DEPTH / 2); // center on z=0 (front cap ends up facing -z)
  starGeo.computeBoundingBox();
  starGeo.translate(0, -starGeo.boundingBox.min.y, 0); // bottom-most point -> squish-local y=0
  starGeo.computeBoundingBox();

  const starTop = starGeo.boundingBox.max.y;
  const starFrontZ = starGeo.boundingBox.min.z + 0.002; // just proud of the front (-z) cap

  const starMesh = new THREE.Mesh(starGeo, bodyMat);
  squish.add(starMesh);
  clickableMeshes.push(starMesh);

  // ================= FACE (front, facing -z) =================
  const faceY = starTop * 0.42;

  function makeEye(xSign) {
    const grp = new THREE.Group();
    grp.position.set(xSign * 0.045, faceY, starFrontZ);
    squish.add(grp);
    const ball = addMesh(new THREE.SphereGeometry(0.017, 14, 12), eyeMat, grp, [0, 0, 0.005], [0.62, 1.25, 0.55]);
    const hl = addMesh(new THREE.SphereGeometry(0.006, 8, 8), highlightMat, grp, [0.006, 0.008, 0.015]);
    return { grp, ball, hl };
  }
  const eyeL = makeEye(-1);
  const eyeR = makeEye(1);

  const cheekL = addMesh(
    new THREE.SphereGeometry(0.02, 12, 10),
    cheekMat,
    squish,
    [-0.085, faceY - 0.03, starFrontZ - 0.004],
    [1, 0.7, 0.4]
  );
  const cheekR = addMesh(
    new THREE.SphereGeometry(0.02, 12, 10),
    cheekMat,
    squish,
    [0.085, faceY - 0.03, starFrontZ - 0.004],
    [1, 0.7, 0.4]
  );

  const mouth = addMesh(new THREE.TorusGeometry(0.02, 0.005, 8, 16, Math.PI), mouthMat, squish, [0, faceY - 0.05, starFrontZ]);
  mouth.rotation.x = Math.PI / 2 + 0.4;
  mouth.rotation.z = Math.PI;

  // ================= LIMBS (small stubby arms + feet) =================
  function makeArm(xSign) {
    const arm = addMesh(
      new THREE.CapsuleGeometry(0.018, 0.05, 4, 8),
      limbMat,
      squish,
      [xSign * OUTER_R * 0.62, faceY - 0.02, 0],
      null,
      [0, 0, xSign * 1.3]
    );
    clickableMeshes.push(arm);
    return arm;
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  function makeFoot(xSign) {
    const foot = addMesh(new THREE.ConeGeometry(0.024, LEG_H, 10), limbMat, dancer, [xSign * 0.06, LEG_H / 2, 0.01]);
    return foot;
  }
  const footL = makeFoot(-1);
  const footR = makeFoot(1);

  // ---- invisible hit-sphere: easier click target around the whole toy ----
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const hitSphere = addMesh(new THREE.SphereGeometry(OUTER_R * 1.3, 10, 8), hitMat, dancer, [0, LEG_H + starTop * 0.45, 0]);
  clickableMeshes.push(hitSphere);

  // ================= animation state =================
  let curP = 0;
  let targetP = 0;
  let idlePhase = 0;

  const HOP_PERIOD = 3.4;
  const HOP_DUR = 0.35;
  let hopTimer = 0;

  const REACT_DUR = 0.4;
  const LAND_SETTLE = 0.25;
  let reactActive = false;
  let reactTimer = 0;

  function update(t, dtIn) {
    const dt = clamp(dtIn || 0.016, 0, 0.05);

    // ease current speed multiplier toward target progress (tempo rises with BGM progress)
    curP += (targetP - curP) * Math.min(1, dt * 3);
    const spd = 1 + curP;
    idlePhase += dt * spd;

    // ---- idle sway (side to side) ----
    let swayZ = Math.sin(idlePhase * 1.6) * 0.12;

    // ---- idle squash (puni puni breathing) ----
    const squashPhase = Math.sin(idlePhase * 2.2);
    let squashY = 1 + squashPhase * 0.05;
    let squashXZ = 1 - squashPhase * 0.035;

    // ---- occasional idle hop ----
    hopTimer += dt * spd;
    let hopY = 0;
    if (hopTimer > HOP_PERIOD) {
      const ht = (hopTimer - HOP_PERIOD) / HOP_DUR;
      if (ht >= 1) {
        hopTimer = 0;
      } else {
        hopY = Math.sin(Math.PI * ht) * 0.03;
      }
    }

    let dancerY = hopY;
    let dancerRotY = 0;

    // ---- react: click reaction (jump + spin, then a puni landing squish) ----
    if (reactActive) {
      reactTimer += dt;
      if (reactTimer <= REACT_DUR) {
        const rt = reactTimer / REACT_DUR;
        dancerY = Math.sin(Math.PI * rt) * 0.12;
        dancerRotY = ease(rt) * Math.PI * 2;
        swayZ = 0;
      } else if (reactTimer <= REACT_DUR + LAND_SETTLE) {
        const lt = clamp((reactTimer - REACT_DUR) / LAND_SETTLE, 0, 1);
        dancerY = 0;
        dancerRotY = 0;
        const pulse = Math.sin(Math.PI * clamp(lt * 1.6, 0, 1)) * (1 - lt);
        squashY = 1 - pulse * 0.2;
        squashXZ = 1 + pulse * 0.14;
        swayZ *= lt;
      } else {
        reactActive = false;
      }
    }

    dancer.position.y = dancerY;
    dancer.rotation.y = dancerRotY;
    squish.rotation.z = swayZ;
    squish.scale.set(squashXZ, squashY, squashXZ);
  }

  function setProgress(p) {
    targetP = clamp(p, 0, 1);
  }

  function react() {
    reactActive = true;
    reactTimer = 0;
  }

  return { group, clickableMeshes, update, setProgress, react };
}
