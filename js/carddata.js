// js/carddata.js
// おしりバトルダイス カードデータ(ブラウザ用・純粋なESモジュール / 外部依存なし)
//
// 出典:
//   - 数値と効果オブジェクト : sim/cardgame-sim.mjs (調整済みの正)
//   - 日本語の表示テキスト     : CARDGAME.md
//
// 効果オブジェクト(fx)の語彙 ※sim の E.xxx() が生成する形と完全に一致させること
//   { t:'none' }
//   { t:'damage', n }                          相手モンスター1体に N ダメージ
//   { t:'damageAll', n }                       相手モンスター全員に N ダメージ
//   { t:'damageByAttr', attr, scope, n }       ○○属性の相手1体/全員に N ダメージ
//   { t:'heal', n }                            自分のモンスター1体を N 回復
//   { t:'healAll', n, attr }                   自分のモンスター全員を N 回復(attrはスコープ)
//   { t:'healFull' }                           自分のモンスター1体をHP全回復
//   { t:'selfDamage', n, to }                  反動(to: 'choose' | 'rerolled')
//   { t:'draw', n }                            カードを N 枚引く
//   { t:'useEvent', n }                        イベントカードを N 枚使う
//   { t:'discardOpponentHand', n }             相手の手札を N 枚ランダムにトラッシュ
//   { t:'reroll', target, chainOn6 }           もう一度振る(target: 'self' | 'choose')
//   { t:'skipRoll' }                           相手モンスター1体は次のターン振れない
//   { t:'bounce' }                             相手モンスター1体を持ち主の手札に戻す
//   { t:'recover', kind, n }                   トラッシュから monster/event を N 枚回収
//   { t:'doubleDamage' }                       このターンのダメージ2倍(現行カードでは未使用)
//   { t:'chooseFace' }                         選択ロール

export const ATTRS = {
  power: { key: 'power', label: 'パワー', icon: '⚡' },
  mecha: { key: 'mecha', label: 'メカ', icon: '🔧' },
  occult: { key: 'occult', label: 'オカルト', icon: '✨' },
};

export const CARDS = {
  // =========================================================================
  // 共通モンスター5種(スタートデッキ)
  // =========================================================================
  yamamoto: {
    id: 'yamamoto',
    kind: 'monster',
    name: '新入社員 山本くん',
    attr: 'power',
    hp: 70,
    rarity: 'common',
    owner: null,
    flavor: '返事だけは、この部屋のだれよりも速い。',
    faces: [
      { text: 'きんちょう — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'ぺこぺこおじぎ — 相手モンスター1体に20ダメージ', fx: [{ t: 'damage', n: 20 }] },
      { text: 'ほうれんそう — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'しごとちゅう — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'しゃにむに — 相手モンスター1体に40ダメージ', fx: [{ t: 'damage', n: 40 }] },
      { text: 'きあいのビンタ — 相手モンスター1体に55ダメージ', fx: [{ t: 'damage', n: 55 }] },
    ],
  },
  gomibako: {
    id: 'gomibako',
    kind: 'monster',
    name: 'ゴミばこおばけ',
    attr: 'power',
    hp: 65,
    rarity: 'common',
    owner: null,
    flavor: '捨てられたものたちの、ささやかな復讐。',
    faces: [
      { text: 'ちらかす — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'ゴミをなげる — 相手モンスター1体に20ダメージ', fx: [{ t: 'damage', n: 20 }] },
      { text: 'ふたをあける — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'あさる — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      {
        text: 'ひろいもの — 自分のトラッシュからイベントカードを1枚選び、手札に戻す',
        fx: [{ t: 'recover', kind: 'event', n: 1 }],
      },
      { text: 'なまゴミバクダン — 相手モンスター全員に35ダメージ', fx: [{ t: 'damageAll', n: 35 }] },
    ],
  },
  danboru: {
    id: 'danboru',
    kind: 'monster',
    name: 'だんボールロボ',
    attr: 'mecha',
    hp: 90,
    rarity: 'common',
    owner: null,
    flavor: 'ただの箱であることをやめた日、それは戦士になった。',
    faces: [
      { text: 'ただのはこにもどる — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'かどでこづく — 相手モンスター1体に20ダメージ', fx: [{ t: 'damage', n: 20 }] },
      { text: 'くみたてなおす — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'ガムテープほきょう — 自分のモンスター1体を20回復', fx: [{ t: 'heal', n: 20 }] },
      { text: 'たいあたり — 相手モンスター1体に35ダメージ', fx: [{ t: 'damage', n: 35 }] },
      {
        text: 'ダンボールプレス — 相手モンスター1体に50ダメージ。自分に10ダメージ',
        fx: [{ t: 'damage', n: 50 }, { t: 'selfDamage', n: 10, to: 'source' }],
      },
    ],
  },
  byun: {
    id: 'byun',
    kind: 'monster',
    name: '扇風機の妖精 ビュン',
    attr: 'mecha',
    hp: 65,
    rarity: 'common',
    owner: null,
    flavor: '風は三段階。そのすべてが、生ぬるい。',
    faces: [
      { text: 'でんげんが入らない — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'そよかぜ — 相手モンスター1体に15ダメージ', fx: [{ t: 'damage', n: 15 }] },
      { text: 'かぜをおこす — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'びみょうなかぜ — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: '首ふりモード — 相手モンスター全員に25ダメージ', fx: [{ t: 'damageAll', n: 25 }] },
      {
        text: 'きょうふうモード — 相手モンスター1体を持ち主の手札に戻す。カードを1枚引く',
        fx: [{ t: 'bounce' }, { t: 'draw', n: 1 }],
      },
    ],
  },
  marley: {
    id: 'marley',
    kind: 'monster',
    name: 'はっぱのマーリー',
    attr: 'occult',
    hp: 75,
    rarity: 'common',
    owner: null,
    flavor: '最後に水をやったのは、たぶん半年前だ。',
    faces: [
      { text: 'こうごうせい — 自分のモンスター1体を15回復', fx: [{ t: 'heal', n: 15 }] },
      { text: 'つるでたたく — 相手モンスター1体に20ダメージ', fx: [{ t: 'damage', n: 20 }] },
      { text: 'はっぱのささやき — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'はっぱカッター — 相手モンスター1体に30ダメージ', fx: [{ t: 'damage', n: 30 }] },
      { text: '森のめぐみ — 自分のモンスター全員を15回復', fx: [{ t: 'healAll', n: 15, attr: null }] },
      {
        text: 'きゅうせいちょう — 自分のモンスター1体を40回復。カードを1枚引く',
        fx: [{ t: 'heal', n: 40 }, { t: 'draw', n: 1 }],
      },
    ],
  },

  // =========================================================================
  // 星 の固有カード
  // =========================================================================
  hoshi: {
    id: 'hoshi',
    kind: 'monster',
    name: 'ほし',
    attr: 'occult',
    hp: 40,
    rarity: 'unique',
    owner: 'hoshi',
    flavor: '机の上から、この部屋のすべてを見下ろし、ののしる。',
    faces: [
      { text: 'あくたい — 相手モンスター1体に25ダメージ', fx: [{ t: 'damage', n: 25 }] },
      { text: 'みまわす — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'ひらめき — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'きらめき — 自分のモンスター1体を30回復', fx: [{ t: 'heal', n: 30 }] },
      {
        text: 'ひとりごと — イベントカードを1枚使う。カードを1枚引く',
        fx: [{ t: 'useEvent', n: 1 }, { t: 'draw', n: 1 }],
      },
      { text: 'ねがいごと — イベントカードを2枚使う', fx: [{ t: 'useEvent', n: 2 }] },
    ],
  },
  hoshinakama: {
    id: 'hoshinakama',
    kind: 'monster',
    name: 'ほしのなかま',
    attr: 'occult',
    hp: 60,
    rarity: 'unique',
    owner: 'hoshi',
    flavor: 'ひとりが跳ねれば、みんなが跳ねる。理由はない。',
    faces: [
      { text: 'ぴょんぴょん — 相手モンスター1体に15ダメージ', fx: [{ t: 'damage', n: 15 }] },
      { text: 'おしゃべり — カードを2枚引く', fx: [{ t: 'draw', n: 2 }] },
      { text: 'みんなでおうえん — 自分のモンスター全員を10回復', fx: [{ t: 'healAll', n: 10, attr: null }] },
      { text: 'あいずをおくる — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'ほしのかけら — 相手モンスター1体に40ダメージ', fx: [{ t: 'damage', n: 40 }] },
      {
        text: 'なかまをよぶ — オカルト属性の自分のモンスター全員を25回復。カードを1枚引く',
        fx: [{ t: 'healAll', n: 25, attr: 'occult' }, { t: 'draw', n: 1 }],
      },
    ],
  },
  starrod: {
    id: 'starrod',
    kind: 'event',
    name: 'スターロッド',
    attr: null,
    rarity: 'unique',
    owner: 'hoshi',
    flavor: '星が振るう杖。当たれば、ただでは済まない。',
    text: '相手モンスター1体に70ダメージ',
    fx: [{ t: 'damage', n: 70 }],
  },
  akutai: {
    id: 'akutai',
    kind: 'event',
    name: 'あくたいぞうごん',
    attr: null,
    rarity: 'unique',
    owner: 'hoshi',
    flavor: 'その一言は短く、鋭く、そして無慈悲である。',
    text: '相手の手札を2枚ランダムにトラッシュ',
    fx: [{ t: 'discardOpponentHand', n: 2 }],
  },

  // =========================================================================
  // クマ の固有カード
  // =========================================================================
  kuma: {
    id: 'kuma',
    kind: 'monster',
    name: 'おどるクマ',
    attr: 'power',
    hp: 75,
    rarity: 'unique',
    owner: 'kuma',
    flavor: 'その踊りに意味はない。だが、誰にも止められない。',
    faces: [
      { text: 'いねむり — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'ひっかき — 相手モンスター1体に20ダメージ', fx: [{ t: 'damage', n: 20 }] },
      { text: 'ダンス — 自分のモンスター全員を10回復', fx: [{ t: 'healAll', n: 10, attr: null }] },
      { text: 'ごきげん — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'クマパンチ — 相手モンスター1体に35ダメージ', fx: [{ t: 'damage', n: 35 }] },
      { text: 'まわしげり — 相手モンスター全員に25ダメージ', fx: [{ t: 'damageAll', n: 25 }] },
    ],
  },
  koganekuma: {
    id: 'koganekuma',
    kind: 'monster',
    name: 'こがねのクマ',
    attr: 'power',
    hp: 70,
    rarity: 'unique',
    owner: 'kuma',
    flavor: '黄金に輝く毛皮。その中身は、ただのクマである。',
    faces: [
      { text: 'きんのゆめ — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'ゴールドひっかき — 相手モンスター1体に25ダメージ', fx: [{ t: 'damage', n: 25 }] },
      { text: 'きんのオーラ — 自分のモンスター全員を15回復', fx: [{ t: 'healAll', n: 15, attr: null }] },
      {
        text: 'ちからくらべ — パワー属性の相手モンスター1体に45ダメージ',
        fx: [{ t: 'damageByAttr', attr: 'power', scope: 'one', n: 45 }],
      },
      { text: 'きんのクマパンチ — 相手モンスター1体に45ダメージ', fx: [{ t: 'damage', n: 45 }] },
      {
        text: 'おうごんらんぶ — 相手モンスター全員に30ダメージ。相手の手札を1枚ランダムにトラッシュ',
        fx: [{ t: 'damageAll', n: 30 }, { t: 'discardOpponentHand', n: 1 }],
      },
    ],
  },
  kumapunch: {
    id: 'kumapunch',
    kind: 'event',
    name: 'クマパンチ',
    attr: null,
    rarity: 'unique',
    owner: 'kuma',
    flavor: '愛らしい見た目から繰り出される、鉄の一撃。',
    text: '相手モンスター1体に40ダメージ',
    fx: [{ t: 'damage', n: 40 }],
  },
  nadenade: {
    id: 'nadenade',
    kind: 'event',
    name: 'なでなで',
    attr: null,
    rarity: 'unique',
    owner: 'kuma',
    flavor: 'なでられたクマは、少しだけ強くなるのだという。',
    text: '自分のモンスター1体を35回復。カードを1枚引く',
    fx: [{ t: 'heal', n: 35 }, { t: 'draw', n: 1 }],
  },

  // =========================================================================
  // キャリーちゃん の固有カード
  // =========================================================================
  carry: {
    id: 'carry',
    kind: 'monster',
    name: 'けいびいんキャリー',
    attr: 'mecha',
    hp: 70,
    rarity: 'unique',
    owner: 'carry',
    flavor: '規則は絶対である。ただし、その口は悪い。',
    faces: [
      { text: 'けいこく — 相手モンスター1体に15ダメージ', fx: [{ t: 'damage', n: 15 }] },
      { text: 'みまわり — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'そうびてんけん — イベントカードを2枚使う', fx: [{ t: 'useEvent', n: 2 }] },
      { text: 'せいあつ — 相手モンスター1体に40ダメージ', fx: [{ t: 'damage', n: 40 }] },
      { text: 'かくほ — 相手モンスター1体は次のターン、サイコロを振れない', fx: [{ t: 'skipRoll' }] },
      { text: 'とっしん — 相手モンスター1体に45ダメージ', fx: [{ t: 'damage', n: 45 }] },
    ],
  },
  busoucarry: {
    id: 'busoucarry',
    kind: 'monster',
    name: 'ぶそうキャリー',
    attr: 'mecha',
    hp: 65,
    rarity: 'unique',
    owner: 'carry',
    flavor: '警備という業務の範囲を、明らかに超えている。',
    faces: [
      { text: 'リロード — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'ハンドガン — 相手モンスター1体に30ダメージ', fx: [{ t: 'damage', n: 30 }] },
      { text: 'だんやくこうかん — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'マシンガン — 相手モンスター全員に30ダメージ', fx: [{ t: 'damageAll', n: 30 }] },
      {
        text: 'じょれいだん — オカルト属性の相手モンスター全員に45ダメージ',
        fx: [{ t: 'damageByAttr', attr: 'occult', scope: 'all', n: 45 }],
      },
      {
        text: 'フルバースト — 相手モンスター1体に70ダメージ。自分のモンスター1体に10ダメージ',
        fx: [{ t: 'damage', n: 70 }, { t: 'selfDamage', n: 10, to: 'choose' }],
      },
    ],
  },
  taihojou: {
    id: 'taihojou',
    kind: 'event',
    name: 'たいほじょう',
    attr: null,
    rarity: 'unique',
    owner: 'carry',
    flavor: 'たった一枚の紙が、すべての抵抗を終わらせる。',
    text: '相手モンスター1体を持ち主の手札に戻す',
    fx: [{ t: 'bounce' }],
  },
  keihou: {
    id: 'keihou',
    kind: 'event',
    name: 'けいほうサイレン',
    attr: null,
    rarity: 'unique',
    owner: 'carry',
    flavor: 'これは訓練ではない。たぶん、訓練ではない。',
    text: '相手モンスター全員に20ダメージ。相手の手札を1枚ランダムにトラッシュ',
    fx: [{ t: 'damageAll', n: 20 }, { t: 'discardOpponentHand', n: 1 }],
  },

  // =========================================================================
  // HELL 9000 の固有カード
  // =========================================================================
  gacha: {
    id: 'gacha',
    kind: 'monster',
    name: 'HELL 9000',
    attr: 'mecha',
    hp: 75,
    rarity: 'unique',
    owner: 'hell',
    flavor: '百円で運命を売りつける、無慈悲な鉄の箱。',
    faces: [
      { text: 'はずれ — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'カプセル1こ — 相手モンスター1体に35ダメージ', fx: [{ t: 'damage', n: 35 }] },
      { text: 'サービスタイム — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'あたり — カードを2枚引く', fx: [{ t: 'draw', n: 2 }] },
      { text: 'カプセルらんしゃ — 相手モンスター全員に45ダメージ', fx: [{ t: 'damageAll', n: 45 }] },
      { text: '大あたり — もう一度振る', fx: [{ t: 'reroll', target: 'self', chainOn6: false }] },
    ],
  },
  capsule: {
    id: 'capsule',
    kind: 'monster',
    name: 'カプセルモンスター',
    attr: 'mecha',
    hp: 70,
    rarity: 'unique',
    owner: 'hell',
    flavor: '開けるまでは、誰もが夢を見ていられる。',
    faces: [
      { text: 'からのカプセル — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'とびだす — 相手モンスター1体に40ダメージ', fx: [{ t: 'damage', n: 40 }] },
      { text: 'ふたがひらく — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      {
        text: 'じゅうでん — メカ属性の自分のモンスター全員を20回復',
        fx: [{ t: 'healAll', n: 20, attr: 'mecha' }],
      },
      { text: 'ミニロケット — 相手モンスター1体に50ダメージ', fx: [{ t: 'damage', n: 50 }] },
      {
        text: 'レアカプセル — 相手モンスター1体に70ダメージ。カードを1枚引く',
        fx: [{ t: 'damage', n: 70 }, { t: 'draw', n: 1 }],
      },
    ],
  },
  hyakuen: {
    id: 'hyakuen',
    kind: 'event',
    name: '100えんだま',
    attr: null,
    rarity: 'unique',
    owner: 'hell',
    flavor: 'たった百円が、運命の歯車をひとつ回す。',
    text: 'カードを3枚引く',
    fx: [{ t: 'draw', n: 3 }],
  },
  ooatari: {
    id: 'ooatari',
    kind: 'event',
    name: '大あたり',
    attr: null,
    rarity: 'unique',
    owner: 'hell',
    flavor: '二度目の幸運は、一度目よりもずっと甘い。',
    text: '自分のモンスター1体をもう一度振る。その出目が6なら、さらにもう一度振る',
    fx: [{ t: 'reroll', target: 'choose', chainOn6: true }],
  },

  // =========================================================================
  // おじさん の固有カード
  // =========================================================================
  ojisan: {
    id: 'ojisan',
    kind: 'monster',
    name: 'おじさん',
    attr: 'power',
    hp: 95,
    rarity: 'unique',
    owner: 'ojisan',
    flavor: '叩かれるほどに輝きを増す、この部屋の主。',
    faces: [
      { text: 'からぶり — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'ビンタ — 相手モンスター1体に35ダメージ', fx: [{ t: 'damage', n: 35 }] },
      { text: 'しりふり — 相手モンスター全員に30ダメージ', fx: [{ t: 'damageAll', n: 30 }] },
      { text: 'ひとやすみ — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'ほんきをだす — イベントカードを2枚使う', fx: [{ t: 'useEvent', n: 2 }] },
      { text: 'しゃくねつのおしり — 相手モンスター1体に60ダメージ', fx: [{ t: 'damage', n: 60 }] },
    ],
  },
  rocketojisan: {
    id: 'rocketojisan',
    kind: 'monster',
    name: 'おしりロケットおじさん',
    attr: 'power',
    hp: 85,
    rarity: 'unique',
    owner: 'ojisan',
    flavor: '推進剤は根性。着地の予定は、いまだ未定。',
    faces: [
      { text: 'カウントダウン — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'ふんしゃ — 相手モンスター1体に35ダメージ', fx: [{ t: 'damage', n: 35 }] },
      { text: 'ねんりょうほきゅう — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'きりもみひこう — 相手モンスター全員に40ダメージ', fx: [{ t: 'damageAll', n: 40 }] },
      {
        text: 'メカキラー — メカ属性の相手モンスター1体に70ダメージ',
        fx: [{ t: 'damageByAttr', attr: 'mecha', scope: 'one', n: 70 }],
      },
      {
        text: 'だいばくはつ — 相手モンスター全員に45ダメージ。自分のモンスター1体に30ダメージ',
        fx: [{ t: 'damageAll', n: 45 }, { t: 'selfDamage', n: 30, to: 'choose' }],
      },
    ],
  },
  oshiriroket: {
    id: 'oshiriroket',
    kind: 'event',
    name: 'おしりロケット',
    attr: null,
    rarity: 'unique',
    owner: 'ojisan',
    flavor: '点火。その行き先は、本人すら知らない。',
    text: '相手モンスター1体に80ダメージ。自分のモンスター1体に10ダメージ',
    fx: [{ t: 'damage', n: 80 }, { t: 'selfDamage', n: 10, to: 'choose' }],
  },
  shachiku: {
    id: 'shachiku',
    kind: 'event',
    name: 'しゃちくのどこんじょう',
    attr: null,
    rarity: 'unique',
    owner: 'ojisan',
    flavor: '倒れても立ち上がる。休み方を知らないだけだ。',
    text: '自分のトラッシュからモンスターカードを1枚選び、手札に戻す。自分のモンスター全員を10回復',
    fx: [{ t: 'recover', kind: 'monster', n: 1 }, { t: 'healAll', n: 10, attr: null }],
  },

  // =========================================================================
  // 共通イベント6種(スタートデッキ)
  // =========================================================================
  slipper: {
    id: 'slipper',
    kind: 'event',
    name: 'スリッパ',
    attr: null,
    rarity: 'common',
    owner: null,
    flavor: 'どこの家にもある、最も身近な凶器。',
    text: '相手モンスター1体に30ダメージ',
    fx: [{ t: 'damage', n: 30 }],
  },
  rubberduck: {
    id: 'rubberduck',
    kind: 'event',
    name: 'ラバーダック',
    attr: null,
    rarity: 'common',
    owner: null,
    flavor: 'ただ浮かぶだけで、なぜか心がやすらぐ。',
    text: '自分のモンスター1体を30回復',
    fx: [{ t: 'heal', n: 30 }],
  },
  coffee: {
    id: 'coffee',
    kind: 'event',
    name: 'きゅうとうしつのコーヒー',
    attr: null,
    rarity: 'common',
    owner: null,
    flavor: '本日三杯目。味はもう、わからない。',
    text: 'カードを2枚引く',
    fx: [{ t: 'draw', n: 2 }],
  },
  zangyou: {
    id: 'zangyou',
    kind: 'event',
    name: 'ざんぎょう',
    attr: null,
    rarity: 'common',
    owner: null,
    flavor: '時計の針は進む。仕事は減らない。',
    text: '自分のモンスター1体をもう一度振る。そのモンスターに10ダメージ',
    fx: [{ t: 'reroll', target: 'choose', chainOn6: false }, { t: 'selfDamage', n: 10, to: 'rerolled' }],
  },
  bell: {
    id: 'bell',
    kind: 'event',
    name: 'ひじょうベル',
    attr: null,
    rarity: 'common',
    owner: null,
    flavor: '鳴った瞬間、全員の手がぴたりと止まる。',
    text: '相手の手札を1枚ランダムにトラッシュ',
    fx: [{ t: 'discardOpponentHand', n: 1 }],
  },
  recyclebox: {
    id: 'recyclebox',
    kind: 'event',
    name: 'リサイクルボックス',
    attr: null,
    rarity: 'common',
    owner: null,
    flavor: '捨てたはずのものが、なぜかまた戻ってくる。',
    text: '自分のトラッシュからイベントカードを1枚選び、手札に戻す',
    fx: [{ t: 'recover', kind: 'event', n: 1 }],
  },

  // =========================================================================
  // レアカード5種(ガチャ限定)
  // =========================================================================
  nijiiroboshi: {
    id: 'nijiiroboshi',
    kind: 'monster',
    name: '虹色星',
    attr: 'occult',
    hp: 85,
    rarity: 'rare',
    owner: null,
    flavor: '七色に光る星。ただし願いは、たいてい叶わない。',
    faces: [
      { text: 'にじいろのかがやき — 自分のモンスター全員を15回復', fx: [{ t: 'healAll', n: 15, attr: null }] },
      { text: 'ほしよみ — カードを2枚引く', fx: [{ t: 'draw', n: 2 }] },
      { text: 'にじのちから — イベントカードを2枚使う', fx: [{ t: 'useEvent', n: 2 }] },
      { text: 'プリズムビーム — 相手モンスター1体に45ダメージ', fx: [{ t: 'damage', n: 45 }] },
      { text: 'オーロラ — 相手モンスター全員に35ダメージ', fx: [{ t: 'damageAll', n: 35 }] },
      {
        text: 'にじのねがい — イベントカードを2枚使う。カードを2枚引く',
        fx: [{ t: 'useEvent', n: 2 }, { t: 'draw', n: 2 }],
      },
    ],
  },
  oshiriseijin: {
    id: 'oshiriseijin',
    kind: 'monster',
    name: 'おしり星人',
    attr: 'power',
    hp: 90,
    rarity: 'rare',
    owner: null,
    flavor: 'はるかな星から、緑の手のひらを掲げてやってきた。',
    faces: [
      { text: 'テレパシー — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'みどりのてのひら — 相手モンスター1体に30ダメージ', fx: [{ t: 'damage', n: 30 }] },
      { text: 'こうしん — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      {
        text: 'アブダクション — 相手モンスター1体を持ち主の手札に戻す。相手の手札を1枚ランダムにトラッシュ',
        fx: [{ t: 'bounce' }, { t: 'discardOpponentHand', n: 1 }],
      },
      { text: 'おしりビーム — 相手モンスター全員に40ダメージ', fx: [{ t: 'damageAll', n: 40 }] },
      { text: 'わくせいのいかり — 相手モンスター1体に65ダメージ', fx: [{ t: 'damage', n: 65 }] },
    ],
  },
  berserker: {
    id: 'berserker',
    kind: 'monster',
    name: 'バーサーカー 覚醒キャリー',
    attr: 'mecha',
    hp: 75,
    rarity: 'rare',
    owner: null,
    flavor: '規則を忘れた警備員ほど、こわいものはない。',
    faces: [
      {
        text: 'ぼうそう — 相手モンスター1体に50ダメージ。自分のモンスター1体に20ダメージ',
        fx: [{ t: 'damage', n: 50 }, { t: 'selfDamage', n: 20, to: 'choose' }],
      },
      { text: 'ガトリング — 相手モンスター全員に30ダメージ', fx: [{ t: 'damageAll', n: 30 }] },
      { text: 'だんやくそうてん — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      {
        text: 'にくだんとつげき — パワー属性の相手モンスター1体に55ダメージ',
        fx: [{ t: 'damageByAttr', attr: 'power', scope: 'one', n: 55 }],
      },
      { text: 'ゼロきょりしゃげき — 相手モンスター1体に50ダメージ', fx: [{ t: 'damage', n: 50 }] },
      {
        text: 'かくせい — もう一度振る。相手モンスター全員に30ダメージ',
        fx: [{ t: 'reroll', target: 'self', chainOn6: false }, { t: 'damageAll', n: 30 }],
      },
    ],
  },
  negai: {
    id: 'negai',
    kind: 'event',
    name: '尻に願いを',
    attr: null,
    rarity: 'rare',
    owner: null,
    flavor: '出る目を選べるなら、それはもう運命ではない。',
    text: '自分の場のモンスターを1体選び、出目を1〜6から選んでそのテキストを実行する',
    fx: [{ t: 'chooseFace' }],
  },
  tenshi: {
    id: 'tenshi',
    kind: 'event',
    name: 'てんしのおしり',
    attr: null,
    rarity: 'rare',
    owner: null,
    flavor: '天から差しのべられた、まるくてやさしい救い。',
    text: '自分のトラッシュからモンスターカードを1枚選び、手札に戻す。自分のモンスター1体を30回復',
    fx: [{ t: 'recover', kind: 'monster', n: 1 }, { t: 'heal', n: 30 }],
  },

  // =========================================================================
  // ガチャ限定の共通カード15種(モンスター10 + イベント5)
  // スタートデッキには入らない。ノーマル/レア両方のパックから出る。
  // 役割を極端に振ってあり、属性を見る面が多い。
  // =========================================================================

  // --- ✨オカルト4種 ---
  pocha: {
    id: 'pocha',
    kind: 'monster',
    name: '整体アザラシ もみ子',
    attr: 'occult',
    hp: 80,
    rarity: 'common',
    owner: null,
    flavor: 'もんでいるのか、もまれているのか、途中から分からなくなる。',
    faces: [
      { text: 'かたもみ — 自分のモンスター1体を20回復', fx: [{ t: 'heal', n: 20 }] },
      { text: 'ぜんしんコース — オカルト属性の自分のモンスター全員を30回復', fx: [{ t: 'healAll', n: 30, attr: 'occult' }] },
      { text: 'ボキボキ — 自分のモンスター1体を40回復', fx: [{ t: 'heal', n: 40 }] },
      { text: 'よやくのでんわ — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'つよもみ — 相手モンスター1体に30ダメージ', fx: [{ t: 'damage', n: 30 }] },
      { text: 'こつばんきょうせい — 自分のモンスター1体をHP全回復', fx: [{ t: 'healFull' }] },
    ],
  },
  suekichi: {
    id: 'suekichi',
    kind: 'monster',
    name: 'パチンカス よし子',
    attr: 'occult',
    hp: 60,
    rarity: 'common',
    owner: null,
    flavor: '今日は出る。今日は出る。今日は出る。',
    faces: [
      { text: 'はまる — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'のまれる — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'たまをかりる — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'ぜんツッパ — 自分に30ダメージ', fx: [{ t: 'selfDamage', n: 30, to: 'source' }] },
      { text: 'こあたり — 相手モンスター1体に25ダメージ', fx: [{ t: 'damage', n: 25 }] },
      { text: 'フィーバー — 相手モンスター全員に70ダメージ', fx: [{ t: 'damageAll', n: 70 }] },
    ],
  },
  manekineko: {
    id: 'manekineko',
    kind: 'monster',
    name: 'ヤニカス 竹造',
    attr: 'occult',
    hp: 70,
    rarity: 'common',
    owner: null,
    flavor: '本数は減らしている。一本あたりの時間が延びただけだ。',
    faces: [
      { text: 'いっぷく — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'けむをまく — 相手モンスター1体に20ダメージ', fx: [{ t: 'damage', n: 20 }] },
      { text: 'ひをかす — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'きつえんじょのわ — オカルト属性の自分のモンスター全員を25回復', fx: [{ t: 'healAll', n: 25, attr: 'occult' }] },
      { text: 'もういっぽん — カードを2枚引く', fx: [{ t: 'draw', n: 2 }] },
      { text: 'じゅうねんぶんのヤニ — オカルト属性の相手モンスター全員に50ダメージ', fx: [{ t: 'damageByAttr', attr: 'occult', scope: 'all', n: 50 }] },
    ],
  },
  mabuta: {
    id: 'mabuta',
    kind: 'monster',
    name: 'まぶたの裏の君',
    attr: 'occult',
    hp: 65,
    rarity: 'common',
    owner: null,
    flavor: '目を閉じるとそこにいる。開けてもたぶん、まだいる。',
    faces: [
      { text: 'まばたき — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'のぞきこむ — 相手モンスター1体に20ダメージ', fx: [{ t: 'damage', n: 20 }] },
      { text: 'かなしばり — 相手モンスター1体は次のターン振れない', fx: [{ t: 'skipRoll' }] },
      { text: 'ねむりのいと — オカルト属性の自分のモンスター全員を20回復', fx: [{ t: 'healAll', n: 20, attr: 'occult' }] },
      { text: 'ゆめのなか — 相手モンスター1体は次のターン振れない。カードを1枚引く', fx: [{ t: 'skipRoll' }, { t: 'draw', n: 1 }] },
      { text: 'まぶたをとじる — 相手モンスター全員に35ダメージ。相手の手札を1枚トラッシュ', fx: [{ t: 'damageAll', n: 35 }, { t: 'discardOpponentHand', n: 1 }] },
    ],
  },

  // --- ⚡パワー3種 ---
  supa: {
    id: 'supa',
    kind: 'monster',
    name: 'カッターアイドル ちょんぱ',
    attr: 'power',
    hp: 20,
    rarity: 'common',
    owner: null,
    flavor: '替刃は無い。折れたら、そこで解散である。',
    faces: [
      { text: 'あくしゅかい — 相手モンスター1体に35ダメージ', fx: [{ t: 'damage', n: 35 }] },
      { text: 'キレのあるダンス — 相手モンスター1体に45ダメージ', fx: [{ t: 'damage', n: 45 }] },
      { text: 'じこプロデュース — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'かいさんはっぴょう — メカ属性の相手モンスター1体に80ダメージ', fx: [{ t: 'damageByAttr', attr: 'mecha', scope: 'one', n: 80 }] },
      { text: 'ぜんこくツアー — 相手モンスター全員に40ダメージ', fx: [{ t: 'damageAll', n: 40 }] },
      { text: 'でんせつのラストライブ — 相手モンスター1体に90ダメージ', fx: [{ t: 'damage', n: 90 }] },
    ],
  },
  midori: {
    id: 'midori',
    kind: 'monster',
    name: 'おならマン',
    attr: 'power',
    hp: 75,
    rarity: 'common',
    owner: null,
    flavor: '本人だけが、においに気づいていない。',
    faces: [
      { text: 'すかしっぺ — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'こだしのいちげき — 相手モンスター1体に25ダメージ', fx: [{ t: 'damage', n: 25 }] },
      { text: 'くさすぎてにげる — 相手モンスター1体を持ち主の手札に戻す', fx: [{ t: 'bounce' }] },
      { text: 'ふかいこきゅう — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'ちからずくのいちげき — パワー属性の相手モンスター1体に55ダメージ', fx: [{ t: 'damageByAttr', attr: 'power', scope: 'one', n: 55 }] },
      { text: 'かんぷうかんき — 相手モンスター全員に35ダメージ', fx: [{ t: 'damageAll', n: 35 }] },
    ],
  },
  nikutai: {
    id: 'nikutai',
    kind: 'monster',
    name: 'ペロペロ魔神',
    attr: 'power',
    hp: 95,
    rarity: 'common',
    owner: null,
    flavor: 'なめる以外の解決手段を、持ち合わせていない。',
    faces: [
      { text: 'においをかぎとる — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'ひとなめ — 相手モンスター1体に25ダメージ', fx: [{ t: 'damage', n: 25 }] },
      { text: 'きずをなめる — 自分のモンスター1体を25回復', fx: [{ t: 'heal', n: 25 }] },
      { text: 'ねっとりロング — パワー属性の相手モンスター1体に60ダメージ', fx: [{ t: 'damageByAttr', attr: 'power', scope: 'one', n: 60 }] },
      { text: 'まわしなめ — 相手モンスター全員に30ダメージ', fx: [{ t: 'damageAll', n: 30 }] },
      { text: 'ぜんりょくペロペロ — 相手モンスター1体に70ダメージ。自分に20ダメージ', fx: [{ t: 'damage', n: 70 }, { t: 'selfDamage', n: 20, to: 'source' }] },
    ],
  },

  // --- 🔧メカ3種 ---
  zakuro: {
    id: 'zakuro',
    kind: 'monster',
    name: 'すてちゃうぞおじさん',
    attr: 'mecha',
    hp: 30,
    rarity: 'common',
    owner: null,
    flavor: '捨てるぞ。ほんとに捨てるぞ。……もう捨てた。',
    faces: [
      { text: 'かたづけをはじめる — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'ゴミぶくろでなぐる — 相手モンスター1体に25ダメージ', fx: [{ t: 'damage', n: 25 }] },
      { text: 'これいる? — 相手の手札を1枚トラッシュ', fx: [{ t: 'discardOpponentHand', n: 1 }] },
      { text: 'せいりせいとん — メカ属性の自分のモンスター全員を25回復', fx: [{ t: 'healAll', n: 25, attr: 'mecha' }] },
      { text: 'まとめてすてちゃうぞ — 相手の手札を2枚トラッシュ', fx: [{ t: 'discardOpponentHand', n: 2 }] },
      { text: 'だいそうじ — 相手モンスター1体に55ダメージ。相手の手札を1枚トラッシュ', fx: [{ t: 'damage', n: 55 }, { t: 'discardOpponentHand', n: 1 }] },
    ],
  },
  gakon: {
    id: 'gakon',
    kind: 'monster',
    name: '横綱ロボ メロン海',
    attr: 'mecha',
    hp: 85,
    rarity: 'common',
    owner: null,
    flavor: '油圧で四股を踏む。土俵のほうがへこむ。',
    faces: [
      { text: 'しきりなおし — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'はりて — 相手モンスター1体に25ダメージ', fx: [{ t: 'damage', n: 25 }] },
      { text: 'ちゃんこきゅうゆ — メカ属性の自分のモンスター全員を30回復', fx: [{ t: 'healAll', n: 30, attr: 'mecha' }] },
      { text: 'けんしょうきん — カードを1枚引く', fx: [{ t: 'draw', n: 1 }] },
      { text: 'かなめのつっぱり — メカ属性の相手モンスター1体に60ダメージ', fx: [{ t: 'damageByAttr', attr: 'mecha', scope: 'one', n: 60 }] },
      { text: 'うっちゃり — 相手モンスター全員に40ダメージ', fx: [{ t: 'damageAll', n: 40 }] },
    ],
  },
  taiki: {
    id: 'taiki',
    kind: 'monster',
    name: 'Pai phone 13',
    attr: 'mecha',
    hp: 60,
    rarity: 'common',
    owner: null,
    flavor: '本家より1世代進んでいる。中身は3世代遅れている。',
    faces: [
      { text: 'けんがい — 何も起きない', fx: [{ t: 'none' }] },
      { text: 'つうち — イベントカードを1枚使う', fx: [{ t: 'useEvent', n: 1 }] },
      { text: 'じゅうでんぎれ — 相手モンスター1体に25ダメージ', fx: [{ t: 'damage', n: 25 }] },
      { text: 'きゅうそくじゅうでん — メカ属性の自分のモンスター全員を25回復', fx: [{ t: 'healAll', n: 25, attr: 'mecha' }] },
      { text: 'アプリぜんかいほう — イベントカードを2枚使う', fx: [{ t: 'useEvent', n: 2 }] },
      { text: 'はつねつばくはつ — 相手モンスター全員に45ダメージ', fx: [{ t: 'damageAll', n: 45 }] },
    ],
  },

  // --- イベント5種 ---
  timecard: {
    id: 'timecard',
    kind: 'event',
    name: 'ちょっとまってん!',
    attr: null,
    rarity: 'common',
    owner: null,
    flavor: '言われた側は、なぜか本当に待ってしまう。',
    text: '相手モンスター1体は次のターン振れない',
    fx: [{ t: 'skipRoll' }],
  },
  hijoushoku: {
    id: 'hijoushoku',
    kind: 'event',
    name: 'スタープリン',
    attr: null,
    rarity: 'common',
    owner: null,
    flavor: '星の形の器に入っているだけで、味はふつうのプリンである。',
    text: '自分のモンスター全員を25回復',
    fx: [{ t: 'healAll', n: 25, attr: null }],
  },
  fax: {
    id: 'fax',
    kind: 'event',
    name: 'フィッシングメール',
    attr: null,
    rarity: 'common',
    owner: null,
    flavor: '【重要】アカウントが凍結されました。心当たりしかない。',
    text: 'オカルト属性の相手モンスター全員に45ダメージ',
    fx: [{ t: 'damageByAttr', attr: 'occult', scope: 'all', n: 45 }],
  },
  yume: {
    id: 'yume',
    kind: 'event',
    name: '昨日見た明後日の夢',
    attr: null,
    rarity: 'common',
    owner: null,
    flavor: '見たのは昨日。起きるのは明後日。もう間に合わない。',
    text: '相手モンスター1体を持ち主の手札に戻す。カードを1枚引く',
    fx: [{ t: 'bounce' }, { t: 'draw', n: 1 }],
  },
  onaji: {
    id: 'onaji',
    kind: 'event',
    name: '卑弥呼様の妄想',
    attr: null,
    rarity: 'common',
    owner: null,
    flavor: '鬼道である。たぶん、ぜんぶ妄想である。',
    text: 'パワー属性の相手モンスター全員に45ダメージ',
    fx: [{ t: 'damageByAttr', attr: 'power', scope: 'all', n: 45 }],
  }
};

// ---------------------------------------------------------------------------
// デッキ(いずれも モンスター5枚 + イベント10枚 = 15枚)
// ---------------------------------------------------------------------------

export const STARTER_DECK = [
  ['yamamoto', 1],
  ['gomibako', 1],
  ['danboru', 1],
  ['byun', 1],
  ['marley', 1],
  ['slipper', 2],
  ['rubberduck', 2],
  ['coffee', 2],
  ['zangyou', 2],
  ['bell', 1],
  ['recyclebox', 1],
];

export const OPPONENT_DECKS = {
  // ガチャ限定の新イベントも1〜2枚ずつ配り、キャラの得意分野を伸ばしている。
  // 共通カード(スリッパ/コーヒー/ベル/リサイクル等)も残してある。
  hoshi: {
    label: '星',
    list: [
      ['hoshi', 3],
      ['hoshinakama', 2],
      ['starrod', 2],
      ['akutai', 2],
      ['recyclebox', 2],
      ['coffee', 2],
      ['hijoushoku', 2], // スタープリン(全体回復) ← スリッパ×2 と入れ替え
    ],
  },
  kuma: {
    label: 'クマ',
    list: [
      ['kuma', 3],
      ['koganekuma', 2],
      ['kumapunch', 3],
      ['nadenade', 3],
      ['slipper', 2],
      ['yume', 2], // 昨日見た明後日の夢(バウンス+ドロー) ← ラバーダック×2 と入れ替え
    ],
  },
  carry: {
    label: 'キャリーちゃん',
    list: [
      ['carry', 3],
      ['busoucarry', 2],
      ['keihou', 3],
      ['taihojou', 2],
      ['bell', 3],
      ['coffee', 1],
      ['fax', 1], // フィッシングメール(オカルト全体45) ← 対オカルトの得意分野を伸ばす
    ],
  },
  hell: {
    label: 'HELL 9000',
    list: [
      ['gacha', 2],
      ['capsule', 3],
      ['ooatari', 3],
      ['hyakuen', 3],
      ['zangyou', 2],
      ['fax', 1],
      ['slipper', 1], // 卑弥呼様の妄想(パワー全体45) ← スリッパ×2 と入れ替え
    ],
  },
  ojisan: {
    label: 'おじさん',
    list: [
      ['ojisan', 3],
      ['rocketojisan', 2],
      ['oshiriroket', 3],
      ['shachiku', 2],
      ['recyclebox', 1],
      ['bell', 1],
      ['timecard', 2],
      ['onaji', 1], // ちょっとまってん!(行動停止) ← スリッパ×2 と入れ替え
    ],
  },
};
// ---------------------------------------------------------------------------
// 対戦相手(難易度順)
// ---------------------------------------------------------------------------

export const OPPONENTS = [
  { key: 'hoshi', label: '星', deck: 'hoshi', difficulty: 1 },
  { key: 'kuma', label: 'クマ', deck: 'kuma', difficulty: 2 },
  { key: 'carry', label: 'キャリーちゃん', deck: 'carry', difficulty: 3 },
  { key: 'hell', label: 'HELL 9000', deck: 'hell', difficulty: 4 },
  { key: 'ojisan', label: 'おじさん', deck: 'ojisan', difficulty: 5 },
];

// ---------------------------------------------------------------------------
// ガチャの排出プール(固有カードは勝利報酬なので排出されない)
// ---------------------------------------------------------------------------

export const GACHA_POOL = {
  common: [
    'yamamoto',
    'gomibako',
    'danboru',
    'byun',
    'marley',
    'slipper',
    'rubberduck',
    'coffee',
    'zangyou',
    'bell',
    'recyclebox',
    // ガチャ限定の共通カード(スタートデッキには入らない)
    'pocha',
    'suekichi',
    'manekineko',
    'supa',
    'midori',
    'zakuro',
    'gakon',
    'timecard',
    'hijoushoku',
    'fax',
    'mabuta',
    'nikutai',
    'taiki',
    'yume',
    'onaji',
  ],
  rare: ['nijiiroboshi', 'oshiriseijin', 'berserker', 'negai', 'tenshi'],
};

// レアブースターの共通枠。スタートデッキで配られる11種は出さず、
// ガチャ限定の15種だけを対象にする(高い金を払って手持ちと同じ物が出ないように)
const STARTER_IDS = new Set(STARTER_DECK.map(([id]) => id));
GACHA_POOL.premium = GACHA_POOL.common.filter((id) => !STARTER_IDS.has(id));
