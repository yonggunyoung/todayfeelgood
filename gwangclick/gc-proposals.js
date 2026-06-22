/* ⚡ 광클대전 — gc-proposals.js : 떡밥 투표소(UGC) 순수 로직 (D8~D12).
 * "플레이어가 떡밥 생성 → 추첨 노출 → 좋아요 투표 → 임계 도달 시 owner 큐레이션 등판."
 *  - D8 검열: 자동 금칙어 필터 + 사후신고(임계 시 읽기시점 자동숨김). D9/D10 투척권=포인트(로컬) 경제. D11 owner 큐레이션. D12 격리(신규 컬렉션).
 *  - 모든 함수 순수(입력만으로 결정) + throw 금지 → tests/proposals.test.mjs 경계 4종(정상/매핑/None/변조).
 *  - 렌더/네트워크/스토리지 부작용 없음 — net.js·index.html이 이 결과를 '사용'만 한다(D2 모듈 분리).
 *  - ⚠ 금칙어 필터는 '1차 거름'일 뿐 완전하지 않다 — 진짜 안전망은 신고+owner 검토(D8). 과하게 막지 않도록 보수적으로.
 * 브라우저: window.GCProp / Node(test): module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api; // Node 테스트
  if (root) root.GCProp = api; // 브라우저
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 튜닝 상수(owner가 바꿈) — 사용자 결정 기본값. 코드 한곳에서 관리(외화 #2).
  var DEFAULTS = {
    Q_MAX: 40, NAME_MAX: 14,      // 입력 길이 캡(스팸·레이아웃 보호)
    likeThreshold: 50,            // 좋아요 ≥ → "🔥 등판 대기"
    reportThreshold: 5,           // 신고 ≥ → 자동숨김(읽기시점)
    ticketCost: 100,              // 떡밥 투척권 1장 = 포인트
    dailyCap: 3,                  // 투척권 있어도 일일 제출 상한(도배 백스톱)
    adPoints: 30,                 // 📺 보상형 광고 1회
    invitePoints: 50,             // 📣 초대 1명
    freeTickets: 1,               // 신규 무료 투척권
  };

  // 금칙어(1차 거름) — 대표 표본만(비속어/혐오/스팸 신호). 비과격: 일상어 오탐 최소화.
  //  실제 욕설/혐오 전수가 아니라 '명백한 것'만 막고, 나머지는 신고+owner(D8)에 위임.
  var BANNED = [
    "씨발", "시발", "병신", "ㅅㅂ", "ㅄ", "좆", "지랄", "개새끼", "보지", "자지", "썅",
    "fuck", "shit", "bitch", "asshole", "nigger", "faggot", "cunt",
    "카지노", "도박", "비아그라", "viagra", "porn", "포르노",
  ];

  function isStr(v) { return typeof v === "string"; }
  // 제어문자 제거 + 공백 정규화 + trim (불신 #1: 외부 입력 재조립).
  function normText(s) {
    if (!isStr(s)) return "";
    return s.replace(/[\x00-\x1f\x7f-\x9f]/g, " ").replace(/\s+/g, " ").trim();
  }
  // 금칙어 포함 여부(소문자·공백제거 비교 → 'f u c k' 류 회피 일부 차단).
  function containsBanned(s) {
    if (!isStr(s)) return false;
    var low = s.toLowerCase();
    var squished = low.replace(/\s+/g, "");
    for (var i = 0; i < BANNED.length; i++) {
      var w = BANNED[i];
      if (low.indexOf(w) !== -1 || squished.indexOf(w) !== -1) return true;
    }
    return false;
  }

  /* 제출 검증 — {q, aName, bName} 정규화 + 캡 + 금칙어 + 형식.
   * 반환 {ok, value:{q,aName,bName}, errors:[code...]}. throw 금지.
   *  errors 코드: empty / tooLong / sameSides / banned (UI가 메시지 매핑). */
  function validateProposal(input, opts) {
    var o = merge(opts), errors = [];
    var src = (input && typeof input === "object") ? input : {};
    var q = normText(src.q), a = normText(src.aName), b = normText(src.bName);
    if (!q || !a || !b) errors.push("empty");
    if (q.length > o.Q_MAX || a.length > o.NAME_MAX || b.length > o.NAME_MAX) errors.push("tooLong");
    if (a && b && a.toLowerCase() === b.toLowerCase()) errors.push("sameSides");
    if (containsBanned(q) || containsBanned(a) || containsBanned(b)) errors.push("banned");
    return { ok: errors.length === 0, value: { q: q, aName: a, bName: b }, errors: errors };
  }

  function num(x) { var n = +x; return isFinite(n) && n >= 0 ? n : 0; }

  /* 떡밥 상태(읽기시점 계산 — 서버 status 변경 0, 비용 0·D8/D11).
   *  reports ≥ 임계 → 'hidden'(자동숨김) / likes ≥ 임계 → 'live'(등판 대기) / 그 외 'pending'.
   *  변조/None 입력은 안전 기본('pending'·숨김 우선). */
  function statusOf(p, opts) {
    var o = merge(opts);
    var pp = (p && typeof p === "object") ? p : {};
    if (num(pp.reports) >= o.reportThreshold) return "hidden";
    if (num(pp.likes) >= o.likeThreshold) return "live";
    return "pending";
  }
  function isHidden(p, opts) { return statusOf(p, opts) === "hidden"; }
  function isPromotable(p, opts) { return statusOf(p, opts) === "live"; }
  // 등판까지 남은 좋아요 수(진행바·동기부여용). live면 0, hidden이면 null.
  function likesToGo(p, opts) {
    var o = merge(opts), pp = (p && typeof p === "object") ? p : {};
    if (num(pp.reports) >= o.reportThreshold) return null;
    var togo = o.likeThreshold - num(pp.likes);
    return togo > 0 ? togo : 0;
  }

  // Fisher-Yates 셔플(추첨 노출). rnd()=[0,1) 주입(테스트 결정성). 원본 불변(복사본 반환).
  function shuffle(arr, rnd) {
    var a = Array.isArray(arr) ? arr.slice() : [];
    var r = (typeof rnd === "function") ? rnd : Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)); if (j < 0) j = 0; if (j > i) j = i;
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  /* 화면에 띄울 후보 추첨 — 숨김(신고임계) 제외 → 셔플 → n개. (좋아요 적은 신규도 노출 기회=마태효과 차단) */
  function pickFeed(list, n, rnd, opts) {
    var arr = Array.isArray(list) ? list : [];
    var visible = [];
    for (var i = 0; i < arr.length; i++) { if (arr[i] && !isHidden(arr[i], opts)) visible.push(arr[i]); }
    var shuffled = shuffle(visible, rnd);
    var lim = (typeof n === "number" && n >= 0) ? n : 10;
    return shuffled.slice(0, lim);
  }

  // ── 기기당 1회 투표(좋아요/신고) 멱등 — 로컬 셋(plain object)에 기록. 비용: 중복쓰기 차단(D12). ──
  function votedKey(kind, id) { return (kind === "report" ? "r:" : "l:") + (id || ""); }
  function hasVoted(set, kind, id) { return !!(set && typeof set === "object" && set[votedKey(kind, id)]); }
  function addVoted(set, kind, id) {
    var s = (set && typeof set === "object") ? set : {};
    var out = {}; for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) out[k] = s[k]; // 복사(불변)
    if (id) out[votedKey(kind, id)] = 1;
    return out;
  }

  // ── 포인트/투척권 경제(로컬·D9/D10) — 순수 리듀서. 상태 {points,tickets,freeDay}. 모두 복사본 반환. ──
  function normEcon(e) {
    var s = (e && typeof e === "object") ? e : {};
    return { points: num(s.points), tickets: num(s.tickets), freeDay: isStr(s.freeDay) ? s.freeDay : "" };
  }
  function addPoints(e, n) { var s = normEcon(e); s.points += num(n); return s; }
  function canAfford(e, opts) { var s = normEcon(e), o = merge(opts); return s.points >= o.ticketCost; }
  /* 투척권 구입: 포인트 ≥ 가격이면 -가격/+1장. 반환 {econ, ok, reason}. */
  function buyTicket(e, opts) {
    var s = normEcon(e), o = merge(opts);
    if (s.points < o.ticketCost) return { econ: s, ok: false, reason: "noPoints" };
    s.points -= o.ticketCost; s.tickets += 1;
    return { econ: s, ok: true, reason: "" };
  }
  /* 제출 시 투척권 1장 소모. 반환 {econ, ok, reason}. (투척권 없으면 ok:false) */
  function spendTicket(e) {
    var s = normEcon(e);
    if (s.tickets <= 0) return { econ: s, ok: false, reason: "noTicket" };
    s.tickets -= 1; return { econ: s, ok: true, reason: "" };
  }
  /* 신규 무료 투척권 1회 지급(날짜 무관·계정당 1회) — freeDay가 비어있을 때만. */
  function grantFreeOnce(e, opts) {
    var s = normEcon(e), o = merge(opts);
    if (s.freeDay) return { econ: s, granted: false };
    s.tickets += o.freeTickets; s.freeDay = "granted";
    return { econ: s, granted: true };
  }

  // opts 병합(누락/변조는 DEFAULTS) — 숫자 항목만 안전 적용.
  function merge(opts) {
    var o = {}; for (var k in DEFAULTS) o[k] = DEFAULTS[k];
    if (opts && typeof opts === "object") {
      for (var k2 in DEFAULTS) {
        if (Object.prototype.hasOwnProperty.call(opts, k2)) {
          var v = +opts[k2]; if (isFinite(v) && v >= 0) o[k2] = v;
        }
      }
    }
    return o;
  }

  return {
    DEFAULTS: DEFAULTS, BANNED: BANNED,
    normText: normText, containsBanned: containsBanned, validateProposal: validateProposal,
    statusOf: statusOf, isHidden: isHidden, isPromotable: isPromotable, likesToGo: likesToGo,
    shuffle: shuffle, pickFeed: pickFeed,
    hasVoted: hasVoted, addVoted: addVoted,
    normEcon: normEcon, addPoints: addPoints, canAfford: canAfford,
    buyTicket: buyTicket, spendTicket: spendTicket, grantFreeOnce: grantFreeOnce,
  };
});
