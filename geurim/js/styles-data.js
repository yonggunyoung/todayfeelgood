// 그림공장 — 스타일·옵션 프리셋 데이터 (순수 데이터, DOM/AI 비의존)
// 각 항목: { id, ko(UI 라벨), en(이미지 모델용 프롬프트 조각), hint? }
// 이미지 모델은 영어 프롬프트에서 품질이 가장 좋으므로, UI는 한글로 보여주되 조립은 en 조각으로 한다.

/** 큰 스타일(매체) — 한 번에 하나 선택 */
export const STYLE_KINDS = [
  { id: 'photo',      ko: '실사 사진',     en: 'photorealistic photograph, realistic, lifelike, sharp focus' },
  { id: 'cinematic',  ko: '시네마틱',      en: 'cinematic film still, dramatic, anamorphic, depth of field, color graded' },
  { id: 'illust',     ko: '디지털 일러스트', en: 'digital illustration, clean line art, vibrant, detailed' },
  { id: 'anime',      ko: '애니메이션',    en: 'anime style, cel shaded, expressive, studio anime key visual' },
  { id: 'manhwa',     ko: '웹툰·만화',     en: 'korean webtoon manhwa style, clean inking, soft cell shading' },
  { id: 'watercolor', ko: '수채화',        en: 'watercolor painting, soft washes, paper texture, hand painted' },
  { id: 'oil',        ko: '유화',          en: 'oil painting, visible brush strokes, rich impasto, classical' },
  { id: 'pencil',     ko: '연필 드로잉',   en: 'graphite pencil sketch, hand drawn, cross hatching, monochrome' },
  { id: 'ink',        ko: '펜·잉크',       en: 'ink illustration, bold linework, high contrast, pen and ink' },
  { id: 'render3d',   ko: '3D 렌더',       en: '3d render, octane render, physically based, soft global illumination' },
  { id: 'pixel',      ko: '픽셀아트',      en: 'pixel art, 16-bit, crisp pixels, retro game sprite' },
  { id: 'lowpoly',    ko: '로우폴리',      en: 'low poly 3d, faceted geometry, flat shading' },
  { id: 'vector',     ko: '미니멀 벡터',   en: 'minimal flat vector illustration, simple shapes, clean, ui style' },
  { id: 'concept',    ko: '컨셉아트',      en: 'concept art, matte painting, epic, highly detailed environment' },
  { id: 'product',    ko: '제품 사진',     en: 'product photography, studio softbox, seamless background, commercial' },
  { id: 'logo',       ko: '로고·아이콘',   en: 'minimal logo design, vector mark, flat, centered, negative space' },
  { id: 'iso',        ko: '아이소메트릭',  en: 'isometric illustration, 45 degree, clean, miniature diorama' },
  { id: 'cyberpunk',  ko: '사이버펑크',    en: 'cyberpunk, neon-lit, futuristic, high tech, rain reflections' },
  { id: 'fantasy',    ko: '판타지 아트',   en: 'fantasy art, painterly, magical, ethereal, artstation trending' },
  { id: 'sticker',    ko: '스티커',        en: 'die-cut sticker, thick white border, glossy, cute, flat color' },
];

/** 분위기·조명 */
export const MOODS = [
  { id: 'soft',     ko: '부드러운 자연광', en: 'soft natural lighting' },
  { id: 'golden',   ko: '황금빛 노을',     en: 'golden hour, warm sunset light, long shadows' },
  { id: 'studio',   ko: '스튜디오 조명',   en: 'studio lighting, softbox, even light' },
  { id: 'neon',     ko: '네온',           en: 'neon lighting, vivid glow, magenta and cyan' },
  { id: 'lowkey',   ko: '로우키(어두운)',  en: 'low key lighting, dramatic shadows, dark background' },
  { id: 'highkey',  ko: '하이키(밝은)',    en: 'high key lighting, bright, airy, minimal shadows' },
  { id: 'backlit',  ko: '역광',           en: 'backlit, rim light, silhouette glow' },
  { id: 'moody',    ko: '몽환적',         en: 'moody atmosphere, foggy, ethereal, dreamy' },
  { id: 'sunny',    ko: '쨍한 햇빛',       en: 'bright sunny day, clear sky, vivid' },
  { id: 'night',    ko: '밤·야경',         en: 'night scene, city lights, long exposure' },
];

/** 구도·샷 */
export const SHOTS = [
  { id: 'closeup',  ko: '클로즈업',   en: 'extreme close-up shot' },
  { id: 'portrait', ko: '인물(상반신)', en: 'portrait shot, head and shoulders' },
  { id: 'full',     ko: '전신',       en: 'full body shot' },
  { id: 'wide',     ko: '와이드샷',   en: 'wide establishing shot' },
  { id: 'top',      ko: '부감(위에서)', en: 'top-down flat lay view' },
  { id: 'low',      ko: '로우앵글',   en: 'low angle shot, looking up' },
  { id: 'macro',    ko: '매크로',     en: 'macro photography, fine detail' },
  { id: 'center',   ko: '정면·대칭',  en: 'centered symmetrical composition, front view' },
];

/** 색감 팔레트 */
export const PALETTES = [
  { id: 'vivid',    ko: '비비드',   en: 'vivid saturated colors' },
  { id: 'pastel',   ko: '파스텔',   en: 'soft pastel color palette' },
  { id: 'warm',     ko: '따뜻한',   en: 'warm color palette, amber and red tones' },
  { id: 'cool',     ko: '차가운',   en: 'cool color palette, blue and teal tones' },
  { id: 'mono',     ko: '모노크롬', en: 'monochrome, black and white' },
  { id: 'earthy',   ko: '어스톤',   en: 'earthy muted natural tones' },
  { id: 'neonpal',  ko: '네온 컬러', en: 'neon color palette, electric, glowing' },
  { id: 'mute',     ko: '저채도',   en: 'desaturated muted colors' },
];

/** 디테일·품질 부스터 (다중 선택 토글) */
export const BOOSTERS = [
  { id: 'highres',  ko: '고해상도',   en: 'high resolution, ultra detailed, sharp' },
  { id: 'pro',      ko: '프로 퀄리티', en: 'professional, masterpiece, best quality' },
  { id: 'bokeh',    ko: '아웃포커스', en: 'shallow depth of field, beautiful bokeh' },
  { id: 'texture',  ko: '질감 강조',  en: 'intricate textures, fine surface detail' },
  { id: 'volumetric', ko: '입체 광선', en: 'volumetric light, god rays, atmospheric' },
  { id: 'film',     ko: '필름 그레인', en: 'analog film grain, 35mm, kodak portra' },
];

/** 화면 비율 — 각 제공자가 지원하는 크기로는 providers/index.js에서 매핑한다 */
export const ASPECTS = [
  { id: '1:1',  ko: '정사각 1:1',   w: 1, h: 1 },
  { id: '3:4',  ko: '세로 3:4',     w: 3, h: 4 },
  { id: '4:3',  ko: '가로 4:3',     w: 4, h: 3 },
  { id: '9:16', ko: '세로 9:16',    w: 9, h: 16 },
  { id: '16:9', ko: '와이드 16:9',  w: 16, h: 9 },
];

/** 시작용 예시(시안) 아이디어 — "막막할 때" 버튼 */
export const SEED_IDEAS = [
  '우주복을 입은 고양이가 달 표면에 앉아 지구를 바라본다',
  '비 내리는 네온 도시의 좁은 골목, 우산을 든 사람',
  '따뜻한 햇살이 드는 카페 창가의 라떼와 책 한 권',
  '벚꽃잎이 흩날리는 한옥 마당',
  '미래 도시를 나는 작은 비행정들',
  '숲속 이끼 낀 바위 위의 작은 버섯 집',
  '파스텔톤 구름 위를 걷는 소녀',
  '레트로 게임기 느낌의 픽셀 용사 캐릭터',
];

// id로 항목을 찾는 헬퍼 (없으면 null)
export const byId = (list, id) => list.find((x) => x.id === id) || null;
