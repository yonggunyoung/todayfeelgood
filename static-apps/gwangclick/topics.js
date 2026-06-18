/* ⚡ 광클대전 — topics.js : 양어(ko/en) 떡밥 소재 + localize (D3: 가산적, KR 폴백).
 * BATTLES 원본은 {ko,en} 양어 형태. localize(battle,lang)가 기존 렌더 코드가 기대하는
 * 평탄(flat) 형태 {id,tag,q,a:{key,emoji,color,name,slogan},b:{...},taunts:[...]} 로 환원한다.
 *  - 언어 폴백: 요청 lang에 값이 없으면 ko로(불신 #1: 절대 undefined/빈문자 노출 X).
 *  - key/emoji/color 는 비언어 데이터 → 그대로 유지(진영 식별·리스킨에 사용).
 *  - 변조 입력(null·이상 객체)에도 throw 없이 안전한 기본값 반환.
 * 브라우저: window.GCTopics / Node(test): module.exports. → tests/topics.test.mjs 경계 4종.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api; // Node 테스트
  if (root) root.GCTopics = api; // 브라우저
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 양어 소재. 기존 8종(한국 밈) + 해외 공감형 4종(아이스/핫 커피, 고양이/개, 휴지 방향, 여름/겨울).
  // tag/q/name/slogan/taunts 는 {ko,en} 맵. 의역 OK(직역 금지) — 영어권에서 자연스럽게 읽히게.
  var BATTLES = [
    { id:"mintchoco",
      tag:{ ko:"민초대전", en:"Mint Choco" },
      q:{ ko:"민트초코, 너는?", en:"Mint choco — you in?" },
      a:{ key:"mint", emoji:"🌿", color:"#12b39a",
          name:{ ko:"민초단", en:"Team Mint" },
          slogan:{ ko:"치약? 이건 신이 내린 맛", en:"Toothpaste? Nah, it's heaven" } },
      b:{ key:"anti", emoji:"🚫", color:"#7b6ef0",
          name:{ ko:"반민초파", en:"Team No-Mint" },
          slogan:{ ko:"디저트에 치약을 왜 넣냐고", en:"Why put toothpaste in dessert" } },
      taunts:{ ko:["치약 자랑 그만 🪥","민초 모르면 인생 손해 ㅋㅋ","반민초는 미각 테러범","결국 다 민초로 온다"],
               en:["Enough toothpaste talk 🪥","You don't know what you're missing","Anti-minters have no taste","Everyone ends up loving mint"] } },

    { id:"tangsuyuk",
      tag:{ ko:"부먹찍먹", en:"Pour or Dip" },
      q:{ ko:"탕수육은 역시?", en:"Sweet & sour pork —" },
      a:{ key:"bu", emoji:"🥣", color:"#e8633a",
          name:{ ko:"부먹파", en:"Team Pour" },
          slogan:{ ko:"소스에 촉촉하게 적셔야 진리", en:"Drench it in sauce, that's the way" } },
      b:{ key:"jjik", emoji:"🥢", color:"#2f9ec4",
          name:{ ko:"찍먹파", en:"Team Dip" },
          slogan:{ ko:"바삭함을 어떻게 포기해", en:"Never give up that crunch" } },
      taunts:{ ko:["눅눅이들 잘 있냐 🫠","소스 부으면 그게 탕수육 죽이야","찍먹이 국룰 모르나","부먹은 사랑입니다"],
               en:["How's the soggy life 🫠","Pouring sauce ruins the crunch","Dipping is the only rule","Pouring is love, fight me"] } },

    { id:"chicken",
      tag:{ ko:"양념후라이드", en:"Sauced vs Plain" },
      q:{ ko:"치킨 한 마리면?", en:"Fried chicken — how?" },
      a:{ key:"yn", emoji:"🍗", color:"#d83838",
          name:{ ko:"양념파", en:"Team Saucy" },
          slogan:{ ko:"손에 묻은 양념까지 핥아먹는다", en:"Lick the sauce off your fingers" } },
      b:{ key:"fr", emoji:"🍤", color:"#cf911f",
          name:{ ko:"후라이드파", en:"Team Plain" },
          slogan:{ ko:"치킨 본연의 맛, 후라이드", en:"Pure crispy, nothing added" } },
      taunts:{ ko:["후라이드는 심심하지 않냐","양념은 소스맛이지 치킨맛이냐 ㅋ","반반? 회색분자 나가라","결국 시키면 양념"],
               en:["Plain is kinda boring, no?","Sauce hides the actual chicken lol","Half-and-half? Pick a side","You'll order saucy anyway"] } },

    { id:"pineapple",
      tag:{ ko:"파인애플피자", en:"Pineapple Pizza" },
      q:{ ko:"파인애플 피자, 인정?", en:"Pineapple on pizza?" },
      a:{ key:"o", emoji:"🍍", color:"#d9a400",
          name:{ ko:"하와이안단", en:"Team Hawaiian" },
          slogan:{ ko:"달콤짭짤 이게 천국", en:"Sweet and salty is heaven" } },
      b:{ key:"x", emoji:"🙅", color:"#3f8f4f",
          name:{ ko:"파인애플아웃", en:"Team No-Pineapple" },
          slogan:{ ko:"피자에 과일은 반칙", en:"Fruit on pizza is a crime" } },
      taunts:{ ko:["피자에 과일 올린 사람 누구야","먹어보고 말해라 진짜 맛있음","이탈리아 가면 잡혀간다","단짠 모르면 입맛 초딩"],
               en:["Who put fruit on a pizza","Try it before you judge","Italy would arrest you for this","Sweet-salty haters just don't get it"] } },

    { id:"naengmyeon",
      tag:{ ko:"물냉비냉", en:"Cold Noodles" },
      q:{ ko:"여름엔 어떤 냉면?", en:"Summer cold noodles?" },
      a:{ key:"mul", emoji:"🧊", color:"#2f8fd0",
          name:{ ko:"물냉파", en:"Team Broth" },
          slogan:{ ko:"시원한 육수 들이켜는 그 맛", en:"Slurp that icy broth" } },
      b:{ key:"bib", emoji:"🌶️", color:"#d8452f",
          name:{ ko:"비냉파", en:"Team Spicy" },
          slogan:{ ko:"매콤새콤 비벼야 제맛", en:"Spicy, tangy, all mixed up" } },
      taunts:{ ko:["물냉은 밍밍하잖아","비냉은 그냥 매운 국수지","면치기 못하면 물냉 자격 없음","둘 다 시키는 게 정답 아님?"],
               en:["Broth ones are kinda bland","Spicy is just hot noodles","Can't slurp? Not a broth fan","Just order both honestly"] } },

    { id:"milk",
      tag:{ ko:"딸기바나나우유", en:"Milk Flavor" },
      q:{ ko:"편의점 우유는?", en:"Pick a flavored milk" },
      a:{ key:"st", emoji:"🍓", color:"#e85a92",
          name:{ ko:"딸기우유단", en:"Team Strawberry" },
          slogan:{ ko:"핑크빛 행복 한 모금", en:"A sip of pink happiness" } },
      b:{ key:"bn", emoji:"🍌", color:"#e0a800",
          name:{ ko:"바나나우유단", en:"Team Banana" },
          slogan:{ ko:"국민 단지우유 영원하라", en:"The classic that never quits" } },
      taunts:{ ko:["딸기우유는 색소맛 ㅋ","바나나우유 안 먹어본 사람 있냐","단지 모양 못 이김","딸기우유가 더 고급짐"],
               en:["Strawberry is just food coloring lol","Everyone's had banana milk","The little jar shape wins","Strawberry is just classier"] } },

    { id:"gimbap",
      tag:{ ko:"김밥꼬다리", en:"Roll Ends" },
      q:{ ko:"김밥, 어디부터 먹어?", en:"Where to bite first?" },
      a:{ key:"end", emoji:"🍙", color:"#8d6e63",
          name:{ ko:"꼬다리파", en:"Team Ends" },
          slogan:{ ko:"못생긴 끝이 제일 맛있어", en:"The ugly ends taste best" } },
      b:{ key:"mid", emoji:"🌀", color:"#3a9b4f",
          name:{ ko:"가운데파", en:"Team Middle" },
          slogan:{ ko:"예쁜 가운데가 정석이지", en:"The neat middle is the way" } },
      taunts:{ ko:["꼬다리 안 주면 서운함","가운데부터 먹는 건 국룰","꼬다리 버리는 사람 손절","엄마는 늘 꼬다리만 드셨지…"],
               en:["No end piece? I'm hurt","Start from the middle, obviously","Throwing out the ends? Blocked","Mom always ate the ends…"] } },

    { id:"mandu",
      tag:{ ko:"군만두물만두", en:"Dumplings" },
      q:{ ko:"만두는 역시?", en:"Dumplings, how?" },
      a:{ key:"gun", emoji:"🥟", color:"#c07c2a",
          name:{ ko:"군만두파", en:"Team Fried" },
          slogan:{ ko:"바삭바삭 겉면이 생명", en:"That crispy shell is everything" } },
      b:{ key:"mul", emoji:"💧", color:"#4d9ec4",
          name:{ ko:"물만두파", en:"Team Boiled" },
          slogan:{ ko:"촉촉하게 터지는 육즙", en:"Juicy and bursting" } },
      taunts:{ ko:["군만두는 기름맛 아니냐","물만두는 밋밋해","냉동만두는 무조건 군만두","둘 다 맛있는 거 인정하자 사실"],
               en:["Fried just tastes like oil","Boiled is kinda plain","Frozen ones gotta be fried","Okay both are good, fine"] } },

    /* ── 해외 공감형 4종 (글로벌 확장) ── */
    { id:"coffee",
      tag:{ ko:"아아따아", en:"Iced vs Hot" },
      q:{ ko:"커피는 역시?", en:"Coffee — how?" },
      a:{ key:"iced", emoji:"🧊", color:"#3a8fd0",
          name:{ ko:"아이스파", en:"Team Iced" },
          slogan:{ ko:"사계절 무조건 아이스", en:"Iced all year, no exceptions" } },
      b:{ key:"hot", emoji:"☕", color:"#a9612e",
          name:{ ko:"따뜻한파", en:"Team Hot" },
          slogan:{ ko:"향은 따뜻해야 산다", en:"The aroma needs warmth" } },
      taunts:{ ko:["겨울에도 아아? 손 안 시려?","따아는 너무 천천히 식어","얼죽아는 못 말리지","뜨거운 게 진짜 커피 맛"],
               en:["Iced in winter? Frozen hands?","Hot just cools down too slow","Can't stop the iced crew","Hot is real coffee flavor"] } },

    { id:"petlove",
      tag:{ ko:"개냥대전", en:"Cats vs Dogs" },
      q:{ ko:"평생 함께라면?", en:"Your forever buddy?" },
      a:{ key:"cat", emoji:"🐱", color:"#b07cc6",
          name:{ ko:"고양이파", en:"Team Cat" },
          slogan:{ ko:"도도한 매력에 중독됨", en:"Hooked on that aloof charm" } },
      b:{ key:"dog", emoji:"🐶", color:"#e0913a",
          name:{ ko:"강아지파", en:"Team Dog" },
          slogan:{ ko:"꼬리 흔드는 무한 사랑", en:"Endless tail-wagging love" } },
      taunts:{ ko:["개는 너무 손이 많이 가","고양이는 정 없다며?","산책은 강아지가 진리","집사는 평생 집사다"],
               en:["Dogs are so much work","Cats are cold? Says who","Nothing beats a dog walk","Once a cat servant, always one"] } },

    { id:"toiletpaper",
      tag:{ ko:"휴지방향", en:"TP Direction" },
      q:{ ko:"휴지는 어느 방향?", en:"Toilet paper —" },
      a:{ key:"over", emoji:"🧻", color:"#3aa17e",
          name:{ ko:"오버파", en:"Team Over" },
          slogan:{ ko:"앞으로 나와야 정상이지", en:"Over the top, obviously" } },
      b:{ key:"under", emoji:"🔄", color:"#9a6ad0",
          name:{ ko:"언더파", en:"Team Under" },
          slogan:{ ko:"벽쪽으로 깔끔하게", en:"Under, clean against the wall" } },
      taunts:{ ko:["언더는 찾기 힘들잖아","오버는 고양이가 다 풀어","특허 도면도 오버라던데","결국 급하면 다 똑같음"],
               en:["Under is so hard to grab","Cats unroll the 'over' ones","Even the patent says over","In a hurry, who even cares"] } },

    { id:"season",
      tag:{ ko:"여름겨울", en:"Summer vs Winter" },
      q:{ ko:"최고의 계절은?", en:"Best season?" },
      a:{ key:"summer", emoji:"🏖️", color:"#e0a82e",
          name:{ ko:"여름파", en:"Team Summer" },
          slogan:{ ko:"바다·휴가·시원한 맥주", en:"Beach, vacation, cold drinks" } },
      b:{ key:"winter", emoji:"❄️", color:"#4d9ec4",
          name:{ ko:"겨울파", en:"Team Winter" },
          slogan:{ ko:"눈·이불·따뜻한 코코아", en:"Snow, blankets, hot cocoa" } },
      taunts:{ ko:["여름은 너무 덥잖아","겨울은 손발 다 얼어","에어컨 앞이 천국임","이불 밖은 위험해"],
               en:["Summer is just too hot","Winter freezes everything","The AC spot is heaven","It's dangerous outside the blanket"] } }
  ];

  // {ko,en} 맵에서 lang 값을 고르되, 없으면 ko로 폴백. 둘 다 없거나 비객체면 ''.
  function pick(v, lang) {
    if (v == null) return "";
    if (typeof v !== "object") return v; // 이미 평문(하위호환)
    var L = lang === "en" ? "en" : "ko"; // 미지원 lang → ko (불신 #1)
    var out = v[L];
    if (out == null) out = v.ko; // 언어 폴백
    if (out == null) out = v.en; // 그래도 없으면 다른 언어라도
    return out == null ? "" : out;
  }

  // 진영(a/b) 1개를 평탄화. key/emoji/color는 비언어 → 그대로.
  function side(s, lang) {
    s = s || {};
    return {
      key: s.key != null ? s.key : "",
      emoji: s.emoji != null ? s.emoji : "",
      color: s.color != null ? s.color : "#888888",
      name: pick(s.name, lang),
      slogan: pick(s.slogan, lang),
    };
  }

  // 양어 battle → 기존 렌더가 쓰는 평탄 형태. 변조 입력에도 throw 금지.
  function localize(battle, lang) {
    var bt = battle || {};
    var taunts = bt.taunts;
    var list;
    if (Array.isArray(taunts)) list = taunts; // 이미 평탄 배열(하위호환)
    else if (taunts && typeof taunts === "object") {
      var L = lang === "en" ? "en" : "ko";
      list = Array.isArray(taunts[L]) ? taunts[L] : (Array.isArray(taunts.ko) ? taunts.ko : []);
    } else list = [];
    return {
      id: bt.id != null ? bt.id : "",
      tag: pick(bt.tag, lang),
      q: pick(bt.q, lang),
      a: side(bt.a, lang),
      b: side(bt.b, lang),
      taunts: list,
    };
  }

  return { BATTLES: BATTLES, localize: localize, pick: pick };
});
