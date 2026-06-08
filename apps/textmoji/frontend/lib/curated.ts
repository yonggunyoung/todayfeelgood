/**
 * 큐레이션 카오모지 — 감정별 검증된 텍스트 이모티콘 라이브러리.
 *
 * 첫 화면 다양성의 핵심. 전부 공개·자유복제되는 일반 텍스트 이모티콘(저작권 무해).
 * "🎲 더 만들기"의 절차 생성이 이 위에 무한 변형을 얹는다.
 * emotion id는 emotions.ts와 1:1로 맞춘다.
 */
export interface CuratedSeed {
  text: string;
  emotion: string;
  tags?: string[];
}

export const CURATED: CuratedSeed[] = [
  // ── 기쁨 joy ──
  { text: "^_^", emotion: "joy", tags: ["웃는", "기본"] },
  { text: "(^▽^)", emotion: "joy" },
  { text: "\\(^o^)/", emotion: "joy", tags: ["만세"] },
  { text: ":D", emotion: "joy", tags: ["활짝"] },
  { text: "(◕‿◕)", emotion: "joy" },
  { text: "(•‿•)", emotion: "joy" },
  { text: "(＾▽＾)", emotion: "joy" },
  { text: "(´∀｀)", emotion: "joy" },
  { text: "ヽ(´▽`)/", emotion: "joy" },
  { text: "(*≧▽≦)", emotion: "joy" },
  { text: "(๑˃ᴗ˂)ﻭ", emotion: "joy" },
  { text: "( ´ ▽ ` )ﾉ", emotion: "joy" },
  { text: "ヽ(o^▽^o)ノ", emotion: "joy" },
  { text: "(✿◠‿◠)", emotion: "joy", tags: ["꽃"] },

  // ── 사랑 love ──
  { text: "(♥‿♥)", emotion: "love", tags: ["하트눈"] },
  { text: "(づ｡◕‿‿◕｡)づ", emotion: "love", tags: ["안기"] },
  { text: "♡(˃͈ ˂͈ )", emotion: "love" },
  { text: "(*^3^)/~♡", emotion: "love", tags: ["뽀뽀"] },
  { text: "(◍•ᴗ•◍)❤", emotion: "love" },
  { text: "(´♡‿♡`)", emotion: "love" },
  { text: "♡＾▽＾♡", emotion: "love" },
  { text: "(◕ᴗ◕✿)", emotion: "love" },
  { text: "(っ˘̩╭╮˘̩)っ", emotion: "love", tags: ["안아줘"] },
  { text: "(灬♥ω♥灬)", emotion: "love" },
  { text: "(*˘︶˘*).｡.:*♡", emotion: "love" },
  { text: "ε≖‿≖з", emotion: "love" },
  { text: "( ˘ ³˘)♥", emotion: "love", tags: ["뽀뽀"] },

  // ── 슬픔 sad ──
  { text: "(T_T)", emotion: "sad", tags: ["우는", "기본"] },
  { text: "(；_；)", emotion: "sad" },
  { text: "(ㅠ_ㅠ)", emotion: "sad", tags: ["한국식"] },
  { text: "(╥﹏╥)", emotion: "sad" },
  { text: "( ; ; )", emotion: "sad" },
  { text: "(っ˘̩╭╮˘̩)っ", emotion: "sad" },
  { text: "(´；ω；`)", emotion: "sad" },
  { text: "( ╥ω╥ )", emotion: "sad" },
  { text: "。゜゜(´Ｏ`) ゜゜。", emotion: "sad" },
  { text: "(ノ_<。)", emotion: "sad" },
  { text: "(•́︿•̀)", emotion: "sad" },
  { text: "(つд⊂)", emotion: "sad", tags: ["눈비빔"] },

  // ── 화남 angry ──
  { text: "(╯°□°)╯︵ ┻━┻", emotion: "angry", tags: ["책상뒤집기"] },
  { text: "(¬_¬)", emotion: "angry", tags: ["째려봄"] },
  { text: "(҂◡_◡)", emotion: "angry" },
  { text: ">:(", emotion: "angry" },
  { text: "(`Д´)", emotion: "angry" },
  { text: "(╬ Ò﹏Ó)", emotion: "angry" },
  { text: "ヽ(`Д´)ﾉ", emotion: "angry" },
  { text: "(҂⌣̀_⌣́)", emotion: "angry" },
  { text: "凸(`0´)凸", emotion: "angry", tags: ["욕"] },
  { text: "(ﾉಥ益ಥ)ﾉ", emotion: "angry" },
  { text: "( ｀皿´)", emotion: "angry" },
  { text: "凸(￣ヘ￣)", emotion: "angry" },

  // ── 놀람 surprise ──
  { text: "(°o°)", emotion: "surprise", tags: ["헉"] },
  { text: "(O_O)", emotion: "surprise" },
  { text: "(⊙_⊙)", emotion: "surprise" },
  { text: "Σ(°ロ°)", emotion: "surprise", tags: ["충격"] },
  { text: "(°ロ°) !", emotion: "surprise" },
  { text: "Σ(ﾟДﾟ)", emotion: "surprise" },
  { text: "(꒪ꇴ꒪)", emotion: "surprise" },
  { text: "(ʘᗩʘ’)", emotion: "surprise" },
  { text: "w(°ｏ°)w", emotion: "surprise" },
  { text: "(((( ;°Д°))))", emotion: "surprise", tags: ["덜덜"] },

  // ── 귀여움 cute ──
  { text: "ʕ•ᴥ•ʔ", emotion: "cute", tags: ["곰"] },
  { text: "(=^･ω･^=)", emotion: "cute", tags: ["고양이"] },
  { text: "(◕ᴥ◕)", emotion: "cute" },
  { text: "ฅ(•ﻌ•)ฅ", emotion: "cute" },
  { text: "ʕ◍•㉨•◍ʔ", emotion: "cute" },
  { text: "(´･ᴥ･`)", emotion: "cute" },
  { text: "ฅ^•ﻌ•^ฅ", emotion: "cute", tags: ["고양이"] },
  { text: "( ˶ˆ ᗜ ˆ˵ )", emotion: "cute" },
  { text: "(づ ◕‿◕ )づ", emotion: "cute" },
  { text: "꒰ᐢ. .ᐢ꒱", emotion: "cute", tags: ["토끼"] },
  { text: "(˶ᵔ ᵕ ᵔ˶)", emotion: "cute" },
  { text: "/ᐠ｡ꞈ｡ᐟ\\", emotion: "cute", tags: ["고양이"] },

  // ── 시크 chic ──
  { text: "(￣ー￣)", emotion: "chic" },
  { text: "(-_-)", emotion: "chic", tags: ["무심"] },
  { text: "( ͡° ͜ʖ ͡°)", emotion: "chic", tags: ["능청"] },
  { text: "¯\\_(ツ)_/¯", emotion: "chic", tags: ["몰라"] },
  { text: "(￢_￢)", emotion: "chic" },
  { text: "(¬‿¬)", emotion: "chic" },
  { text: "(￣～￣;)", emotion: "chic" },
  { text: "ಠ_ಠ", emotion: "chic", tags: ["불만"] },
  { text: "( ̄□ ̄」", emotion: "chic" },
  { text: "(；一_一)", emotion: "chic" },

  // ── 민망 embarrassed ──
  { text: "(^_^;)", emotion: "embarrassed", tags: ["식은땀"] },
  { text: "(>_<)", emotion: "embarrassed" },
  { text: "(；・∀・)", emotion: "embarrassed" },
  { text: "(￣▽￣;)", emotion: "embarrassed" },
  { text: "(°_°;)", emotion: "embarrassed" },
  { text: "(⌒_⌒;)", emotion: "embarrassed" },
  { text: "(￣Д￣;;", emotion: "embarrassed" },
  { text: "(；ﾟ∀ﾟ)", emotion: "embarrassed" },

  // ── 무표정 blank ──
  { text: "(・_・)", emotion: "blank" },
  { text: "(゜-゜)", emotion: "blank", tags: ["멍"] },
  { text: "(´・_・`)", emotion: "blank" },
  { text: "(￣_￣)", emotion: "blank" },
  { text: "(-。-)", emotion: "blank" },
  { text: "(¯ . ¯)", emotion: "blank" },
  { text: "(•_•)", emotion: "blank" },
  { text: "(￫_￩)", emotion: "blank", tags: ["현타"] },

  // ── 장난 play ──
  { text: "(>_<)d", emotion: "play" },
  { text: "(｀▽´)-σ", emotion: "play", tags: ["메롱"] },
  { text: ";)", emotion: "play", tags: ["윙크"] },
  { text: "(^_-)", emotion: "play" },
  { text: "(￣ε￣＠)", emotion: "play" },
  { text: "(・ωｰ)～☆", emotion: "play", tags: ["윙크"] },
  { text: "(ﾉ´ヮ`)ﾉ*: ･ﾟ", emotion: "play" },
  { text: "(づ｡◕‿‿◕｡)づ", emotion: "play" },
  { text: "(๑˃̵ᴗ˂̵)و", emotion: "play" },
  { text: "（；￥；）", emotion: "play" },

  // ── 인사 hi ──
  { text: "(^o^)/", emotion: "hi", tags: ["손흔들"] },
  { text: "ヾ(^▽^*)", emotion: "hi" },
  { text: "(｡•̀ᴗ-)✧", emotion: "hi" },
  { text: "ヾ(＾∇＾)", emotion: "hi" },
  { text: "( ´ ▽ ` )ﾉ", emotion: "hi" },
  { text: "(*￣▽￣)ノ", emotion: "hi" },
  { text: "ヽ(・∀・)ﾉ", emotion: "hi" },
  { text: "(•‿•)ノ", emotion: "hi" },
  { text: "bye (T▽T)/", emotion: "hi", tags: ["바이"] },

  // ── 뿌듯 proud ──
  { text: "( •̀ᴗ•́ )و", emotion: "proud", tags: ["화이팅"] },
  { text: "ᕦ(ò_óˇ)ᕤ", emotion: "proud", tags: ["근육"] },
  { text: "(ง•̀_•́)ง", emotion: "proud" },
  { text: "(๑•̀ㅂ•́)و✧", emotion: "proud" },
  { text: "( •̀ω•́ )✧", emotion: "proud" },
  { text: "٩( ᐛ )و", emotion: "proud" },
  { text: "ᕙ(⇀‸↼‶)ᕗ", emotion: "proud", tags: ["근육"] },
  { text: "(„• ֊ •„)੭", emotion: "proud" },

  // ── 졸림 sleepy ──
  { text: "(￣o￣) zzZ", emotion: "sleepy" },
  { text: "(-ω-) zzz", emotion: "sleepy" },
  { text: "(｡-ω-)zzz", emotion: "sleepy" },
  { text: "(=_ヾ)", emotion: "sleepy" },
  { text: "(￣Q￣)zzz", emotion: "sleepy" },
  { text: "(´〜｀*) zzz", emotion: "sleepy" },
  { text: "ヽ(✿ﾟ▽ﾟ)ノ", emotion: "sleepy" },
  { text: "(￣ρ￣)..zzZ", emotion: "sleepy" },

  // ── 심쿵 flutter ──
  { text: "(♡˙︶˙♡)", emotion: "flutter" },
  { text: "(*♡∀♡)", emotion: "flutter" },
  { text: "♡>৺<♡", emotion: "flutter" },
  { text: "(˶˃ ᵕ ˂˶) .ᐟ", emotion: "flutter" },
  { text: "(/▽＼*)｡o○♡", emotion: "flutter", tags: ["부끄"] },
  { text: "(⸝⸝ᵕᴗᵕ⸝⸝)", emotion: "flutter" },
  { text: "ദ്ദി ˉ͈̀꒳ˉ͈́ )", emotion: "flutter" },
  { text: "(´｡• ᵕ •｡`) ♡", emotion: "flutter" },

  // ── 빵터짐 lol ──
  { text: "(≧▽≦)", emotion: "lol" },
  { text: "ヾ(≧▽≦*)o", emotion: "lol" },
  { text: "(*≧∀≦*)", emotion: "lol" },
  { text: "﹏(◑‿◐)﹏", emotion: "lol" },
  { text: "ʷʷʷ", emotion: "lol", tags: ["ㅋㅋ"] },
  { text: "(╹◡╹)凸", emotion: "lol" },
  { text: "( ˃̣̣̥᷄⌓˂̣̣̥᷅ )", emotion: "lol", tags: ["웃다눈물"] },
  { text: "ﾌﾟｯ(*≧m≦*)", emotion: "lol" },

  // ── 부끄 shy ──
  { text: "(*/ω＼*)", emotion: "shy" },
  { text: "(//▽//)", emotion: "shy" },
  { text: "(*ﾉωﾉ)", emotion: "shy" },
  { text: "(>///<)", emotion: "shy" },
  { text: "( ˶ᵔ ᵕ ᵔ˶ )", emotion: "shy" },
  { text: "(⁄ ⁄•⁄ω⁄•⁄ ⁄)", emotion: "shy" },
  { text: "(*/。＼)", emotion: "shy" },
  { text: "꒰⑅ ׳̥̑·֊·̭ ꒱", emotion: "shy" },

  // ── 글쎄 shrug ──
  { text: "¯\\_(ツ)_/¯", emotion: "shrug" },
  { text: "ヽ(´ー｀)ノ", emotion: "shrug" },
  { text: "(´・ω・`)", emotion: "shrug" },
  { text: "╮(￣～￣)╭", emotion: "shrug" },
  { text: "ლ(ﾟдﾟლ)", emotion: "shrug", tags: ["왜"] },
  { text: "(눈_눈)", emotion: "shrug" },
  { text: "(¯ ¯٥)", emotion: "shrug" },
  { text: "( ˙▿˙ )?", emotion: "shrug" },

  // ── 오열 cry ──
  { text: "(πーπ)", emotion: "cry" },
  { text: "ﻌ(´°̥̥̥̥̥̥̥̥ω°̥̥̥̥̥̥̥̥｀)ﻌ", emotion: "cry" },
  { text: "。゜(｀Д´)゜。", emotion: "cry", tags: ["대성통곡"] },
  { text: "(;﹏;)", emotion: "cry" },
  { text: "｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡", emotion: "cry", tags: ["펑펑"] },
  { text: "(个_个)", emotion: "cry" },
  { text: "(╥╯﹏╰╥)", emotion: "cry" },
  { text: "˚‧º·(˃̣̣̥▱˂̣̣̥)‧º·˚", emotion: "cry" },
];
