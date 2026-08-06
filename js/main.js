import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createOffice } from "./office.js";
import { createOjisan } from "./ojisan.js";
import { createBGM, TRACKS } from "./bgm.js";
import { SLAP_ITEMS, COSTUMES, createItemManager } from "./items.js";
import { createSlapper } from "./slapper.js";
import { createFPSControls } from "./fpscontrols.js";
import { createAnimal } from "./animal.js";
import { createHoshi, HOSHI_LINES } from "./hoshi.js";
import { maybeSlapVoice, screamVoice } from "./voices.js";
import { getReply, getSlapLine, getStageLine, getEndingLine, ENDING_TEXTS, getCostumeEndLine } from "./dialog.js";
import { createEndingFx, PLATFORM_TOP_Y } from "./ending.js";

const TOTAL_POINTS = 1000000;
// ステージ演出の閾値: 序盤はアイテム出現(3,500/8,000/20,000/100,000)に同期
const STAGE_THRESHOLDS = [0, 3500, 8000, 20000, 100000, 300000, 550000, 800000]; // ステージ0〜7

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

const fps = createFPSControls(camera, renderer.domElement);
const office = createOffice(scene);
const ojisan = createOjisan(scene);
const items = createItemManager(scene);
const slapper = createSlapper(scene);
const animal = createAnimal(scene);
const hoshi = createHoshi();
hoshi.group.position.set(0.5, 0.745, 0.55); // デスクの天板の上
scene.add(hoshi.group);
const endFx = createEndingFx(scene);
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
const hoshiBubble = document.getElementById("hoshi-bubble");
const carrieBubble = document.getElementById("carrie-bubble");
let bubbleTimer = 0;
let hoshiBubbleTimer = 0;
let carrieBubbleTimer = 0;
function say(text, ms = 3500) {
  bubble.textContent = text;
  bubble.style.display = "block";
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => (bubble.style.display = "none"), ms);
  ojisan.startTalk(Math.min(ms, 2200));
}
function sayHoshi(text, ms = 3000) {
  hoshiBubble.textContent = text;
  hoshiBubble.style.display = "block";
  clearTimeout(hoshiBubbleTimer);
  hoshiBubbleTimer = setTimeout(() => (hoshiBubble.style.display = "none"), ms);
}
function sayCarrie(text, ms = 2400) {
  carrieBubble.textContent = text;
  carrieBubble.style.display = "block";
  clearTimeout(carrieBubbleTimer);
  carrieBubbleTimer = setTimeout(() => (carrieBubble.style.display = "none"), ms);
}
// 話し手の頭上に吹き出しを置く。画面外や背後のときは画面上部に固定表示
// (FPSで下を向いていてもセリフが読めるように)
const _camDir = new THREE.Vector3();
const _toSpeaker = new THREE.Vector3();
function placeBubble(el, worldPos, pinnedTop) {
  if (el.style.display === "none") return;
  camera.getWorldDirection(_camDir);
  _toSpeaker.copy(worldPos).sub(camera.position);
  const behind = _camDir.dot(_toSpeaker) <= 0.01;
  const p = worldPos.clone().project(camera);
  const x = (p.x * 0.5 + 0.5) * innerWidth;
  const y = (-p.y * 0.5 + 0.5) * innerHeight - 10;
  const off = behind || x < 50 || x > innerWidth - 50 || y < 60 || y > innerHeight - 20;
  el.classList.toggle("pinned", off);
  if (off) {
    el.style.left = "50%";
    el.style.top = pinnedTop + "px";
  } else {
    el.style.left = x + "px";
    el.style.top = y + "px";
  }
}
const _hoshiHead = new THREE.Vector3();
const _carrieHead = new THREE.Vector3(2.5, 1.95, 2.3); // 警備員キャリーちゃんの頭上(固定)
function updateBubblePos() {
  placeBubble(bubble, ojisan.headPos(), 90);
  _hoshiHead.copy(hoshi.group.position);
  _hoshiHead.y += 0.4;
  placeBubble(hoshiBubble, _hoshiHead, 170);
  placeBubble(carrieBubble, _carrieHead, 250);
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
// Enter送信はしない(漢字変換の確定Enterで誤送信するため、送信は送信ボタンのみ)
chatInput.addEventListener("keydown", (e) => {
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
  paper(ac, t) {
    noiseBurst(ac, t, { freq: 1600, dur: 0.11, q: 0.6, gain: 0.85 });
    noiseBurst(ac, t + 0.015, { freq: 700, dur: 0.08, gain: 0.4, type: "lowpass" });
    thump(ac, t, { from: 200, to: 90, dur: 0.08, gain: 0.25 });
  },
  gun(ac, t) {
    // ラタタタッ!と4連射
    for (let i = 0; i < 4; i++) {
      const tt = t + i * 0.055;
      noiseBurst(ac, tt, { freq: 800, dur: 0.045, q: 0.7, gain: 0.65 });
      thump(ac, tt, { from: 220, to: 70, dur: 0.05, gain: 0.45 });
    }
    noiseBurst(ac, t + 0.23, { freq: 2500, dur: 0.06, gain: 0.25, type: "highpass" });
  },
  baguette(ac, t) {
    // バフッという鈍いパン打撃
    noiseBurst(ac, t, { freq: 500, dur: 0.14, q: 0.5, gain: 0.9, type: "lowpass" });
    noiseBurst(ac, t + 0.02, { freq: 300, dur: 0.1, gain: 0.4, type: "lowpass" });
    thump(ac, t, { from: 150, to: 60, dur: 0.12, gain: 0.5 });
  },
  guitar(ac, t) {
    // ジャーン!というかき鳴らし
    noiseBurst(ac, t, { freq: 3000, dur: 0.04, gain: 0.35, type: "highpass" });
    for (const [i, f] of [82.4, 110, 146.8, 196, 246.9].entries()) {
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f * (0.995 + Math.random() * 0.01);
      const g = ac.createGain();
      const tt = t + i * 0.012;
      g.gain.setValueAtTime(0.12, tt);
      g.gain.exponentialRampToValueAtTime(0.001, tt + 0.9);
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(2500, tt);
      lp.frequency.exponentialRampToValueAtTime(500, tt + 0.8);
      osc.connect(lp).connect(g).connect(ac.destination);
      osc.start(tt);
      osc.stop(tt + 0.95);
    }
    thump(ac, t, { from: 120, to: 70, dur: 0.1, gain: 0.3 });
  },
  kasa(ac, t) {
    // ビュッというスイング風切り+ペチッ
    const len = Math.floor(ac.sampleRate * 0.18);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(600, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + 0.15);
    bp.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t);
    noiseBurst(ac, t + 0.13, { freq: 1800, dur: 0.06, gain: 0.7 });
  },
  squeak(ac, t) {
    // ラバーダックのキュッキュ
    noiseBurst(ac, t, { freq: 900, dur: 0.05, gain: 0.4 });
    for (const [dt0, f0, f1] of [[0, 2200, 3400], [0.09, 3000, 2000]]) {
      const sq = ac.createOscillator();
      sq.type = "square";
      sq.frequency.setValueAtTime(f0, t + dt0);
      sq.frequency.exponentialRampToValueAtTime(f1, t + dt0 + 0.08);
      const sg = ac.createGain();
      sg.gain.setValueAtTime(0.12, t + dt0);
      sg.gain.exponentialRampToValueAtTime(0.001, t + dt0 + 0.1);
      sq.connect(sg).connect(ac.destination);
      sq.start(t + dt0);
      sq.stop(t + dt0 + 0.12);
    }
  },
  star(ac, t) {
    // キラキラ星アルペジオ+軽い打撃音
    noiseBurst(ac, t, { freq: 1400, dur: 0.08, gain: 0.5 });
    thump(ac, t, { from: 200, to: 80, dur: 0.1, gain: 0.4 });
    ding(ac, t, 1568, 0.3, 0.2);
    ding(ac, t + 0.06, 1975, 0.35, 0.18);
    ding(ac, t + 0.12, 2637, 0.5, 0.15);
    ding(ac, t + 0.18, 3136, 0.6, 0.12);
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
let onlyHandUsed = true; // 素手のみでクリアすると特別エンド

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
  hoshi.setProgress(p);
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
  if (petCount % 10 === 0) {
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

// 素手とスーツも実物として棚/ハンガーに常設(使用中は非表示になる)
items.spawn("item", "hand");
items.spawn("costume", "suit");
items.setEquipped("hand");
items.setWornCostume("suit");

// ---------- 部屋オブジェクトのクリックギミック ----------
const CLICK_UNLOCKS = {
  trash:  { count: 50,  kind: "item",    id: "newspaper",  name: "丸めた新聞紙",
            line: "ゴミ箱から新聞紙!?昭和のしつけ道具じゃないか…" },
  boxes:  { count: 100, kind: "costume", id: "boxrobo",    name: "段ボールロボ",
            line: "段ボールから服が…ワシ、ロボになるんか?" },
  locker: { count: 50,  kind: "costume", id: "tuxedo",     name: "タキシード",
            line: "ロッカーにタキシード…誰のじゃ?まあ、着るがの。" },
  fridge: { count: 150, kind: "costume", id: "penguin",    name: "ペンギンの着ぐるみ",
            line: "冷蔵庫からペンギン服…ひんやりしとるのう!" },
  muscle: { count: 500, kind: "item",    id: "machinegun", name: "マシンガン",
            line: "ちょ、キャリーちゃん!?それはやりすぎじゃろ!!" },
  umbrella: { count: 100, kind: "item",  id: "kasa",       name: "ビニール傘",
            line: "その傘、誰のか知らんが…借りるんかの?ワシを叩くのに?" },
  safe:   { count: 200, kind: "item",    id: "duck",       name: "金庫のラバーダック",
            line: "き、金庫の中身はアヒルじゃったんか…!ワシも知らんかったわい!" },
  musicposter: { count: 30, kind: "bgm", id: "android",    name: "ぴっちぴち・アンドロイド",
            line: "おっ、このアーティストの曲が聴きたくなってきたのう。" },
  // レコードの山は2段階解禁(配列は多段階解禁として扱われる)。To the zooは星300クリック
  records: [
    { count: 80,  kind: "bgm", id: "gedatsu", name: "解脱",
      line: "このレコード…なんだか心が無になりそうじゃ…。" },
    { count: 200, kind: "bgm", id: "alice",   name: "Alice fell down",
      line: "ほう、不思議な曲が出てきたのう。誰の落とし物じゃ?" },
  ],
};
// クリック回数を記録する全オブジェクト(ハズレも含む — 宝探し用)
const CLICK_NAMES = {
  trash: "ゴミ箱", boxes: "段ボール", locker: "ロッカー", fridge: "冷蔵庫", muscle: "警備員キャリーちゃん",
  player: "レコードプレイヤー", records: "レコードの山", musicposter: "音楽ポスター",
  copier: "コピー機", cooler: "ウォーターサーバー", safe: "金庫",
  fan: "扇風機", umbrella: "傘", dartboard: "ダーツボード", plant: "観葉植物",
  hoshi: "星",
};
// BGM管理
function trackTitle(id) {
  const t = TRACKS.find((x) => x.id === id);
  return t ? t.title : id;
}
function availableTracks() {
  const list = ["heya", "sekkai"];
  if (dropped.has("bgm:android")) list.push("android");
  if (dropped.has("bgm:gedatsu")) list.push("gedatsu");
  if (dropped.has("bgm:alice")) list.push("alice");
  if (dropped.has("bgm:zoo")) list.push("zoo");
  return list;
}
function cycleTrack() {
  const avail = availableTracks();
  const cur = bgm.track;
  const idx = avail.indexOf(cur);
  const next = avail[(idx + 1) % avail.length];
  bgm.setTrack(next);
  if (!bgm.playing) bgm.start();
  toast(`♪ ${trackTitle(next)}`);
}
const CLICKS_KEY = "oshiri_clicks";
let clicks = {};
try { clicks = JSON.parse(localStorage.getItem(CLICKS_KEY) || "{}") || {}; } catch { clicks = {}; }
function saveClicks() { localStorage.setItem(CLICKS_KEY, JSON.stringify(clicks)); }
function tickSound() {
  const ac = ctx();
  const t = ac.currentTime;
  noiseBurst(ac, t, { freq: 2200, dur: 0.04, gain: 0.3, type: "highpass" });
  thump(ac, t, { from: 320, to: 180, dur: 0.05, gain: 0.2 });
}
function checkClickUnlocks(announce) {
  for (const [cid, cfgOrList] of Object.entries(CLICK_UNLOCKS)) {
    for (const cfg of [].concat(cfgOrList)) {
      const key = (cfg.kind === "item" ? "item:" : cfg.kind === "costume" ? "cos:" : "bgm:") + cfg.id;
      if ((clicks[cid] || 0) >= cfg.count && !dropped.has(key)) {
        dropped.add(key);
        if (cfg.kind === "bgm") {
          if (announce) {
            playDropSound();
            toast(`🎵 新しいBGM『${cfg.name}』を獲得!レコードプレイヤーで切替できます`);
            say(cfg.line, 3800);
          }
        } else {
          items.spawn(cfg.kind, cfg.id);
          if (announce) {
            playDropSound();
            toast(`${cfg.kind === "item" ? "🎁" : "👗"} 隠し${cfg.kind === "item" ? "アイテム" : "衣装"}『${cfg.name}』が出現!`);
            say(cfg.line, 3800);
          }
        }
      }
    }
  }
}
// 警備員キャリーちゃん: クリックの20%で1〜2語の過激なひとことをぼそっと言う
const CARRIE_LINES = [
  "……排除。", "……殲滅。", "……粛清?", "……制圧完了。", "……ロックオン。",
  "……交戦許可を。", "……武力行使。", "……焦土作戦。", "……対象、確認。", "……逃がさない。",
  "……包囲済み。", "……掃討。", "……漏れなく。", "……更地に。", "……跡形もなく。",
  "……容赦不要。", "……慈悲は経費。", "……武器庫、満タン。", "……安全装置?外した。", "……照準、良好。",
  "……火力こそ正義。", "……会話終了。", "……傾聴。のち砲撃。", "……平和(暫定)。", "……敵、未定。",
  "……全方位警戒。", "……瞬殺希望。", "……過剰防衛上等。", "……鎮圧予定。", "……立入、禁止。",
  "……忠告は一度。", "……次は撃つ。", "……もう撃ちたい。", "……指がうずく。", "……嵐、呼ぶ?",
  "……静粛に。永遠に。", "……命拾い。", "……今日は見逃す。", "……燃やす?", "……冷凍も可。",
  "……後始末は任せろ。", "……道具は選ばない。", "……素手でも可。", "……逃走は運動。", "……無駄。全部。",
  "……勝率100%。", "……戦場が呼んでる。", "……給料分は壊す。", "……残業?殲滅する。", "……おじさんは、守る。",
];
function onObjectClick(clickId) {
  clicks[clickId] = (clicks[clickId] || 0) + 1;
  saveClicks();
  office.react(clickId);
  if (clickId === "muscle" && Math.random() < 0.2) {
    sayCarrie(CARRIE_LINES[Math.floor(Math.random() * CARRIE_LINES.length)]);
  }
  if (clickId === "player") {
    // レコードプレイヤーはBGM切替(獲得済みの曲を順番に)
    cycleTrack();
    return;
  }
  tickSound();
  checkClickUnlocks(true);
  const n = clicks[clickId];
  if (n % 10 === 0) {
    toast(`👆 ${CLICK_NAMES[clickId] || clickId}: ${n}回目`);
  }
}
checkClickUnlocks(false); // 保存済みクリック数ぶんを起動時に復元

// ---------- マスコット「星」(デスクの上・隠し要素つき) ----------
// クリック数は clicks.hoshi として oshiri_clicks に永続化。セリフ本体はhoshi.jsのHOSHI_LINES
// ヒント: 対象別の専用の言い回し(必要回数は教えない)
const HINT_LINES = {
  trash: "そこのゴミ箱、もっと叩いてみろよ。なんか出るかもな。",
  boxes: "あの段ボールの山、気にならねえか?オレは気になるね。",
  locker: "ロッカーってのは、しつこく開けたがるやつに応えるもんだぜ。",
  fridge: "あの冷蔵庫、何入ってんだろうな?なあ?",
  muscle: "警備員のキャリーちゃん、しつこくつついたら何かくれそうだぜ。自己責任な。",
  musicposter: "あのポスターのやつの曲、聴きたくなってきただろ?",
  records: "レコードの山ってのは、掘るためにあるんだぜ。",
  umbrella: "壁の傘、突っついてみろよ。雨の日だけの道具じゃねーぜ。",
  safe: "あの金庫、何入ってんだろうな。開けたくならねえか?",
  pet100: "あのクマ、もっとかわいがってやれよ。妬いてねーし。",
  pet1000: "クマを撫で続けたやつだけが見られる景色があるらしいぜ。",
  hoshi300: "オレ様を構い続けたやつには、いい曲を聴かせてやるよ。",
  hoshi500: "オレ様をもっとクリックしろよ。いいことあるぜ、たぶんな。",
  hoshi1000: "オレ様を愛し続けたやつには…最強のご褒美だ。F**k yeah!",
};
// おじさんへの質問ネタ振り(dialog.jsの全キーワードエントリを網羅)
// 「〜について質問」が自然な話題キーワード
const QUESTION_TOPICS = [
  "名前", "仕事", "掃除", "尻", "音楽", "疲れ", "ビール", "家族", "ラーメン",
  "天気", "休み", "上司", "ゴルフ", "野球", "パチンコ", "カラオケ", "若い頃",
  "給料", "結婚", "ダイエット", "健康診断", "腰痛", "スマホ", "星", "宇宙",
  "ロケット", "夢", "好物", "タバコ", "ペット", "老後", "ダジャレ",
  "アヒル", "バゲット", "ギター", "トロフィー", "フィーバー", "椅子",
];
const QUESTION_HINT_TEMPLATES = [
  (t) => `おっさんに「${t}」について質問してみ?たぶん面白いぜ。`,
  (t) => `ヒマなら、おっさんに「${t}」の話でも聞いてやれよ。`,
  (t) => `おっさんな、「${t}」って言われると喋りだすぜ。試してみな。`,
];
// そのまま声をかける形が自然な言葉
const SAY_TOPICS = ["こんにちは", "おはよう", "ありがとう", "ばか", "がんばれ", "かわいい", "帰りたい"];
const SAY_HINT_TEMPLATES = [
  (t) => `おっさんに「${t}」って言ってやれよ。`,
  (t) => `試しにおっさんに「${t}」って言ってみな。反応が笑えるぜ。`,
];
function lockedHintPool() {
  const pool = [];
  for (const [cid, cfgOrList] of Object.entries(CLICK_UNLOCKS)) {
    const anyLocked = [].concat(cfgOrList).some((cfg) => {
      const key = (cfg.kind === "item" ? "item:" : cfg.kind === "costume" ? "cos:" : "bgm:") + cfg.id;
      return !dropped.has(key);
    });
    if (anyLocked && HINT_LINES[cid]) pool.push(HINT_LINES[cid]);
  }
  if (!dropped.has("cos:bear")) pool.push(HINT_LINES.pet100);
  else if (!dropped.has("cos:gold")) pool.push(HINT_LINES.pet1000);
  if (!dropped.has("bgm:zoo")) pool.push(HINT_LINES.hoshi300);
  else if (!dropped.has("cos:hoshi")) pool.push(HINT_LINES.hoshi500);
  else if (!dropped.has("item:starrod")) pool.push(HINT_LINES.hoshi1000);
  return pool;
}
function hoshiLineOnClick() {
  // 喋るのは2割のクリックのみなので、喋る時のヒント率は3割(=クリック全体の約6%)
  // 半々で隠し要素ヒント/おじさんへの質問ネタ振り
  if (Math.random() < 0.3) {
    const pool = lockedHintPool();
    if (pool.length > 0 && Math.random() < 0.5) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
    if (Math.random() < SAY_TOPICS.length / (SAY_TOPICS.length + QUESTION_TOPICS.length)) {
      const t = SAY_TOPICS[Math.floor(Math.random() * SAY_TOPICS.length)];
      return SAY_HINT_TEMPLATES[Math.floor(Math.random() * SAY_HINT_TEMPLATES.length)](t);
    }
    const t = QUESTION_TOPICS[Math.floor(Math.random() * QUESTION_TOPICS.length)];
    return QUESTION_HINT_TEMPLATES[Math.floor(Math.random() * QUESTION_HINT_TEMPLATES.length)](t);
  }
  return HOSHI_LINES[Math.floor(Math.random() * HOSHI_LINES.length)];
}
function hoshiSound() {
  const ac = ctx();
  const t = ac.currentTime;
  ding(ac, t, 1760, 0.1, 0.14);
  ding(ac, t + 0.06, 2349, 0.14, 0.12);
}
function checkHoshiUnlocks(announce) {
  const n = clicks.hoshi || 0;
  if (n >= 300 && !dropped.has("bgm:zoo")) {
    dropped.add("bgm:zoo");
    if (announce) {
      playDropSound();
      toast("🎵 新しいBGM『To the zoo』を獲得!レコードプレイヤーで切替できます");
      sayHoshi("……『To the zoo』やるよ。オレ様の秘蔵コレクションだ。感謝して聴けよな。", 3800);
    }
  }
  if (n >= 500 && !dropped.has("cos:hoshi")) {
    dropped.add("cos:hoshi");
    items.spawn("costume", "hoshi");
    if (announce) {
      playDropSound();
      toast("⭐ 隠し衣装『星の着ぐるみ』がハンガーに出現!");
      sayHoshi("おっさんをオレ様にしてやれ。光栄だろ?That's me!", 3800);
    }
  }
  if (n >= 1000 && !dropped.has("item:starrod")) {
    dropped.add("item:starrod");
    items.spawn("item", "starrod");
    if (announce) {
      playDropSound();
      toast("⭐ 隠しアイテム『スターロッド』が棚に出現!(+10000pt)");
      sayHoshi("オレ様の力、貸してやるよ。F**k yeah!", 3600);
    }
  }
}
function onHoshiClick() {
  clicks.hoshi = (clicks.hoshi || 0) + 1;
  saveClicks();
  hoshi.react();
  hoshiSound();
  checkHoshiUnlocks(true);
  if (Math.random() < 0.2) sayHoshi(hoshiLineOnClick()); // 80%は無言(リアクションのみ)
  if (clicks.hoshi % 10 === 0) {
    toast(`⭐ 星: ${clicks.hoshi}回目`);
  }
}
checkHoshiUnlocks(false); // 保存済みクリック数ぶんを起動時に復元

// ---------- フィーバータイム ----------
// 500pt以降、前回終了から2分経過後に毎秒約1/70の確率で発動(平均3〜4分に1回)。
// 15秒間ポイント2倍+ミラーボール+フィーバー曲+おじさんはパターン移動(5種からランダム)
const feverBanner = document.getElementById("fever-banner");
const feverSecEl = document.getElementById("fever-sec");
const slapCounterBox = document.getElementById("slap-counter");
const FEVER_DURATION = 15;
const FEVER_COOLDOWN = 120;
let feverActive = false;
let feverEndsAt = 0;
let lastFeverEnd = 0;
let feverStartPoints = 0;
const FEVER_START_LINES = [
  "フィ、フィーバーじゃとぉ!?体が勝手に動くんじゃー!",
  "ミラーボール!?ワシの時代が来たのう!",
  "うおお、血が騒ぐ!ディスコの記憶が蘇るんじゃ!",
];
const FEVER_END_LINES = [
  "はぁ、はぁ…楽しかったのう…",
  "ふう、ええ汗かいたわい!",
  "まだ踊り足りん気もするがのう…",
];
function startFeverTime(pattern) {
  if (feverActive || ending) return;
  feverActive = true;
  feverEndsAt = clock.elapsedTime + FEVER_DURATION;
  feverStartPoints = points;
  ojisan.setFever(pattern || 1 + Math.floor(Math.random() * 5));
  bgm.startFever();
  office.setFever(true);
  animal.setProgress(1); // クマと星もダンス最高潮
  hoshi.setProgress(1);
  feverBanner.classList.add("show");
  slapCounterBox.classList.add("fever");
  say(FEVER_START_LINES[Math.floor(Math.random() * FEVER_START_LINES.length)], 3000);
}
function endFeverTime(silent) {
  if (!feverActive) return;
  feverActive = false;
  lastFeverEnd = clock.elapsedTime;
  ojisan.setFever(0);
  bgm.stopFever();
  office.setFever(false);
  applyProgress(); // クマ・星のテンションを進行度相応に戻す
  feverBanner.classList.remove("show");
  slapCounterBox.classList.remove("fever");
  if (!silent) {
    toast(`🕺 フィーバー終了! +${(points - feverStartPoints).toLocaleString()}pt`);
    say(FEVER_END_LINES[Math.floor(Math.random() * FEVER_END_LINES.length)], 3000);
  }
}
function updateFever(dt) {
  if (ending || !gameMode) return;
  if (feverActive) {
    const remain = feverEndsAt - clock.elapsedTime;
    feverSecEl.textContent = Math.max(0, Math.ceil(remain));
    if (remain <= 0) endFeverTime(false);
  } else if (
    points >= 500 && points < TOTAL_POINTS &&
    clock.elapsedTime - lastFeverEnd > FEVER_COOLDOWN &&
    Math.random() < dt / 70
  ) {
    startFeverTime();
  }
}

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
// クリック/タップ/Shiftキー共通のゲーム内クリック処理(cssX/cssYはCSSピクセル座標)
function handleGameClick(cssX, cssY) {
  if (!gameMode || ending) return; // スタート画面中は無効
  pointer.set((cssX / innerWidth) * 2 - 1, -(cssY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  // FPSモードは目の前まで近づかないとクリックできない
  const inReach = (hit) => gameMode !== "fps" || hit.distance <= INTERACT_RANGE;

  // 1) 動物(撫でる — 装備に関係なく手で)
  const animalHits = raycaster.intersectObjects(animal.clickableMeshes, true);
  if (animalHits.length > 0 && inReach(animalHits[0])) {
    onPetAnimal(animalHits[0].point);
    return;
  }

  // 1.2) 星(デスクのマスコット)
  const hoshiHits = raycaster.intersectObjects(hoshi.clickableMeshes, true);
  if (hoshiHits.length > 0 && inReach(hoshiHits[0])) {
    onHoshiClick();
    return;
  }

  // 1.5) 部屋のクリックギミック(段ボール/ゴミ箱/ロッカー/冷蔵庫/警備員)
  const officeHits = raycaster.intersectObjects(office.clickables, true);
  if (officeHits.length > 0 && officeHits[0].object.userData.clickId && inReach(officeHits[0])) {
    onObjectClick(officeHits[0].object.userData.clickId);
    return;
  }

  // 2) アイテム / 衣装
  const itemHits = raycaster.intersectObjects(items.clickableMeshes(), true);
  if (itemHits.length > 0 && inReach(itemHits[0])) {
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
  if (hits.length === 0 || !inReach(hits[0])) return;

  slapCount++;
  if (equipped.id !== "hand") onlyHandUsed = false;
  points = Math.min(points + equipped.points * (feverActive ? 2 : 1), TOTAL_POINTS);
  slapper.swing(equipped.id, hits[0].point, camera.position);
  ojisan.slap();
  playItemSound(equipped.sound);
  const voiceLine = maybeSlapVoice(ojisan.getCostume(), points / TOTAL_POINTS);
  if (voiceLine) say(voiceLine, 15000);
  applyProgress();
  checkUnlocks(true);

  const pop = document.createElement("div");
  pop.className = "slap-pop";
  pop.textContent = ["スパーン!", "ペチーン!", "バチーン!", "パァン!"][Math.floor(Math.random() * 4)];
  pop.style.left = cssX + "px";
  pop.style.top = cssY + "px";
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
}
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!downPos || Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) > 6) return;
  handleGameClick(e.clientX, e.clientY);
});
// PC(FPSモード): Spaceキーで画面中央(照準)をクリック。押しっぱなしの連射は無効
window.addEventListener("keydown", (e) => {
  if (e.code !== "Space" || e.repeat) return;
  if (gameMode !== "fps") return;
  if (helpOverlay.classList.contains("show")) return;
  const el = document.activeElement;
  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
  e.preventDefault();
  handleGameClick(innerWidth / 2, innerHeight / 2);
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
// エンディング分岐: 到着先はコンプ率で決定(素手のみクリアは別エンド)、クマ/星は重ねがけ演出
let endingDest = "moon"; // "cloud" | "moon" | "butt" | "star"
let bearEscort = false;
let starEscort = false;
let arrivalT = 0;
let bigStarBuilt = false;
const DEST_LABELS = { cloud: "雲の上", moon: "月面", butt: "おしり星", star: "星になった" };

function startEnding() {
  endFeverTime(true); // フィーバー中なら静かに終了
  ending = true;
  endingPhase = 1;
  // 到着先の決定: コンプ率(アイテム12+衣装11+BGM6=29種)。素手のみクリアは星になる
  const got = items.spawnedIds();
  const rate = (got.items.length + got.costumes.length + availableTracks().length) /
    (SLAP_ITEMS.length + COSTUMES.length + TRACKS.length);
  endingDest = window.__endDest ||
    (onlyHandUsed ? "star" : rate >= 1 ? "butt" : rate >= 0.5 ? "moon" : "cloud");
  bearEscort = petCount >= 1000;
  starEscort = (clicks.hoshi || 0) >= 1000;
  endFx.begin(endingDest, { bearEscort, starEscort });
  if (gameMode === "fps") {
    localStorage.setItem("oshiri_god", "1"); // FPSモードクリアで神様モード解禁
    fps.disable(); // エンディングはシネマティックカメラに切替
  }
  slapCountEl.textContent = TOTAL_POINTS.toLocaleString();
  slapBarFill.style.width = "100%";
  flashStage();
  say(getEndingLine(endingDest), 6000);
  controls.enabled = false;
  office.openRoof();
  setTimeout(() => {
    endingPhase = 2;
    playRocketSound();
    say(screamVoice(ojisan.getCostume()), 4000);
    if (starEscort) sayHoshi("……ついてこいよ、f**kin'相棒。今日だけは離れねえ。", 5000);
    ojisan.launch();
  }, 2000);
}

function updateEnding(dt) {
  endingT += dt;
  // 到着処理: 到着面(雲/月/おしり星)でy固定。素手エンドは昇り続けて星になる
  if (endingPhase >= 2) {
    if (endingDest !== "star" && ojisan.group.position.y >= PLATFORM_TOP_Y) {
      ojisan.group.position.y = PLATFORM_TOP_Y;
      arrivalT += dt;
    } else if (endingDest === "star" && ojisan.group.position.y > 70) {
      if (!bigStarBuilt) {
        bigStarBuilt = true;
        ojisan.group.visible = false; // おじさんは星になった
        endFx.buildBigStar(ojisan.group.position.clone());
      }
      ojisan.group.position.y = 70.5;
      arrivalT += dt;
    }
  }
  const y = ojisan.group.position.y;
  // クマ護衛: 巨大クマがおじさんを抱えて一緒に飛ぶ
  if (bearEscort && endingPhase >= 2 && y > 1) {
    animal.group.position.set(
      ojisan.group.position.x + 0.1,
      y - 2.6,
      ojisan.group.position.z + 0.9
    );
  }
  // 星の仲間・おじさん星人・大星のアニメーション
  endFx.update(clock.elapsedTime, dt, ojisan.group.position);
  const target = new THREE.Vector3(0, 0.9 + y, 0);
  controls.target.lerp(target, 0.08);
  const wantPos = new THREE.Vector3(2.0, y + 1.8, -2.4);
  camera.position.lerp(wantPos, 0.04);
  camera.lookAt(controls.target);
  // 星も一緒に飛んでいく(少し遅れてついてきて、くるくる回る)
  if (y > 2.5) {
    hoshi.group.position.y = 0.745 + (y - 2.5);
    hoshi.group.rotation.y += dt * 4;
  }
  const spaceMix = Math.min(y / 45, 1);
  scene.background.lerpColors(new THREE.Color(0x2a2a35), new THREE.Color(0x000005), spaceMix);
  if (scene.fog) scene.fog.far = 16 + spaceMix * 200;
  starField.visible = true;
  starField.material.opacity = spaceMix;
  starField.position.y = y * 0.5;
  const arrived = endingPhase === 2 && arrivalT > (endingDest === "star" ? 3 : 4);
  if (arrived) {
    endingPhase = 3;
    // 到着先別のエンディングテキスト+衣装別ひとこと
    document.getElementById("ending-text").innerHTML =
      (ENDING_TEXTS[endingDest] || ENDING_TEXTS.moon) +
      `<br><span style="opacity:.75;font-size:13px">${getCostumeEndLine(ojisan.getCostume())}</span>`;
    bgm.playEnding(); // エンディング曲(Brooklyn Network)に切替
    const sec = Math.round((Date.now() - startedAt) / 1000);
    const got = items.spawnedIds();
    const bgmGot = availableTracks();
    // コレクション達成度カード
    const mkCard = (icon, label, gotN, total, extra) => {
      const comp = gotN >= total;
      return `<div class="end-card">` +
        `<div class="end-label">${icon} ${label}</div>` +
        `<div class="end-big">${gotN}<small> / ${total}</small></div>` +
        `<div class="end-note${comp ? " comp" : ""}">${comp ? "コンプリート!" : `未入手 ${total - gotN}`}${extra || ""}</div>` +
        `</div>`;
    };
    const petNote = petCount >= 1000 ? "限界突破!" : petCount >= 100 ? "なかよし" : "もっと撫でてあげて";
    const clickRows = Object.keys(CLICK_NAMES)
      .map((id) => `<span>${CLICK_NAMES[id]} <b>×${clicks[id] || 0}</b></span>`)
      .join("");
    endingStats.innerHTML =
      `<div class="end-summary">` +
      `<span>🚀 <b>${DEST_LABELS[endingDest]}</b></span>` +
      `<span>👋 <b>${slapCount.toLocaleString()}</b> 発</span>` +
      `<span>🏆 <b>${TOTAL_POINTS.toLocaleString()}</b> pt</span>` +
      `<span>⏱ <b>${Math.floor(sec / 60)}</b> 分 <b>${sec % 60}</b> 秒</span>` +
      `</div>` +
      `<div class="end-cards">` +
      mkCard("🎁", "アイテム", got.items.length, SLAP_ITEMS.length) +
      mkCard("👗", "衣装", got.costumes.length, COSTUMES.length) +
      mkCard("🎵", "BGM", bgmGot.length, TRACKS.length, `<br>${bgmGot.map(trackTitle).join("、")}`) +
      `<div class="end-card"><div class="end-label">🐻 なでなで</div>` +
      `<div class="end-big">${petCount.toLocaleString()}<small> 回</small></div>` +
      `<div class="end-note">${petNote}</div></div>` +
      `</div>` +
      `<div class="end-section-title">👆 クリック探索のきろく</div>` +
      `<div class="end-clicks">${clickRows}</div>`;
    // 結果画面の下からゲーム中UIが透けないよう隠す
    for (const id of ["controls", "slap-counter", "toast-area", "bubble", "hoshi-bubble", "carrie-bubble", "fever-banner", "title-bar", "help-btn"]) {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    }
    endingEl.classList.add("show");
    requestAnimationFrame(() => endingEl.classList.add("visible"));
  }
}

// ---------- スタート画面 / モード管理 ----------
const INTERACT_RANGE = 2.2; // FPSモードの近接クリック射程(m)
let gameMode = null; // null=スタート画面 | "fps" | "god"
const startScreenEl = document.getElementById("start-screen");
const modeFpsBtn = document.getElementById("mode-fps");
const modeGodBtn = document.getElementById("mode-god");
const godUnlocked = localStorage.getItem("oshiri_god") === "1";
if (godUnlocked) {
  modeGodBtn.textContent = "👼 神様モードで始める";
  document.getElementById("mode-god-hint").style.display = "none";
} else {
  modeGodBtn.classList.add("locked");
}
controls.enabled = false; // スタート画面の間はカメラ操作なし

function beginGame(mode) {
  gameMode = mode;
  startScreenEl.style.display = "none";
  bgm.start(); // ボタン押下=正式なユーザー操作なので確実に再生できる
  bgmStarted = true;
  if (mode === "fps") {
    fps.enable();
  } else {
    controls.enabled = true;
  }
  say("おお、いらっしゃい。散らかっとるが、まあゆっくりしていきなさい。", 4500);
}
// ヘルプ(操作説明のオーバーレイ)
const helpOverlay = document.getElementById("help-overlay");
document.getElementById("help-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  helpOverlay.classList.add("show");
});
helpOverlay.addEventListener("click", () => helpOverlay.classList.remove("show"));

modeFpsBtn.addEventListener("click", () => beginGame("fps"));
modeGodBtn.addEventListener("click", () => {
  if (godUnlocked) beginGame("god");
});

// FPSモード: 照準の射程内ハイライト用に全クリック対象をレイキャスト
const _center = new THREE.Vector2(0, 0);
let crosshairTick = 0;
function updateCrosshair() {
  if (!fps.enabled || (++crosshairTick % 6) !== 0) return;
  raycaster.setFromCamera(_center, camera);
  const targets = [
    ...ojisan.buttMeshes,
    ...animal.clickableMeshes,
    ...hoshi.clickableMeshes,
    ...office.clickables,
    ...items.clickableMeshes(),
  ];
  const hits = raycaster.intersectObjects(targets, true);
  fps.setInRange(hits.length > 0 && hits[0].distance <= INTERACT_RANGE);
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
// デバッグ用: 撫で回数/クリック数を直接設定
window.__setPets = (n) => { petCount = n; localStorage.setItem(PETS_KEY, n); };
window.__setClicks = (id, n) => { clicks[id] = n; saveClicks(); };
window.__clicks = () => ({ ...clicks });
window.__items = items;
window.__animal = animal;
window.__hoshi = hoshi;
window.__slapper = slapper;
window.__office = office;
window.__bgm = bgm;
window.__ojisan = ojisan;
window.__fps = fps;
window.__forceEnd = () => { if (!ending) { points = TOTAL_POINTS; startEnding(); } };
window.__feverStart = (p) => startFeverTime(p);
window.__feverEnd = () => endFeverTime(false);
window.__endDest = null; // "cloud"|"moon"|"butt"|"star" で到着先を強制(デバッグ用)
window.__screenPos = (x, y, z) => {
  const v = new THREE.Vector3(x, y, z).project(camera);
  return [Math.round((v.x * 0.5 + 0.5) * innerWidth), Math.round((-v.y * 0.5 + 0.5) * innerHeight), +v.z.toFixed(3)];
};
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
    hoshi.update(t, dt);
    updateBearGrowth(dt);
    if (ending) updateEnding(dt);
  }
  renderer.render(scene, camera);
  return window.__dbg();
};
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  ojisan.update(clock.elapsedTime, dt);
  office.update(clock.elapsedTime, dt);
  items.update(clock.elapsedTime, dt);
  slapper.update(clock.elapsedTime, dt);
  animal.update(clock.elapsedTime, dt);
  hoshi.update(clock.elapsedTime, dt);
  if (!ending) updateBearGrowth(dt); // エンディング中はクマ護衛の位置制御を優先
  updateFever(dt);
  if (ending) {
    updateEnding(dt);
  } else if (fps.enabled) {
    fps.update(dt);
    updateCrosshair();
  } else {
    controls.update();
  }
  updateBubblePos();
  renderer.render(scene, camera);
});
