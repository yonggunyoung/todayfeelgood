/* ⚡ 광클대전 — gc-globe.js : Phase 4 순수 헬퍼 (3D 지구본 데이터 매핑·포커스·색/강도 스케일).
 * D2(모듈 분리·테스트 용이)·D7(3D 지구본은 모바일 안전 우선) 연장선.
 *  - 렌더(globe.gl)는 브라우저 전용 + 외부 라이브러리라 node 테스트 불가 → '테스트 가능한 순수 로직만' 여기로 분리.
 *  - 모든 함수는 순수(입력만으로 결정) + throw 금지 → tests/globe.test.mjs 경계 4종(정상/매핑/None/변조).
 *  - 데이터는 기존 countries 집계(net.js peek/watch)만 사용 — 신규 Firestore I/O 0(D5·비용 0).
 *  - 좌표는 아래 내장 centroid 표(ISO2→{lat,lng})로 배치. 표에 없는 코드는 지구본에서 '조용히 생략'(불신 #1).
 * 브라우저: window.GCGlobe / Node(test): module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api; // Node 테스트
  if (root) root.GCGlobe = api; // 브라우저
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ── 국가 중심좌표(centroid) 표 — ISO2 → [위도, 경도] ──
   * geo.js NAMES 전수(~190국)와 1:1 동기 — 어떤 국가도 지구본에서 '소외'되지 않음.
   * '근사 중심'이면 충분(점/링 배치용) → 정밀도 2~3자리(D7: 번들 최소, 불필요한 정밀 금지).
   * 표에 없으면 지구본에 안 찍힘(centroidOf 게이트 유지; 폴백: 평면 리스트는 여전히 노출).
   * 컴팩트 JSON 대신 인라인(파일 1개 추가·번들 0) — 변경 반경 최소(#3). */
  var CENTROIDS = {
    // ── 아시아 ──
    KR: [36.5, 127.8], KP: [40.3, 127.5], JP: [36.2, 138.3], CN: [35.9, 104.2],
    HK: [22.3, 114.2], MO: [22.2, 113.5], TW: [23.7, 121.0], MN: [46.9, 103.8],
    SG: [1.35, 103.8], TH: [15.0, 101.0], LA: [19.9, 102.5], KH: [12.6, 104.9],
    MM: [21.9, 95.9], ID: [-2.5, 118.0], PH: [12.9, 121.8], VN: [16.0, 107.8],
    MY: [4.2, 102.0], BN: [4.5, 114.7], TL: [-8.8, 125.7], IN: [22.0, 79.0],
    BD: [23.7, 90.4], LK: [7.9, 80.8], NP: [28.4, 84.1], BT: [27.5, 90.4],
    MV: [3.2, 73.2], PK: [30.0, 70.0], AF: [33.9, 67.7], UZ: [41.4, 64.6],
    KZ: [48.0, 66.9], KG: [41.2, 74.8], TJ: [38.9, 71.3], TM: [38.97, 59.6],
    IR: [32.4, 53.7], IQ: [33.2, 43.7], SA: [24.0, 45.0], AE: [24.0, 54.0],
    QA: [25.3, 51.2], BH: [26.0, 50.6], KW: [29.3, 47.5], OM: [21.5, 55.9],
    YE: [15.6, 48.0], JO: [30.6, 36.2], LB: [33.9, 35.9], SY: [34.8, 38.0],
    IL: [31.4, 35.0], PS: [31.9, 35.2], TR: [39.0, 35.0], CY: [35.1, 33.4],
    AZ: [40.1, 47.6], AM: [40.1, 45.0], GE: [42.3, 43.4],
    // ── 유럽 ──
    GB: [54.0, -2.5], IE: [53.0, -8.0], PT: [39.5, -8.0], FR: [46.5, 2.5],
    ES: [40.0, -3.7], DE: [51.2, 10.4], NL: [52.2, 5.5], BE: [50.6, 4.6],
    LU: [49.8, 6.1], CH: [46.8, 8.2], AT: [47.6, 14.1], IT: [42.8, 12.6],
    NO: [62.0, 10.0], SE: [62.0, 15.0], FI: [64.0, 26.0], DK: [56.0, 9.5],
    IS: [64.96, -19.0], PL: [52.1, 19.4], CZ: [49.8, 15.5], SK: [48.7, 19.7],
    HU: [47.2, 19.5], RO: [45.9, 24.97], BG: [42.7, 25.5], GR: [39.0, 22.0],
    RS: [44.0, 21.0], HR: [45.1, 15.2], SI: [46.1, 14.8], BA: [43.9, 17.7],
    MK: [41.6, 21.7], AL: [41.2, 20.2], ME: [42.7, 19.4], XK: [42.6, 20.9],
    MD: [47.4, 28.4], UA: [49.0, 32.0], BY: [53.7, 27.95], LT: [55.2, 23.9],
    LV: [56.9, 24.6], EE: [58.6, 25.0], MT: [35.9, 14.4], AD: [42.5, 1.6],
    MC: [43.74, 7.42], LI: [47.17, 9.55], SM: [43.94, 12.46], VA: [41.9, 12.45],
    RU: [61.5, 90.0],
    // ── 아메리카 ──
    US: [39.5, -98.4], CA: [56.1, -106.3], MX: [23.6, -102.5], GT: [15.8, -90.2],
    BZ: [17.2, -88.5], SV: [13.8, -88.9], HN: [15.2, -86.2], NI: [12.9, -85.2],
    CR: [9.7, -83.8], PA: [8.5, -80.8], CU: [21.5, -77.8], JM: [18.1, -77.3],
    HT: [19.0, -72.3], DO: [18.7, -70.2], BS: [25.0, -77.4], BB: [13.2, -59.5],
    TT: [10.7, -61.2], PR: [18.2, -66.5], CO: [4.0, -73.0], VE: [6.4, -66.6],
    GY: [4.9, -58.9], SR: [3.9, -56.0], PE: [-9.2, -75.0], BO: [-16.3, -63.6],
    EC: [-1.8, -78.2], PY: [-23.4, -58.4], CL: [-35.7, -71.5], UY: [-32.5, -55.8],
    BR: [-10.3, -53.2], AR: [-38.4, -63.6],
    // ── 아프리카 ──
    EG: [26.8, 30.0], LY: [26.3, 17.2], TN: [33.9, 9.6], DZ: [28.0, 1.7],
    MA: [31.8, -7.1], MR: [21.0, -10.9], SN: [14.5, -14.5], GM: [13.4, -15.3],
    GW: [12.0, -15.0], GN: [9.9, -11.0], SL: [8.5, -11.8], LR: [6.4, -9.4],
    ML: [17.6, -4.0], BF: [12.2, -1.6], NE: [17.6, 8.1], CI: [7.5, -5.5],
    GH: [7.95, -1.0], TG: [8.6, 0.8], BJ: [9.3, 2.3], NG: [9.1, 8.7],
    CM: [5.7, 12.7], TD: [15.5, 18.7], CF: [6.6, 20.9], GA: [-0.6, 11.6],
    CG: [-0.8, 15.2], CD: [-2.9, 23.6], GQ: [1.6, 10.3], AO: [-11.2, 17.9],
    SD: [15.0, 30.2], SS: [7.3, 30.3], ET: [9.1, 40.5], ER: [15.2, 39.8],
    DJ: [11.8, 42.6], SO: [5.2, 46.2], KE: [0.2, 37.9], UG: [1.4, 32.4],
    RW: [-1.9, 29.9], BI: [-3.4, 29.9], TZ: [-6.4, 34.9], ZM: [-13.1, 27.8],
    ZW: [-19.0, 29.2], MZ: [-18.7, 35.5], MW: [-13.3, 34.3], BW: [-22.3, 24.7],
    NA: [-22.96, 18.5], ZA: [-29.0, 24.0], LS: [-29.6, 28.2], SZ: [-26.5, 31.5],
    MG: [-18.8, 46.9], MU: [-20.3, 57.6], SC: [-4.7, 55.5], KM: [-11.6, 43.3],
    CV: [16.0, -24.0], ST: [0.2, 6.6],
    // ── 오세아니아 ──
    AU: [-25.3, 133.8], NZ: [-41.5, 172.8], FJ: [-17.7, 178.0], PG: [-6.3, 143.9],
    SB: [-9.6, 160.2], VU: [-15.4, 166.96], NC: [-21.3, 165.6], PF: [-17.7, -149.4],
    WS: [-13.8, -172.1], TO: [-21.2, -175.2], KI: [1.9, -157.4], FM: [6.9, 158.2],
    MH: [7.1, 171.2], PW: [7.5, 134.6], NR: [-0.5, 166.9], TV: [-7.1, 178.0],
    GU: [13.5, 144.8],
  };

  // ISO2 정규화: 2글자 영문만 통과(대문자), 그 외 '' (불신 #1 — net.js normCountry와 동일 계약).
  function normCode(code) {
    if (typeof code !== "string") return "";
    var c = code.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(c) ? c : "";
  }
  function centroidOf(code) {
    var c = normCode(code);
    var v = c && CENTROIDS[c];
    return Array.isArray(v) && v.length === 2 ? { lat: v[0], lng: v[1] } : null;
  }
  function num(x) { var n = +x; return isFinite(n) && n > 0 ? n : 0; }

  // hex 색 검증(보안/안정 #1: 진영색은 신뢰값이나, 변조 입력에도 깨지지 않게 폴백).
  function safeHex(c, fallback) {
    return (typeof c === "string" && /^#[0-9a-fA-F]{3,8}$/.test(c.trim())) ? c.trim() : fallback;
  }

  /* 강도→색: 우세 진영(lead)의 팀색을 그대로 반환(요구사항: color = leading side).
   * lead가 'a'/'b'가 아니면 a로 폴백(불신 #1). 색 변조 시 안전 기본색. */
  function intensityColor(lead, colorA, colorB) {
    var a = safeHex(colorA, "#36e0c8"), b = safeHex(colorB, "#7b6ef0");
    return lead === "b" ? b : a;
  }

  /* 참여수(tot) → 점/링 가중치(0~1). 최대 tot 기준 정규화 + 로그 스케일(소수 거대국이 다 먹지 않게).
   * maxTot<=0 이면 0. 단일국이면 1. 변조 입력에도 0~1 clamp. */
  function weightOf(tot, maxTot) {
    var tt = num(tot), mx = num(maxTot);
    if (mx <= 0 || tt <= 0) return 0;
    // log1p 정규화: 1국이 압도해도 작은 국가가 보이게(가독). 0~1 clamp.
    var w = Math.log(1 + tt) / Math.log(1 + mx);
    return Math.max(0, Math.min(1, w));
  }

  /* countries 집계 → 지구본 점(point) 배열.
   * 입력: countries={ISO2:{a,b}}, colorA/colorB=진영 팀색(bt.a.color/bt.b.color).
   * 출력(tot 내림차순): [{code,lat,lng,a,b,tot,lead,share,color,weight}]
   *   - 0 참여국·centroid 없는 코드·변조 항목은 제외(graceful, throw 금지).
   *   - max(기본 60): 모바일 경량 — 점/링 개수 상한.
   * countryStandings(gc-util)와 같은 집계 규칙을 쓰되 좌표/색/가중치를 덧붙인 '렌더 입력'. */
  function countryPoints(countries, colorA, colorB, max) {
    var out = [];
    if (!countries || typeof countries !== "object") return out;
    var keys = Object.keys(countries), maxTot = 0, i;
    var rows = [];
    for (i = 0; i < keys.length; i++) {
      var code = normCode(keys[i]);
      if (!code) continue;                    // 변조 코드 → skip
      var cen = centroidOf(code);
      if (!cen) continue;                      // centroid 없음 → 지구본 생략(평면 리스트는 별도로 노출)
      var v = countries[keys[i]];
      if (!v || typeof v !== "object") continue; // 변조 값 → skip
      var a = num(v.a), b = num(v.b), tot = a + b;
      if (tot <= 0) continue;                  // 0 참여 → skip
      var lead = a >= b ? "a" : "b";
      var share = Math.round((lead === "a" ? a : b) / tot * 100);
      if (tot > maxTot) maxTot = tot;
      rows.push({ code: code, lat: cen.lat, lng: cen.lng, a: a, b: b, tot: tot, lead: lead, share: share });
    }
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      r.color = intensityColor(r.lead, colorA, colorB);
      r.weight = weightOf(r.tot, maxTot);
      out.push(r);
    }
    out.sort(function (x, y) { return y.tot - x.tot; });
    var lim = (typeof max === "number" && max >= 0) ? max : 60;
    if (out.length > lim) out = out.slice(0, lim);
    return out;
  }

  /* 포커스 대상 선택: 내 나라(myCode)에 활동이 있으면 내 나라, 아니면 최다 참여국(hottest).
   * points 비었으면 null(호출부가 기본 시점). 변조 myCode는 무시. */
  function pickFocus(points, myCode) {
    if (!Array.isArray(points) || !points.length) return null;
    var my = normCode(myCode);
    if (my) {
      for (var i = 0; i < points.length; i++) if (points[i].code === my) return points[i];
    }
    // points는 countryPoints에서 tot 내림차순 → [0]이 hottest. 방어적으로 max 재탐색.
    var best = points[0];
    for (var j = 1; j < points.length; j++) if (num(points[j].tot) > num(best.tot)) best = points[j];
    return best;
  }

  // 각도 차를 -180~180으로 정규화(경도 wrap 처리).
  function angDiff(a, b) {
    var d = ((a - b + 180) % 360 + 360) % 360 - 180;
    return d;
  }

  /* 활동의 지리적 '퍼짐(spread)' — 참여 가중 표준편차(도 단위, 대략적).
   * 좁게 모이면 작고, 전세계로 퍼지면 큼. points 0/1개면 0. */
  function spreadOf(points) {
    if (!Array.isArray(points) || points.length < 2) return 0;
    var sw = 0, sLat = 0, sLng = 0, i, w;
    for (i = 0; i < points.length; i++) {
      w = num(points[i].weight) || num(points[i].tot) || 1;
      sw += w; sLat += points[i].lat * w; sLng += points[i].lng * w;
    }
    if (sw <= 0) return 0;
    var mLat = sLat / sw, mLng = sLng / sw, varSum = 0;
    for (i = 0; i < points.length; i++) {
      w = num(points[i].weight) || num(points[i].tot) || 1;
      var dLat = points[i].lat - mLat, dLng = angDiff(points[i].lng, mLng);
      varSum += w * (dLat * dLat + dLng * dLng);
    }
    return Math.sqrt(varSum / sw); // RMS 거리(도)
  }

  /* 포커스 고도(altitude) 계산 — globe.gl pointOfView altitude(카메라 거리, 클수록 멀리/넓게).
   *  - 좁게 집중된 핫스팟 → 가까이 줌인(작은 altitude).
   *  - 전세계로 퍼진 대전 → 멀리 줌아웃(큰 altitude).
   *  - 점 0/1개면 단일국 클로즈업(MIN_ALT). 범위는 [MIN_ALT, MAX_ALT] clamp(불신 #1).
   * spread(도, 0~~180) → altitude 선형 매핑. 모바일에서도 과도한 줌/광각 방지. */
  var MIN_ALT = 0.7;   // 한 지역 집중: 가깝게
  var MAX_ALT = 2.5;   // 전세계 분산: 지구 전체 보이게
  function focusAltitude(points) {
    if (!Array.isArray(points) || points.length <= 1) return MIN_ALT;
    var s = spreadOf(points);
    // spread 0도→MIN, 80도(대륙 횡단급)→MAX 로 선형. 그 사이 보간.
    var t = Math.max(0, Math.min(1, s / 80));
    var alt = MIN_ALT + (MAX_ALT - MIN_ALT) * t;
    return Math.max(MIN_ALT, Math.min(MAX_ALT, alt));
  }

  /* 저사양/모바일 휴리스틱 — 폴백 판단 보조(순수: 신호 객체만 받음).
   * 입력 {deviceMemory, hardwareConcurrency, reducedMotion, webgl, libLoaded}.
   *  - webgl=false | libLoaded=false | reducedMotion=true → 2D 폴백(true 반환=폴백써라).
   *  - deviceMemory<2 또는 코어<=2 → 저사양 → 폴백.
   * 모든 신호 누락이면 false(폴백 안 함 — 3D 시도, 실패 시 런타임이 폴백). */
  function shouldFallback(sig) {
    sig = (sig && typeof sig === "object") ? sig : {};
    if (sig.webgl === false) return true;
    if (sig.libLoaded === false) return true;
    if (sig.reducedMotion === true) return true;
    var mem = +sig.deviceMemory;
    if (isFinite(mem) && mem > 0 && mem < 2) return true;
    var cores = +sig.hardwareConcurrency;
    if (isFinite(cores) && cores > 0 && cores <= 2) return true;
    return false;
  }

  // 모바일 DPR 캡(D7): 실제 dpr 받아 [1, cap]로 제한. 변조/누락은 1.
  function cappedDpr(dpr, cap) {
    var d = +dpr; if (!isFinite(d) || d <= 0) d = 1;
    var c = +cap; if (!isFinite(c) || c <= 0) c = 1.5;
    return Math.max(1, Math.min(c, d));
  }

  return {
    CENTROIDS: CENTROIDS, MIN_ALT: MIN_ALT, MAX_ALT: MAX_ALT,
    normCode: normCode, centroidOf: centroidOf, safeHex: safeHex,
    intensityColor: intensityColor, weightOf: weightOf,
    countryPoints: countryPoints, pickFocus: pickFocus,
    spreadOf: spreadOf, focusAltitude: focusAltitude,
    shouldFallback: shouldFallback, cappedDpr: cappedDpr,
  };
});
