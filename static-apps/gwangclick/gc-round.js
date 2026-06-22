/* ⚡ 광클대전 — gc-round.js : 라운드(대전 한 판) 스케줄 (순수·결정적).
 *  - 기본: defaultHours(예 6시간)마다 BATTLES 순환. 전 세계 같은 시각=같은 라운드(집계 공유).
 *  - featured(1회 특집): {id,startMs,hours} 창 안이면 그 떡밥으로 오버라이드(예: 아샷추 지금부터 24h 한 번).
 *    창이 끝나면 자동으로 일반 순환 복귀.
 *  - 집계 키 = "<topicId>@<roundStartSec>" : 라운드 occurrence마다 유일·전역 동일.
 *  - 순수·throw 금지 → tests/round.test.mjs. 브라우저: window.GCRound / Node: module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GCRound = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var HMS = 3600000;

  function findIdx(battles, id) {
    for (var i = 0; i < battles.length; i++) if (battles[i] && battles[i].id === id) return i;
    return -1;
  }
  function make(battles, idx, startMs, hours, featured) {
    return {
      index: idx, id: battles[idx].id, topic: battles[idx], hours: hours,
      startMs: Math.round(startMs), endMs: Math.round(startMs + hours * HMS),
      key: battles[idx].id + "@" + Math.round(startMs / 1000), featured: !!featured,
    };
  }

  /* nowMs 시점의 현재 라운드. opts={defaultHours,anchorMs,featured:{id,startMs,hours}} */
  function roundAt(battles, opts, nowMs) {
    if (!Array.isArray(battles) || !battles.length) return null;
    var now = (typeof nowMs === "number") ? nowMs : Date.now();
    var o = opts || {};
    var dh = (+o.defaultHours > 0) ? +o.defaultHours : 6;
    var anchor = (typeof o.anchorMs === "number") ? o.anchorMs : 0;
    var f = o.featured;
    // 1회 특집 창
    if (f && typeof f.startMs === "number") {
      var fi = findIdx(battles, f.id), fh = (+f.hours > 0) ? +f.hours : 24;
      if (fi >= 0 && now >= f.startMs && now < f.startMs + fh * HMS) {
        return make(battles, fi, f.startMs, fh, true);
      }
    }
    // 일반 순환(균일 defaultHours)
    var slot = Math.floor((now - anchor) / (dh * HMS));
    var idx = ((slot % battles.length) + battles.length) % battles.length;
    return make(battles, idx, anchor + slot * dh * HMS, dh, false);
  }

  /* 직전(방금 끝난) 라운드 — 승자 발표용. 특집/일반 모두 자동 처리. */
  function previousRound(battles, opts, nowMs) {
    var cur = roundAt(battles, opts, nowMs);
    if (!cur) return null;
    return roundAt(battles, opts, cur.startMs - 1000);
  }

  return { HMS: HMS, roundAt: roundAt, previousRound: previousRound };
});
