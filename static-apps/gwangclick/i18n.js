/* ⚡ 광클대전 — i18n.js : 언어 선택 + 문자열 사전 (D3: 가산적, KR 폴백).
 * pickLang/t 는 순수 함수 → tests/i18n.test.mjs 경계 4종 검증.
 * STR 키가 없으면 ko로, ko에도 없으면 key 자체 반환(불신 #1: 절대 빈화면 X).
 * 브라우저: window.GCI18n / Node(test): module.exports.
 * ※ STR는 index.html 배선 단계에서 점진 확장(현재는 기반 셋).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GCI18n = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SUPPORTED = ["ko", "en"];

  // navigator.language 류 입력 → 'ko'|'en'. 한국어면 ko, 그 외 en, 미상/빈값은 ko(보수적 폴백 #1).
  function pickLang(input) {
    if (typeof input !== "string" || !input.trim()) return "ko";
    return /^ko(-|_|$)/i.test(input.trim()) ? "ko" : "en";
  }

  var STR = {
    ko: {
      // 브랜드/공통
      brand: "⚡ 광클대전", live: "LIVE", liveWorld: "전 세계 동시",
      liveBadge: "LIVE · 전국 동시", demoBadge: "데모 · 흐름 시뮬", demo: "데모",
      worldTitle: "세계 광클대전", appName: "광클대전", vs: "VS",
      // 인트로
      todayFlow: "전국 흐름", worldFlow: "세계 흐름",
      join: "{name}로 참전", // ko: 조사는 호출부에서 withEuro로 보정
      tapHint: "60초 동안 미친듯이 탭 → 내 편 흐름을 끌어와라. 콤보를 이으면 한 탭이 ×3까지.",
      firstJoin: "🔴 오늘의 첫 참전자가 되어보세요", streakDays: "{n}일 연속 참전",
      streakDaysOn: "{n}일 연속 참전 중",
      connecting: "🔴 전국 실시간 집계 연결 중…",
      liveCount: "🔴 지금까지 {n}명 참전 — 실제 전국 집계 반영 중",
      rankBtn: "🏆 전국 랭킹", todayBattle: "⚡ 오늘의 대전",
      // 배틀
      battleHead: "LIVE · BATTLE", startCry: "전국에서 광클 시작 — {team} 가즈아!",
      myContribution: "내 기여", comboLbl: "콤보", timeLbl: "Time", tapLab: "TAP!",
      chipNormal: "평상", chipCombo: "콤보!", chipUrgent: "막판 10초",
      thirdLive: "전국 실시간", thirdUrgent: "긴급", thirdComboAcc: "콤보 가속",
      thirdGrab: "{name} · 흐름 잡아라",
      thirdUrgentMsg: "막판 10초 · 총력전", thirdComboMsg: "버튼 발광 · 기여 강조",
      thirdLeadMsg: "{name} 우세 · 차이 {diff}%p",
      // 티커 일반 라인(떡밥별 도발은 topics.js)
      tkClose: "⚔️ 초접전! 한 끗 차이다", tkLead: "🔥 {team} 흐름 장악 {share}%",
      tkCombo: "💥 누군가 ×{mult} 콤보 폭발!",
      tkGen1: "🚀 단톡방에 소문이 퍼지는 중…", tkGen2: "👀 옆 반도 참전했다는데?", tkGen3: "📣 지금 흐름 끌어올 타이밍!",
      // 결과
      resultTag: "RESULT", verdictWin: "우리 편이 전국을 먹었다 🎉",
      verdictLose: "오늘은 밀렸다…<br>내일 설욕 🔥", verdictTie: "초접전 무승부 ⚔️",
      titleLbl: "칭호", finalShare: "최종 {n}%", maxCombo: "최고 콤보",
      rankNation: "전국 순위", rankEst: "예상 전국", counting: "집계 중…",
      rankUnit: "위", rankOf: "{n}명", hashApp: "#광클대전",
      newBest: "🏆 내 최고 기여 갱신 · {n}",
      x2done: "✅ 광고 보상 적용 — 자랑 카드가 2배로 커졌어요",
      rewardBtn: "📺 광고 보고 기여 <b>2배</b>로 자랑 ⚡2X",
      shareBtn: "📣 결과 자랑 + 친구 소환", againBtn: "🔁 한 판 더",
      // 공유
      shareText: "⚡광클대전⚡ 나는 {name}!\n{q} → {title}\n내 기여 {contrib}{x2}{rank}\n너는 어느 편? 참전해라 👉",
      shareRankReal: " · 전국 {n}위", shareRankEst: " · 예상 {n}위",
      shareCopied: "링크 복사 완료 — 단톡방에 뿌리기 📣",
      shareScreenshot: "스크린샷 해서 자랑해보세요 📸",
      // 랭킹 보드
      rankTitle: "🏆 전국 랭킹", topToday: "오늘의 광클 TOP", realtime: "실시간",
      loading: "불러오는 중…", refreshBtn: "🔄 새로고침",
      boardDemo: "데모 모드예요 — fb-config.js에 Firebase 설정을 넣으면 실제 전국 랭킹·지역 점령전이 켜집니다.",
      boardErr: "랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      boardEmpty: "아직 오늘 참전자가 없어요 — 첫 광클의 주인공이 되어보세요!",
      regionTitle: "지역 점령 현황", me: "(나)",
      // 나라대전(Phase 2)
      countryTitle: "🌍 나라 순위", myCountry: "내 나라", world: "세계",
      myCountryVsWorld: "내 나라 vs 세계",
      contribRankLine: "내 기여 {contrib} · {scope} {rank}위",
      contribRankLineEst: "내 기여 {contrib} · 예상 {scope} {rank}위",
      scopeNation: "전국", scopeWorld: "세계",
      youRanked: "🏅 순위권 진입! {scope} {rank}위",
      // 설정
      setTitle: "설정", closeBtn: "✕ 닫기", setRegionLbl: "내 지역 · 지역 점령전",
      setNickLbl: "랭킹 닉네임", anon: "익명광클러",
      setBadgeLbl: "순위권 배지 (이모지 1개)", setCommentLbl: "순위권 멘트 (한 줄)",
      setBadgeHint: "TOP 순위에 들면 닉네임 옆에 표시돼요.",
      setCommentPh: "예: 가볍게 한판 하고 갑니다",
      setHintOn: "실제 전국 집계에 참여 중 — 닉네임은 랭킹에만 표시돼요.",
      setHintOff: "백엔드 미연결(데모). fb-config.js 연결 시 실제 대전이 켜집니다.",
      saveBtn: "저장",
      // 광고 오버레이
      adTag: "AD · 광고", adSkip: "✕ 건너뛰기(보상 없음)",
      adNote: "광고 자리 — 토스/애드센스/애드핏 연결 시 실제 광고가 나옵니다",
      adWatching: "광고 시청 중… {n}초", adRewarded: "✅ 보상 적용",
      adNeedFull: "끝까지 봐야 보상을 받아요", adApplied: "⚡ 기여 2배 적용 — 더 크게 자랑하기!",
      // 꾸미기/보관함(Phase 3) — 코스메틱은 100% 표현(게임 밸런스 불변)
      lockerBtn: "🎨 꾸미기", lockerTitle: "🎨 꾸미기 보관함",
      lockerIntro: "탭 이펙트·이름색·배지를 꾸며보세요. 게임 실력엔 영향 없는 순수 장식이에요.",
      catTapFx: "✨ 탭 이펙트", catNameColor: "🏷️ 이름 색", catBadge: "🏅 프리미엄 배지",
      equip: "장착", equipped: "✅ 장착됨",
      unlockAd: "📺 광고 보고 해금", unlockInvite: "📣 초대하고 해금",
      lockedTag: "🔒 잠김", freeTag: "기본",
      unlocked: "🎉 해금 완료 — {name}", equippedToast: "✅ 장착: {name}", unequippedToast: "장착 해제됨",
      inviteShareText: "⚡광클대전⚡ 같이 광클하자! 내 초대코드 {code}\n오늘의 떡밥에 참전 👉",
      inviteUnlocked: "🎉 초대 링크 공유 — {name} 해금!",
      inviteCopied: "초대 링크 복사 완료 — 친구에게 보내면 끝! 📣",
      badgeEquipHint: "프리미엄 배지는 순위권에서 닉네임 옆에 표시돼요.",
      premiumBadgeOn: "🏅 프리미엄 배지 장착: {b}", badgeCleared: "배지를 비웠어요",
      // 지구본(Phase 4) — 실시간 타격 3D 지구본(globe.gl 지연로딩 + 2D 폴백, D7)
      globeBtn: "🌍 지구본", globeTitle: "🌍 실시간 타격 지구본",
      globeIntro: "전 세계 광클 강도를 실시간 지구본으로. 점이 클수록 참여가 많고, 색은 우세 진영이에요.",
      globeLoading: "지구본 불러오는 중…", globeRotate: "⏸ 회전 멈춤", globeRotateOn: "▶ 회전 시작",
      globeEmpty: "아직 오늘 참전한 나라가 없어요 — 첫 광클로 지구본을 켜보세요!",
      globeDemo: "데모 모드예요 — fb-config.js에 Firebase를 연결하면 실제 세계 타격이 지구본에 떠요.",
      globe2d: "2D 모드", globe2dNote: "이 기기는 가벼운 2D 지구본으로 표시했어요(3D 미지원/절전).",
      globeMine: "내 나라", globeTaps: "참여 {n}",
      // 토글
      langToggle: "EN", // ko 화면에서 누르면 영어로 → 다른 언어를 표시
    },
    en: {
      // brand/common
      brand: "⚡ Click Battle", live: "LIVE", liveWorld: "Worldwide live",
      liveBadge: "LIVE · Worldwide", demoBadge: "Demo · simulated", demo: "Demo",
      worldTitle: "World Click Battle", appName: "Click Battle", vs: "VS",
      // intro
      todayFlow: "Global flow", worldFlow: "World flow",
      join: "Join {name}",
      tapHint: "Tap like crazy for 60s → pull the flow to your side. Combos boost a tap up to ×3.",
      firstJoin: "🔴 Be today's first to join", streakDays: "{n}-day streak",
      streakDaysOn: "{n}-day streak going",
      connecting: "🔴 Connecting to live count…",
      liveCount: "🔴 {n} have joined so far — live count is on",
      rankBtn: "🏆 Rankings", todayBattle: "⚡ Today's battle",
      // battle
      battleHead: "LIVE · BATTLE", startCry: "Battle is on — let's go {team}!",
      myContribution: "My taps", comboLbl: "Combo", timeLbl: "Time", tapLab: "TAP!",
      chipNormal: "Steady", chipCombo: "Combo!", chipUrgent: "Final 10s",
      thirdLive: "Live", thirdUrgent: "Urgent", thirdComboAcc: "Combo rush",
      thirdGrab: "{name} · grab the flow",
      thirdUrgentMsg: "Final 10s · all in", thirdComboMsg: "Button on fire · push taps",
      thirdLeadMsg: "{name} leading · by {diff}%p",
      // ticker generic lines
      tkClose: "⚔️ Neck and neck! Razor thin", tkLead: "🔥 {team} owns the flow {share}%",
      tkCombo: "💥 Someone just hit a ×{mult} combo!",
      tkGen1: "🚀 Word is spreading in the chat…", tkGen2: "👀 The other side just joined too?", tkGen3: "📣 Now's the time to swing it!",
      // result
      resultTag: "RESULT", verdictWin: "Our side took it all 🎉",
      verdictLose: "We got pushed back today…<br>Revenge tomorrow 🔥", verdictTie: "Dead heat — a draw ⚔️",
      titleLbl: "Title", finalShare: "Final {n}%", maxCombo: "Max combo",
      rankNation: "Global rank", rankEst: "Est. rank", counting: "Counting…",
      rankUnit: "", rankOf: "of {n}", hashApp: "#ClickBattle",
      newBest: "🏆 New personal best · {n}",
      x2done: "✅ Reward applied — your brag card is 2× bigger",
      rewardBtn: "📺 Watch an ad to brag <b>2×</b> ⚡2X",
      shareBtn: "📣 Brag + summon friends", againBtn: "🔁 One more",
      // share
      shareText: "⚡Click Battle⚡ I'm {name}!\n{q} → {title}\nMy taps {contrib}{x2}{rank}\nWhich side are you? Join 👉",
      shareRankReal: " · global #{n}", shareRankEst: " · est. #{n}",
      shareCopied: "Link copied — share it around 📣",
      shareScreenshot: "Take a screenshot to brag 📸",
      // rank board
      rankTitle: "🏆 Rankings", topToday: "Today's top clickers", realtime: "Live",
      loading: "Loading…", refreshBtn: "🔄 Refresh",
      boardDemo: "Demo mode — add your Firebase config to fb-config.js to turn on live rankings and regional battles.",
      boardErr: "Couldn't load rankings. Please try again shortly.",
      boardEmpty: "No one has joined today yet — be the first clicker!",
      regionTitle: "Regional control", me: "(you)",
      // country battle (Phase 2)
      countryTitle: "🌍 Country standings", myCountry: "My country", world: "World",
      myCountryVsWorld: "My country vs World",
      contribRankLine: "My taps {contrib} · {scope} #{rank}",
      contribRankLineEst: "My taps {contrib} · est. {scope} #{rank}",
      scopeNation: "national", scopeWorld: "global",
      youRanked: "🏅 You're ranked! {scope} #{rank}",
      // settings
      setTitle: "Settings", closeBtn: "✕ Close", setRegionLbl: "My region · regional battle",
      setNickLbl: "Ranking nickname", anon: "Anonymous",
      setBadgeLbl: "Rank badge (1 emoji)", setCommentLbl: "Rank comment (one line)",
      setBadgeHint: "Shown next to your name if you make the top ranks.",
      setCommentPh: "e.g. Just here for a quick round",
      setHintOn: "You're in the live count — nickname shows only on the ranking.",
      setHintOff: "Backend not connected (demo). Connect fb-config.js to turn on the real battle.",
      saveBtn: "Save",
      // ad overlay
      adTag: "AD", adSkip: "✕ Skip (no reward)",
      adNote: "Ad slot — real ads appear when Toss/AdSense/AdFit is connected",
      adWatching: "Watching ad… {n}s", adRewarded: "✅ Reward applied",
      adNeedFull: "Watch to the end to get the reward", adApplied: "⚡ Taps doubled — brag even bigger!",
      // cosmetics / locker (Phase 3) — purely visual, never affects balance
      lockerBtn: "🎨 Customize", lockerTitle: "🎨 Customize",
      lockerIntro: "Style your tap effect, name color and badges. Pure decoration — never changes gameplay.",
      catTapFx: "✨ Tap effect", catNameColor: "🏷️ Name color", catBadge: "🏅 Premium badge",
      equip: "Equip", equipped: "✅ Equipped",
      unlockAd: "📺 Watch ad to unlock", unlockInvite: "📣 Invite to unlock",
      lockedTag: "🔒 Locked", freeTag: "Free",
      unlocked: "🎉 Unlocked — {name}", equippedToast: "✅ Equipped: {name}", unequippedToast: "Unequipped",
      inviteShareText: "⚡Click Battle⚡ Come click with me! My invite code {code}\nJoin today's battle 👉",
      inviteUnlocked: "🎉 Invite link shared — {name} unlocked!",
      inviteCopied: "Invite link copied — send it to a friend! 📣",
      badgeEquipHint: "Premium badges show next to your name when you rank.",
      premiumBadgeOn: "🏅 Premium badge equipped: {b}", badgeCleared: "Badge cleared",
      // globe (Phase 4) — live-strike 3D globe (lazy-loaded globe.gl + 2D fallback, D7)
      globeBtn: "🌍 Globe", globeTitle: "🌍 Live strike globe",
      globeIntro: "Worldwide click intensity on a live globe. Bigger dots mean more taps; color shows the leading side.",
      globeLoading: "Loading globe…", globeRotate: "⏸ Stop spin", globeRotateOn: "▶ Spin",
      globeEmpty: "No country has joined today yet — be the first to light up the globe!",
      globeDemo: "Demo mode — connect Firebase in fb-config.js to see real worldwide strikes on the globe.",
      globe2d: "2D mode", globe2dNote: "Shown as a lightweight 2D globe on this device (no 3D / power-saving).",
      globeMine: "My country", globeTaps: "{n} taps",
      // toggle
      langToggle: "한국어", // on en screen, tapping switches to Korean
    },
  };

  // (lang, key, vars?) → 문자열. 폴백: lang→ko→key. {placeholder} 치환.
  // ⚠ 보안 계약(#1): 반환값은 innerHTML로 쓰일 수 있고 STR에 의도적 HTML(<b>·<br>)이 있다.
  //   따라서 vars 는 신뢰값(숫자·앱상수)만 전달할 것. 사용자입력(닉네임 등)은 호출부에서 esc() 후 넣는다.
  function t(lang, key, vars) {
    var L = SUPPORTED.indexOf(lang) >= 0 ? lang : "ko";
    var dict = STR[L] || STR.ko;
    var s = dict[key];
    if (s == null) s = STR.ko[key];
    if (s == null) return key;
    if (vars && typeof s === "string") {
      s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? String(vars[k]) : m; });
    }
    return s;
  }

  return { SUPPORTED: SUPPORTED, pickLang: pickLang, t: t, STR: STR };
});
