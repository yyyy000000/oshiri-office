// 対戦画面。cardengine.js の prompt/choose/roll を画面に橋渡しするだけで、
// ルールの判断は一切しない(エンジンが唯一の正)。
//
// 演出の方針(ポケポケ参考):
//  - 盤面は実物のカードを並べる(イラスト・HPバー付き)
//  - エンジンが吐くイベントを**1件ずつ順番に再生**し、何が起きたか読める間を作る
//  - ダメージ/回復は当該カードを揺らす・光らせる・数字を飛ばす
//  - 出目のテキストは中央のバナーに大きく出す(ログを読まなくても分かるように)
//  - 演出中に画面をタップすると早送りできる
import { CARDS, OPPONENTS } from "./carddata.js";
import { createBattle } from "./cardengine.js";
import { renderCard } from "./cards.js";
import * as col from "./collection.js";

const $ = (id) => document.getElementById(id);

// 各イベントの見せ場の長さ(ms)。短すぎると何が起きたか読めない
const DUR = {
  turnStart: 1500, play: 1000, roll: 2200, damage: 1400, heal: 1200, draw: 550,
  useEvent: 1900, bounce: 1300, trash: 900, discard: 1000, skipRoll: 1300,
  recover: 1300, chooseFace: 1800, mulligan: 1200, over: 900, turnEnd: 150,
  ko: 1200,        // 撃破の追い演出
  aiThink: 900,    // 相手のターンに入る前の間
  diceSpin: 900,   // ダイスが回っている時間
  diceHold: 1200,  // 出目が決まってから次へ進むまでの間
};

export function createCardBattle(deps) {
  // deps: { toast, onFinish }
  const overlay = $("battle-overlay");
  const els = {
    foeName: $("bt-foe-name"), foeSt: $("bt-foe-st"), youSt: $("bt-you-st"),
    turn: $("bt-turn"), foeField: $("bt-foe-field"), youField: $("bt-you-field"),
    hand: $("bt-hand"), foeHand: $("bt-foe-hand"), log: $("bt-log"), dice: $("bt-dice"),
    youTrash: $("bt-you-trash"), foeTrash: $("bt-foe-trash"),
    youDeck: $("bt-you-deck"), foeDeck: $("bt-foe-deck"),
    prompt: $("bt-prompt"), banner: $("bt-banner"), turnBanner: $("bt-turnbanner"),
  };
  $("bt-quit").addEventListener("click", () => { if (battle) finish(null); });
  els.youTrash.addEventListener("click", () => showTrash("you"));
  els.foeTrash.addEventListener("click", () => showTrash("foe"));

  let battle = null;
  let oppKey = null;
  let selected = new Set();
  let busy = false;        // 演出中は入力を止める
  let pendingPlay = null;  // 交換相手を選ばせている最中の手札uid
  let pendingPick = null;  // 盤面の選択で「詳細を見て確認待ち」のuid
  let actingUid = null;    // いま行動している(振る)モンスター
  // このターンに行動を終えたモンスター(暗く表示する)。ターンが変わると空になる
  let doneMons = new Set();
  // ターン終了で召喚酔いの表示を消したモンスター(エンジン上は次の自分の手番まで酔ったまま)
  let sickCleared = new Set();
  // 配布・ドロー演出の間だけ手札の表示枚数を絞る(nullなら全部出す)
  let handLimit = null;
  let foeHandLimit = null;
  // これから捨てられる予定のカード。演出でトラッシュに落ちるまで手札に残して見せる
  let handGhosts = [];
  // これから場に出るモンスター(playの演出まで出さない)
  let hiddenMons = new Set();
  // これから場から消えるモンスター(trash/bounce/交換の演出まで残す)
  let ghostMons = [];
  // 直前の場のスナップショット(消えるモンスターの見た目を復元するのに使う)
  let prevField = { you: [], foe: [] };
  // 演出が追いつくまで表示しておくHP(uid → hp)。エンジンは先に減らしているため
  let hpOverride = new Map();
  let skipNow = null;      // 演出の早送り
  let nextNow = null;      // 「次へ」待ちの解放
  let skipLayer = null;
  const logLines = [];

  const el = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };
  const sfx = (n) => { if (deps.sfx) deps.sfx(n); };
  const nameOf = (id) => (CARDS[id] ? CARDS[id].name : id);

  // ---------- 起動と終了 ----------
  function start(opponentKey, seed) {
    if (nextNow) nextNow();
    oppKey = opponentKey;
    // seed は検証用(省略時は毎回ランダム)
    battle = createBattle({ playerDeck: col.getDeck() || [], opponentKey, seed });
    selected.clear(); pendingPlay = null; pendingPick = null; actingUid = null; busy = false; logLines.length = 0;
    doneMons = new Set();
    sickCleared = new Set();
    handLimit = null; foeHandLimit = null; handGhosts = [];
    hiddenMons = new Set(); ghostMons = []; prevField = { you: [], foe: [] };
    hpOverride = new Map();
    els.log.textContent = "";
    els.banner.className = "bt-banner";
    closeStage();
    overlay.classList.add("show");
    if (deps.onBattleStart) deps.onBattleStart();
    render();
    run();
  }

  function finish(winner) {
    if (nextNow) nextNow();
    closeStage();
    overlay.classList.remove("show");
    const had = !!battle;
    battle = null;
    if (winner === "you" && had) { col.recordWin(oppKey); showReward(oppKey); }
    else if (deps.onFinish) deps.onFinish(winner);
  }

  // ---------- 演出の下ごしらえ ----------
  function wait(ms) {
    return new Promise((res) => {
      const t = setTimeout(done, ms);
      function done() { clearTimeout(t); skipNow = null; res(); }
      skipNow = done;
    });
  }
  function setBusy(on) {
    busy = on;
    if (on && !skipLayer) {
      skipLayer = el(`<div class="bt-skip" title="タップで早送り"></div>`);
      skipLayer.addEventListener("click", () => { if (skipNow) skipNow(); });
      overlay.appendChild(skipLayer);
    } else if (!on && skipLayer) { skipLayer.remove(); skipLayer = null; }
  }
  /**
   * 操作バーに「次へ」を出して、押されるまで演出を止める。
   * 早送りレイヤは一時的に外す(ボタンが押せなくなるため)。
   */
  function waitForNext(msgText, label) {
    return new Promise((resolve) => {
      const hadSkip = !!skipLayer;
      if (skipLayer) { skipLayer.remove(); skipLayer = null; }
      els.prompt.innerHTML = "";
      els.prompt.appendChild(el(`<span class="msg">${msgText}</span>`));
      const done = () => {
        nextNow = null;
        if (hadSkip && busy) setBusy(true); // 早送りレイヤを戻す
        resolve();
      };
      nextNow = done;
      const b = el(`<button class="bt-act big">${label || "次へ ▶"}</button>`);
      b.addEventListener("click", done, { once: true });
      els.prompt.appendChild(b);
    });
  }

  function banner(text, sub) {
    els.banner.innerHTML = text + (sub ? `<span class="sub">${sub}</span>` : "");
    els.banner.className = "bt-banner";
    void els.banner.offsetWidth; // アニメーションを再生し直す
    els.banner.className = "bt-banner show";
  }
  function pushLog(t) {
    logLines.push(t.replace(/<[^>]+>/g, ""));
    while (logLines.length > 3) logLines.shift();
    els.log.textContent = logLines.join("　/　");
  }
  const cardEl = (uid) => overlay.querySelector(`.bt-card[data-uid="${uid}"]`);

  // --- カードを画面中央にせり出させる「ステージ」 ---
  // 選択中のカードやロール中のモンスターを実物大で見せ、6面テキストを直接強調する。
  let stageEl = null;
  let stageCardEl = null;
  let stageKey = null;   // いま出しているカードの識別(同じなら出し直さない)
  let stageHidden = null; // 元の場所で隠しているDOM

  function openStage(cardId, fromEl, key) {
    const k = key != null ? key : cardId;
    if (stageEl && stageKey === k) return stageCardEl;
    closeStage();
    stageKey = k;
    const wrap = el(`<div class="bt-stage"><div class="bt-stage-inner"></div></div>`);
    const inner = wrap.firstElementChild;
    const card = renderCard(CARDS[cardId], cardId);
    inner.appendChild(card);
    overlay.appendChild(wrap);
    stageEl = wrap;
    stageCardEl = card;
    // 画面に収まるよう縮める
    const sc = Math.min(1, (innerHeight - 130) / 502, (innerWidth - 30) / 340);
    inner.style.transform = `scale(${sc.toFixed(3)})`;
    // 元のカードの位置から飛んでくる
    if (fromEl) {
      const a = fromEl.getBoundingClientRect();
      const b = card.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2);
      const dy = a.top + a.height / 2 - (b.top + b.height / 2);
      const r = a.width / b.width;
      card.style.transition = "none";
      card.style.transform = `translate(${dx}px, ${dy}px) scale(${r.toFixed(3)})`;
      requestAnimationFrame(() => {
        card.style.transition = "transform .42s cubic-bezier(.2,1.2,.4,1)";
        card.style.transform = "";
      });
      fromEl.style.visibility = "hidden";
      stageHidden = fromEl;
    }
    // サイコロをステージ上へ移す
    inner.appendChild(els.dice);
    return card;
  }

  function closeStage() {
    if (!stageEl) return;
    document.querySelector(".bt-dicebox").appendChild(els.dice); // サイコロを元に戻す
    stageEl.remove();
    if (stageHidden) { stageHidden.style.visibility = ""; stageHidden = null; }
    stageEl = null; stageCardEl = null; stageKey = null;
  }

  /** ステージ上のカードの6面のうち1つを光らせる。mode: "spin" | "lock" */
  function stageHighlight(face, mode) {
    if (!stageCardEl) return;
    const rows = [...stageCardEl.querySelectorAll(".pcard-face")];
    rows.forEach((r, i) => {
      r.classList.remove("spin", "on", "off");
      if (mode === "spin") { if (i === face - 1) r.classList.add("spin"); }
      else r.classList.add(i === face - 1 ? "on" : "off");
    });
  }

  function floatNum(uid, text, cls) {
    const c = cardEl(uid);
    if (!c) return;
    const f = el(`<div class="bt-float ${cls}">${text}</div>`);
    c.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  }

  // ---------- 盤面の描画 ----------
  function fieldCard(m, side) {
    const def = CARDS[m.id];
    // 演出がまだのダメージ/回復は反映しない
    const hp = hpOverride.has(m.uid) ? hpOverride.get(m.uid) : m.hp;
    const pct = Math.max(0, Math.round((hp / m.maxHp) * 100));
    const sick = m.sick && !sickCleared.has(m.uid); // 召喚酔い(ターン終了で表示は消える)
    const c = el(
      `<div class="bt-card ${def.attr || ""}${sick ? " done" : ""}" data-uid="${m.uid}" data-side="${side}">` +
      `<div class="bt-flash"></div>` +
      (sick ? `<span class="bt-sick">召喚酔い</span>` : "") +
      `<div class="bt-card-art" style="background-image:url(assets/cards/${m.id}.jpeg)"></div>` +
      `<div class="bt-card-name">${def.name}</div>` +
      `<div class="bt-card-hp"><i style="width:${pct}%"></i></div>` +
      `<div class="bt-card-num">${hp} / ${m.maxHp}</div></div>`
    );
    c.addEventListener("click", () => onBoardClick(m.uid, side));
    return c;
  }
  function renderField(box, list, side) {
    box.innerHTML = "";
    const shown = list.filter((m) => !hiddenMons.has(m.uid));
    const ghosts = ghostMons.filter((g) => g.side === side).map((g) => g.m);
    const all = shown.concat(ghosts);
    if (!all.length) { box.appendChild(el(`<div class="bt-empty">場にモンスターがいない</div>`)); return; }
    for (const m of all) box.appendChild(fieldCard(m, side));
  }

  function render() {
    if (!battle) return;
    const s = battle.state;
    const meta = OPPONENTS.find((o) => o.key === s.opponentKey);
    els.foeName.textContent = meta ? meta.label : s.opponentKey;
    els.foeSt.textContent = `山札${s.foe.deckCount} / トラッシュ${s.foe.trashCount}`;
    els.youSt.textContent = `山札${s.you.deckCount} / トラッシュ${s.you.trashCount}`;
    els.turn.textContent = `${s.turn}ターン目`;
    renderFoeHand(foeHandLimit == null ? s.foe.handCount : foeHandLimit);
    for (const [el2, n] of [[els.youTrash, s.you.trashCount], [els.foeTrash, s.foe.trashCount]]) {
      el2.querySelector(".n").textContent = n;
      el2.classList.toggle("empty", n === 0);
    }
    els.youDeck.querySelector(".n").textContent = s.you.deckCount;
    els.foeDeck.querySelector(".n").textContent = s.foe.deckCount;
    renderField(els.foeField, s.foe.field, "foe");
    renderField(els.youField, s.you.field, "you");
    markPickable(s);
    renderHand(s);
    renderPrompt(s);
  }

  function markPickable(s) {
    // 行動を終えたモンスターだけ沈める(相手の場・未行動のカードは明るいまま)
    for (const uid of doneMons) {
      if (uid === actingUid) continue;
      const e = cardEl(uid);
      if (e) e.classList.add("done");
    }
    // いま行動するモンスターを強調する
    if (actingUid != null) {
      const e = cardEl(actingUid);
      if (e) { e.classList.remove("done"); e.classList.add("acting"); }
    }
    const q = s.prompt;
    if (!q || !q.options) return;
    if (q.kind === "rollOrder" || q.kind === "pickTarget") {
      for (const uid of q.options) { const e = cardEl(uid); if (e) e.classList.add("pick"); }
    }
    if (q.kind === "roll" && q.monsterUid != null) {
      const e = cardEl(q.monsterUid);
      if (e) { e.classList.remove("done"); e.classList.add("acting"); }
    }
    if (pendingPlay != null) {
      for (const e of els.youField.querySelectorAll(".bt-card")) e.classList.add("pick");
    }
    if (pendingPick != null) { const e = cardEl(pendingPick); if (e) e.classList.add("acting"); }
  }

  // 相手の手札は中身を見せず、裏面を枚数ぶん並べる
  function renderFoeHand(n) {
    els.foeHand.innerHTML = "";
    const show = Math.min(n, 12); // 多すぎるときは12枚までにして枚数を添える
    for (let i = 0; i < show; i++) {
      const b = el(`<div class="bt-back"></div>`);
      b.style.animationDelay = i * 0.03 + "s";
      els.foeHand.appendChild(b);
    }
    els.foeHand.appendChild(el(`<span class="cnt">手札 ${n}枚</span>`));
  }

  function renderHand(s) {
    const q = s.prompt;
    const pickable = new Set(q && (q.kind === "playMonster" || q.kind === "useEvent") ? q.options : []);
    els.hand.innerHTML = "";
    const shown = handLimit == null ? s.you.hand : s.you.hand.slice(0, handLimit);
    // まだ演出していない「捨てられる予定」のカードも並べておく
    for (const g of handGhosts) {
      const mini = renderCard(CARDS[g.id], g.id, { mini: true });
      mini.dataset.uid = g.uid;
      mini.classList.add("dim");
      els.hand.appendChild(mini);
    }
    for (const c of shown) {
      const mini = renderCard(CARDS[c.id], c.id, { mini: true });
      mini.dataset.uid = c.uid;
      if (pickable.size) mini.classList.add(pickable.has(c.uid) ? "pick" : "dim");
      if (selected.has(c.uid)) mini.classList.add("sel");
      mini.addEventListener("click", () => onHandClick(c, pickable.has(c.uid)));
      els.hand.appendChild(mini);
    }
  }

  // ---------- 選択待ちの表示 ----------
  function renderPrompt(s) {
    els.prompt.innerHTML = "";
    if (s.over) return;
    if (busy) { els.prompt.appendChild(el(`<span class="msg" style="opacity:.6">…</span>`)); return; }
    if (s.awaitingAiTurn) { els.prompt.appendChild(el(`<span class="msg">相手のターン…</span>`)); return; }
    const q = s.prompt;
    if (!q) return;
    const msg = (t) => els.prompt.appendChild(el(`<span class="msg">${t}</span>`));
    const act = (label, fn, cls) => {
      const b = el(`<button class="bt-act ${cls || ""}">${label}</button>`);
      b.addEventListener("click", fn);
      els.prompt.appendChild(b);
      return b;
    };
    // 出目の結果に続く選択(対象選び・イベント使用など)の間は、
    // どのテキストが選ばれたのかを見せたままにする
    // 盤面の選択で1枚目をタップ済み: 中身を見せて確定を促す
    if (pendingPick != null && (q.kind === "rollOrder" || q.kind === "pickTarget")) {
      const id = monIdOf(pendingPick);
      openStage(id, cardEl(pendingPick), "mon" + pendingPick);
      msg(q.kind === "rollOrder"
        ? `<b>${nameOf(id)}</b> で振りますか?(中身は上に表示中)`
        : `<b>${nameOf(id)}</b> を対象にしますか?`);
      act("これで決定", () => { const u = pendingPick; pendingPick = null; answer(u); });
      act("選び直す", () => { pendingPick = null; closeStage(); render(); }, "ghost");
      return;
    }
    // 何も選びかけていない選択待ちでは、せり出したカードを片付ける
    if (q && q.kind !== "roll" && q.kind !== "useEvent" && pendingPick == null && !busy) closeStage();
    if (pendingPlay != null) {
      msg("場が埋まっています。<b>どのモンスターと交換しますか?</b>(戻したモンスターはHPが減ったまま手札に戻ります)");
      act("やめる", () => { pendingPlay = null; render(); }, "ghost");
      return;
    }
    switch (q.kind) {
      case "playMonster": {
        if (pendingPick != null) {
          const c = s.you.hand.find((x) => x.uid === pendingPick);
          if (c) {
            openStage(c.id, els.hand.querySelector(`[data-uid="${c.uid}"]`), "hand" + c.uid);
            msg(`<b>${nameOf(c.id)}</b> を場に出しますか?`);
            act("出す", () => { const u = pendingPick; pendingPick = null; onConfirmPlay(u); });
            act("選び直す", () => { pendingPick = null; closeStage(); render(); }, "ghost");
            return;
          }
        }
        // 開始時の初期配置と、通常ターンの配置を区別して伝える
        msg(q.initial
          ? "<b>開始時の配置です。</b>モンスターを1体出してください(お互い1体ずつ置いてから第1ターンが始まります。置いたモンスターは召喚酔いで第1ターンは振れません)"
          : q.canSkip
            ? "手札のモンスターを1体出せます(<b>このターンに出せるのは1体まで</b>)"
            : "<b>場が空です。</b>モンスターを出してください");
        if (q.canSkip) act("出さない", () => answer(null), "ghost");
        break;
      }
      case "rollOrder": msg("どのモンスターから振りますか?(カードをタップ)"); break;
      case "roll":
        // 振る前にカードを中央にせり出させる。何が当たりうるかを見た上で振れる
        openStage(monIdOf(q.monsterUid), cardEl(q.monsterUid), "mon" + q.monsterUid);
        msg(`<b>${nameOf(monIdOf(q.monsterUid))}</b> の番です`);
        act("🎲 サイコロを振る", doRoll, "big");
        break;
      case "useEvent": {
        const last = [...selected].pop();
        if (last != null) {
          const c = s.you.hand.find((x) => x.uid === last);
          if (c) openStage(c.id, els.hand.querySelector(`[data-uid="${c.uid}"]`), "ev" + c.uid);
        } else closeStage();
        msg(selected.size
          ? `<b>${nameOf(s.you.hand.find((x) => x.uid === last).id)}</b> を使いますか?` +
            `(別の手札をタップすると選び替えられます)`
          : `イベントカードを最大${q.max}枚まで使えます(手札をタップすると効果が出ます)`);
        act(`使う (${selected.size})`, () => answer(selected.size ? [...selected] : null)).disabled = selected.size === 0;
        if (selected.size) act("選び直す", () => { selected.clear(); closeStage(); render(); }, "ghost");
        if (q.canSkip !== false) act("使わない", () => answer(null), "ghost");
        break;
      }
      case "pickTarget": msg(targetMsg(q) + "(カードをタップ)"); break;
      case "pickFace": {
        msg(`<b>${nameOf(monIdOf(q.monsterUid))}</b> の出目を選べます`);
        const box = el(`<div class="bt-faces"></div>`);
        for (const f of q.options) {
          const b = el(`<div class="bt-face pip-${f}" title="${f}"></div>`);
          b.addEventListener("click", () => answer(f));
          box.appendChild(b);
        }
        els.prompt.appendChild(box);
        break;
      }
      case "recover": {
        msg(`トラッシュから最大${q.max}枚まで手札に戻せます`);
        const box = el(`<div class="bt-faces"></div>`);
        for (const uid of q.options) {
          const b = el(`<button class="bt-act ghost">${nameOf(trashIdOf(uid))}</button>`);
          b.addEventListener("click", () => answer([uid]));
          box.appendChild(b);
        }
        els.prompt.appendChild(box);
        break;
      }
      default: msg("…");
    }
  }

  function targetMsg(q) {
    const by = { damage: "ダメージを与える相手", heal: "回復する味方", bounce: "手札に戻す相手",
      selfDamage: "ダメージを受ける味方", reroll: "もう一度振るモンスター",
      chooseFace: "出目を選ぶモンスター", skipRoll: "行動を止める相手" };
    return (by[q.reason] || "対象") + "を選んでください";
  }
  function monIdOf(uid) {
    const s = battle.state;
    const m = [...s.you.field, ...s.foe.field].find((x) => x.uid === uid);
    return m ? m.id : "?";
  }
  function trashIdOf(uid) {
    const s = battle.state;
    const c = (s.you.trash || []).find((x) => x.uid === uid);
    return c ? c.id : "?";
  }

  // ---------- 入力 ----------
  function onHandClick(card, isPickable) {
    if (busy || !battle) return;
    const q = battle.state.prompt;
    if (!q || !isPickable) { showDetail(card.id); return; }
    if (q.kind === "playMonster") {
      // 1回目のタップで6面を見せ、同じカードをもう一度タップすると場に出す
      if (pendingPick !== card.uid) {
        pendingPick = card.uid;
        render();
        return;
      }
      pendingPick = null;
      if (battle.state.you.field.length >= 2 && q.canSwap && q.canSwap.length) {
        pendingPlay = card.uid; render();
      } else answer(card.uid);
    } else if (q.kind === "useEvent") {
      if (selected.has(card.uid)) {
        selected.delete(card.uid); // もう一度タップで選択解除
      } else {
        // 上限まで選んでいる時に別のカードをタップしたら、古いほうと入れ替える
        // (1枚しか使えない場面で選び直せないのを防ぐ)
        while (selected.size >= q.max) selected.delete(selected.values().next().value);
        selected.add(card.uid);
      }
      render();
    }
  }

  function onConfirmPlay(uid) {
    if (battle.state.you.field.length >= 2) {
      const q = battle.state.prompt;
      if (q && q.canSwap && q.canSwap.length) { pendingPlay = uid; render(); return; }
    }
    answer(uid);
  }

  function onBoardClick(uid, side) {
    if (busy || !battle) return;
    if (pendingPlay != null && side === "you") {
      const p = pendingPlay; pendingPlay = null;
      answer({ play: p, swap: uid });
      return;
    }
    const q = battle.state.prompt;
    if (q && (q.kind === "rollOrder" || q.kind === "pickTarget") && q.options.includes(uid)) {
      // 1回目のタップ: 中身(6面テキスト)を見せて確認させる / 2回目で確定
      if (pendingPick === uid) { pendingPick = null; answer(uid); return; }
      pendingPick = uid;
      render();
      return;
    }
    showDetail(monIdOf(uid));
  }

  function answer(v) {
    if (!battle) return;
    const kind = battle.state.prompt && battle.state.prompt.kind;
    try { battle.choose(v); } catch (e) { deps.toast("⚠ " + e.message); return; }
    selected.clear();
    pendingPick = null;
    // ロール順を決めた直後は同じモンスターの「振る」に続くので、
    // ここで閉じるとカードが一度消えて出し直しになる
    if (kind !== "rollOrder") closeStage();
    run();
  }

  /** サイコロを回してから face で止める(自分・相手で共通) */
  async function spinDice(face) {
    sfx("dice");
    els.dice.classList.add("rolling");
    const spin = setInterval(() => {
      const n = 1 + Math.floor(Math.random() * 6);
      els.dice.className = "bt-dice rolling pip-" + n;
      stageHighlight(n, "spin");
    }, 65);
    await wait(DUR.diceSpin);
    clearInterval(spin);
    els.dice.className = "bt-dice landed pip-" + face;
    sfx("land");
  }

  async function doRoll() {
    if (busy || !battle) return;
    const q = battle.state.prompt;
    const monId = q && q.monsterUid != null ? monIdOf(q.monsterUid) : null;
    setBusy(true);
    renderPrompt(battle.state);
    if (monId) openStage(monId, cardEl(q.monsterUid), "mon" + q.monsterUid);
    // 先に回してから、止める瞬間に出目を確定させる
    sfx("dice");
    els.dice.classList.add("rolling");
    const spin = setInterval(() => {
      const n = 1 + Math.floor(Math.random() * 6);
      els.dice.className = "bt-dice rolling pip-" + n;
      stageHighlight(n, "spin");
    }, 65);
    await wait(DUR.diceSpin);
    clearInterval(spin);
    const face = battle.roll();
    els.dice.className = "bt-dice landed pip-" + face;
    sfx("land");
    stageHighlight(face, "lock"); // カード内の該当テキストだけを強調する
    // ここでは閉じない。続く roll イベントの再生が同じステージを使い回す
    // (閉じるとカードがもう一度せり出して二度手間になる)
    await wait(DUR.diceHold);
    setBusy(false);
    run();
  }

  // ---------- 進行(イベントを1件ずつ再生してから次の入力を待つ) ----------
  let running = false;
  async function run() {
    if (running || !battle) return;
    running = true;
    try {
      for (;;) {
        await playEvents();
        if (!battle) return;
        const s = battle.state;
        if (s.over) { render(); await wait(700); showResult(s.winner); return; }
        if (s.awaitingAiTurn) {
          render();
          await wait(DUR.aiThink);
          if (!battle) return;
          battle.autoPlayTurn();
          continue; // 溜まったイベントを再生してから次へ
        }
        render();
        snapField();
        return; // プレイヤーの入力待ち
      }
    } finally { running = false; }
  }

  /** これから再生するイベントのうち、その側の手札を増やすものの合計枚数 */
  function pendingHandAdds(evs, side) {
    let n = 0;
    for (const ev of evs) {
      if (ev.side !== side) continue;
      if (ev.t === "draw") n += ev.n;
      else if (ev.t === "recover" || ev.t === "bounce") n += 1;
    }
    return n;
  }

  /** いまの場を覚えておく(次の再生で「消えるモンスター」を復元するため) */
  function snapField() {
    if (!battle) return;
    const s = battle.state;
    prevField = {
      you: s.you.field.map((m) => ({ ...m })),
      foe: s.foe.field.map((m) => ({ ...m })),
    };
  }

  async function playEvents() {
    if (!battle) return;
    const evs = battle.drainEvents();
    if (!evs.length) return;
    setBusy(true);
    // エンジンは先の手番まで進んでいるので、これから演出する増加分は伏せておく。
    // (相手のターンを再生している最中に、自分の次のドローが見えてしまうのを防ぐ)
    const s0 = battle.state;
    handLimit = Math.max(0, s0.you.hand.length - pendingHandAdds(evs, "you"));
    // 捨てられる予定のカードは、演出でトラッシュへ落ちるまで手札に残して見せる
    handGhosts = evs.filter((e) => e.t === "discard" && e.side === "you" && CARDS[e.id])
      .map((e) => ({ uid: e.uid, id: e.id }));
    // ダメージ/回復もエンジンは先に適用済みなので、直前のHPを持ち越して表示する
    hpOverride = new Map();
    for (const sd of ["you", "foe"]) {
      for (const m of prevField[sd] || []) hpOverride.set(m.uid, m.hp);
    }
    // これから場に出るモンスターは、play の演出まで出さない
    hiddenMons = new Set(evs.filter((e) => e.t === "play").map((e) => e.uid));
    // これから場を離れるモンスターは、その演出まで残しておく
    ghostMons = [];
    const leaving = [];
    for (const e of evs) {
      if (e.t === "trash" || e.t === "bounce") leaving.push({ side: e.side, uid: e.uid });
      else if (e.t === "play" && e.swapped != null) leaving.push({ side: e.side, uid: e.swapped });
    }
    for (const lv of leaving) {
      const cur = (lv.side === "you" ? s0.you.field : s0.foe.field).find((m) => m.uid === lv.uid);
      if (cur) continue; // まだ場にいるなら復元不要
      const old = (prevField[lv.side] || []).find((m) => m.uid === lv.uid);
      if (old) ghostMons.push({ side: lv.side, m: old });
    }
    const foeAdds = pendingHandAdds(evs, "foe");
    const foeDrops = evs.filter((e) => e.t === "discard" && e.side === "foe").length;
    foeHandLimit = Math.max(0, s0.foe.handCount - foeAdds + foeDrops);
    render(); // 演出中の盤面(まだ結果は反映されていない状態)
    for (const ev of evs) {
      if (!battle) break;
      await playOne(ev);
    }
    handLimit = null;
    foeHandLimit = null;
    handGhosts = [];
    hiddenMons = new Set();
    ghostMons = [];
    hpOverride = new Map();
    render();
    snapField();
    setBusy(false);
  }

  async function playOne(ev) {
    const who = ev.side === "you" ? "あなた" : "相手";
    switch (ev.t) {
      case "turnStart":
        els.turnBanner.textContent = ev.side === "you" ? "あなたのターン" : "あいてのターン";
        els.turnBanner.className = "bt-turnbanner";
        void els.turnBanner.offsetWidth;
        els.turnBanner.className = "bt-turnbanner show";
        sfx("turn");
        actingUid = null;
        doneMons = new Set(); // 新しいターン: 全部明るく戻す
        render();             // 暗くしていた表示をここで戻す
        closeStage();
        els.banner.className = "bt-banner"; // ターン表示と重ならないよう他は消す
        els.banner.innerHTML = "";
        pushLog(`${who}のターン`);
        await wait(DUR.turnStart);
        return;

      case "play": {
        hiddenMons.delete(ev.uid);                     // ここで初めて場に現れる
        sickCleared.delete(ev.uid);                    // 出し直しなら再び召喚酔い
        if (ev.swapped != null) ghostMons = ghostMons.filter((g) => g.m.uid !== ev.swapped);
        render();
        const c = cardEl(ev.uid);
        if (c) c.classList.add("entering");
        sfx("play");
        banner(`${who}は <b>${nameOf(ev.id)}</b> を出した`, ev.swapped != null ? "交換して場に出した" : "このターンは召喚酔いで振れない");
        pushLog(`${who}が${nameOf(ev.id)}を出した`);
        await wait(DUR.play);
        return;
      }

      case "roll": {
        // 自分で振った直後は、すでに同じカードがせり出しているので出し直さない
        const already = stageKey === "mon" + ev.uid;
        actingUid = ev.uid;
        if (!already) {
          render();
          await wait(500); // 誰が振るのかを見せる間
          openStage(ev.id, cardEl(ev.uid), "mon" + ev.uid);
          if (ev.side === "foe") await spinDice(ev.face);
          else els.dice.className = "bt-dice landed pip-" + ev.face;
          stageHighlight(ev.face, "lock");
        }
        banner(`🎲 <b>${ev.face}</b> — ${nameOf(ev.id)}`, ev.text);
        pushLog(`${nameOf(ev.id)}→${ev.face} ${ev.text}`);
        await wait(already ? 700 : DUR.roll); // 既に見せた分は短くする
        closeStage();
        doneMons.add(ev.uid); // このモンスターは行動済み
        actingUid = null;
        render();
        return;
      }

      case "chooseFace":
        actingUid = ev.uid;
        render();
        openStage(ev.id, cardEl(ev.uid), "mon" + ev.uid);
        els.dice.className = "bt-dice landed pip-" + ev.face;
        stageHighlight(ev.face, "lock");
        banner(`✨ 出目を <b>${ev.face}</b> に選んだ`, ev.text);
        pushLog(`${nameOf(ev.id)}の出目を${ev.face}に選択`);
        await wait(DUR.chooseFace);
        closeStage();
        return;

      case "damage": {
        hpOverride.set(ev.uid, ev.hp); // ここで初めてHPが減る
        const c = cardEl(ev.uid);
        // 攻撃側(行動中のモンスター)が踏み込む。相手を殴っている時だけ
        if (actingUid != null && actingUid !== ev.uid) {
          const a = cardEl(actingUid);
          if (a) {
            const dir = a.dataset.side === "you" ? "lunge-up" : "lunge-down";
            a.classList.add(dir);
            setTimeout(() => a.classList.remove(dir), 520);
            await wait(190); // 踏み込んでから当たるように少し待つ
          }
        }
        sfx("hit");
        if (c) {
          c.classList.add("hit");
          floatNum(ev.uid, "-" + ev.n, "dmg");
          const bar = c.querySelector(".bt-card-hp i");
          const num = c.querySelector(".bt-card-num");
          const max = Number((num.textContent.split("/")[1] || "1").trim());
          if (bar) bar.style.width = Math.max(0, (ev.hp / max) * 100) + "%";
          if (num) num.textContent = `${ev.hp} / ${max}`;
        }
        pushLog(`${nameOf(ev.id)}に${ev.n}ダメージ`);
        await wait(DUR.damage);
        if (ev.dead && c) { sfx("ko"); banner(`💥 <b>${nameOf(ev.id)}</b> は倒れた`); await wait(DUR.ko); }
        return;
      }

      case "heal": {
        hpOverride.set(ev.uid, ev.hp);
        const c = cardEl(ev.uid);
        sfx("heal");
        if (c) {
          c.classList.add("healed");
          floatNum(ev.uid, "+" + ev.n, "heal");
          const num = c.querySelector(".bt-card-num");
          const max = Number((num.textContent.split("/")[1] || "1").trim());
          const bar = c.querySelector(".bt-card-hp i");
          if (bar) bar.style.width = Math.min(100, (ev.hp / max) * 100) + "%";
          if (num) num.textContent = `${ev.hp} / ${max}`;
        }
        pushLog(`${nameOf(ev.id)}が${ev.n}回復`);
        await wait(DUR.heal);
        return;
      }

      case "useEvent": {
        // 使ったイベントカードを中央に大きく出し、効果文も併記する。
        // 特に相手のイベントは何が起きたのか分からなくなりがちなので、枠に効果を出す
        const def = CARDS[ev.id];
        closeStage();
        const pop = el(`<div class="bt-eventpop"></div>`);
        pop.appendChild(renderCard(def, ev.id));
        overlay.appendChild(pop);
        sfx("event");
        banner(`${who}は <b>${nameOf(ev.id)}</b> を使った`, def.text);
        pushLog(`${who}が${nameOf(ev.id)}を使用: ${def.text}`);
        if (ev.side === "foe") {
          // 相手のイベントは見落としやすいので、押すまで止める。
          // 効果の発動(後続のイベント)もここで待たされる
          pop.classList.add("hold");
          await waitForNext(`相手が <b>${nameOf(ev.id)}</b> を使いました。効果: ${def.text}`);
        } else {
          await wait(DUR.useEvent);
        }
        pop.remove();
        return;
      }

      case "bounce": {
        const c = cardEl(ev.uid);
        if (c) c.classList.add("leaving");
        if (ev.side === "you") { handLimit++; } else { foeHandLimit++; }
        ghostMons = ghostMons.filter((g) => g.m.uid !== ev.uid);
        banner(`↩️ <b>${nameOf(ev.id)}</b> が手札に戻された`, "HPは減ったまま");
        pushLog(`${nameOf(ev.id)}が手札に戻った`);
        await wait(DUR.bounce);
        return;
      }

      case "skipRoll":
        banner(`🚫 <b>${nameOf(ev.id)}</b> は次のターン振れない`);
        pushLog(`${nameOf(ev.id)}を行動不能に`);
        await wait(DUR.skipRoll);
        return;

      case "discard": {
        // 手札から実際に1枚落ちるところを見せる
        const from = els.hand.querySelector(`[data-uid="${ev.uid}"]`);
        flyToTrash(ev.side, ev.id, ev.side === "you" ? from : null);
        if (ev.side === "you") {
          handGhosts = handGhosts.filter((g) => g.uid !== ev.uid);
          renderHand(battle.state);
        } else {
          foeHandLimit = Math.max(0, foeHandLimit - 1);
          renderFoeHand(foeHandLimit);
        }
        banner(`🗑 ${who}の手札から <b>${nameOf(ev.id)}</b> がトラッシュへ`);
        pushLog(`${who}の手札から${nameOf(ev.id)}が落ちた`);
        await wait(DUR.discard);
        return;
      }

      case "recover":
        if (ev.side === "you") { handLimit++; renderHand(battle.state); }
        else { foeHandLimit++; renderFoeHand(foeHandLimit); }
        banner(`♻️ <b>${nameOf(ev.id)}</b> をトラッシュから手札へ`);
        pushLog(`${nameOf(ev.id)}を回収`);
        await wait(DUR.recover);
        return;

      case "draw": {
        sfx("draw");
        // スライドが着地したところで手札に1枚ずつ現れる
        const ms = flyFromDeck(ev.side, ev.n, 0, () => {
          if (ev.side === "you") { handLimit++; renderHand(battle.state); }
          else { foeHandLimit++; renderFoeHand(foeHandLimit); }
        });
        pushLog(`${who}が${ev.n}枚引いた`);
        await wait(Math.max(DUR.draw, ms));
        return;
      }

      case "mulligan": {
        // 対戦開始: 手札を空にしてから、1枚着地するたびに増やしていく
        banner("カードを配ります", "お互い5枚");
        handLimit = 0;
        foeHandLimit = 0;
        render();
        sfx("draw");
        const a = flyFromDeck("foe", 5, 0, () => { foeHandLimit++; renderFoeHand(foeHandLimit); sfx("draw"); });
        const b = flyFromDeck("you", 5, 130, () => { handLimit++; renderHand(battle.state); });
        await wait(Math.max(a, b) + 250);
        return;
      }

      case "trash": {
        // 場から消えるカードをトラッシュへ飛ばしてから盤面から外す
        const from = cardEl(ev.uid);
        flyToTrash(ev.side, ev.id, from);
        if (from) from.style.visibility = "hidden";
        await wait(DUR.trash);
        ghostMons = ghostMons.filter((g) => g.m.uid !== ev.uid);
        render();
        return;
      }

      case "over":
        actingUid = null;
        await wait(DUR.over);
        return;

      case "turnEnd": {
        actingUid = null; // ターンが終わったら行動中の強調を解除
        doneMons = new Set(); // 暗くしていたカードも明るく戻す
        // 召喚酔いの表示もここで消す(エンジン上は次の自分の手番まで酔ったまま)
        const fs = ev.side === "you" ? battle.state.you.field : battle.state.foe.field;
        for (const m of fs) sickCleared.add(m.uid);
        closeStage();
        render();
        await wait(DUR.turnEnd);
        return;
      }

      default:
        return;
    }
  }

  // ---------- 結果と報酬 ----------
  function showResult(winner) {
    const win = winner === "you";
    sfx(win ? "win" : "lose");
    const box = el(
      `<div class="bt-result"><h2 style="color:${win ? "#ffd76e" : "#8fa3bd"}">${win ? "勝利!" : "敗北…"}</h2>` +
      `<div class="sub">${win
        ? "勝利報酬として、相手の固有カードから1枚もらえます"
        : "……出直シテキテクダサイ、とHELL 9000が言っています"}</div></div>`
    );
    const b = el(`<button class="bt-act big">${win ? "報酬を選ぶ" : "もどる"}</button>`);
    b.addEventListener("click", () => { box.remove(); finish(winner); });
    box.appendChild(b);
    overlay.appendChild(box);
  }

  function showReward(key) {
    const box = el(`<div class="bt-result"><h2 style="color:#ffd76e">勝利報酬</h2><div class="sub">好きなカードを1枚選んでください</div></div>`);
    const row = el(`<div class="bt-rewards"></div>`);
    for (const id of col.rewardChoices(key)) {
      const card = renderCard(CARDS[id], id, { mini: true });
      card.title = CARDS[id].name;
      card.addEventListener("click", () => {
        col.grantReward(id);
        deps.toast(`🎴 ${CARDS[id].name} を手に入れた!`);
        box.remove();
        overlay.classList.remove("show");
        if (deps.onFinish) deps.onFinish("you");
      });
      row.appendChild(card);
    }
    box.appendChild(row);
    overlay.classList.add("show");
    overlay.appendChild(box);
  }

  // トラッシュの中身を一覧表示(カードをタップすると詳細)
  function showTrash(side) {
    if (!battle) return;
    const s = battle.state;
    const list = (side === "you" ? s.you.trash : s.foe.trash) || [];
    const box = el(
      `<div class="bt-trashlist"><h3>${side === "you" ? "あなた" : "相手"}のトラッシュ (${list.length}枚)</h3></div>`
    );
    if (!list.length) box.appendChild(el(`<div class="sub" style="opacity:.6">まだ何も入っていません</div>`));
    const grid = el(`<div class="grid"></div>`);
    for (const c of list) {
      const mini = renderCard(CARDS[c.id], c.id, { mini: true });
      mini.title = CARDS[c.id].name;
      mini.addEventListener("click", (e) => { e.stopPropagation(); showDetail(c.id); });
      grid.appendChild(mini);
    }
    box.appendChild(grid);
    const close = el(`<button class="bt-act ghost">閉じる</button>`);
    close.addEventListener("click", () => box.remove());
    box.appendChild(close);
    overlay.appendChild(box);
  }

  /**
   * 山札の一番上からカードが1枚ずつスライドして抜け、手札へ滑り込む演出。
   * @returns 全部終わるまでの時間(ms)
   */
  function flyFromDeck(side, n, offset = 0, onLand) {
    const deck = side === "you" ? els.youDeck : els.foeDeck;
    const target = side === "you" ? els.hand : els.foeHand;
    const dr = deck.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const step = 260;   // 1枚ずつ順に配る間隔
    const slide = 190;  // 束から抜き出すまで
    const move = 340;   // 手札へ滑り込むまで
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        deck.classList.add("draw");
        setTimeout(() => deck.classList.remove("draw"), 300);
        const g = el(`<div class="bt-slide"></div>`);
        g.style.left = dr.left + "px";
        g.style.top = dr.top + "px";
        g.style.width = dr.width + "px";
        g.style.height = dr.height + "px";
        document.body.appendChild(g);
        // ① 束の一番上から手札の方向へスッと抜き出す
        const outDx = (side === "you" ? -1 : 1) * dr.width * 0.6;
        requestAnimationFrame(() => {
          g.style.transition = `transform ${slide}ms ease-out`;
          g.style.transform = `translate(${outDx}px, -5px)`;
        });
        // ② そのまま手札へ滑り込む
        setTimeout(() => {
          const dx = tr.left + tr.width * (side === "you" ? 0.66 : 0.5) - dr.left;
          const dy = tr.top + tr.height * 0.5 - (dr.top + dr.height * 0.5);
          g.style.transition = `transform ${move}ms cubic-bezier(.4,0,.3,1), opacity ${move}ms ease-in`;
          g.style.transform = `translate(${dx}px, ${dy}px) scale(.82)`;
          g.style.opacity = "0.2";
          setTimeout(() => { g.remove(); if (onLand) onLand(); }, move + 30);
        }, slide);
      }, offset + i * step);
    }
    return offset + (n - 1) * step + slide + move + 60;
  }

  /** カードがトラッシュへ飛んでいく残像を出す */
  function flyToTrash(side, cardId, fromEl) {
    const target = side === "you" ? els.youTrash : els.foeTrash;
    const tr = target.getBoundingClientRect();
    const fr = fromEl ? fromEl.getBoundingClientRect() : { left: innerWidth / 2 - 40, top: innerHeight / 2 - 55, width: 80, height: 110 };
    const g = el(`<div class="bt-fly"></div>`);
    g.style.left = fr.left + "px";
    g.style.top = fr.top + "px";
    g.style.width = fr.width + "px";
    g.style.height = fr.height + "px";
    g.style.backgroundImage = `url(assets/cards/${cardId}.jpeg)`;
    document.body.appendChild(g);
    requestAnimationFrame(() => {
      const dx = tr.left + tr.width / 2 - (fr.left + fr.width / 2);
      const dy = tr.top + tr.height / 2 - (fr.top + fr.height / 2);
      g.style.transform = `translate(${dx}px, ${dy}px) scale(.28) rotate(20deg)`;
      g.style.opacity = "0.15";
    });
    setTimeout(() => {
      g.remove();
      target.classList.add("flash");
      setTimeout(() => target.classList.remove("flash"), 500);
    }, 560);
  }

  function showDetail(id) {
    if (!CARDS[id]) return;
    const w = el(`<div class="bt-result"></div>`);
    w.appendChild(renderCard(CARDS[id], id));
    w.addEventListener("click", () => w.remove());
    overlay.appendChild(w);
  }

  return { start, get isOpen() { return overlay.classList.contains("show"); } };
}
