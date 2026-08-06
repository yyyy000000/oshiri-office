import * as THREE from "three";
import { createOjisan } from "./ojisan.js";
import { createHoshi } from "./hoshi.js";

// エンディング分岐の演出セット
// 到着先: cloud(雲の上)/ moon(月面)/ butt(おしり星+おじさん星人)/ star(素手・星になる)
// 重ねがけ: クマ護衛(撫で1000)/ 星の仲間10体(星1000)

export const PLATFORM_TOP_Y = 60; // 到着面の高さ(おじさんの着地y)

export function createEndingFx(scene) {
  let destGroup = null;
  let clouds = null;
  const aliens = []; // おじさん星人(本体と同モデルの色替え)
  const starClones = []; // 色違いの星の仲間
  let bigStar = null; // 素手エンド: おじさんが星になる

  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });

  function buildClouds() {
    clouds = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.9 + Math.random() * 0.7, 10, 8), cloudMat);
        s.position.set((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 1.6);
        s.scale.y = 0.55;
        c.add(s);
      }
      c.position.set((Math.random() - 0.5) * 34, 14 + Math.random() * 34, (Math.random() - 0.5) * 34);
      clouds.add(c);
    }
    scene.add(clouds);
  }

  // おじさん本体と同じモデルを緑肌+白ブリーフに色替え
  function greenify(api) {
    const seen = new Map();
    api.group.traverse((o) => {
      if (o.isMesh && o.material && !Array.isArray(o.material)) {
        if (!seen.has(o.material)) {
          const m = o.material.clone();
          m.color.set(0x5cb86e);
          if (m.emissive) m.emissive.setScalar(0);
          seen.set(o.material, m);
        }
        o.material = seen.get(o.material);
      }
    });
    const brief = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.2, 0.42),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 })
    );
    brief.position.set(0, 0.52, 0);
    api.group.add(brief);
  }

  function buildDest(dest) {
    destGroup = new THREE.Group();
    if (dest === "cloud") {
      // 巨大な雲の足場
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = i < 8 ? 2.6 : 1.1;
        const s = new THREE.Mesh(new THREE.SphereGeometry(1.6 + Math.random() * 0.6, 12, 10), cloudMat);
        s.position.set(Math.cos(a) * r, -0.9 - Math.random() * 0.4, Math.sin(a) * r);
        s.scale.y = 0.6;
        destGroup.add(s);
      }
      destGroup.position.y = PLATFORM_TOP_Y - 0.1;
    } else if (dest === "moon") {
      const rock = new THREE.MeshStandardMaterial({ color: 0x9a9aa2, roughness: 0.95 });
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7.5, 1.4, 28), rock);
      disk.position.y = -0.7;
      destGroup.add(disk);
      const craterMat = new THREE.MeshStandardMaterial({ color: 0x707078, roughness: 0.95 });
      for (let i = 0; i < 7; i++) {
        const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.5 + Math.random() * 0.7, 0.7 + Math.random() * 0.7, 0.12, 16), craterMat);
        const a = Math.random() * Math.PI * 2;
        const r = 1.5 + Math.random() * 4.2;
        cr.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
        destGroup.add(cr);
      }
      // 地球が遠くに見える
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 20, 16),
        new THREE.MeshStandardMaterial({ color: 0x3d7edb, emissive: 0x18365f, emissiveIntensity: 0.6 })
      );
      earth.position.set(-9, 8, -14);
      destGroup.add(earth);
      destGroup.position.y = PLATFORM_TOP_Y;
    } else if (dest === "butt") {
      // お尻の形をした惑星(巨大な双球+割れ目)
      const buttMat = new THREE.MeshStandardMaterial({ color: 0xf5a9c0, roughness: 0.6 });
      for (const sx of [-1, 1]) {
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(3.6, 22, 18), buttMat);
        cheek.position.set(sx * 2.5, -2.9, 0);
        destGroup.add(cheek);
      }
      const cleft = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 5.2, 6.4),
        new THREE.MeshStandardMaterial({ color: 0xd07a95, roughness: 0.8 })
      );
      cleft.position.set(0, -3.1, 0);
      destGroup.add(cleft);
      destGroup.position.y = PLATFORM_TOP_Y - 0.4;
    }
    if (destGroup) scene.add(destGroup);
  }

  // おじさん星人(butt到着時のみ)。本体と同じcreateOjisanの色替え・空気椅子で座っている
  function buildAliens() {
    const spots = [
      [-3.4, 0.4, 1.6, 0.5], [-1.6, 0.7, -1.9, -0.4], [1.8, 0.7, 1.9, 2.6],
      [3.5, 0.4, -1.4, -2.2], [0.1, 0.9, 2.6, 3.1],
    ];
    for (const [x, y, z, rot] of spots) {
      const api = createOjisan(scene);
      greenify(api);
      scene.remove(api.group);
      destGroup.add(api.group);
      api.group.position.set(x, y, z);
      api.group.rotation.y = rot;
      api.group.scale.setScalar(0.9);
      aliens.push(api);
    }
  }

  // 色違いの星の仲間たち(星1000達成の重ねがけ)
  function buildStarClones() {
    for (let i = 0; i < 10; i++) {
      const api = createHoshi();
      const hueShift = (i + 1) / 11;
      api.group.traverse((o) => {
        if (o.isMesh && o.material && o.material.color) {
          const m = o.material.clone();
          m.color.offsetHSL(hueShift, 0, 0);
          if (m.emissive) m.emissive.offsetHSL(hueShift, 0, 0);
          o.material = m;
        }
      });
      api.group.scale.setScalar(0.75 + Math.random() * 0.35);
      scene.add(api.group);
      starClones.push({ api, angle: (i / 10) * Math.PI * 2, radius: 1.6 + (i % 3) * 0.45, h: -0.6 + (i % 4) * 0.5 });
    }
  }

  // 素手エンド: おじさんの位置に大きな星が生まれる
  function buildBigStar(pos) {
    bigStar = createHoshi();
    bigStar.group.scale.setScalar(4);
    bigStar.group.position.copy(pos);
    scene.add(bigStar.group);
    return bigStar;
  }

  function begin(dest, opts) {
    buildClouds();
    if (dest !== "star") buildDest(dest);
    if (dest === "butt") buildAliens();
    if (opts.starEscort) buildStarClones();
  }

  // 毎フレーム: 護衛の追従・星人と星のアニメ
  const _v = new THREE.Vector3();
  function update(t, dt, ojisanPos) {
    for (const a of aliens) a.update(t, dt);
    for (const s of starClones) {
      s.angle += dt * 0.9;
      s.api.group.position.set(
        ojisanPos.x + Math.cos(s.angle) * s.radius,
        ojisanPos.y + s.h + Math.sin(t * 2 + s.angle) * 0.2,
        ojisanPos.z + Math.sin(s.angle) * s.radius
      );
      s.api.update(t, dt);
    }
    if (bigStar) {
      bigStar.update(t, dt);
      bigStar.group.rotation.y += dt * 0.6;
    }
  }

  return { begin, update, buildBigStar, get hasAliens() { return aliens.length > 0; } };
}
