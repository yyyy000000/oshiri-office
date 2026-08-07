// HELL 9000 のメニュー画面。購入 / デッキ構築 / 対戦 の3本立て。
// 3Dではなく図鑑と同じHTMLオーバーレイ。カードの見た目は cards.js の renderCard に任せる。

import { CARDS, OPPONENTS } from "./carddata.js";
import { renderCard } from "./cards.js";
import * as col from "./collection.js";

// HELL 9000のひとこと(機械的で、微妙に脅してくる)
const LINES = {
  menu: [
    "……イラッシャイマセ。カードヲ、オ求メデスカ。",
    "……在庫ハ、無限デス。財布ハ、有限デス。",
    "……ヨウコソ。オ尻ノ対価ハ、カードデ支払ワレマス。",
  ],
  bought: [
    "……オ買イ上ゲ、アリガトウゴザイマス。",
    "……返品ハ、受ケ付ケマセン。",
    "……次モ、ドウゾ。",
  ],
  broke: [
    "……残高不足デス。オ尻ヲ、叩イテキテクダサイ。",
    "……ポイントガ、足リマセン。労働ヲ推奨シマス。",
  ],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function createHellShop(deps) {
  // deps: { getPoints, spendPoints, toast, playSfx, onStartBattle }
  const overlay = document.getElementById("hell-overlay");
  const body = document.getElementById("hell-body");
  const pointsEl = document.getElementById("hell-points");
  document.getElementById("hell-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  let open = false;

  function close() { overlay.classList.remove("show"); open = false; }
  function refreshPoints() { pointsEl.textContent = deps.getPoints().toLocaleString() + " pt"; }

  function show() {
    open = true;
    overlay.classList.add("show");
    refreshPoints();
    screenMenu();
  }

  function el(html) {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }
  function setBody(...nodes) {
    body.innerHTML = "";
    for (const n of nodes) body.appendChild(n);
    body.scrollTop = 0;
  }
  function backBtn(to) {
    const b = el(`<button class="hell-back">← もどる</button>`);
    b.addEventListener("click", to);
    return b;
  }

  // ---------- メニュー ----------
  function screenMenu() {
    const line = el(`<div class="hell-line">${pick(LINES.menu)}</div>`);
    const menu = el(`<div class="hell-menu"></div>`);
    const unlocked = col.unlocked();

    const buy = el(`<button class="hell-btn">🛒 パックを買う<small>カードを手に入れる</small></button>`);
    buy.addEventListener("click", screenShop);
    menu.appendChild(buy);

    const build = el(
      `<button class="hell-btn" ${unlocked ? "" : "disabled"}>🗂 デッキ構築` +
      `<small>${unlocked ? "モンスター5枚+イベント10枚を組む" : "スターターパックを買うと使えます"}</small></button>`
    );
    build.addEventListener("click", screenDeck);
    menu.appendChild(build);

    const fight = el(
      `<button class="hell-btn" ${unlocked ? "" : "disabled"}>⚔️ 対戦する` +
      `<small>${unlocked ? "5人の相手から選ぶ" : "スターターパックを買うと使えます"}</small></button>`
    );
    fight.addEventListener("click", screenOpponents);
    menu.appendChild(fight);

    setBody(line, menu);
  }

  // ---------- 購入 ----------
  function packRow(kind) {
    const p = col.PACKS[kind];
    const price = col.packPrice(kind);
    const sold = kind === "starter" && !col.starterAvailable();
    const afford = deps.getPoints() >= price;
    const b = el(
      `<button class="hell-btn" ${sold || !afford ? "disabled" : ""}>` +
      `<span>${p.name}<small>${p.sub} — ${p.desc}</small></span>` +
      `<span class="hell-cost ${afford ? "" : "short"}">` +
      `${sold ? "購入済み" : price.toLocaleString() + " pt"}</span></button>`
    );
    if (!sold && afford) b.addEventListener("click", () => doBuy(kind));
    return b;
  }
  function screenShop() {
    refreshPoints();
    const line = el(
      `<div class="hell-line">……商品ハ3種類デス。ブースターハ<b>買ウホド値上ガリ</b>シマス` +
      `(1周ゴトニ戻リマス)。</div>`
    );
    const packs = el(`<div class="hell-packs"></div>`);
    for (const k of ["starter", "normal", "rare"]) packs.appendChild(packRow(k));
    setBody(line, packs, backBtn(screenMenu));
  }

  function doBuy(kind) {
    const price = col.packPrice(kind);
    if (deps.getPoints() < price) { deps.toast(pick(LINES.broke)); return; }
    const before = col.ownedAll();
    deps.spendPoints(price);
    const res = col.openPack(kind);
    if (deps.playSfx) deps.playSfx();
    screenOpened(res, before);
  }

  function screenOpened(res, before) {
    refreshPoints();
    const line = el(
      `<div class="hell-line">${pick(LINES.bought)} <b>−${res.cost.toLocaleString()} pt</b></div>`
    );
    const seen = { ...before };
    let wrap;
    if (res.cards.length > 6) {
      // スターターパックは15枚。枠を全部出すと長すぎるので一覧で見せる
      wrap = el(`<div class="hell-list"></div>`);
      const tally = {};
      for (const id of res.cards) tally[id] = (tally[id] || 0) + 1;
      for (const [id, n] of Object.entries(tally)) {
        const def = CARDS[id];
        const isNew = !seen[id];
        wrap.appendChild(el(
          `<div class="hell-list-item"><span class="a">${def.kind === "monster" ? "👾" : "📜"}</span>` +
          `<span>${def.name}${isNew ? ' <span class="hell-new" style="position:static">NEW</span>' : ""}</span>` +
          `<span class="q">×${n}</span></div>`
        ));
        seen[id] = (seen[id] || 0) + n;
      }
    } else {
      wrap = el(`<div class="hell-open"></div>`);
      res.cards.forEach((id, i) => {
        const holder = el(`<div class="hell-cardwrap"></div>`);
        const card = renderCard(CARDS[id], id);
        card.style.animationDelay = i * 0.12 + "s";
        if (!seen[id]) holder.appendChild(el(`<span class="hell-new">NEW</span>`));
        seen[id] = (seen[id] || 0) + 1;
        holder.appendChild(card);
        wrap.appendChild(holder);
      });
    }
    setBody(line, wrap, backBtn(screenShop));
  }

  // ---------- デッキ構築 ----------
  let draft = null;
  function screenDeck() {
    draft = new Map((col.getDeck() || []).map(([id, n]) => [id, n]));
    renderDeck();
  }
  function draftCounts() {
    let mon = 0, ev = 0;
    for (const [id, n] of draft) (CARDS[id].kind === "monster" ? (mon += n) : (ev += n));
    return { mon, ev };
  }
  function renderDeck() {
    const { mon, ev } = draftCounts();
    const okMon = mon === col.DECK_MONSTERS, okEv = ev === col.DECK_EVENTS;
    const bar = el(
      `<div class="hell-deckbar">` +
      `<span>モンスター <b class="${okMon ? "ok" : "ng"}">${mon}/${col.DECK_MONSTERS}</b></span>` +
      `<span>イベント <b class="${okEv ? "ok" : "ng"}">${ev}/${col.DECK_EVENTS}</b></span>` +
      `<span style="opacity:.6">タップで+1 / 右クリック・長押しで−1</span></div>`
    );
    const save = el(
      `<button class="hell-btn" style="margin-left:auto" ${okMon && okEv ? "" : "disabled"}>` +
      `💾 このデッキで確定</button>`
    );
    save.addEventListener("click", () => {
      col.setDeck([...draft].filter(([, n]) => n > 0));
      deps.toast("🗂 デッキを保存しました");
      screenMenu();
    });
    bar.appendChild(save);

    const grid = el(`<div class="hell-grid"></div>`);
    const ids = col.ownedKinds().sort((a, b) => {
      const A = CARDS[a], B = CARDS[b];
      if (A.kind !== B.kind) return A.kind === "monster" ? -1 : 1;
      return A.name.localeCompare(B.name, "ja");
    });
    for (const id of ids) {
      const def = CARDS[id];
      const n = draft.get(id) || 0;
      const slot = el(
        `<div class="hell-slot ${n ? "in" : ""}"><span class="n">${n}/${col.ownedCount(id)}</span>` +
        `${def.name}<span class="k">${def.kind === "monster" ? "モンスター" : "イベント"}</span></div>`
      );
      const add = () => { if ((draft.get(id) || 0) < col.ownedCount(id)) { draft.set(id, (draft.get(id) || 0) + 1); renderDeck(); } };
      const sub = () => { const c = draft.get(id) || 0; if (c > 0) { draft.set(id, c - 1); renderDeck(); } };
      slot.addEventListener("click", add);
      slot.addEventListener("contextmenu", (e) => { e.preventDefault(); sub(); });
      let held = 0;
      slot.addEventListener("pointerdown", () => { held = setTimeout(sub, 450); });
      for (const ev2 of ["pointerup", "pointerleave", "pointercancel"])
        slot.addEventListener(ev2, () => clearTimeout(held));
      grid.appendChild(slot);
    }
    setBody(bar, grid, backBtn(screenMenu));
  }

  // ---------- 対戦相手選択 ----------
  function screenOpponents() {
    const errs = col.validateDeck(col.getDeck() || []);
    const line = el(
      `<div class="hell-line">${errs.length
        ? "……デッキガ不正デス。先ニ構築シテクダサイ: " + errs[0]
        : "……対戦相手ヲ、選択シテクダサイ。"}</div>`
    );
    const menu = el(`<div class="hell-menu"></div>`);
    for (const o of OPPONENTS) {
      const w = col.winCount(o.key);
      const b = el(
        `<button class="hell-btn" ${errs.length ? "disabled" : ""}>` +
        `<span>${"★".repeat(o.difficulty)}<span style="opacity:.3">${"★".repeat(5 - o.difficulty)}</span> ${o.label}` +
        `<small>${w ? `${w}勝` : "未対戦"}</small></span></button>`
      );
      b.addEventListener("click", () => { close(); deps.onStartBattle(o.key); });
      menu.appendChild(b);
    }
    setBody(line, menu, backBtn(screenMenu));
  }

  return { show, close, get isOpen() { return open; } };
}
