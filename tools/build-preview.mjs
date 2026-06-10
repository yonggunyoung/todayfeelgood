// 자체 완결형 디자인 미리보기 생성기 — css/styles.css를 그대로 인라인해 preview.html을 만든다.
// 브라우저 없이 "스크린샷 대용"으로 디자인을 공유하기 위한 정적 산출물 (실제 CSS 사용 = 가짜 목업 아님).
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');

const stamp = (d) =>
  d <= 1 ? `<span class="stamp stamp-danger">D-${d}</span>`
  : d <= 3 ? `<span class="stamp stamp-warn">D-${d}</span>`
  : `<span class="stamp stamp-ok">D-${d}</span>`;

const fi = (emoji, name, dot) => `
  <button class="f-item">${dot ? `<span class="fi-dot dot-${dot}"></span>` : ''}
    <span class="fi-face">${emoji}</span><span class="fi-name">${name}</span></button>`;

/* ── ① 홈 ── */
const homeView = `
  <div class="hero">
    <h1>오늘 저녁,<br><em>오늘 뭐 해먹지?</em></h1>
    <p>💪 운동 모드 — 단백질 우선 · 매크로 표시</p>
  </div>
  <div class="action-strip">
    <button class="btn btn-primary"><b>📷 AI 입고 스캔</b><small>영수증·장본 사진 한 장</small></button>
    <button class="btn"><b>➕ 빠른 추가</b><small>검색해서 2탭 등록</small></button>
  </div>
  <div class="section-title"><h2>🔥 먼저 먹어요</h2><small>잔반과 임박 재료</small></div>
  <div class="item danger">
    <span class="emoji t-가공">🍱</span>
    <div class="grow"><div class="name">어제 만든 김치찌개</div><div class="sub">남은 음식 · 냉장 ${stamp(1)}</div></div>
    <button class="btn btn-sm btn-primary">먹었어요</button>
  </div>
  <div class="item">
    <span class="emoji t-신선">⬜</span>
    <div class="grow"><div class="name">두부</div><div class="sub">1모 · 냉장</div></div>
    ${stamp(2)}<button class="btn btn-sm btn-tint">활용 →</button>
  </div>
  <div class="section-title"><h2>💪 오늘의 추천</h2><small>전체 보기 →</small></div>
  <div class="card recipe-card">
    <div class="ready-flag">✓ 지금 가능</div>
    <div class="r-body">
      <div class="r-head">
        <div class="r-emoji">🍗</div>
        <div class="grow"><h3>닭가슴살 덮밥</h3>
          <div class="meta"><span>⏱ 15분</span><span>🔥 480kcal</span><span>단백질 <b>42g</b></span></div></div>
        <button class="heart on">❤️</button>
      </div>
      <div class="match-bar"><i style="width:100%"></i></div>
      <div style="margin-top:9px"><span class="chip have">재료 4/4</span></div>
    </div>
  </div>
  <div class="section-title"><h2>🧾 절약 장부</h2><small>요리 12회 · 잔반 해결 5회</small></div>
  <div class="card ledger-card">
    <div class="save"><div class="l-label">아낀 돈 (누적)</div><div class="l-val">₩31,000</div></div>
    <div class="waste"><div class="l-label">버린 돈 (누적)</div><div class="l-val">₩4,500</div></div>
  </div>`;

/* ── ② 냉장고 — 실제 내부 뷰 ── */
const pantryView = `
  <div class="hero"><h1>우리집 <em>냉장고</em></h1><p>14개 보관 중 · 빨간 점 1개 먼저 드세요</p></div>
  <div class="seg" style="margin-top:12px">
    <button class="on">🧊 냉장고</button><button>📋 자세히 보기</button>
  </div>
  <div class="fridge">
    <div class="fridge-inner">
      <div class="f-led"></div>
      <div class="f-vent"><i></i><i></i><i></i><i></i></div>
      <span class="mist" style="left:16%"></span>
      <span class="mist" style="left:46%;animation-delay:1.7s;--dx:-16px"></span>
      <span class="mist" style="left:71%;animation-delay:3.2s;--dx:9px"></span>
      <div class="f-sec-label"><span>냉장실</span><span>9개</span></div>
      <div class="f-row">${fi('🥚', '계란')}${fi('⬜', '두부', 'amber')}${fi('🥛', '우유', 'red')}${fi('🍗', '닭가슴살', 'amber')}</div>
      <div class="f-shelf"></div>
      <div class="f-row">${fi('🥬', '대파')}${fi('🍅', '토마토')}${fi('🧀', '치즈')}${fi('🥦', '브로콜리')}</div>
      <div class="f-shelf"></div>
      <div class="f-pocket"><div class="fp-label">도어 포켓 · 소스</div>
        <div class="fp-row">${fi('🥬', '김치')}${fi('🥚', '마요네즈')}${fi('🍅', '케찹')}${fi('🦪', '굴소스')}</div></div>
    </div>
    <div class="f-divider"></div>
    <div class="fridge-inner freezer">
      <div class="f-sec-label"><span>냉동실</span><span>3개</span></div>
      <div class="f-row">${fi('🥟', '만두')}${fi('🦐', '새우')}${fi('🥓', '삼겹살')}</div>
      <div class="f-shelf"></div>
    </div>
  </div>
  <div class="basket">
    <div class="f-sec-label"><span>실온 선반</span><span>3개</span></div>
    <div class="f-row">${fi('🍚', '즉석밥')}${fi('🧅', '양파')}${fi('🍜', '라면')}</div>
    <div class="f-shelf"></div>
  </div>`;

/* ── ③ 레시피 (유튜브 저장 + 모드 칩) ── */
const recipesView = `
  <div class="hero"><h1>🌙 <em>야식</em> 레시피</h1><p>늦은 밤엔 가볍고 빠르게 — 내가 만든 모드</p></div>
  <div class="mode-chips">
    <span class="mode-chip">🍽️ 기본</span><span class="mode-chip">💪 운동</span>
    <span class="mode-chip">🪙 자린고비</span><span class="mode-chip">🥢 반찬</span>
    <span class="mode-chip on">🌙 야식 ✎</span><span class="mode-chip add">＋ 모드 만들기</span>
  </div>
  <div class="search-row"><input placeholder="요리 이름·태그 검색" /><button class="btn btn-tint">＋ 레시피</button></div>
  <div class="seg" style="margin-top:4px"><button class="on">추천</button><button>📒 내 레시피</button><button>❤️ 찜</button></div>
  <div class="card recipe-card">
    <div class="yt-flag">▶ YouTube</div>
    <div class="r-photo" style="display:grid;place-items:center;background:linear-gradient(120deg,#2b2118,#6b3f23 55%,#a3582c);color:#fff">
      <span style="font-size:2.4rem">▶</span>
      <span style="position:absolute;bottom:10px;left:12px;font-size:.72rem;font-weight:700;opacity:.85">유튜브 실사 썸네일 자동 연결</span>
    </div>
    <div class="r-body">
      <div class="r-head">
        <div class="grow"><h3>백종원 김치찜 (내가 저장)</h3>
          <div class="meta"><span>⏱ 40분</span><span>단백질 <b>28g</b></span><span>📒 내 레시피</span></div></div>
        <button class="heart on">❤️</button>
      </div>
      <div class="match-bar"><i style="width:80%"></i></div>
      <div style="margin-top:9px"><span class="chip have">재료 4/5</span><span class="chip miss">＋ 돼지목살</span></div>
    </div>
  </div>
  <div class="card recipe-card">
    <div class="ready-flag">✓ 지금 가능</div>
    <div class="r-body">
      <div class="r-head">
        <div class="r-emoji">🍜</div>
        <div class="grow"><h3>계란 콩나물라면</h3>
          <div class="meta"><span>⏱ 8분</span><span>🔥 560kcal</span><span style="color:var(--red)">임박재료 소진</span></div></div>
        <button class="heart">❤️</button>
      </div>
      <div class="match-bar"><i style="width:100%"></i></div>
      <div style="margin-top:9px"><span class="chip have">재료 4/4</span></div>
    </div>
  </div>`;

/* ── ④ 모드 만들기 시트 (홈 위 오버레이) ── */
const modeMakerOverlay = `
  <div class="pv-overlay">
    <div class="sheet" style="animation:none">
      <div class="grip"></div>
      <h2>⭐ 나만의 모드 만들기</h2>
      <p class="sub">예: "야식 모드", "아빠 도시락" — 추천 기준을 직접 설계하세요</p>
      <div style="display:flex;gap:8px">
        <div class="field" style="flex:0 0 76px"><label>이모지</label><input value="🌙" style="text-align:center;font-size:1.3rem" /></div>
        <div class="field" style="flex:1"><label>모드 이름 *</label><input value="야식" /></div>
      </div>
      <div class="field"><label>추천 기준</label>
        <div class="tag-toggles">
          <button>💪 단백질 우선</button><button class="on">⏳ 임박 재료 우선</button><button class="on">🪙 추가 지출 0원 우선</button>
        </div></div>
      <div class="field"><label>좋아하는 태그</label>
        <div class="tag-toggles">
          <button class="on">초간단</button><button>반찬</button><button class="on">국물</button><button>자취</button><button>매콤</button>
        </div></div>
      <div class="field"><label>빼고 싶은 재료</label><input value="오이" /></div>
      <div class="btn-row">
        <button class="btn btn-soft">📤 공유</button>
        <button class="btn btn-primary">저장하고 적용</button></div>
    </div>
  </div>`;

const TAB = (active) => `
  <nav class="pv-tab">
    ${[['🏠', '홈', 'home'], ['🧊', '냉장고', 'pantry'], ['🍳', '레시피', 'recipes'], ['🧺', '장보기', 'shopping'], ['⚙️', '설정', 'settings']]
      .map(([e, l, k]) => `<button class="${active === k ? 'active' : ''}"><span>${e}</span>${l}</button>`).join('')}
  </nav>`;

const TOP = `
  <header class="pv-top">
    <div class="brand"><span class="brand-mark">냉</span>
      <div class="brand-text"><strong>냉비서</strong><small>6월 10일 수요일</small></div></div>
    <div class="top-right"><span class="pill pill-on">동기화 ✓</span><span class="pill pill-save">₩31,000</span></div>
  </header>`;

function frame(cap, sub, view, active, overlay = '') {
  return `<div class="pv-frame">
    <div class="pv-cap">${cap}<small>${sub}</small></div>
    <div class="pv-phone">${TOP}<div class="pv-view">${view}</div>${TAB(active)}${overlay}</div>
  </div>`;
}

const previewCss = `
  .pv-body{margin:0;background:#e6e8ee;padding:30px 16px 50px;display:flex;flex-wrap:wrap;gap:32px;justify-content:center;align-items:flex-start;font-family:var(--sans)}
  .pv-title{flex-basis:100%;text-align:center;margin-bottom:4px}
  .pv-title h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;color:var(--label)}
  .pv-title p{color:var(--label-2);font-size:.86rem;margin-top:6px;font-weight:500}
  .pv-frame{width:384px;max-width:93vw}
  .pv-cap{font-weight:800;color:var(--label);text-align:center;margin-bottom:11px;font-size:1rem;letter-spacing:-.01em}
  .pv-cap small{display:block;color:var(--label-2);font-weight:500;font-size:.77rem;margin-top:2px}
  .pv-phone{height:820px;border-radius:44px;overflow:hidden;display:flex;flex-direction:column;background:var(--bg);box-shadow:0 0 0 10px #17181c,0 0 0 12px #3a3b40,0 26px 60px rgba(20,24,33,.35);position:relative}
  .pv-top{display:flex;justify-content:space-between;align-items:center;padding:18px 18px 10px;background:rgba(242,243,247,.9)}
  .pv-view{flex:1;overflow:hidden;padding:0 16px 12px;position:relative}
  .pv-tab{display:flex;background:rgba(250,250,252,.92);border-top:.5px solid var(--hairline)}
  .pv-tab button{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:9px 0 10px;font-size:.66rem;font-weight:600;color:var(--label-3);background:none;border:none}
  .pv-tab button span{font-size:1.3rem;filter:grayscale(1) opacity(.55)}
  .pv-tab button.active{color:var(--green)}
  .pv-tab button.active span{filter:none}
  .pv-overlay{position:absolute;inset:0;background:rgba(20,24,33,.42);display:flex;align-items:flex-end;z-index:5}
  .pv-overlay .sheet{width:100%;max-height:none}
  .pv-foot{flex-basis:100%;text-align:center;color:var(--label-2);font-size:.8rem;margin-top:8px;line-height:1.65;font-weight:500}`;

const html = `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>냉비서 — 디자인 미리보기 v2</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
<style>
/* ===== 실제 앱 스타일시트 (css/styles.css) 인라인 ===== */
${css}
/* ===== 미리보기 갤러리 전용 레이아웃 ===== */
${previewCss}
</style></head>
<body class="pv-body">
  <div class="pv-title"><h1>🧊 냉비서 — 디자인 v2 미리보기</h1>
    <p>iOS 네이티브 감성 · 실제 스타일시트로 렌더링된 4개 핵심 화면 (실제 앱은 모든 버튼이 동작합니다)</p></div>
  ${frame('① 홈', '먼저 먹기 · 임박 재료 "활용 →" · 절약 장부', homeView, 'home')}
  ${frame('② 냉장고 — 실제 내부 뷰', 'LED 조명 · 유리 선반 · 냉기 모션 · 도어 포켓(소스) · 상냉장 하냉동 · 탭하면 자세히', pantryView, 'pantry')}
  ${frame('③ 레시피', '유튜브 저장 · 🤖 빠른 레시피(영상 안 보고 AI 정리) · 인분 환산 · ❤️ 찜', recipesView, 'recipes')}
  ${frame('④ 나만의 모드 만들기', '추천 기준 직접 설계 · 공유 코드로 친구에게 전달', homeView, 'recipes', modeMakerOverlay)}
  <div class="pv-foot">유튜브 레시피를 저장하면 영상 실사 썸네일이 카드에 자동으로 붙고, 재료에 내 사진을 찍어 붙이면 선반에 실사로 보입니다.<br>모드·레시피는 공유 코드(NB1.…)로 카톡 등에서 주고받을 수 있어요.</div>
</body></html>`;

fs.writeFileSync(new URL('../preview.html', import.meta.url), html);
console.log('preview.html 생성 완료:', (html.length / 1024).toFixed(1) + 'KB');
