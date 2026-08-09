// 「おしりバトルダイス」のルール表示。HELL 9000のメニューと対戦画面の両方から開く。
// ルールの本文はここだけにある(文言を直すときはこのファイルを見ればよい)。

import { INITIAL_HAND, DRAW_LIMIT } from "./cardengine.js";

const RULES = [
  {
    h: "勝ち負け",
    p: [
      "自分のターンのはじめに<b>場にモンスターがおらず、手札からも出せなければ負け</b>。" +
      "相手をその状態に追いこめば勝ち。",
      "山札が尽きても負けにはならない。引けないだけ。",
    ],
  },
  {
    h: "デッキ",
    p: [
      "<b>モンスター5枚 + イベント10枚 = ちょうど15枚</b>。",
      "同じカードは何枚でも入れられる。ただし<b>実際に持っている枚数まで</b>。",
    ],
  },
  {
    h: "ターンの流れ",
    ol: [
      `<b>ドロー</b> — 手札が${DRAW_LIMIT}枚以下なら山札から1枚引く。${DRAW_LIMIT + 1}枚以上のときは引かない`,
      "<b>補充</b> — 場が空なら、手札からモンスターを1体出す(出せなければ負け)",
      "<b>召喚</b> — モンスターを1体出せる。補充と合わせて<b>1ターンに1体まで</b>、場は最大2体",
      "<b>ロール</b> — 場のモンスター1体ずつにサイコロを振り、出た目のテキストを実行する。<b>振る順番は自分で選べる</b>",
      "ターン終了",
    ],
  },
  {
    h: "モンスター",
    p: [
      "カードには6つのテキストがあり、<b>出た目の行だけ</b>が起こる。",
      "HPが0になるとトラッシュへ。回復で最大HPを超えることはない。",
      "<b>召喚酔い</b> — 場に出したターン、そのモンスターはサイコロを振れない。例外なし。",
      "<b>交換</b> — モンスターを出すとき、場のモンスターと入れ替えてもよい。" +
      "手札に戻ったモンスターは<b>HPが減ったまま</b>。",
    ],
  },
  {
    h: "イベントカード",
    p: [
      "<b>手札にあるだけでは使えない。</b>モンスターの出目に「イベントカードを使う」が出たときだけ使える。",
      "使ったイベントはトラッシュへ。トラッシュから拾い直すカードもある。",
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
      "場には何も置かれていない状態から始まる。お互い第1ターンは<b>出すだけで、振れない</b>(召喚酔い)。",
    ],
  },
  {
    h: "カードを増やす",
    p: [
      "HELL 9000でパックを買う。スパンキングポイントで支払う。",
      "対戦に勝つと、<b>その相手の固有カード4種から好きな1枚</b>をもらえる。何度でも勝てば何枚でも集まる。",
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
