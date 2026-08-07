// カードの見た目(枠・テキスト配置)。データは carddata.js、対戦ロジックは cardgame.js。
// イラストだけ assets/cards/<id>.jpg を差し込み、枠・文字・アイコンは全てDOMで描く。

export const ATTR = {
  power:  { label: "パワー",   icon: "⚡", cls: "power" },
  mecha:  { label: "メカ",     icon: "🔧", cls: "mecha" },
  occult: { label: "オカルト", icon: "✨", cls: "occult" },
};

// サイコロの目はCSSで描く(⚀⚁…のUnicodeは環境によって豆腐になるため)

// 枠の確認用サンプル(本実装では carddata.js から読む)
export const SAMPLE_CARDS = {
  ojisan: {
    kind: "monster", name: "おじさん", attr: "power", hp: 105, rarity: "unique",
    flavor: "今日も定時では帰れない。",
    faces: [
      "からぶり — 何も起きない",
      "ビンタ — 相手モンスター1体に30ダメージ",
      "しりふり — 相手モンスター全員に25ダメージ",
      "ひとやすみ — イベントカードを1枚使う",
      "ほんきをだす — イベントカードを2枚使う",
      "しゃくねつのおしり — 相手モンスター1体に50ダメージ",
    ],
  },
  slipper: {
    kind: "event", name: "スリッパ", attr: null, rarity: "common",
    flavor: "どこの家にもある、最も身近な凶器。",
    text: "相手モンスター1体に30ダメージ",
  },
  oshiriseijin: {
    kind: "monster", name: "おしり星人", attr: "power", hp: 110, rarity: "rare",
    flavor: "遥か彼方、おしり星からの来訪者。",
    faces: [
      "テレパシー — カードを1枚引く",
      "みどりのてのひら — 相手モンスター1体に30ダメージ",
      "こうしん — イベントカードを1枚使う",
      "アブダクション — 相手モンスター1体を持ち主の手札に戻す。相手の手札を1枚トラッシュ",
      "おしりビーム — 相手モンスター全員に40ダメージ",
      "わくせいのいかり — 相手モンスター1体に65ダメージ",
    ],
  },
};

/**
 * カード1枚をDOMで組み立てて返す。
 * @param {object} def カード定義
 * @param {string} id  イラストのファイル名に使うID
 * @param {object} opts { mini: true で手札用の小サイズ }
 */
export function renderCard(def, id, opts = {}) {
  const a = def.attr ? ATTR[def.attr] : null;
  const el = document.createElement("div");
  el.className = [
    "pcard",
    a ? "pcard-" + a.cls : "pcard-event",
    def.rarity === "rare" ? "pcard-rare" : "",
    opts.mini ? "pcard-mini" : "",
  ].filter(Boolean).join(" ");

  const head = document.createElement("div");
  head.className = "pcard-head";
  head.innerHTML =
    `<span class="pcard-name">${def.name}</span>` +
    (a ? `<span class="pcard-attr">${a.icon}</span>` : `<span class="pcard-attr">◆</span>`);
  el.appendChild(head);

  const art = document.createElement("div");
  art.className = "pcard-art" + (def.kind === "event" ? " pcard-art-tall" : "");
  // イラストが未生成のあいだはプレースホルダを出す(枠の確認ができるように)
  art.innerHTML =
    `<img alt="" src="assets/cards/${id}.jpg" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` +
    `<div class="pcard-art-ph" style="display:none">ILLUST<br><small>${id}</small></div>`;
  el.appendChild(art);

  const type = document.createElement("div");
  type.className = "pcard-type";
  type.innerHTML =
    `<span>${def.kind === "monster" ? "モンスター" : "イベント"}${a ? " ・ " + a.icon + a.label : ""}</span>` +
    (def.kind === "monster" ? `<span class="pcard-hp">HP ${def.hp}</span>` : "");
  el.appendChild(type);

  const body = document.createElement("div");
  body.className = "pcard-body";
  if (def.kind === "monster") {
    // faces は carddata.js では {text, fx} オブジェクト。見本データは文字列。どちらも受ける
    body.innerHTML = def.faces
      .map((f, i) => {
        const t = typeof f === "string" ? f : f.text;
        return `<div class="pcard-face"><span class="pcard-pip pip-${i + 1}"></span><span>${t}</span></div>`;
      })
      .join("");
  } else {
    body.innerHTML = `<div class="pcard-text">${def.text}</div>`;
    if (def.flavor) body.innerHTML += `<div class="pcard-flavor">${def.flavor}</div>`;
  }
  el.appendChild(body);

  return el;
}
