// 「おしりバトルダイス」のルール表示。HELL 9000のメニューと対戦画面の両方から開く。
// ルールの本文はここだけにある(文言を直すときはこのファイルを見ればよい)。

import { INITIAL_HAND, DRAW_LIMIT } from "./cardengine.js";

const RULES = [
  {
    h: "勝ち負け",
    p: [
      "自分のターンのはじめに<b>場にモンスターがおらず、手札からも出せなければ負け</b>。",
    ],
  },
  {
    h: "デッキ",
    p: [
      "<b>モンスター5枚 + イベント10枚 = ちょうど15枚</b>。",
      "同じカードは何枚でも入れられる。",
    ],
  },
  {
    h: "ターンの流れ",
    ol: [
      `<b>ドロー</b> — 手札が<b>${DRAW_LIMIT}枚以下なら</b>山札から1枚引く。${DRAW_LIMIT + 1}枚以上のときは引かない`,
      "<b>召喚</b> — 1ターンに1体まで場にモンスターを出せる。場にモンスターは最大2体。" +
      "場にいるモンスターと交換も可能。場に出したターン、そのモンスターは攻撃できない(召喚酔い)",
      "<b>攻撃</b> — 場のモンスター1体ずつにサイコロを振り、出た目のテキストを実行する。<b>振る順番は自分で選べる</b>",
      "ターン終了",
    ],
  },
  {
    h: "モンスター",
    p: [
      "カードには6つのテキストがあり、<b>出た目の行だけ</b>が起こる。",
      "HPが0になるとトラッシュへ。",
      "交換で手札に戻ったモンスターは、<b>HPが減ったまま</b>。",
    ],
  },
  {
    h: "イベントカード",
    p: [
      "<b>手札にあるだけでは使えない。</b>モンスターの出目に「イベントカードを使う」が出たときだけ使える。",
      "使ったイベントはトラッシュへ。",
    ],
  },
  {
    h: "属性",
    p: [
      "⚡パワー / 🔧メカ / ✨オカルト の3種。<b>相性による有利不利はない</b>。" +
      "「メカ属性のモンスター1体に70ダメージ」のように、カードのテキストの中でだけ意味を持つ。",
    ],
  },
  {
    h: "はじまり方",
    p: [
      `最初の手札は<b>${INITIAL_HAND}枚</b>。モンスターが1枚も無ければ引き直す。`,
    ],
  },
  {
    h: "勝利報酬",
    p: [
      "対戦に勝つと、<b>その相手の固有カード4種から好きな1枚</b>をもらえる。",
    ],
  },
];

export function createCardRules() {
  const overlay = document.getElementById("rules-overlay");
  const body = document.getElementById("rules-body");
  document.getElementById("rules-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  let built = false;
  function build() {
    if (built) return;
    built = true;
    for (const sec of RULES) {
      const d = document.createElement("section");
      d.className = "rules-sec";
      let html = `<h3>${sec.h}</h3>`;
      if (sec.ol) html += "<ol>" + sec.ol.map((t) => `<li>${t}</li>`).join("") + "</ol>";
      if (sec.p) html += sec.p.map((t) => `<p>${t}</p>`).join("");
      d.innerHTML = html;
      body.appendChild(d);
    }
  }

  function open() { build(); overlay.classList.add("show"); body.scrollTop = 0; }
  function close() { overlay.classList.remove("show"); }

  return { open, close, get isOpen() { return overlay.classList.contains("show"); } };
}
