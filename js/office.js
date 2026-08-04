import * as THREE from "three";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function createOffice(scene) {
  // Floor
  const floorGeom = new THREE.PlaneGeometry(6, 6);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x8b8b8b });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0 });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.1), wallMat);
  backWall.position.z = -3;
  backWall.position.y = 1.5;
  scene.add(backWall);

  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.1), wallMat);
  frontWall.position.z = 3;
  frontWall.position.y = 1.5;
  scene.add(frontWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 6), wallMat);
  leftWall.position.x = -3;
  leftWall.position.y = 1.5;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 6), wallMat);
  rightWall.position.x = 3;
  rightWall.position.y = 1.5;
  scene.add(rightWall);

  // Ceiling
  const ceilingGeom = new THREE.PlaneGeometry(6, 6);
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
  const ceiling = new THREE.Mesh(ceilingGeom, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 3;
  scene.add(ceiling);

  // Desk tabletop
  const deskTabletop = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.05, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x654321 })
  );
  deskTabletop.position.set(0, 0.72, 0.75);
  scene.add(deskTabletop);

  // Desk legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  for (let dx of [-0.6, 0.6]) {
    for (let dz of [-0.25, 0.25]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), legMat);
      leg.position.set(dx, 0.35, 0.75 + dz);
      scene.add(leg);
    }
  }

  // Keyboard
  const keyboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.02, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  keyboard.position.set(-0.3, 0.73, 0.9);
  scene.add(keyboard);

  // Mouse
  const mouse = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.03, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  mouse.position.set(0.3, 0.73, 0.95);
  scene.add(mouse);

  // Coffee mug
  const mugMat = new THREE.MeshStandardMaterial({ color: 0xaa6633 });
  const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 16), mugMat);
  mugBody.position.set(0.5, 0.8, 0.6);
  scene.add(mugBody);

  // Clutter registry: small chaotic objects that escalate/levitate with progress
  const clutterItems = [];
  function registerClutter(mesh) {
    clutterItems.push({
      mesh,
      basePos: mesh.position.clone(),
      baseRot: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
      tiltSeed: {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random() * 2 - 1
      },
      phase: Math.random() * Math.PI * 2,
      spinSeed: (Math.random() * 2 - 1) * 0.6,
      restY: mesh.position.y,
      levitating: false
    });
  }

  // Scattered papers on desk
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
  for (let i = 0; i < 8; i++) {
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.005, 0.25),
      paperMat
    );
    paper.position.set(
      (Math.random() - 0.5) * 0.8,
      0.73 + Math.random() * 0.05,
      0.95 + Math.random() * 0.3
    );
    paper.rotation.z = Math.random() * Math.PI * 2;
    paper.rotation.x = (Math.random() - 0.5) * 0.3;
    scene.add(paper);
    registerClutter(paper);
  }

  // Scattered papers on floor
  for (let i = 0; i < 5; i++) {
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.002, 0.2),
      paperMat
    );
    paper.position.set(
      (Math.random() - 0.5) * 2,
      0.01,
      1 + Math.random() * 1
    );
    paper.rotation.z = Math.random() * Math.PI * 2;
    scene.add(paper);
    registerClutter(paper);
  }

  // Stacked cardboard boxes in corner
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xb8860b });
  for (let i = 0; i < 4; i++) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      boxMat
    );
    box.position.set(-2.2, 0.2 + i * 0.42, -2.2);
    box.rotation.z = (Math.random() - 0.5) * 0.2;
    scene.add(box);
  }

  // Trash can
  const trashCan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x666666 })
  );
  trashCan.position.set(-2.5, 0.25, 0.5);
  scene.add(trashCan);

  // Crumpled paper around trash
  const crumpleMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  for (let i = 0; i < 6; i++) {
    const crumple = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      crumpleMat
    );
    crumple.position.set(
      -2.5 + (Math.random() - 0.5) * 0.6,
      0.1 + Math.random() * 0.3,
      0.5 + (Math.random() - 0.5) * 0.6
    );
    scene.add(crumple);
    registerClutter(crumple);
  }

  // Bookshelf on back wall
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x8b6914 });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 0.3), shelfMat);
  shelf.position.set(1.5, 1.2, -2.8);
  scene.add(shelf);

  // Tilted/fallen books
  const bookColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa8e6cf, 0xff8787];
  for (let i = 0; i < 8; i++) {
    const bookMat = new THREE.MeshStandardMaterial({ color: bookColors[i % bookColors.length] });
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.2, 0.08),
      bookMat
    );
    book.position.set(
      0.8 + Math.random() * 2,
      0.9 + Math.random() * 0.6,
      -2.7
    );
    book.rotation.z = (Math.random() - 0.5) * Math.PI;
    book.rotation.x = (Math.random() - 0.5) * 0.5;
    scene.add(book);
  }

  // Beer and coffee cans
  const canMat1 = new THREE.MeshStandardMaterial({ color: 0xffd700 });
  const canMat2 = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  for (let i = 0; i < 3; i++) {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8),
      i % 2 === 0 ? canMat1 : canMat2
    );
    can.position.set(
      -1.5 + i * 0.4,
      0.06,
      1.5 + Math.random() * 1
    );
    scene.add(can);
  }

  // Cable
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.8), cableMat);
  cable.position.set(-0.5, 0.8, 0.2);
  scene.add(cable);

  // Wall clock
  const clockFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  clockFace.position.set(-2.8, 2, -2.8);
  clockFace.rotation.y = Math.PI / 2;
  scene.add(clockFace);

  const clockHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.1, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );
  clockHand.position.set(-2.8, 2, -2.76);
  scene.add(clockHand);

  // Poster on right wall
  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 1),
    new THREE.MeshStandardMaterial({ color: 0xff6b6b })
  );
  poster.position.set(2.9, 2, 0);
  scene.add(poster);
  const posterBaseRotZ = poster.rotation.z;

  // Potted plant
  const potMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 0.2, 12),
    potMat
  );
  pot.position.set(2.5, 0.1, 1.5);
  scene.add(pot);

  const stemMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), stemMat);
  stem.position.set(2.5, 0.35, 1.5);
  stem.rotation.x = 0.3;
  scene.add(stem);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const ambientBase = { color: new THREE.Color(0xffffff), intensity: 0.5 };

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.position.set(2, 3, 2);
  scene.add(directionalLight);
  const directionalBase = { color: new THREE.Color(0xffffff), intensity: 0.7 };

  const deskLamp = new THREE.PointLight(0xffcc99, 0.8);
  deskLamp.position.set(0.4, 1.2, 0.7);
  scene.add(deskLamp);
  const deskLampBase = { color: new THREE.Color(0xffcc99), intensity: 0.8 };

  // Escalation target colors
  const sunsetColor = new THREE.Color(0xff2f6d);
  const deskLampHotColor = new THREE.Color(0xff1a66);
  const wallEmissiveHot = new THREE.Color(0x440000);
  const brightWarmColor = new THREE.Color(0xfff2d9);

  // --- Progression state ---
  let progress = 0;

  function setProgress(p) {
    progress = clamp01(p);

    // Lighting: neutral white -> hot sunset red/magenta; ambient dims slightly
    ambientLight.color.copy(ambientBase.color).lerp(sunsetColor, progress * 0.7);
    ambientLight.intensity = lerp(ambientBase.intensity, ambientBase.intensity * 0.8, progress);

    directionalLight.color.copy(directionalBase.color).lerp(sunsetColor, progress);

    // Desk lamp color shift
    deskLamp.color.copy(deskLampBase.color).lerp(deskLampHotColor, progress);


    // Clutter chaos: wilder tilt, and levitation from p >= 0.5
    const tiltAmount = progress * Math.PI * 1.4;
    const liftT = smoothstep(0.5, 1.0, progress);
    const maxLift = 1.3;
    for (const item of clutterItems) {
      item.mesh.rotation.x = item.baseRot.x + item.tiltSeed.x * tiltAmount;
      item.mesh.rotation.y = item.baseRot.y + item.tiltSeed.y * tiltAmount;
      item.mesh.rotation.z = item.baseRot.z + item.tiltSeed.z * tiltAmount;
      item.restY = item.basePos.y + liftT * maxLift;
      item.mesh.position.x = item.basePos.x;
      item.mesh.position.y = item.restY;
      item.mesh.position.z = item.basePos.z;
      item.levitating = progress >= 0.5;
    }

    // Walls: faint red emissive tint from p >= 0.8
    const wallHeat = smoothstep(0.8, 1.0, progress);
    wallMat.emissive.copy(wallEmissiveHot).multiplyScalar(wallHeat * 0.5);

    // Poster flips upside down from p >= 0.8
    const flipT = smoothstep(0.8, 0.95, progress);
    poster.rotation.z = posterBaseRotZ + Math.PI * flipT;
  }

  // --- Roof opening (rocket-launch ending) ---
  let roofOpening = false;
  let roofOpenStartT = null;
  const roofOpenDuration = 1.0;
  let roofSnapshotAmbientColor = null;
  let roofSnapshotDirectionalColor = null;
  let roofSnapshotDeskLampColor = null;
  let roofSnapshotAmbientIntensity = 0;

  function openRoof() {
    ceiling.visible = false;
    roofOpening = true;
    roofOpenStartT = null;
    roofSnapshotAmbientColor = ambientLight.color.clone();
    roofSnapshotDirectionalColor = directionalLight.color.clone();
    roofSnapshotDeskLampColor = deskLamp.color.clone();
    roofSnapshotAmbientIntensity = ambientLight.intensity;
  }

  function update(t, dt) {
    if (roofOpening) {
      if (roofOpenStartT === null) roofOpenStartT = t;
      const rp = clamp01((t - roofOpenStartT) / roofOpenDuration);
      ambientLight.color.copy(roofSnapshotAmbientColor).lerp(brightWarmColor, rp);
      ambientLight.intensity = lerp(roofSnapshotAmbientIntensity, 0.9, rp);
      directionalLight.color.copy(roofSnapshotDirectionalColor).lerp(brightWarmColor, rp);
      deskLamp.color.copy(roofSnapshotDeskLampColor).lerp(brightWarmColor, rp);
      if (rp >= 1) roofOpening = false;
    }

    if (progress < 0.5) return;

    const shakeOn = progress >= 0.85;
    const bobAmp = lerp(0.03, 0.09, smoothstep(0.5, 1.0, progress));
    const shakeAmp = shakeOn ? lerp(0.0, 0.12, smoothstep(0.85, 1.0, progress)) : 0;

    for (const item of clutterItems) {
      if (!item.levitating) continue;
      const bob = Math.sin(t * 1.6 + item.phase) * bobAmp;
      item.mesh.position.y = item.restY + bob;
      item.mesh.rotation.y += item.spinSeed * dt;
      if (shakeOn) {
        item.mesh.position.x = item.basePos.x + Math.sin(t * 7 + item.phase) * shakeAmp;
        item.mesh.position.z = item.basePos.z + Math.cos(t * 6.3 + item.phase * 1.3) * shakeAmp;
      }
    }
  }

  setProgress(0);

  return { setProgress, openRoof, update };
}
