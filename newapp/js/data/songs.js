// 오늘의 노래 시드 카탈로그 — 기분별 큐레이션. D2/D8/D15.
// 원칙1(불신): 깨질 수 있는 영상ID를 지어내지 않는다 → YouTube Music '검색' 딥링크로 연결(항상 유효).
//   영상 임베드(youtubeId)는 관리자(admin.html)가 확인한 URL만 추가한다.
// 큐레이션 기준: 기분 톤에 맞춰 국내·해외 / 시대(70s~현재) / 장르를 고루 섞는다(기분당 20곡).
//   → "내 맘을 어떻게 알았지" 싶은 폭과 정교함. 관리자가 계속 다듬는 살아있는 목록.
const yt = (q) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}`;
const s = (title, artist) => ({ title, artist, source: 'link', url: yt(`${artist} ${title}`) });

export const SONGS = {
  // 행복 — 밝고 신나는, 텐션 끌어올리는
  happy: [
    s('아주 NICE', '세븐틴'), s('Hype Boy', '뉴진스'), s('Dynamite', '방탄소년단'),
    s('마지막처럼', '블랙핑크'), s('CHEER UP', '트와이스'), s('HIP', '마마무'), s('라일락', '아이유'),
    s('Happy', 'Pharrell Williams'), s('Uptown Funk', 'Mark Ronson, Bruno Mars'),
    s('Can\'t Stop the Feeling!', 'Justin Timberlake'), s('September', 'Earth, Wind & Fire'),
    s('Shake It Off', 'Taylor Swift'), s('Walking on Sunshine', 'Katrina and the Waves'),
    s('강남스타일', '싸이'), s('I Gotta Feeling', 'Black Eyed Peas'), s('Levitating', 'Dua Lipa'),
    s('Treasure', 'Bruno Mars'), s('Dancing Queen', 'ABBA'), s('사랑을 했다', '아이콘'),
    s('Mr. Blue Sky', 'Electric Light Orchestra'),
  ],
  // 설렘 — 두근거리는, 사랑에 빠지는
  flutter: [
    s('좋은 날', '아이유'), s('주저하는 연인들을 위해', '잔나비'), s('모든 날, 모든 순간', '폴킴'),
    s('첫 눈처럼 너에게 가겠다', '에일리'), s('봄이 좋냐??', '10cm'), s('썸', '소유, 정기고'),
    s('너를 만나', '폴킴'), s('Perfect', 'Ed Sheeran'), s('Sweater Weather', 'The Neighbourhood'),
    s('Can\'t Help Falling in Love', 'Elvis Presley'), s('Sugar', 'Maroon 5'),
    s('La Vie en Rose', 'Édith Piaf'), s('Best Part', 'Daniel Caesar, H.E.R.'),
    s('Cupid', '피프티피프티'), s('LOVE DIVE', '아이브'), s('strawberry moon', '아이유'),
    s('Style', 'Taylor Swift'), s('Adore You', 'Harry Styles'), s('Electric Love', 'BØRNS'),
    s('Photograph', 'Ed Sheeran'),
  ],
  // 평온 — 잔잔하게 흐르는, 한 박자 쉬어가는
  calm: [
    s('밤편지', '아이유'), s('안녕', '폴킴'), s('난춘', '새소년'), s('가을 아침', '아이유'),
    s('봄 여름 가을 겨울', '빅뱅'), s('비도 오고 그래서', '헤이즈'),
    s('Banana Pancakes', 'Jack Johnson'), s('Put Your Records On', 'Corinne Bailey Rae'),
    s('Fly Me to the Moon', 'Frank Sinatra'), s('Norwegian Wood', 'The Beatles'),
    s('Riptide', 'Vance Joy'), s('Sunday Morning', 'Maroon 5'), s('Better Together', 'Jack Johnson'),
    s('신호등', '이무진'), s('가로수 그늘 아래 서면', '이문세'), s('Here Comes the Sun', 'The Beatles'),
    s('Lovely Day', 'Bill Withers'), s('Lemon Tree', 'Fool\'s Garden'),
    s('Island in the Sun', 'Weezer'), s('Bubbly', 'Colbie Caillat'),
  ],
  // 우울 — 마음을 곱씹는, 위로가 되는
  blue: [
    s('사건의 지평선', '윤하'), s('서른 즈음에', '김광석'), s('옛사랑', '이문세'),
    s('어떻게 이별까지 사랑하겠어, 널 사랑하는 거지', '악동뮤지션'), s('보고싶다', '김범수'),
    s('이별택시', '김연우'), s('Love poem', '아이유'), s('Someone Like You', 'Adele'),
    s('Fix You', 'Coldplay'), s('Skinny Love', 'Bon Iver'), s('Stay With Me', 'Sam Smith'),
    s('Let Her Go', 'Passenger'), s('All I Want', 'Kodaline'), s('소주 한 잔', '임창정'),
    s('사랑했지만', '김광석'), s('그 중에 그대를 만나', '이선희'), s('The Night We Met', 'Lord Huron'),
    s('when the party\'s over', 'Billie Eilish'), s('Everybody Hurts', 'R.E.M.'),
    s('Tears in Heaven', 'Eric Clapton'),
  ],
  // 화남 — 강렬하게 분출하는, 속이 뻥 뚫리는
  angry: [
    s('FIRE (불타오르네)', '방탄소년단'), s('TOMBOY', '(여자)아이들'), s('삐딱하게', '지드래곤'),
    s('하여가', '서태지와 아이들'), s('눈누난나 (NUNU NANA)', '제시'), s('How You Like That', '블랙핑크'),
    s('Numb', 'Linkin Park'), s('In the End', 'Linkin Park'), s('Smells Like Teen Spirit', 'Nirvana'),
    s('Believer', 'Imagine Dragons'), s('HUMBLE.', 'Kendrick Lamar'), s('Lose Yourself', 'Eminem'),
    s('Seven Nation Army', 'The White Stripes'), s('내가 제일 잘 나가', '투애니원'),
    s('Bring Me to Life', 'Evanescence'), s('Boulevard of Broken Dreams', 'Green Day'),
    s('Last Resort', 'Papa Roach'), s('\'Til I Collapse', 'Eminem'), s('DNA.', 'Kendrick Lamar'),
    s('Killing in the Name', 'Rage Against the Machine'),
  ],
};
