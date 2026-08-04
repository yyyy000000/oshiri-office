// おじさんの被弾ボイス(Web Speech API)。衣装によって声とセリフが変わる。
// 発声した場合はそのセリフ文字列を返す(吹き出し表示用)。発声しなければ null。
const VOICE_SETS = {
  suit: {
    pitch: 0.45, rate: 1.05,
    lines: ["イタッ", "アイタタ", "うおっ", "ぬおお", "効くのう", "ほげっ"],
  },
  nurse: {
    pitch: 1.5, rate: 1.0,
    lines: ["きゃっ", "もう、乱暴はだめですよ", "ちゅ、注射しますよ", "お大事に、じゃなくて痛いです"],
  },
  dino: {
    pitch: 0.35, rate: 0.95,
    lines: ["ガオー、じゃなくてイタッ", "恐竜は絶滅するぞ", "ジュラ紀に帰りたい", "ガオオオ"],
  },
  space: {
    pitch: 0.6, rate: 1.0,
    lines: ["ヒューストン、尻をやられた", "無重力でも痛いもんは痛い", "酸素より尻が心配じゃ", "打ち上げ準備は万端じゃ"],
  },
  magical: {
    pitch: 1.8, rate: 1.1,
    lines: ["魔法が解けちゃう", "ステッキが折れるー", "変身がとける", "月にかわって、いたい"],
  },
  bear: {
    pitch: 0.7, rate: 0.9,
    lines: ["クマったのう", "冬眠させてくれ", "サケが食べたいのう", "ガルルル、痛いんじゃ"],
  },
  gold: {
    pitch: 0.5, rate: 1.1,
    lines: ["金運が逃げるじゃろ", "ワシは黄金じゃぞ", "まぶしいか?ワシもじゃ", "24金の尻じゃ"],
  },
  boxrobo: {
    pitch: 0.3, rate: 0.85,
    lines: ["ワレワレハ、ダンボールジン", "イタイ、ダンボールデモ、イタイ", "ガシャン、コワレル", "リサイクルシナイデ"],
  },
  tuxedo: {
    pitch: 0.55, rate: 0.95,
    lines: ["紳士の尻を叩くとは", "ボンド、尻山ボンドじゃ", "パーティーはこれからじゃぞ", "蝶ネクタイが曲がるじゃろ"],
  },
  penguin: {
    pitch: 1.3, rate: 1.05,
    lines: ["ペンペン", "南極に帰りたいのう", "氷の上なら滑って逃げられたのに", "ぺぎょっ"],
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
  const line = "うわああああ、飛ぶうううう";
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
