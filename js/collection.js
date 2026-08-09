// カードの所持数・デッキ・戦績の永続化と、HELL 9000のパック販売。
// 価格は固定(累進は廃止)。所持カード・デッキ・戦績・天井カウンタ・
// 未開封パックはlocalStorageに保存する。

import { CARDS, STARTER_DECK, GACHA_POOL } from "./carddata.js";

const KEY_CARDS = "oshiri_cards";   // { [カードID]: 所持枚数 }
const KEY_DECK = "oshiri_deck";     // [[カードID, 枚数], ...]
const KEY_WINS = "oshiri_cardwins"; // { [対戦相手key]: 勝利数 }
const KEY_MISC = "oshiri_cardmisc"; // { starterBought: bool, pity: number }

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, v) { localStorage.setItem(key, JSON.stringify(v)); }

let owned = load(KEY_CARDS, {});
let deck = load(KEY_DECK, null);
let wins = load(KEY_WINS, {});
let misc = Object.assign({ starterBought: false, pity: 0 }, load(KEY_MISC, {}));

// ---------- パックの定義 ----------
export const PACKS = {
  starter: {
    id: "starter", name: "スターターパック", sub: "デッキ1個ぶん・15枚",
    price: 0, once: true, // 無料。カードゲームの入り口なので、ポイント0でも始められる
    desc: "対戦に必要な15枚が入った基本デッキ。<b>無料・生涯1回だけ</b>受け取れる。",
  },
  normal: {
    id: "normal", name: "夜明けのお尻", sub: "ノーマルブースター・3枚",
    price: 20000, cards: 3, rarePerPack: 0.01,
    desc: "共通カードが3枚。まれにレアが混じる(100パックに1枚ほど)。",
  },
  rare: {
    id: "rare", name: "お尻星の覇者", sub: "レアブースター・3枚",
    price: 100000, cards: 3, rarePerPack: 0.2, pityAt: 10,
    desc: "レアが出やすい(5パックに1枚ほど)。10パック続けて出なければ<b>次は確定</b>。",
  },
};

/** パックの価格(固定。買うほど値上がりする累進は廃止した) */
export function packPrice(kind) { return PACKS[kind].price; }

/** スターターパックは生涯1回だけ */
export function starterAvailable() { return !misc.starterBought; }

/** カードゲームが解禁されているか(スターターを買ったか) */
export function unlocked() { return misc.starterBought; }

export function ownedCount(id) { return owned[id] || 0; }
export function ownedAll() { return { ...owned }; }
export function ownedKinds() { return Object.keys(owned).filter((id) => owned[id] > 0); }

function grant(ids) {
  for (const id of ids) owned[id] = (owned[id] || 0) + 1;
  save(KEY_CARDS, owned);
}

function pickRandom(list, rnd) { return list[Math.floor(rnd() * list.length)]; }

/** レアブースターの共通枠はガチャ限定カードだけ(スタートデッキの11種は出ない) */
function commonPool(kind) {
  return kind === "rare" ? GACHA_POOL.premium : GACHA_POOL.common;
}

/**
 * パックを開ける。ポイントが足りるかは呼び出し側で確認済みの前提。
 * @returns {{ cost:number, cards:string[] }} 引いたカードIDの配列(レアは重複しうる=単純ランダム)
 */
export function openPack(kind, rnd = Math.random) {
  const p = PACKS[kind];
  const cost = packPrice(kind);
  let cards;
  if (kind === "starter") {
    cards = [];
    for (const [id, n] of STARTER_DECK) for (let i = 0; i < n; i++) cards.push(id);
    misc.starterBought = true;
    save(KEY_MISC, misc);
    // 買った直後に遊べるよう、スターターの構成をそのままデッキに入れる
    deck = STARTER_DECK.map(([id, n]) => [id, n]);
    save(KEY_DECK, deck);
  } else {
    cards = [];
    // レア枠の判定はパック単位。天井はレアブースターのみ
    let rareHit = rnd() < p.rarePerPack;
    if (p.pityAt && misc.pity >= p.pityAt) rareHit = true;
    if (kind === "rare") {
      misc.pity = rareHit ? 0 : misc.pity + 1;
      save(KEY_MISC, misc);
    }
    for (let i = 0; i < p.cards; i++) {
      const isRare = rareHit && i === p.cards - 1; // レアは最後の1枚に置く(開封演出映え)
      cards.push(pickRandom(isRare ? GACHA_POOL.rare : commonPool(kind), rnd));
    }
  }
  grant(cards);
  return { cost, cards };
}

// ---------- デッキ ----------
export const DECK_MONSTERS = 5;
export const DECK_EVENTS = 10;

export function getDeck() { return deck ? deck.map(([id, n]) => [id, n]) : null; }
export function setDeck(list) { deck = list.map(([id, n]) => [id, n]); save(KEY_DECK, deck); }

/** デッキが規定どおりか調べる。問題があれば理由の配列を返す */
export function validateDeck(list) {
  const errs = [];
  let mon = 0, ev = 0;
  for (const [id, n] of list) {
    const def = CARDS[id];
    if (!def) { errs.push(`未知のカード: ${id}`); continue; }
    if (n > ownedCount(id)) errs.push(`${def.name} は ${ownedCount(id)}枚しか持っていません`);
    if (def.kind === "monster") mon += n; else ev += n;
  }
  if (mon !== DECK_MONSTERS) errs.push(`モンスターは${DECK_MONSTERS}枚ちょうど(いま${mon}枚)`);
  if (ev !== DECK_EVENTS) errs.push(`イベントは${DECK_EVENTS}枚ちょうど(いま${ev}枚)`);
  return errs;
}

// ---------- 戦績と勝利報酬 ----------
export function winCount(key) { return wins[key] || 0; }
export function recordWin(key) { wins[key] = (wins[key] || 0) + 1; save(KEY_WINS, wins); }

/**
 * 勝利報酬のパック。おじさんはレア確定、それ以外は五分でノーマル/レア。
 * 開封は報酬画面で行うので、ここでは種類を決めるだけ。
 */
export function rewardPack(opponentKey, rnd = Math.random) {
  if (opponentKey === "ojisan") return "rare";
  return rnd() < 0.5 ? "rare" : "normal";
}

/** 勝利報酬のパックを開ける(ポイントは減らさない) */
export function openRewardPack(kind, rnd = Math.random) {
  const p = PACKS[kind];
  const cards = [];
  let rareHit = rnd() < p.rarePerPack;
  if (p.pityAt && misc.pity >= p.pityAt) rareHit = true;
  if (kind === "rare") {
    misc.pity = rareHit ? 0 : misc.pity + 1;
    save(KEY_MISC, misc);
  }
  for (let i = 0; i < p.cards; i++) {
    const isRare = rareHit && i === p.cards - 1;
    cards.push(pickRandom(isRare ? GACHA_POOL.rare : commonPool(kind), rnd));
  }
  grant(cards);
  return { cost: 0, cards };
}

/** そのキャラに勝ったときに選べる固有カード(4種) */
export function rewardChoices(opponentKey) {
  return Object.values(CARDS).filter((c) => c.rarity === "unique" && c.owner === opponentKey).map((c) => c.id);
}
export function grantReward(id) { grant([id]); }

/** デバッグ・図鑑用 */
export function resetAll() {
  owned = {}; deck = null; wins = {}; misc = { starterBought: false, pity: 0 };
  for (const k of [KEY_CARDS, KEY_DECK, KEY_WINS, KEY_MISC]) localStorage.removeItem(k);
}
export function debugGrant(id, n = 1) { for (let i = 0; i < n; i++) grant([id]); }
