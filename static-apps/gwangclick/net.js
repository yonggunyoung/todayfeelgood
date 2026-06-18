/* ⚡ 광클대전 — 실제 전국 대전 네트워크 (window.GCNet)
 *
 * 역할: 모든 플레이어의 '진영 선택 + 광클 수'를 Firestore 한곳에 원자적으로 합산하고,
 *       실시간으로 되돌려줘서 게이지/순위/랭킹/지역 점령이 진짜 데이터로 움직이게 한다.
 *
 * 설계 원칙
 *  - 로그인 불필요: 익명 인증으로 모든 기기가 집계에 참여 (랭킹 닉네임은 로컬 입력값).
 *  - 절대 게임을 막지 않음: 모든 함수는 실패해도 조용히 폴백(throw 없음). config 없으면 available()=false.
 *  - 비용 안전: 광클은 매 탭이 아니라 '라운드 종료 시 1회'만 합산 전송(+ 어뷰징 상한).
 *
 * Firestore 구조 (Phase 2: 하위호환 가산 확장 — D4)
 *  gc_battles/{YYYY-MM-DD}            = { a, b, na, nb, regions:{<region>:{a,b}}, countries:{<ISO2>:{a,b}}, updatedAt }
 *    └ countries 는 regions 와 동일한 맵 패턴(증가). 기존 a/b/na/nb/regions 는 불변.
 *  gc_scores/{YYYY-MM-DD__uid}        = { date, uid, nick, side, taps, region, country, badge, comment, ts }
 *    └ country/badge/comment 가 Phase 2 신규(없으면 ''). 기존 필드 불변.
 *
 * 규칙·색인은 FIREBASE.md 참고.
 */
(function () {
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var TAP_CAP = 1500; // 어뷰징 상한: 60초 현실 최대(≈10tap/s × 콤보) 보수적 캡

  var state = {
    cfg: (typeof window !== 'undefined' && window.GC_FB) || null,
    app: null, auth: null, db: null, fs: null, // fs = firestore 모듈 네임스페이스
    uid: null, ready: null, on: false, err: '',
  };

  function available() { return !!state.cfg; }

  // Firebase 1회 로드 + 익명 로그인 (idempotent). 성공 시 true.
  function init() {
    if (state.ready) return state.ready;
    state.ready = (async function () {
      if (!state.cfg) return false;
      try {
        var mods = await Promise.all([
          import(SDK + 'firebase-app.js'),
          import(SDK + 'firebase-auth.js'),
          import(SDK + 'firebase-firestore.js'),
        ]);
        var appM = mods[0], authM = mods[1], fsM = mods[2];
        state.app = appM.initializeApp(state.cfg, 'gwangclick'); // 냉비서와 같은 프로젝트라도 앱 인스턴스는 분리
        state.auth = authM.getAuth(state.app);
        state.fs = fsM;
        state.db = fsM.getFirestore(state.app);
        var cred = state.auth.currentUser || (await authM.signInAnonymously(state.auth)).user;
        state.uid = cred && cred.uid;
        state.on = !!state.uid;
        return state.on;
      } catch (e) {
        state.err = (e && e.message) || String(e);
        state.on = false;
        return false;
      }
    })();
    return state.ready;
  }

  function battleRef(date) { return state.fs.doc(state.db, 'gc_battles', date); }
  function scoreRef(date, uid) { return state.fs.doc(state.db, 'gc_scores', date + '__' + uid); }
  function zero() { return { a: 0, b: 0, na: 0, nb: 0, regions: {}, countries: {} }; }
  // 집계 문서 1건 → 표준 totals 형태. 옛 문서(countries 없음)는 {}로 폴백(하위호환 D4·불신 #1).
  function totalsOf(d) {
    return d
      ? { a: d.a || 0, b: d.b || 0, na: d.na || 0, nb: d.nb || 0, regions: d.regions || {}, countries: d.countries || {} }
      : zero();
  }

  // 오늘 집계 1회 읽기 → {a,b,na,nb,regions,countries}
  async function peek(date) {
    try {
      if (!(await init())) return null;
      var snap = await state.fs.getDoc(battleRef(date));
      return totalsOf(snap.exists() ? snap.data() : null);
    } catch (e) { return null; }
  }

  // 실시간 구독 → 집계가 바뀔 때마다 cb(totals). 반환값은 구독해지 함수.
  function watch(date, cb) {
    var off = function () {};
    init().then(function (ok) {
      if (!ok) return;
      try {
        off = state.fs.onSnapshot(battleRef(date), function (snap) {
          cb(totalsOf(snap.exists() ? snap.data() : null));
        }, function () { /* 권한/네트워크 오류 — 폴백 유지 */ });
      } catch (e) { /* ignore */ }
    });
    return function () { try { off(); } catch (e) {} };
  }

  // ISO2 국가코드 정규화(집계 키·점수 필드 공용). 2글자 영문만 통과, 그 외 '' (불신 #1).
  function normCountry(code) {
    if (typeof code !== 'string') return '';
    var c = code.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(c) ? c : '';
  }
  // 배지/멘트 정제: GCUtil 있으면 위임(코드포인트 캡), 없으면 보수적 길이 컷(불신 #1).
  function sanBadge(v) {
    try { if (typeof GCUtil !== 'undefined' && GCUtil.sanitizeBadge) return GCUtil.sanitizeBadge(v); } catch (e) {}
    return (typeof v === 'string' ? v : '').replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').trim().slice(0, 4);
  }
  function sanComment(v) {
    try { if (typeof GCUtil !== 'undefined' && GCUtil.sanitizeComment) return GCUtil.sanitizeComment(v); } catch (e) {}
    return (typeof v === 'string' ? v : '').replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24);
  }

  // 라운드 종료 합산 전송: 진영 집계 increment + 내 점수 기록. 반환 {rank,total} (실패 시 null).
  // Phase 2(D4/D5): country 가 있으면 countries.<ISO2>.<진영> 를 regions 와 똑같이 1회 증가(탭마다 ❌).
  //   opts.badge / opts.comment 는 점수문서에 함께 저장(타 사용자 노출 → 정제). 하위호환: 옛 호출(5인자)도 동작.
  async function submit(date, side, taps, region, nick, country, opts) {
    try {
      if (!(await init())) return null;
      opts = opts || {};
      taps = Math.max(0, Math.min(TAP_CAP, Math.floor(taps || 0)));
      var inc = state.fs.increment, side2 = side === 'a' ? 'a' : 'b';
      var cc = normCountry(country);
      var agg = { updatedAt: Date.now() };
      agg[side2] = inc(taps); agg[side2 === 'a' ? 'na' : 'nb'] = inc(1);
      // 중첩 객체 + merge:true 라야 regions.<지역>.<진영> 가 올바르게 증가 (점 표기 키는 setDoc에서 미동작)
      if (region) { var rg = {}; rg[side2] = inc(taps); agg.regions = {}; agg.regions[region] = rg; }
      // 국가 집계 — regions 와 정확히 동일한 패턴(D4). 옛 문서에 countries 없어도 merge로 안전 생성.
      if (cc) { var cg = {}; cg[side2] = inc(taps); agg.countries = {}; agg.countries[cc] = cg; }
      await state.fs.setDoc(battleRef(date), agg, { merge: true });
      await state.fs.setDoc(scoreRef(date, state.uid), {
        date: date, uid: state.uid, nick: (nick || '익명광클러').slice(0, 16),
        side: side2, taps: taps, region: region || '', country: cc,
        badge: sanBadge(opts.badge), comment: sanComment(opts.comment), ts: Date.now(),
      });
      return await rankOf(date, taps);
    } catch (e) { return null; }
  }

  // 오늘 참여자 중 내 순위 = (나보다 많이 친 사람 수)+1 / 전체 참여자 수
  async function rankOf(date, taps) {
    try {
      if (!(await init())) return null;
      var col = state.fs.collection(state.db, 'gc_scores');
      var above = state.fs.query(col, state.fs.where('date', '==', date), state.fs.where('taps', '>', taps));
      var all = state.fs.query(col, state.fs.where('date', '==', date));
      var aC = await state.fs.getCountFromServer(above);
      var tC = await state.fs.getCountFromServer(all);
      return { rank: (aC.data().count || 0) + 1, total: tC.data().count || 0 };
    } catch (e) { return null; }
  }

  // 오늘 전국 랭킹 TOP — [{nick,side,taps,region,country,badge,comment,me}]
  // Phase 2: country/badge/comment 가산(옛 문서엔 ''). 기존 필드(nick/side/taps/region/me) 불변.
  async function leaderboard(date, max, myUid) {
    try {
      if (!(await init())) return null;
      var col = state.fs.collection(state.db, 'gc_scores');
      var q = state.fs.query(col, state.fs.where('date', '==', date),
        state.fs.orderBy('taps', 'desc'), state.fs.limit(max || 20));
      var snap = await state.fs.getDocs(q);
      var rows = [];
      snap.forEach(function (d) {
        var v = d.data();
        rows.push({
          nick: v.nick || '익명광클러', side: v.side, taps: v.taps || 0, region: v.region || '',
          country: v.country || '', badge: v.badge || '', comment: v.comment || '',
          me: v.uid === (myUid || state.uid),
        });
      });
      return rows;
    } catch (e) { return null; }
  }

  window.GCNet = {
    available: available, init: init, peek: peek, watch: watch,
    submit: submit, rankOf: rankOf, leaderboard: leaderboard,
    uid: function () { return state.uid; },
    on: function () { return state.on; },
    err: function () { return state.err; },
    TAP_CAP: TAP_CAP,
  };
})();
