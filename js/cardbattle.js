// 対戦画面。cardengine.js の prompt/choose/roll を画面に橋渡しするだけで、
// ルールの判断は一切しない(エンジンが唯一の正)。
import { CARDS, OPPONENTS } from "./carddata.js";
import { createBattle } from "./cardengine.js";
import { renderCard } from "./cards.js";
import * as col from "./collection.js";

const $ = (id) => document.getElementById(id);

export function createCardBattle(deps) {
  // deps: { toast, onFinish }
  const overlay = $("battle-overlay");
  const els = {
    foeName: $("bt-foe-name"), foeSt: $("bt-foe-st"), youSt: $("bt-you-st"),
    turn: $("bt-turn"), foeField: $("bt-foe-field"), youField: $("bt-you-field"),
    hand: $("bt-hand"), log: $("bt-log"), dice: $("bt-dice"), prompt: $("bt-prompt"),
  };
  $("bt-quit").addEventListener("click", () => finish(null));

  let battle = null;
  let oppKey = null;
  let selected = new Set(); // useEvent / recover の複数選択
  let busy = false;         // 演出中は入力を止める

  function el(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; }
  const nameOf = (id) => (CARDS[id] ? CARDS[id].name : id);

  function start(opponentKey) {
    oppKey = opponentKey;
    const deck = col.getDeck() || [];
    battle = createBattle({ playerDeck: deck, opponentKey });
    selected.clear();
    busy = false;
    overlay.classList.add("show");
    els.log.innerHTML = "";
    render();
    tick();
  }

  function finish(winner) {
    overlay.classList.remove("show");
    const b = battle;
    battle = null;
    if (winner === "you" && b) {
      col.recordWin(oppKey);
      showReward(oppKey);
    } else if (deps.onFinish) deps.onFinish(winner);
  }

  // ---------- 描画 ----------
  function monEl(m, side) {
    const def = CARDS[m.id];
    const pct = Math.max(0, Math.round((m.hp / m.maxHp) * 100));
    const e = el(
      `<div class="bt-mon" data-uid="${m.uid}" data-side="${side}">` +
      `<div class="bt-mon-name">${def.name}</div>` +
      `<div class="bt-mon-hp"><i style="width:${pct}%"></i></div>` +
      `<div class="bt-mon-num">${m.hp} / ${m.maxHp}</div>` +
      (m.sick ? `<span class="bt-sick">召喚酔い</span>` : "") + `</div>`
    );
    e.addEventListener("click", () => onBoardClick(m.uid, side));
    return e;
  }

  function renderField(box, list, side) {
    box.innerHTML = "";
    if (!list.length) { box.appendChild(el(`<div class="bt-empty">場にモンスターがいない</div>`)); return; }
    for (const m of list) box.appendChild(monEl(m, side));
  }

  function render() {
    if (!battle) return;
    const s = battle.state;
    const meta = OPPONENTS.find((o) => o.key === s.opponentKey);
    els.foeName.textContent = meta ? meta.label : s.opponentKey;
    els.foeSt.textContent = `手札${s.foe.handCount} / 山札${s.foe.deckCount} / トラッシュ${s.foe.trashCount}`;
    els.youSt.textContent = `山札${s.you.deckCount} / トラッシュ${s.you.trashCount}`;
    els.turn.textContent = `${s.turn}ターン目`;
    renderField(els.foeField, s.foe.field, "foe");
    renderField(els.youField, s.you.field, "you");
    markPickable(s);
    renderHand(s);
    renderPrompt(s);
  }

  // 盤面のモンスターを選ぶ prompt では、選べるものを光らせる
  function markPickable(s) {
    const q = s.prompt;
    if (!q || !q.options) return;
    if (q.kind !== "rollOrder" && q.kind !== "pickTarget") return;
    for (const uid of q.options) {
      const e = overlay.querySelector(`.bt-mon[data-uid="${uid}"]`);
      if (e) e.classList.add("pick");
    }
  }

  function renderHand(s) {
    const q = s.prompt;
    const pickable = new Set(
      q && (q.kind === "playMonster" || q.kind === "useEvent") ? q.options : []
    );
    els.hand.innerHTML = "";
    for (const c of s.you.hand) {
      const mini = renderCard(CARDS[c.id], c.id, { mini: true });
      mini.dataset.uid = c.uid;
      if (pickable.size) mini.classList.add(pickable.has(c.uid) ? "pick" : "dim");
      if (selected.has(c.uid)) mini.classList.add("sel");
      mini.addEventListener("click", () => onHandClick(c, pickable.has(c.uid)));
      els.hand.appendChild(mini);
    }
  }

  // 選択待ちの説明文とボタン
  function renderPrompt(s) {
    els.prompt.innerHTML = "";
    if (s.over) return;
    if (s.awaitingAiTurn) { els.prompt.appendChild(el(`<span class="msg">相手のターン…</span>`)); return; }
    const q = s.prompt;
    if (!q) return;
    const msg = (t) => els.prompt.appendChild(el(`<span class="msg">${t}</span>`));
    const act = (label, fn, ghost) => {
      const b = el(`<button class="bt-act ${ghost ? "ghost" : ""}">${label}</button>`);
      b.addEventListener("click", fn);
      els.prompt.appendChild(b);
      return b;
    };
    switch (q.kind) {
      case "playMonster":
        msg(q.canSkip
          ? "手札のモンスターを1体出せます(場のモンスターと交換もできます)"
          : "<b>場が空です。</b>モンスターを出してください");
        if (q.canSkip) act("出さない", () => answer(null), true);
        break;
      case "rollOrder":
        msg("どのモンスターから振りますか?");
        break;
      case "roll":
        msg(`<b>${nameOf(monIdOf(q.monsterUid))}</b> のサイコロを振ります`);
        act("🎲 振る", doRoll);
        break;
      case "useEvent":
        msg(`イベントカードを最大${q.max}枚まで使えます(手札から選択)`);
        act(`使う (${selected.size})`, () => answer(selected.size ? [...selected] : null))
          .disabled = selected.size === 0;
        if (q.canSkip !== false) act("使わない", () => answer(null), true);
        break;
      case "pickTarget":
        msg(targetMsg(q));
        break;
      case "pickFace": {
        msg(`<b>${nameOf(monIdOf(q.monsterUid))}</b> の出目を選んでください`);
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
      default:
        msg("…");
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
      // 場が2体埋まっているときだけ、交換相手を選ばせる
      if (battle.state.you.field.length >= 2 && q.canSwap && q.canSwap.length) {
        pendingPlay = card.uid;
        askSwap();
      } else {
        answer(card.uid);
      }
    } else if (q.kind === "useEvent") {
      if (selected.has(card.uid)) selected.delete(card.uid);
      else if (selected.size < q.max) selected.add(card.uid);
      render();
    }
  }

  let pendingPlay = null;
  function askSwap() {
    // 場が2体埋まっている状態。交換せずに出すことはできないので、やめる=選び直し
    els.prompt.innerHTML = "";
    els.prompt.appendChild(el(`<span class="msg">場が埋まっています。<b>どのモンスターと交換しますか?</b>(場のモンスターをタップ。戻したモンスターはHPが減ったまま手札に戻ります)</span>`));
    const b = el(`<button class="bt-act ghost">やめる</button>`);
    b.addEventListener("click", () => { pendingPlay = null; render(); });
    els.prompt.appendChild(b);
    for (const e of els.youField.querySelectorAll(".bt-mon")) e.classList.add("pick");
  }

  function onBoardClick(uid, side) {
    if (busy || !battle) return;
    const q = battle.state.prompt;
    if (pendingPlay != null && side === "you") {
      const p = pendingPlay; pendingPlay = null;
      answer({ play: p, swap: uid });
      return;
    }
    if (!q) { showDetail(monIdOf(uid)); return; }
    if ((q.kind === "rollOrder" || q.kind === "pickTarget") && q.options.includes(uid)) answer(uid);
    else showDetail(monIdOf(uid));
  }

  function answer(v) {
    if (!battle) return;
    try { battle.choose(v); } catch (e) { deps.toast("⚠ " + e.message); return; }
    selected.clear();
    flush();
    render();
    tick();
  }

  function doRoll() {
    if (busy || !battle) return;
    busy = true;
    els.dice.classList.add("rolling");
    let n = 0;
    const spin = setInterval(() => {
      n = 1 + Math.floor(Math.random() * 6);
      els.dice.className = "bt-dice rolling pip-" + n;
    }, 70);
    setTimeout(() => {
      clearInterval(spin);
      const face = battle.roll();
      els.dice.className = "bt-dice pip-" + face;
      busy = false;
      flush();
      render();
      tick();
    }, 620);
  }

  // ---------- 進行 ----------
  // AIの手番なら少し待ってから自動で進める
  function tick() {
    if (!battle) return;
    const s = battle.state;
    if (s.over) { flush(); setTimeout(() => showResult(s.winner), 500); return; }
    if (s.awaitingAiTurn) {
      busy = true;
      setTimeout(() => {
        if (!battle) return;
        battle.autoPlayTurn();
        busy = false;
        flush();
        render();
        tick();
      }, 700);
    }
  }

  // エンジンのイベント列をログに流す
  function flush() {
    if (!battle) return;
    for (const ev of battle.drainEvents()) {
      const t = describe(ev);
      if (!t) continue;
      const line = el(`<div>${t}</div>`);
      els.log.appendChild(line);
    }
    els.log.scrollTop = els.log.scrollHeight;
    while (els.log.childElementCount > 120) els.log.removeChild(els.log.firstChild);
  }

  function describe(ev) {
    const who = ev.side === "you" ? "あなた" : "相手";
    switch (ev.t) {
      case "turnStart": return `── ${who}のターン ──`;
      case "play": return `${who}が <b>${nameOf(ev.id || monIdOf(ev.uid))}</b> を出した`;
      case "roll": return `🎲 ${nameOf(ev.id || monIdOf(ev.uid))} → <b>${ev.face}</b>`;
      case "damage": return `${nameOf(ev.id || monIdOf(ev.uid))} に <b>${ev.n}</b> ダメージ${ev.dead ? " → 撃破!" : ""}`;
      case "heal": return `${nameOf(ev.id || monIdOf(ev.uid))} が ${ev.n} 回復`;
      case "draw": return `${who}がカードを${ev.n}枚引いた`;
      case "useEvent": return `${who}が <b>${nameOf(ev.id)}</b> を使った`;
      case "bounce": return `${nameOf(ev.id || "?")} が手札に戻された`;
      case "discard": return `${who}の手札が1枚トラッシュへ`;
      case "over": return `<b>${ev.winner === "you" ? "あなたの勝ち!" : "あなたの負け…"}</b>`;
      default: return "";
    }
  }

  // ---------- 結果と報酬 ----------
  function showResult(winner) {
    const box = el(
      `<div class="bt-result"><h2>${winner === "you" ? "WIN" : "LOSE"}</h2>` +
      `<div class="sub">${winner === "you"
        ? "勝利報酬として、相手の固有カードから1枚もらえます"
        : "……出直してこい、とHELL 9000が言っています"}</div></div>`
    );
    const b = el(`<button class="bt-act">${winner === "you" ? "報酬を選ぶ" : "もどる"}</button>`);
    b.addEventListener("click", () => { box.remove(); finish(winner); });
    box.appendChild(b);
    overlay.appendChild(box);
  }

  function showReward(key) {
    const ids = col.rewardChoices(key);
    const box = el(
      `<div class="bt-result"><h2>REWARD</h2>` +
      `<div class="sub">好きなカードを1枚選んでください</div></div>`
    );
    const row = el(`<div class="bt-rewards"></div>`);
    for (const id of ids) {
      const card = renderCard(CARDS[id], id, { mini: true });
      card.title = CARDS[id].name;
      card.addEventListener("click", () => {
        col.grantReward(id);
        deps.toast(`🎴 ${CARDS[id].name} を手に入れた!`);
        box.remove();
        if (deps.onFinish) deps.onFinish("you");
      });
      row.appendChild(card);
    }
    box.appendChild(row);
    overlay.classList.add("show");
    overlay.appendChild(box);
  }

  // カードの詳細(タップして中身を確認する)
  function showDetail(id) {
    if (!CARDS[id]) return;
    const w = el(`<div class="bt-result"></div>`);
    w.appendChild(renderCard(CARDS[id], id));
    w.addEventListener("click", () => w.remove());
    overlay.appendChild(w);
  }

  return { start, get isOpen() { return overlay.classList.contains("show"); } };
}
