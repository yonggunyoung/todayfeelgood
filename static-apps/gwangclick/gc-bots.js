/* ⚡ 광클대전 — gc-bots.js : 초반 콜드스타트용 '가상 플레이어' (D-bots)
 *
 * 왜: 출시 초반 실제 접속자가 붙기 전엔 전국 집계가 0이라 게이지 50:50·참전 0명·빈 랭킹·빈 지구본이 됨.
 *     → 죽은 앱처럼 보여 이탈. 그래서 '있을 법한' 가상 활동을 화면에만 얹어 살아있게 보이게 한다.
 *
 * 철칙(원칙1 불신·원칙4 가역성):
 *  - 절대 DB(Firestore)에 쓰지 않는다. 순수 표시용 합산 → 실데이터 무오염.
 *  - 결정적(seed=날짜): 모든 기기가 같은 수치를 본다(“전국 집계”가 기기마다 다르면 들통).
 *  - 자동 소멸: 실제 참여자 수가 FADE에 가까워질수록 가상치는 0으로 페이드 → 탈출구 내장.
 *  - 킬 스위치: GCBots.enabled=false 한 줄로 완전 OFF(승인/성장 후).
 *  - 순수 함수: now(ms)·date를 받으면 결정적 → tests/bots.test.mjs 경계검증. 외부 deps/네트워크 0.
 *
 * 데이터 형태는 net.js totals와 동일: {a,b,na,nb,regions:{key:{a,b}},countries:{ISO2:{a,b}}}.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api; // Node 테스트
  if (root) root.GCBots = api; // 브라우저
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 튜닝 상수(초반 소규모 바이럴 가정 — 과하지 않게)
  var FLOOR = 45, PEAK = 300;     // 동시간대 전국 참전 수 하한~상한(초반 소규모: 새벽~90·점심~230·저녁~310)
  var FADE = 200;                  // (클라 합성 모드 전용) 실제 참여자가 이 값에 닿으면 가상치 0
  var ROWS = 20;                   // 가상 리더보드 행 수
  var TOP_TAP = 1480, MIN_TAP = 720; // 상위권 가상 점수 범위(어뷰징 캡 1500 미만)

  // 시간대 활동 곡선(0~1): 새벽 바닥, 밤 9~10시 피크.
  var HOURW = [.5,.4,.3,.22,.18,.18,.22,.3,.45,.55,.6,.62,.7,.62,.6,.6,.62,.65,.7,.8,.9,1,.98,.8];

  // 한국 시/도 가중치(서울·경기 집중). 키는 index.html REGIONS와 1:1.
  var RW = { seoul:.21, gyeonggi:.25, incheon:.055, busan:.06, gyeongnam:.04, daegu:.035,
    gyeongbuk:.025, gwangju:.025, daejeon:.026, ulsan:.02, chungnam:.03, chungbuk:.02,
    jeonbuk:.02, jeonnam:.02, gangwon:.02, jeju:.013, sejong:.008 };
  // 국가 가중치(KR 압도 + 글로브 생기용 소수 해외). 키는 geo.js NAMES에 존재.
  var CW = { KR:.8, US:.05, JP:.04, VN:.025, TW:.02, ID:.02, PH:.013, TH:.01, CA:.006, AU:.006 };

  var NICKS = ["민초단","반민초연합","부먹수호대","찍먹파","광클의신","엄지부상주의","연타머신","국밥충",
    "맵부심","새벽감성러","킹받는중","폼미쳤다","갓생러","광클러","전설의타건","반박불가요","손가락폭주",
    "내가1등","즙짜개","겜수저","무지성연타","오늘도광클","집게사장","두번참전","라면국물","TapKing",
    "FlagBearer","NightOwl","ComboGod","SilentTap"];
  var BADGES = ["🔥","👑","⚡","🥇","💯","god","1up","🐉"];
  var COMMENTS = ["손가락 안 보임 ㅋㅋ","우리 편 가보자","오늘 폼 미쳤다","한 끗 차이였네","반민초 각성",
    "내일 또 온다","연타 자신감","겜 왜케 중독","엄지 나갔다","이게 국룰"];

  // ── 결정적 RNG (xfnv1a 해시 → mulberry32) ──
  function hash(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // 시간대 곡선값(0~1) — now(ms) 기준 현지 시각. 분 단위로 부드럽게 보간.
  function curveAt(now) {
    var d = new Date(now == null ? Date.now() : now);
    var h = d.getHours(), m = d.getMinutes();
    var a = HOURW[h], b = HOURW[(h + 1) % 24];
    return a + (b - a) * (m / 60);
  }

  // 오늘의 기본 성향(진영 A 비율 0.42~0.58, 날짜마다 다름) — 결정적.
  function leanOf(date) { return 0.42 + rng(hash(date + "|lean"))() * 0.16; }

  // 오늘·이 시각의 가상 참전 수(전국). 결정적 + 날짜 지터.
  function participants(date, now) {
    var jit = 0.85 + rng(hash(date + "|jit"))() * 0.30; // 0.85~1.15
    return Math.round((FLOOR + (PEAK - FLOOR) * curveAt(now)) * jit);
  }

  function alloc(total, weights, seed, lean) {
    var r = rng(seed), out = {}, keys = Object.keys(weights), sum = 0, i;
    for (i = 0; i < keys.length; i++) sum += weights[keys[i]];
    for (i = 0; i < keys.length; i++) {
      var share = weights[keys[i]] / sum;
      var part = total * share;
      var tilt = clamp(lean + (r() - 0.5) * 0.28, 0.15, 0.85); // 지역/국가별 진영 쏠림 변주(점령 다양화)
      out[keys[i]] = { a: Math.round(part * tilt), b: Math.round(part * (1 - tilt)) };
    }
    return out;
  }

  // 가상 집계 totals (순수·결정적). 비활성이면 0.
  function totals(date, now) {
    if (!api.enabled) return { a: 0, b: 0, na: 0, nb: 0, regions: {}, countries: {} };
    var P = participants(date, now), lean = leanOf(date);
    var r = rng(hash(date + "|tot"));
    var avg = 300 + r() * 140;                 // 1인 평균 광클 수
    var taps = Math.round(P * avg);
    var na = Math.round(P * lean), nb = P - na;
    var ta = Math.round(taps * lean), tb = taps - ta;
    return {
      a: ta, b: tb, na: na, nb: nb,
      regions: alloc(taps, RW, hash(date + "|rg"), lean),
      countries: alloc(taps, CW, hash(date + "|cc"), lean),
    };
  }

  // 실제 참여자 수에 따른 가상치 비중(1→0). 실데이터가 차면 가상은 사라진다.
  function fade(realN) {
    if (!api.enabled) return 0;
    return clamp(1 - (realN || 0) / FADE, 0, 1);
  }

  // 실 totals + 가상 totals(×fade) 합산 → 표시용. realTot null이어도 항상 유효 객체 반환.
  function blend(realTot, date, now) {
    var R = realTot || { a: 0, b: 0, na: 0, nb: 0, regions: {}, countries: {} };
    var f = fade((R.na || 0) + (R.nb || 0));
    if (f <= 0) return realTot || { a: R.a||0, b: R.b||0, na: R.na||0, nb: R.nb||0, regions: R.regions||{}, countries: R.countries||{} };
    var S = totals(date, now);
    function mergeMap(real, syn) {
      var out = {}, k;
      for (k in (real || {})) if (real.hasOwnProperty(k)) out[k] = { a: real[k].a || 0, b: real[k].b || 0 };
      for (k in syn) if (syn.hasOwnProperty(k)) { out[k] = out[k] || { a: 0, b: 0 }; out[k].a += Math.round(syn[k].a * f); out[k].b += Math.round(syn[k].b * f); }
      return out;
    }
    return {
      a: (R.a || 0) + Math.round(S.a * f), b: (R.b || 0) + Math.round(S.b * f),
      na: (R.na || 0) + Math.round(S.na * f), nb: (R.nb || 0) + Math.round(S.nb * f),
      regions: mergeMap(R.regions, S.regions), countries: mergeMap(R.countries, S.countries),
    };
  }

  // 가상 리더보드 행(결정적). 상위권 점수 내림차순.
  function rows(date, now) {
    if (!api.enabled) return [];
    var r = rng(hash(date + "|rows")), lean = leanOf(date), out = [];
    var rkeys = Object.keys(RW), ckeys = Object.keys(CW);
    var f = clamp(curveAt(now) + 0.15, 0, 1);                 // 시간대에 따라 노출 행 수 약간 증감
    var n = Math.max(6, Math.round(ROWS * f));
    var step = (TOP_TAP - MIN_TAP) / Math.max(1, ROWS - 1);
    for (var i = 0; i < n; i++) {
      var taps = Math.round((TOP_TAP - i * step) * (0.96 + r() * 0.08));
      var side = (r() < lean) ? "a" : "b";
      var region = rkeys[Math.floor(r() * rkeys.length)];
      var foreign = r() > 0.82;                                // 일부 해외 참가자
      var country = foreign ? ckeys[1 + Math.floor(r() * (ckeys.length - 1))] : "KR";
      var nick = NICKS[(hash(date + "|n" + i)) % NICKS.length];
      out.push({
        nick: nick, side: side, taps: clamp(taps, MIN_TAP, 1499),
        region: region, country: country,
        badge: r() > 0.6 ? BADGES[Math.floor(r() * BADGES.length)] : "",
        comment: r() > 0.7 ? COMMENTS[Math.floor(r() * COMMENTS.length)] : "",
        bot: true,
      });
    }
    out.sort(function (x, y) { return y.taps - x.taps; }); // 지터로 어긋난 순서 정렬
    return out;
  }

  // 실 리더보드 + 가상 행 병합 → taps 내림차순 max개. 실데이터가 차면 가상 행은 fade로 감소.
  function mergeRows(realRows, date, max, now) {
    var real = Array.isArray(realRows) ? realRows.slice() : [];
    var f = fade(real.length);
    var bots = rows(date, now);
    var take = Math.round(bots.length * f);
    var merged = real.concat(bots.slice(0, Math.max(0, take)));
    merged.sort(function (x, y) { return (y.taps || 0) - (x.taps || 0); });
    return merged.slice(0, max || 20);
  }

  // 결과 화면 순위 보정: 실 {rank,total}(없으면 null)에 가상 인원을 얹어 '몇 명 중 몇 등'을 그럴듯하게.
  // f==0이고 실값도 없으면 null(호출부가 기존 추정치 사용).
  function blendRank(realRes, date, taps, now) {
    var realTotal = realRes ? (realRes.total || 0) : 0;
    var f = fade(realTotal);
    if (f <= 0) return realRes || null;
    var P = Math.round(participants(date, now) * f);
    var fracAbove = Math.pow(clamp(1 - (taps || 0) / 1500, 0, 1), 1.25); // 많이 칠수록 위에 적음
    var above = Math.round(P * fracAbove);
    var base = realRes ? realTotal : 1, rank0 = realRes ? (realRes.rank || 1) : 1;
    var total = base + P, rank = clamp(rank0 + above, 1, total);
    return { rank: rank, total: total };
  }

  var api = {
    enabled: true,           // 라이브 ON: 초반 가상 플레이어(표시전용·실유저 차면 자동소멸). 끄려면 false
    FLOOR: FLOOR, PEAK: PEAK, FADE: FADE,
    leanOf: leanOf, participants: participants, totals: totals,
    blend: blend, rows: rows, mergeRows: mergeRows, blendRank: blendRank, fade: fade,
    // ── tools/bots(서버 시더)가 재사용하는 결정적 부품(DRY) ──
    _hash: hash, _rng: rng, _clamp: clamp, _curveAt: curveAt,
    NICKS: NICKS, BADGES: BADGES, COMMENTS: COMMENTS, RW: RW, CW: CW,
  };
  return api;
});
