// 오늘의 노래 시드 카탈로그 — Tier A(가수곡 = 링크아웃). D2/D3/D8.
// ⚠️ SEED: 실제 큐레이션으로 교체 예정. 무드 매핑도 임시.
// 원칙1(불신): 깨질 수 있는 youtubeId를 지어내지 않는다 → '검색 링크'로 연결(항상 유효).
//   추후 정확한 임베드 ID로 승급(D2).
const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
const s = (title, artist) => ({ title, artist, source: 'link', url: yt(`${artist} ${title}`) });

export const SONGS = {
  happy:   [ s('아주 NICE', '세븐틴'), s('워커홀릭', '볼빨간사춘기'), s('HIP', '마마무') ],
  flutter: [ s('좋은 날', '아이유'), s('주저하는 연인들을 위해', '잔나비'), s('모든 날, 모든 순간', '폴킴') ],
  calm:    [ s('밤편지', '아이유'), s('안녕', '폴킴'), s('난춘', '새소년') ],
  blue:    [ s('사건의 지평선', '윤하'), s('서른 즈음에', '김광석'), s('옛사랑', '이문세') ],
  angry:   [ s('불타오르네', '방탄소년단'), s('챔피언', '싸이'), s('TOMBOY', '(여자)아이들') ],
};
