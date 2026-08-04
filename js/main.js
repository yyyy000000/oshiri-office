import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createOffice } from "./office.js";
import { createOjisan } from "./ojisan.js";
import { createBGM } from "./bgm.js";
import { SLAP_ITEMS, COSTUMES, createItemManager } from "./items.js";
import { createSlapper } from "./slapper.js";
import { createAnimal } from "./animal.js";
import { maybeSlapVoice, screamVoice } from "./voices.js";
import { getReply, getSlapLine, getStageLine, getEndingLine } from "./dialog.js";

const TOTAL_POINTS = 100000;
const STAGE_THRESHOLDS = [0, 5000, 12000, 22000, 35000, 50000, 68000, 85000]; // ステージ0〜7

// ---------- 3D シーン ----------
const app = document.getElementById("app");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a35);
scene.fog = new THREE.Fog(0x2a2a35, 8, 16);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(1.7, 1.6, -2.3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.85, 0);
controls.enableDamping = true;
controls.minDistance = 1.2;
controls.maxDistance = 6;
controls.maxPolarAngle = Math.PI * 0.55;

const office = createOffice(scene);
const ojisan = createOjisan(scene);
const items = createItemManager(scene);
const slapper = createSlapper(scene);
const animal = createAnimal(scene);
const bgm = createBGM();

// 宇宙(エンディング用の星空)
const starField = (() => {
  const n = 900;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 60 + Math.random() * 80;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(Math.random() * 2 - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) + 5;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0 });
  const pts = new THREE.Points(geo, mat);
  pts.visible = false;
  scene.add(pts);
  return pts;
})();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- 吹き出し / トースト ----------
const bubble = document.getElementById("bubble");
let bubbleTimer = 0;
function say(text, ms = 3500) {
  bubble.textContent = text;
  bubble.style.display = "block";
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => (bubble.style.display = "none"), ms);
  ojisan.startTalk(Math.min(ms, 2200));
}
function updateBubblePos() {
  if (bubble.style.display === "none") return;
  const p = ojisan.headPos().clone().project(camera);
  bubble.style.left = ((p.x * 0.5 + 0.5) * innerWidth) + "px";
  bubble.style.top = ((-p.y * 0.5 + 0.5) * innerHeight - 10) + "px";
}
const toastArea = document.getElementById("toast-area");
function toast(text) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  toastArea.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

// ---------- 会話 ----------
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
function sendChat() {
  const text = chatInput.value.trim();
  if (!text || ending) return;
  chatInput.value = "";
  say(getReply(text), 4200);
}
chatSend.addEventListener("click", sendChat);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
  e.stopPropagation();
});

// ---------- 効果音 ----------
// iOS: マナーモード中でもWebAudioを再生する(Safari 16.4+)
try {
  if (navigator.audioSession) navigator.audioSession.type = "playback";
} catch (_) { /* 非対応環境は無視 */ }

let audioCtx = null;
function ctx() {
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function noiseBurst(ac, t, { dur = 0.12, freq = 900, q = 0.8, gain = 0.9, type = "bandpass" }) {
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.03);
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t);
}
function thump(ac, t, { from = 180, to = 60, dur = 0.12, gain = 0.5, type = "sine" }) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.02);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}
function ding(ac, t, freq, dur = 0.5, gain = 0.25) {
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur);
}
// アイテムごとの叩き音
const ITEM_SOUNDS = {
  hand(ac, t) { noiseBurst(ac, t, { freq: 900, dur: 0.12 }); thump(ac, t, {}); },
  slipper(ac, t) { noiseBurst(ac, t, { freq: 1500, dur: 0.09, gain: 0.8 }); thump(ac, t, { from: 220, gain: 0.3 }); },
  harisen(ac, t) { noiseBurst(ac, t, { freq: 2600, dur: 0.14, q: 0.5, gain: 1 }); noiseBurst(ac, t + 0.02, { freq: 3400, dur: 0.07, gain: 0.5 }); },
  drum(ac, t) { thump(ac, t, { from: 140, to: 50, dur: 0.28, gain: 0.9 }); noiseBurst(ac, t, { freq: 4000, dur: 0.03, gain: 0.4, type: "highpass" }); },
  pan(ac, t) {
    thump(ac, t, { from: 90, to: 70, dur: 0.2, gain: 0.5 });
    for (const [f, g] of [[820, 0.35], [1230, 0.25], [2070, 0.18], [3300, 0.1]]) {
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = f * (0.98 + Math.random() * 0.04);
      const gg = ac.createGain();
      gg.gain.setValueAtTime(g, t);
      gg.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.connect(gg).connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.75);
    }
  },
  gold(ac, t) {
    noiseBurst(ac, t, { freq: 1200, dur: 0.1 });
    thump(ac, t, {});
    ding(ac, t + 0.03, 1568, 0.4, 0.18);
    ding(ac, t + 0.09, 2093, 0.5, 0.15);
    ding(ac, t + 0.15, 2637, 0.6, 0.12);
  },
  paw(ac, t) {
    // もふっとした低音ボヨン+キュッというぬいぐるみの鳴き
    thump(ac, t, { from: 120, to: 45, dur: 0.3, gain: 0.8, type: "triangle" });
    noiseBurst(ac, t, { freq: 500, dur: 0.2, q: 0.5, gain: 0.4, type: "lowpass" });
    const sq = ac.createOscillator();
    sq.type = "sine";
    sq.frequency.setValueAtTime(2400, t + 0.05);
    sq.frequency.exponentialRampToValueAtTime(3200, t + 0.12);
    sq.frequency.exponentialRampToValueAtTime(2000, t + 0.2);
    const sg = ac.createGain();
    sg.gain.setValueAtTime(0.15, t + 0.05);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    sq.connect(sg).connect(ac.destination);
    sq.start(t + 0.05);
    sq.stop(t + 0.25);
  },
};
function playItemSound(soundId) {
  const ac = ctx();
  (ITEM_SOUNDS[soundId] || ITEM_SOUNDS.hand)(ac, ac.currentTime);
}
function playRocketSound() {
  const ac = ctx();
  const t = ac.currentTime;
  const len = Math.floor(ac.sampleRate * 9);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(250, t);
  lp.frequency.linearRampToValueAtTime(1200, t + 2);
  lp.frequency.linearRampToValueAtTime(300, t + 8);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.55, t + 1.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 9);
  src.connect(lp).connect(g).connect(ac.destination);
  src.start(t);
}
function playDropSound() {
  const ac = ctx();
  const t = ac.currentTime;
  ding(ac, t, 880, 0.25, 0.2);
  ding(ac, t + 0.1, 1175, 0.3, 0.2);
}

// ---------- ポイント / 進行管理 ----------
const slapCountEl = document.getElementById("slap-count");
const slapBarFill = document.getElementById("slap-bar-fill");
const equipNameEl = document.getElementById("equip-name");
const equipPtsEl = document.getElementById("equip-pts");
const stageFlash = document.getElementById("stage-flash");

let points = Math.min(parseInt(new URLSearchParams(location.search).get("pt") || "0", 10) || 0, TOTAL_POINTS - 1);
let slapCount = 0;
let equipped = SLAP_ITEMS[0]; // 素手
let ending = false;

function currentStage(n) {
  let s = 0;
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) if (n >= STAGE_THRESHOLDS[i]) s = i;
  return s;
}
let stage = currentStage(points);

// 解禁済みアイテム/衣装を部屋に出す(起動時は即設置、プレイ中は降ってくる)
const dropped = new Set();
function checkUnlocks(announce) {
  for (const it of SLAP_ITEMS) {
    if (it.unlock > 0 && points >= it.unlock && !dropped.has("item:" + it.id)) {
      dropped.add("item:" + it.id);
      items.spawn("item", it.id);
      if (announce) {
        playDropSound();
        toast(`🎁 ${it.name} が降ってきた!(+${it.points}pt)`);
        say("おっ、なんか降ってきたぞ!?嫌な予感しかせんのう…", 3000);
      }
    }
  }
  for (const c of COSTUMES) {
    if (c.unlock > 0 && points >= c.unlock && !dropped.has("cos:" + c.id)) {
      dropped.add("cos:" + c.id);
      items.spawn("costume", c.id);
      if (announce) {
        playDropSound();
        toast(`👗 ${c.name} が降ってきた!クリックで着せ替え`);
        say("なんか可愛いのが落ちてきたが…まさかワシが着るんか?", 3200);
      }
    }
  }
}

function applyProgress() {
  const p = Math.min(points / TOTAL_POINTS, 1);
  ojisan.setProgress(p);
  office.setProgress(p);
  animal.setProgress(p);
  bgm.setIntensity(p);
  slapCountEl.textContent = points.toLocaleString();
  slapBarFill.style.width = (p * 100) + "%";
}
applyProgress();
checkUnlocks(false);

function flashStage() {
  stageFlash.classList.add("on");
  setTimeout(() => stageFlash.classList.remove("on"), 80);
}

function equip(def) {
  equipped = def;
  items.setEquipped(def.id);
  equipNameEl.textContent = def.name;
  equipPtsEl.textContent = def.points;
  toast(`✋ ${def.name} を装備!(1叩き +${def.points}pt)`);
}

// ---------- 動物(隠し要素) ----------
// 撫で回数はlocalStorageに保存(リロードしても継続)
const PETS_KEY = "oshiri_pets";
let petCount = parseInt(localStorage.getItem(PETS_KEY) || "0", 10) || 0;
function petSound() {
  const ac = ctx();
  const t = ac.currentTime;
  ding(ac, t, 1320, 0.12, 0.15);
  ding(ac, t + 0.08, 1760, 0.15, 0.12);
}
function checkPetUnlocks(announce) {
  if (petCount >= 100 && !dropped.has("cos:bear")) {
    dropped.add("cos:bear");
    items.spawn("costume", "bear");
    if (announce) {
      playDropSound();
      toast("🧸 隠し衣装『クマの着ぐるみ』がハンガーに出現!");
      say("おお!?クマ君とおそろいの服が出てきたぞ!", 3500);
    }
  }
  if (petCount >= 1000 && !dropped.has("cos:gold")) {
    dropped.add("cos:gold");
    dropped.add("item:pawpunch");
    items.spawn("costume", "gold");
    items.spawn("item", "pawpunch");
    if (announce) {
      playDropSound();
      toast("👑 隠し衣装『黄金スーツ』がハンガーに出現!");
      toast("🐾 最強アイテム『もふもふクマパンチ』が棚に出現!(+3000pt)");
      say("な、なんじゃこの黄金のオーラは…!クマ君、おぬし何者じゃ!?", 4500);
    }
  }
}
function onPetAnimal(hitPoint) {
  petCount++;
  localStorage.setItem(PETS_KEY, petCount);
  animal.pet();
  slapper.pet(hitPoint);
  petSound();
  checkPetUnlocks(true);
  if (petCount % 25 === 0 && petCount < 100) {
    toast(`🐻 クマ君なでなで ${petCount}回目…(100回撫でると何かが…?)`);
  } else if (petCount % 100 === 0 && petCount > 100 && petCount < 1000) {
    toast(`🐻 クマ君なでなで ${petCount}回目…(1000回でまだ何かが…?)`);
  } else if (petCount % 10 === 0) {
    toast(`🐻 クマ君なでなで ${petCount}回目`);
  }
}
checkPetUnlocks(false); // 保存済みの撫で回数ぶんを起動時に復元

// クマの巨大化: 10回撫でるごとに一段階、1000回で最大(おじさんの約3倍)
const BEAR_MAX_SCALE = 4.4;
const bearHomeStart = new THREE.Vector3(2.2, 0, 0.8);
const bearHomeEnd = new THREE.Vector3(1.5, 0, 1.0); // 大きくなったら壁から離す
function bearTargetScale() {
  const capped = Math.min(Math.floor(petCount / 10) * 10, 1000);
  return 1 + (BEAR_MAX_SCALE - 1) * (capped / 1000);
}
const _bearScaleV = new THREE.Vector3();
const _bearPosV = new THREE.Vector3();
function updateBearGrowth(dt) {
  const s = bearTargetScale();
  const k = 1 - Math.pow(0.05, dt); // なめらかに成長
  animal.group.scale.lerp(_bearScaleV.set(s, s, s), k);
  const g = (s - 1) / (BEAR_MAX_SCALE - 1);
  _bearPosV.lerpVectors(bearHomeStart, bearHomeEnd, g);
  _bearPosV.y = animal.group.position.y;
  animal.group.position.lerp(_bearPosV, k);
}
animal.group.scale.setScalar(bearTargetScale()); // 起動時は即適用

// デフォルトに戻すボタン
document.getElementById("reset-hand").addEventListener("click", (e) => {
  if (equipped.id !== "hand") equip(SLAP_ITEMS[0]);
  e.target.blur();
});
document.getElementById("reset-suit").addEventListener("click", (e) => {
  if (ojisan.getCostume() !== "suit") {
    ojisan.setCostume("suit");
    items.setWornCostume("suit");
    toast("👔 いつものスーツに戻した!");
    say("ふう、やっぱりスーツが落ち着くわい。", 2500);
  }
  e.target.blur();
});

// ---------- クリック処理(尻叩き / アイテム拾い / 着せ替え) ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downPos = null;
let bgmStarted = false;

renderer.domElement.addEventListener("pointerdown", (e) => {
  downPos = [e.clientX, e.clientY];
});
// タップ/クリックのたびに音声を解錠(iOS対策)
// iOSはタッチ開始ではオーディオ許可が下りないことがあるため、
// bgm.start()を毎回呼ぶ(再生中なら内部でresumeだけ行い二重再生はしない)
function unlockAudio() {
  bgmStarted = true;
  bgm.start();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}
document.addEventListener("pointerdown", unlockAudio);
document.addEventListener("touchend", unlockAudio, { passive: true });
document.addEventListener("click", unlockAudio);
renderer.domElement.addEventListener("pointerup", (e) => {
  if (ending) return;
  if (!downPos || Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) > 6) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);

  // 1) 動物(撫でる — 装備に関係なく手で)
  const animalHits = raycaster.intersectObjects(animal.clickableMeshes, true);
  if (animalHits.length > 0) {
    onPetAnimal(animalHits[0].point);
    return;
  }

  // 2) アイテム / 衣装
  const itemHits = raycaster.intersectObjects(items.clickableMeshes(), true);
  if (itemHits.length > 0) {
    const ud = itemHits[0].object.userData;
    if (ud.kind === "item") {
      const def = SLAP_ITEMS.find((s) => s.id === ud.id);
      if (def && def.id !== equipped.id) equip(def);
      return;
    }
    if (ud.kind === "costume") {
      const cur = ojisan.getCostume();
      const next = ud.id === cur ? "suit" : ud.id;
      ojisan.setCostume(next);
      items.setWornCostume(next);
      const def = COSTUMES.find((c) => c.id === next);
      toast(`👔 ${def ? def.name : next} にお着替え!`);
      say(next === "suit" ? "ふう、やっぱりスーツが落ち着くわい。" : "は、恥ずかしいのう…似合っとるか?", 3000);
      return;
    }
  }

  // 3) 尻叩き
  const hits = raycaster.intersectObjects(ojisan.buttMeshes, false);
  if (hits.length === 0) return;

  slapCount++;
  points = Math.min(points + equipped.points, TOTAL_POINTS);
  slapper.swing(equipped.id, hits[0].point, camera.position);
  ojisan.slap();
  playItemSound(equipped.sound);
  const voiceLine = maybeSlapVoice(ojisan.getCostume(), points / TOTAL_POINTS);
  if (voiceLine) say(voiceLine, 1800);
  applyProgress();
  checkUnlocks(true);

  const pop = document.createElement("div");
  pop.className = "slap-pop";
  pop.textContent = ["スパーン!", "ペチーン!", "バチーン!", "パァン!"][Math.floor(Math.random() * 4)];
  pop.style.left = e.clientX + "px";
  pop.style.top = e.clientY + "px";
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 750);

  if (points >= TOTAL_POINTS) {
    startEnding();
    return;
  }
  const newStage = currentStage(points);
  if (newStage !== stage) {
    stage = newStage;
    flashStage();
    say(getStageLine(stage), 4200);
  } else if (slapCount % 5 === 0) {
    say(getSlapLine(slapCount), 2600);
  }
});

// ---------- エンディング ----------
const endingEl = document.getElementById("ending");
const endingStats = document.getElementById("ending-stats");
document.getElementById("restart-btn").addEventListener("click", () => {
  location.href = location.pathname;
});
const startedAt = Date.now();
let endingPhase = 0;
let endingT = 0;

function startEnding() {
  ending = true;
  endingPhase = 1;
  slapCountEl.textContent = TOTAL_POINTS.toLocaleString();
  slapBarFill.style.width = "100%";
  flashStage();
  say(getEndingLine(), 6000);
  controls.enabled = false;
  office.openRoof();
  setTimeout(() => {
    endingPhase = 2;
    playRocketSound();
    say(screamVoice(ojisan.getCostume()), 4000);
    ojisan.launch();
  }, 2000);
}

function updateEnding(dt) {
  endingT += dt;
  const y = ojisan.group.position.y;
  const target = new THREE.Vector3(0, 0.9 + y, 0);
  controls.target.lerp(target, 0.08);
  const wantPos = new THREE.Vector3(2.0, y + 1.8, -2.4);
  camera.position.lerp(wantPos, 0.04);
  camera.lookAt(controls.target);
  const spaceMix = Math.min(y / 45, 1);
  scene.background.lerpColors(new THREE.Color(0x2a2a35), new THREE.Color(0x000005), spaceMix);
  if (scene.fog) scene.fog.far = 16 + spaceMix * 200;
  starField.visible = true;
  starField.material.opacity = spaceMix;
  starField.position.y = y * 0.5;
  if (y > 55 && endingPhase === 2) {
    endingPhase = 3;
    bgm.stop();
    const sec = Math.round((Date.now() - startedAt) / 1000);
    endingStats.textContent = `獲得ポイント: ${TOTAL_POINTS.toLocaleString()}pt / 叩いた回数: ${slapCount}発 / プレイ時間: ${Math.floor(sec / 60)}分${sec % 60}秒`;
    endingEl.classList.add("show");
    requestAnimationFrame(() => endingEl.classList.add("visible"));
  }
}

// ---------- ループ ----------
const clock = new THREE.Clock();
window.__dbg = () => ({
  y: +ojisan.group.position.y.toFixed(2),
  cam: camera.position.toArray().map((v) => +v.toFixed(2)),
  phase: endingPhase,
  points,
  costume: ojisan.getCostume(),
  equip: equipped.id,
  bgm: bgm.playing,
  petCount,
  pos: [+ojisan.group.position.x.toFixed(2), +ojisan.group.position.z.toFixed(2)],
});
// デバッグ用: 撫で回数を直接設定
window.__setPets = (n) => { petCount = n; localStorage.setItem(PETS_KEY, n); };
window.__items = items;
window.__animal = animal;
window.__slapper = slapper;
// デバッグ用: rAFが止まる環境でも時間を早送りして検証する
window.__ff = (sec = 1, steps = 60) => {
  const dt = sec / steps;
  for (let i = 0; i < steps; i++) {
    const t = clock.elapsedTime + i * dt;
    ojisan.update(t, dt);
    office.update(t, dt);
    items.update(t, dt);
    slapper.update(t, dt);
    animal.update(t, dt);
    updateBearGrowth(dt);
    if (ending) updateEnding(dt);
  }
  renderer.render(scene, camera);
  return window.__dbg();
};
say("おお、いらっしゃい。散らかっとるが、まあゆっくりしていきなさい。", 4500);

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  ojisan.update(clock.elapsedTime, dt);
  office.update(clock.elapsedTime, dt);
  items.update(clock.elapsedTime, dt);
  slapper.update(clock.elapsedTime, dt);
  animal.update(clock.elapsedTime, dt);
  updateBearGrowth(dt);
  if (ending) updateEnding(dt);
  else controls.update();
  updateBubblePos();
  renderer.render(scene, camera);
});
