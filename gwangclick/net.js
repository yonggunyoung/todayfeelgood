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
 * Firestore 구조
 *  gc_battles/{YYYY-MM-DD}            = { a, b, na, nb, regions:{<region>:{a,b}}, updatedAt }  // 전국 집계(increment)
 *  gc_scores/{YYYY-MM-DD__uid}        = { date, uid, nick, side, taps, region, ts }            // 랭킹/순위 산출
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
  function zero() { return { a: 0, b: 0, na: 0, nb: 0, regions: {} }; }

  // 오늘 집계 1회 읽기 → {a,b,na,nb,regions}
  async function peek(date) {
    try {
      if (!(await init())) return null;
      var snap = await state.fs.getDoc(battleRef(date));
      var d = snap.exists() ? snap.data() : null;
      return d ? { a: d.a || 0, b: d.b || 0, na: d.na || 0, nb: d.nb || 0, regions: d.regions || {} } : zero();
    } catch (e) { return null; }
  }

  // 실시간 구독 → 집계가 바뀔 때마다 cb(totals). 반환값은 구독해지 함수.
  function watch(date, cb) {
    var off = function () {};
    init().then(function (ok) {
      if (!ok) return;
      try {
        off = state.fs.onSnapshot(battleRef(date), function (snap) {
          var d = snap.exists() ? snap.data() : null;
          cb(d ? { a: d.a || 0, b: d.b || 0, na: d.na || 0, nb: d.nb || 0, regions: d.regions || {} } : zero());
        }, function () { /* 권한/네트워크 오류 — 폴백 유지 */ });
      } catch (e) { /* ignore */ }
    });
    return function () { try { off(); } catch (e) {} };
  }

  // 라운드 종료 합산 전송: 진영 집계 increment + 내 점수 기록. 반환 {rank,total} (실패 시 null).
  async function submit(date, side, taps, region, nick) {
    try {
      if (!(await init())) return null;
      taps = Math.max(0, Math.min(TAP_CAP, Math.floor(taps || 0)));
      var inc = state.fs.increment, side2 = side === 'a' ? 'a' : 'b';
      var agg = { updatedAt: Date.now() };
      agg[side2] = inc(taps); agg[side2 === 'a' ? 'na' : 'nb'] = inc(1);
      // 중첩 객체 + merge:true 라야 regions.<지역>.<진영> 가 올바르게 증가 (점 표기 키는 setDoc에서 미동작)
      if (region) { var rg = {}; rg[side2] = inc(taps); agg.regions = {}; agg.regions[region] = rg; }
      await state.fs.setDoc(battleRef(date), agg, { merge: true });
      await state.fs.setDoc(scoreRef(date, state.uid), {
        date: date, uid: state.uid, nick: (nick || '익명광클러').slice(0, 16),
        side: side2, taps: taps, region: region || '', ts: Date.now(),
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

  // 오늘 전국 랭킹 TOP — [{nick,side,taps,region,me}]
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
        rows.push({ nick: v.nick || '익명광클러', side: v.side, taps: v.taps || 0, region: v.region || '', me: v.uid === (myUid || state.uid) });
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
