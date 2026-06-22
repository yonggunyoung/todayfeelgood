/* ⚡ 광클대전 — gc-round.js : 라운드(대전 한 판) 스케줄 (순수·결정적).
 *  - 기본 라운드 길이 = 1시간. 단 special 맵에 지정된 떡밥은 그 시간(예: ashotchu=24h).
 *  - 고정 ANCHOR 기준 시각으로 계산 → 전 세계 모든 기기가 '같은 시점=같은 라운드'(집계 공유).
 *  - 모든 함수 순수(입력만으로 결정)·throw 금지 → tests/round.test.mjs 경계검증.
 *  - 집계 키 = "<topicId>@<roundStartSec>" : 라운드 occurrence마다 유일·전역 동일.
 * 브라우저: window.GCRound / Node(test): module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GCRound = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var HMS = 3600000;

  function hoursOf(b, special) {
    var h = b && special && special[b.id];
    h = +h;
    return (isFinite(h) && h > 0) ? h : 1;        // 기본 1시간
  }
  function cycleHours(battles, special) {
    var s = 0; for (var i = 0; i < battles.length; i++) s += hoursOf(battles[i], special);
    return s > 0 ? s : (battles ? battles.length : 0);
  }

  /* nowMs 시점의 현재 라운드. battles=BATTLES, special={id:hours}, anchorMs=고정기준. */
  function roundAt(battles, special, anchorMs, nowMs) {
    if (!Array.isArray(battles) || !battles.length) return null;
    var now = (typeof nowMs === "number") ? nowMs : Date.now();
    var anchor = (typeof anchorMs === "number") ? anchorMs : 0;
    var cyc = cycleHours(battles, special);
    var elapsed = (now - anchor) / HMS;
    var pos = ((elapsed % cyc) + cyc) % cyc;       // 0..cyc(시간)
    var acc = 0, idx = battles.length - 1, startH = cyc - hoursOf(battles[battles.length - 1], special);
    for (var i = 0; i < battles.length; i++) {
      var h = hoursOf(battles[i], special);
      if (pos < acc + h) { idx = i; startH = acc; break; }
      acc += h;
    }
    var hr = hoursOf(battles[idx], special);
    var startMs = Math.round(now - (pos - startH) * HMS);
    var endMs = startMs + hr * HMS;
    return {
      index: idx, id: battles[idx].id, topic: battles[idx], hours: hr,
      startMs: startMs, endMs: endMs,
      key: battles[idx].id + "@" + Math.round(startMs / 1000),
    };
  }

  /* 직전(방금 끝난) 라운드 — 승자 발표용. */
  function previousRound(battles, special, anchorMs, nowMs) {
    var cur = roundAt(battles, special, anchorMs, nowMs);
    if (!cur) return null;
    return roundAt(battles, special, anchorMs, cur.startMs - 1000);
  }

  return { HMS: HMS, hoursOf: hoursOf, cycleHours: cycleHours, roundAt: roundAt, previousRound: previousRound };
});
