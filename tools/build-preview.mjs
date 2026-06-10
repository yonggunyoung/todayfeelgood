// 자체 완결형 디자인 미리보기 생성기 — css/styles.css를 그대로 인라인해 preview.html을 만든다.
// 브라우저 없이 "스크린샷 대용"으로 디자인을 공유하기 위한 정적 산출물 (실제 CSS 사용 = 가짜 목업 아님).
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');

const stamp = (d) =>
  d <= 1 ? `<span class="stamp stamp-danger">D-${d}</span>`
  : d <= 3 ? `<span class="stamp stamp-warn">D-${d}</span>`
  : `<span class="stamp stamp-ok">D-${d}</span>`;

// ── 화면별 본문 (실제 main.js가 생성하는 마크업과 동일 구조 / 실제 클래스) ──
const homeView = `
  <div class="hero">
    <h1>오늘 저녁,<br><em>오늘 뭐 해먹지?</em></h1>
    <p>모드: 💪 운동 — 단백질 위주로 추천 · 매크로 표시</p>
  </div>
  <div class="action-strip">
    <button class="btn btn-primary"><b>📷 AI 입고 스캔</b><small>영수증·장본 사진 한 장</small></button>
    <button class="btn"><b>➕ 빠른 추가</b><small>검색해서 2탭 등록</small></button>
  </div>
  <div class="section-title"><h2>🔥 먼저 먹어요</h2><small>잔반과 임박 재료</small></div>
  <div class="item danger">
    <span class="emoji">🍱</span>
    <div class="grow"><div class="name">어제 만든 김치찌개</div><div class="sub">남은 음식 · 냉장 ${stamp(1)}</div></div>
    <button class="btn btn-sm btn-primary">먹었어요</button>
    <button class="btn btn-sm btn-soft">버림</button>
  </div>
  <div class="item">
    <span class="emoji">⬜</span>
    <div class="grow"><div class="name">두부</div><div class="sub">1모 · 냉장</div></div>${stamp(2)}
  </div>
  <div class="section-title"><h2>💪 오늘의 추천</h2><small>전체 보기 →</small></div>
  <div class="card recipe-card">
    <div class="ready-flag">지금 가능</div>
    <div class="r-head">
      <div class="r-emoji">🍗</div>
      <div class="grow"><h3>닭가슴살 덮밥</h3>
        <div class="meta"><span>⏱ 15분</span><span>🔥 480kcal</span><span>단백질 <b>42g</b></span></div></div>
    </div>
    <div class="match-bar"><i style="width:100%"></i></div>
    <div style="margin-top:8px"><span class="chip have">재료 4/4</span></div>
  </div>
  <div class="card recipe-card">
    <div class="r-head">
      <div class="r-emoji">⬜</div>
      <div class="grow"><h3>두부 스크램블</h3>
        <div class="meta"><span>⏱ 10분</span><span>🔥 280kcal</span><span>단백질 <b>26g</b></span><span style="color:var(--red)">🔥 임박재료 소진</span></div></div>
    </div>
    <div class="match-bar"><i style="width:66%"></i></div>
    <div style="margin-top:8px"><span class="chip have">재료 2/3</span><span class="chip miss">＋ 대파</span></div>
  </div>
  <div class="section-title"><h2>🧾 절약 장부</h2><small>요리 12회 · 잔반 해결 5회</small></div>
  <div class="card ledger-card">
    <div class="save"><div class="l-label">아낀 돈 (누적)</div><div class="l-val">₩31,000</div></div>
    <div class="waste"><div class="l-label">버린 돈 (누적)</div><div class="l-val">₩4,500</div></div>
  </div>`;

const recipesView = `
  <div class="hero"><h1>💪 <em>운동</em> 레시피</h1><p>단백질 위주로 추천 · 내 냉장고 기준으로 정렬했어요</p></div>
  <div class="search-row"><input placeholder="요리 이름·태그 검색" /><button class="btn btn-soft">모드 변경</button></div>
  <div class="card recipe-card">
    <div class="ready-flag">지금 가능</div>
    <div class="r-head"><div class="r-emoji">🥤</div>
      <div class="grow"><h3>바나나 프로틴 쉐이크</h3>
        <div class="meta"><span>⏱ 3분</span><span>🔥 280kcal</span><span>단백질 <b>30g</b></span></div></div></div>
    <div class="match-bar"><i style="width:100%"></i></div>
    <div style="margin-top:8px"><span class="chip have">재료 3/3</span></div>
  </div>
  <div class="card recipe-card">
    <div class="ready-flag">지금 가능</div>
    <div class="r-head"><div class="r-emoji">🥗</div>
      <div class="grow"><h3>닭가슴살 샐러드</h3>
        <div class="meta"><span>⏱ 10분</span><span>🔥 320kcal</span><span>단백질 <b>38g</b></span></div></div></div>
    <div class="match-bar"><i style="width:100%"></i></div>
    <div style="margin-top:8px"><span class="chip have">재료 4/4</span></div>
  </div>
  <div class="card recipe-card">
    <div class="r-head"><div class="r-emoji">🍗</div>
      <div class="grow"><h3>닭다리 간장조림</h3>
        <div class="meta"><span>⏱ 30분</span><span>🔥 450kcal</span><span>단백질 <b>38g</b></span></div></div></div>
    <div class="match-bar"><i style="width:75%"></i></div>
    <div style="margin-top:8px"><span class="chip have">재료 3/4</span><span class="chip miss">＋ 당근</span></div>
  </div>`;

const settingsView = `
  <div class="hero"><h1>내 <em>모드</em>와 설정</h1><p>모드를 바꾸면 추천이 통째로 달라져요</p></div>
  <div class="mode-grid">
    <button class="mode-card"><span class="m-emoji">🍚</span><b>기본 모드</b><small>있는 재료로 만들 수 있는 요리부터</small></button>
    <button class="mode-card on"><span class="m-emoji">💪</span><b>운동 모드</b><small>단백질 위주로 추천 · 매크로 표시</small></button>
    <button class="mode-card"><span class="m-emoji">🪙</span><b>자린고비 모드</b><small>임박 재료 소진 · 추가 지출 0원 우선</small></button>
    <button class="mode-card"><span class="m-emoji">🤰</span><b>산모 모드</b><small>주의 재료 자동 제외 · 순한 요리 우선</small></button>
  </div>
  <div class="section-title"><h2>🔄 기기 연동 · 가족 공유</h2><small>같은 코드 = 같은 냉장고</small></div>
  <div class="card flat">
    <div class="field"><label>동기화 코드</label>
      <div class="search-row" style="margin:0"><input value="두부-x3k9" /><button class="btn btn-soft">생성</button></div></div>
    <button class="btn btn-primary btn-block">연결</button>
    <p class="hint" style="color:var(--green)">✓ 동기화 작동 중 — 다른 기기에서 같은 코드를 입력하면 냉장고가 합쳐져요</p>
  </div>`;

// 차감 전표 시트 (시그니처 UI) — 홈 위에 오버레이
const deductOverlay = `
  <div class="pv-overlay">
    <div class="sheet" style="animation:none">
      <div class="grip"></div>
      <h2>🧾 재고 차감 전표</h2>
      <p class="sub">닭가슴살 덮밥 — 몇 인분 하셨어요? 확인만 누르면 끝나요.</p>
      <div class="seg" style="margin-top:0">
        <button>1인분</button><button class="on">2인분</button><button>3인분</button><button>4인분</button>
      </div>
      <div class="receipt">
        <div class="r-line"><span>🍗 닭가슴살</span><span>2팩 → <b>0팩</b> <button style="margin-left:6px;font-size:.7rem;color:var(--ink-soft)">건너뛰기</button></span></div>
        <div class="r-line"><span>🍚 즉석밥</span><span>4개 → <b>2개</b></span></div>
        <div class="r-line"><span>🧅 양파</span><span>3개 → <b>2개</b></span></div>
        <div class="r-line" style="color:var(--ink-soft)"><span>🍶 간장</span><small>양념 — 차감 안 함</small></div>
        <div class="r-line r-total"><span>합계</span><span>3개 품목 차감</span></div>
      </div>
      <div class="btn-row">
        <button class="btn">취소</button>
        <button class="btn btn-primary">✓ 확인 (차감)</button>
      </div>
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
      <div class="brand-text"><strong>냉비서</strong><small>6월 10일 · 수요일</small></div></div>
    <div class="top-right"><span class="pill pill-on">동기화 ON</span><span class="pill pill-save">₩31,000</span></div>
  </header>`;

function frame(cap, sub, view, active, overlay = '') {
  return `<div class="pv-frame">
    <div class="pv-cap">${cap}<small>${sub}</small></div>
    <div class="pv-phone">${TOP}<div class="pv-view">${view}</div>${TAB(active)}${overlay}</div>
  </div>`;
}

const previewCss = `
  .pv-body{margin:0;background:var(--paper);padding:28px 16px 48px;display:flex;flex-wrap:wrap;gap:30px;justify-content:center;align-items:flex-start;font-family:var(--sans)}
  .pv-title{flex-basis:100%;text-align:center;margin-bottom:6px}
  .pv-title h1{font-family:var(--serif);font-size:1.5rem;color:var(--ink)}
  .pv-title p{color:var(--ink-soft);font-size:.86rem;margin-top:6px}
  .pv-frame{width:380px;max-width:92vw}
  .pv-cap{font-family:var(--serif);font-weight:700;color:var(--ink);text-align:center;margin-bottom:11px;font-size:1.02rem}
  .pv-cap small{display:block;color:var(--ink-soft);font-weight:400;font-size:.78rem;margin-top:2px}
  .pv-phone{height:812px;border:3px solid var(--ink);border-radius:36px;overflow:hidden;display:flex;flex-direction:column;background:var(--paper);box-shadow:0 20px 44px rgba(32,49,42,.2);position:relative}
  .pv-top{display:flex;justify-content:space-between;align-items:center;padding:16px 18px 10px;background:var(--paper)}
  .pv-view{flex:1;overflow:hidden;padding:0 18px 12px;position:relative}
  .pv-tab{display:flex;background:var(--card);border-top:1.5px solid var(--ink)}
  .pv-tab button{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:9px 0 7px;font-size:.68rem;font-weight:600;color:var(--ink-soft);background:none;border:none}
  .pv-tab button span{font-size:1.25rem;filter:grayscale(.7)}
  .pv-tab button.active{color:var(--green)}
  .pv-tab button.active span{filter:none}
  .pv-overlay{position:absolute;inset:0;background:rgba(32,49,42,.45);display:flex;align-items:flex-end}
  .pv-overlay .sheet{width:100%;max-height:none}
  .pv-foot{flex-basis:100%;text-align:center;color:var(--ink-soft);font-size:.8rem;margin-top:10px;line-height:1.6}`;

const html = `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>냉비서 — 디자인 미리보기</title>
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
<style>
/* ===== 실제 앱 스타일시트 (css/styles.css) 인라인 ===== */
${css}
/* ===== 미리보기 갤러리 전용 레이아웃 ===== */
${previewCss}
</style></head>
<body class="pv-body">
  <div class="pv-title"><h1>🧊 냉비서 — 화면 미리보기</h1>
    <p>실제 스타일시트로 렌더링된 4개 핵심 화면입니다 (가짜 목업 아님). 휴대폰 폭(480px)에 맞춰져 있어요.</p></div>
  ${frame('① 홈', '먼저 먹기 · 모드별 추천 · 절약 장부', homeView, 'home')}
  ${frame('② 레시피 (운동 모드)', '내 냉장고 기준 정렬 · 매칭 막대', recipesView, 'recipes')}
  ${frame('③ 요리 완료 → 차감 전표', '인분 선택 후 1탭 · 양념은 차감 제외', homeView, 'recipes', deductOverlay)}
  ${frame('④ 설정 (모드 · 기기 연동)', '모드 전환 · 가족 공유 동기화', settingsView, 'settings')}
  <div class="pv-foot">이 파일은 디자인 공유용 정적 미리보기입니다. 실제 앱은 탭 이동·AI 스캔·차감·동기화가 모두 동작합니다.<br>배포: GitHub Pages → 발급 주소를 뚝딱 사이트에 연결</div>
</body></html>`;

fs.writeFileSync(new URL('../preview.html', import.meta.url), html);
console.log('preview.html 생성 완료:', (html.length / 1024).toFixed(1) + 'KB');
