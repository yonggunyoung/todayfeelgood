/**
 * 큐레이션 시드(데이터) — 검증된 "명작" 부트스트랩. (idea-textmoji §3.3)
 *
 * 중요: 큐레이션은 생성기의 *시드/첫인상*일 뿐, 그 자체가 제품이 아니다(게이트 ❌ 회피).
 * 첫 화면은 검증된 이것들을 먼저 보여 주고, "🎲 더 만들기"에서 절차 생성으로 넘어간다.
 * 전부 공개·자유복제되는 일반 텍스트 이모티콘(저작권 무해). tier는 estimateTier로 런타임 재산정한다.
 */
export interface CuratedSeed {
  text: string;
  emotion: string;
  tags?: string[];
}

export const CURATED: CuratedSeed[] = [
  // 기쁨
  { text: "^_^", emotion: "joy", tags: ["웃는", "기본"] },
  { text: "(^▽^)", emotion: "joy" },
  { text: "\\(^o^)/", emotion: "joy", tags: ["만세"] },
  { text: ":D", emotion: "joy", tags: ["활짝"] },
  { text: "(◕‿◕)", emotion: "joy", tags: ["또렷"] },
  { text: "(•‿•)", emotion: "joy" },
  // 사랑
  { text: "(♥‿♥)", emotion: "love", tags: ["하트눈"] },
  { text: "(づ｡◕‿‿◕｡)づ", emotion: "love", tags: ["안기"] },
  { text: "♡(˃͈ ˂͈ )", emotion: "love" },
  { text: "(*^3^)/~♡", emotion: "love", tags: ["뽀뽀"] },
  { text: "(◍•ᴗ•◍)❤", emotion: "love" },
  // 슬픔
  { text: "(T_T)", emotion: "sad", tags: ["우는", "기본"] },
  { text: "(；_；)", emotion: "sad" },
  { text: "(ㅠ_ㅠ)", emotion: "sad", tags: ["한국식"] },
  { text: "(╥﹏╥)", emotion: "sad" },
  { text: "( ; ; )", emotion: "sad" },
  // 화남
  { text: "(╯°□°)╯︵ ┻━┻", emotion: "angry", tags: ["책상뒤집기"] },
  { text: "(¬_¬)", emotion: "angry", tags: ["째려봄"] },
  { text: "(҂◡_◡)", emotion: "angry" },
  { text: ">:(", emotion: "angry" },
  { text: "(`Д´)", emotion: "angry" },
  // 놀람
  { text: "(°o°)", emotion: "surprise", tags: ["헉"] },
  { text: "(O_O)", emotion: "surprise" },
  { text: "(⊙_⊙)", emotion: "surprise" },
  { text: "Σ(°ロ°)", emotion: "surprise", tags: ["충격"] },
  // 귀여움(동물상)
  { text: "ʕ•ᴥ•ʔ", emotion: "cute", tags: ["곰"] },
  { text: "(=^･ω･^=)", emotion: "cute", tags: ["고양이"] },
  { text: "(◕ᴥ◕)", emotion: "cute" },
  { text: "ฅ(•ﻌ•)ฅ", emotion: "cute" },
  // 시크
  { text: "(￣ー￣)", emotion: "chic" },
  { text: "(-_-)", emotion: "chic", tags: ["무심"] },
  { text: "( ͡° ͜ʖ ͡°)", emotion: "chic", tags: ["능청"] },
  { text: "¯\\_(ツ)_/¯", emotion: "chic", tags: ["몰라"] },
  // 민망
  { text: "(^_^;)", emotion: "embarrassed", tags: ["식은땀"] },
  { text: "(>_<)", emotion: "embarrassed" },
  { text: "(；・∀・)", emotion: "embarrassed" },
  // 무표정
  { text: "(・_・)", emotion: "blank" },
  { text: "(゜-゜)", emotion: "blank", tags: ["멍"] },
  { text: "(´・_・`)", emotion: "blank" },
  // 장난
  { text: "(>_<)d", emotion: "play" },
  { text: "(｀▽´)-σ", emotion: "play", tags: ["메롱"] },
  { text: ";)", emotion: "play", tags: ["윙크"] },
  { text: "(^_-)", emotion: "play" },
  // 인사
  { text: "(^o^)/", emotion: "hi", tags: ["손흔들"] },
  { text: "ヾ(^▽^*)", emotion: "hi" },
  { text: "(｡•̀ᴗ-)✧", emotion: "hi" },
  // 뿌듯
  { text: "( •̀ᴗ•́ )و", emotion: "proud", tags: ["화이팅"] },
  { text: "ᕦ(ò_óˇ)ᕤ", emotion: "proud", tags: ["근육"] },
  { text: "(ง•̀_•́)ง", emotion: "proud" },
];
