// おじさんの被弾ボイス(Web Speech API)。衣装によって声とセリフが変わる。
// 発声した場合はそのセリフ文字列を返す(吹き出し表示用)。発声しなければ null。
const VOICE_SETS = {
  suit: {
    pitch: 0.45, rate: 1.05,
    lines: ["イエーイ", "たまらんのう", "効くのう、最高じゃ", "うおお、いいぞ", "もっとこい", "ナイスじゃ", "病みつきじゃ", "最高潮じゃ"],
  },
  nurse: {
    pitch: 1.5, rate: 1.0,
    lines: ["きゃっ、いい感じです", "もっと処置しちゃいます", "先生、これ効果抜群です", "注射よりよく効きますね", "はい、次いきましょう", "先生も悦んでます", "カルテに記録しときますね"],
  },
  dino: {
    pitch: 0.35, rate: 0.95,
    lines: ["ガオー、最高じゃ", "恐竜も大興奮じゃ", "ジュラ紀最強の尻じゃ", "ガオオオ、たまらん", "肉食系の尻じゃぞ", "咆哮したくなるのう"],
  },
  space: {
    pitch: 0.6, rate: 1.0,
    lines: ["ヒューストン、絶好調じゃ", "無重力より気持ちええぞ", "尻から発射準備完了じゃ", "打ち上げカウントダウンじゃ", "宇宙最高の尻じゃ", "スペーシーな気分じゃ"],
  },
  magical: {
    pitch: 1.8, rate: 1.1,
    lines: ["魔法みたいに気持ちいい", "ステッキよりよく効くのう", "変身しちゃいそうじゃ", "月に代わって最高じゃ", "キラキラが止まらんのう", "魔法少女もびっくりじゃ"],
  },
  bear: {
    pitch: 0.7, rate: 0.9,
    lines: ["クマもご機嫌じゃ", "冬眠したくなくなったのう", "サケより美味しい気分じゃ", "ガオー、最高じゃ", "モフモフ悦んどるぞ", "熊の里でも大人気じゃ"],
  },
  gold: {
    pitch: 0.5, rate: 1.1,
    lines: ["金運上がってきたぞ", "ワシは黄金に輝くのう", "まぶしいほど気持ちいい", "24金の尻、絶好調じゃ", "黄金の輝き増し増しじゃ", "成金気分じゃのう"],
  },
  boxrobo: {
    pitch: 0.3, rate: 0.85,
    lines: ["ワレワレハ、ゴキゲンダ", "イタクナイ、キモチイイ", "ガシャン、コウフンスル", "リサイクル不要、絶好調", "ダンボールジン、カンゲキ", "エネルギー、ジュウテンダ"],
  },
  tuxedo: {
    pitch: 0.55, rate: 0.95,
    lines: ["紳士も悦ぶ一撃じゃ", "ボンド、絶好調じゃ", "パーティーはこれからじゃぞ", "蝶ネクタイが躍るのう", "エレガントに悶えとるわ", "紳士的にたまらんのう"],
  },
  penguin: {
    pitch: 1.3, rate: 1.05,
    lines: ["ペンペン、最高じゃ", "南極より温かい気分じゃ", "氷の上でも踊れそうじゃ", "ぺぎょっ、たまらん", "よちよち悦んどるぞ", "フリッパーが震えるのう"],
  },
  hoshi: {
    pitch: 1.2, rate: 1.15,
    lines: ["F**k yeah, effin' 最高じゃ!", "That's me、ノリノリじゃぜ!", "イエーイ!効くぜ!", "オー、that's the spot じゃ!", "レッツゴー、まだまだ叩けや!", "星屑くらい弾けとるぞ!", "So damn good じゃ!", "キラキラ輝いてキマってるぜ!"],
  },
};

let jaVoice = null;
function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  const pick = () => {
    const vs = speechSynthesis.getVoices();
    jaVoice = vs.find((v) => v.lang && v.lang.startsWith("ja")) || null;
  };
  pick();
  if (!jaVoice) speechSynthesis.addEventListener("voiceschanged", pick, { once: true });
}
loadVoices();

// 叩かれたときに呼ぶ。毎回ではなくランダム(約35%)で発声する。
export function maybeSlapVoice(costumeId, progress = 0) {
  if (!("speechSynthesis" in window)) return null;
  if (Math.random() > 0.35) return null;
  if (speechSynthesis.speaking) return null; // 重ねない
  const set = VOICE_SETS[costumeId] || VOICE_SETS.suit;
  const line = set.lines[Math.floor(Math.random() * set.lines.length)];
  const u = new SpeechSynthesisUtterance(line);
  if (jaVoice) u.voice = jaVoice;
  u.lang = "ja-JP";
  // 進行が進むほど声が上ずる
  u.pitch = Math.min(2, set.pitch + progress * 0.3);
  u.rate = set.rate + progress * 0.2;
  u.volume = 0.9;
  speechSynthesis.speak(u);
  return line;
}

// エンディングの叫び。叫んだセリフを返す。
export function screamVoice(costumeId) {
  const line = "ヒャッホーウ!飛ぶぞおおおお";
  if (!("speechSynthesis" in window)) return line;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(line);
  if (jaVoice) u.voice = jaVoice;
  u.lang = "ja-JP";
  const set = VOICE_SETS[costumeId] || VOICE_SETS.suit;
  u.pitch = Math.min(2, set.pitch + 0.3);
  u.rate = 1.2;
  u.volume = 1;
  speechSynthesis.speak(u);
  return line;
}
