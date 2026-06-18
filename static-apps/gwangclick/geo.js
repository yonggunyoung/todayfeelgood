/* ⚡ 광클대전 — geo.js : 무료 국가 감지 (D1: 비AI·비용 0).
 * 신호 우선순위: navigator.language 지역서브태그 → 타임존 매핑 → '' (미상).
 * 외부 API·네트워크 0. 모든 함수는 순수(입력만으로 결정) → tests/geo.test.mjs 경계 4종 검증.
 * 브라우저: window.GCGeo / Node(test): module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api; // Node 테스트
  if (root) root.GCGeo = api; // 브라우저
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ISO2 → 국기 이모지(지역표시기호). 변조/미상은 백색기.
  function flagOf(code) {
    if (typeof code !== "string") return "🏳️";
    var c = code.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(c)) return "🏳️";
    return String.fromCodePoint(0x1f1e6 + (c.charCodeAt(0) - 65), 0x1f1e6 + (c.charCodeAt(1) - 65));
  }

  // "en-US","ko_KR","zh-Hans-CN" → 지역서브태그(대문자 ISO2). 없으면 ''.
  function countryFromLocale(lang) {
    if (typeof lang !== "string" || !lang) return "";
    var parts = lang.replace(/_/g, "-").split("-");
    for (var i = 1; i < parts.length; i++) {
      if (/^[A-Za-z]{2}$/.test(parts[i])) return parts[i].toUpperCase();
    }
    return "";
  }

  // IANA 타임존 → 국가(주요 도시 위주). 미상은 ''. (정밀 지오는 D1 탈출구로 후속.)
  // locale가 1차 신호(detectCountry). 여긴 locale에 지역서브태그가 없을 때의 보조 매핑.
  var TZ = {
    "Asia/Seoul": "KR", "Asia/Pyongyang": "KP", "Asia/Tokyo": "JP", "Asia/Shanghai": "CN",
    "Asia/Urumqi": "CN", "Asia/Hong_Kong": "HK", "Asia/Macau": "MO", "Asia/Taipei": "TW",
    "Asia/Singapore": "SG", "Asia/Bangkok": "TH", "Asia/Vientiane": "LA", "Asia/Phnom_Penh": "KH",
    "Asia/Yangon": "MM", "Asia/Jakarta": "ID", "Asia/Makassar": "ID", "Asia/Jayapura": "ID",
    "Asia/Manila": "PH", "Asia/Ho_Chi_Minh": "VN", "Asia/Kuala_Lumpur": "MY", "Asia/Brunei": "BN",
    "Asia/Kolkata": "IN", "Asia/Colombo": "LK", "Asia/Dhaka": "BD", "Asia/Kathmandu": "NP",
    "Asia/Thimphu": "BT", "Asia/Karachi": "PK", "Asia/Kabul": "AF", "Asia/Tashkent": "UZ",
    "Asia/Almaty": "KZ", "Asia/Bishkek": "KG", "Asia/Dushanbe": "TJ", "Asia/Ashgabat": "TM",
    "Asia/Ulaanbaatar": "MN", "Asia/Tehran": "IR", "Asia/Baghdad": "IQ", "Asia/Riyadh": "SA",
    "Asia/Dubai": "AE", "Asia/Qatar": "QA", "Asia/Bahrain": "BH", "Asia/Kuwait": "KW",
    "Asia/Muscat": "OM", "Asia/Aden": "YE", "Asia/Amman": "JO", "Asia/Beirut": "LB",
    "Asia/Damascus": "SY", "Asia/Jerusalem": "IL", "Asia/Gaza": "PS", "Asia/Nicosia": "CY",
    "Asia/Baku": "AZ", "Asia/Yerevan": "AM", "Asia/Tbilisi": "GE",
    "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Lisbon": "PT", "Europe/Paris": "FR",
    "Europe/Brussels": "BE", "Europe/Amsterdam": "NL", "Europe/Luxembourg": "LU",
    "Europe/Berlin": "DE", "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Vienna": "AT",
    "Europe/Zurich": "CH", "Europe/Oslo": "NO", "Europe/Stockholm": "SE", "Europe/Helsinki": "FI",
    "Europe/Copenhagen": "DK", "Europe/Reykjavik": "IS", "Europe/Warsaw": "PL", "Europe/Prague": "CZ",
    "Europe/Bratislava": "SK", "Europe/Budapest": "HU", "Europe/Bucharest": "RO", "Europe/Sofia": "BG",
    "Europe/Athens": "GR", "Europe/Belgrade": "RS", "Europe/Zagreb": "HR", "Europe/Ljubljana": "SI",
    "Europe/Sarajevo": "BA", "Europe/Skopje": "MK", "Europe/Tirane": "AL", "Europe/Podgorica": "ME",
    "Europe/Chisinau": "MD", "Europe/Kiev": "UA", "Europe/Kyiv": "UA", "Europe/Minsk": "BY",
    "Europe/Vilnius": "LT", "Europe/Riga": "LV", "Europe/Tallinn": "EE", "Europe/Moscow": "RU",
    "Europe/Istanbul": "TR", "Europe/Malta": "MT",
    "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
    "America/Los_Angeles": "US", "America/Phoenix": "US", "America/Anchorage": "US",
    "Pacific/Honolulu": "US", "America/Toronto": "CA", "America/Vancouver": "CA",
    "America/Edmonton": "CA", "America/Winnipeg": "CA", "America/Halifax": "CA",
    "America/Mexico_City": "MX", "America/Guatemala": "GT", "America/Belize": "BZ",
    "America/El_Salvador": "SV", "America/Tegucigalpa": "HN", "America/Managua": "NI",
    "America/Costa_Rica": "CR", "America/Panama": "PA", "America/Havana": "CU",
    "America/Jamaica": "JM", "America/Port-au-Prince": "HT", "America/Santo_Domingo": "DO",
    "America/Puerto_Rico": "PR", "America/Bogota": "CO", "America/Caracas": "VE",
    "America/Guyana": "GY", "America/Paramaribo": "SR", "America/Lima": "PE",
    "America/La_Paz": "BO", "America/Guayaquil": "EC", "America/Asuncion": "PY",
    "America/Santiago": "CL", "America/Montevideo": "UY", "America/Sao_Paulo": "BR",
    "America/Bahia": "BR", "America/Manaus": "BR", "America/Buenos_Aires": "AR",
    "America/Argentina/Buenos_Aires": "AR",
    "Africa/Cairo": "EG", "Africa/Tripoli": "LY", "Africa/Tunis": "TN", "Africa/Algiers": "DZ",
    "Africa/Casablanca": "MA", "Africa/Nouakchott": "MR", "Africa/Dakar": "SN",
    "Africa/Bamako": "ML", "Africa/Ouagadougou": "BF", "Africa/Niamey": "NE", "Africa/Abidjan": "CI",
    "Africa/Accra": "GH", "Africa/Lome": "TG", "Africa/Porto-Novo": "BJ", "Africa/Lagos": "NG",
    "Africa/Douala": "CM", "Africa/Ndjamena": "TD", "Africa/Bangui": "CF", "Africa/Libreville": "GA",
    "Africa/Brazzaville": "CG", "Africa/Kinshasa": "CD", "Africa/Luanda": "AO", "Africa/Khartoum": "SD",
    "Africa/Juba": "SS", "Africa/Addis_Ababa": "ET", "Africa/Asmara": "ER", "Africa/Djibouti": "DJ",
    "Africa/Mogadishu": "SO", "Africa/Nairobi": "KE", "Africa/Kampala": "UG", "Africa/Kigali": "RW",
    "Africa/Bujumbura": "BI", "Africa/Dar_es_Salaam": "TZ", "Africa/Lusaka": "ZM",
    "Africa/Harare": "ZW", "Africa/Maputo": "MZ", "Africa/Lilongwe": "MW", "Africa/Gaborone": "BW",
    "Africa/Windhoek": "NA", "Africa/Johannesburg": "ZA", "Africa/Maseru": "LS", "Africa/Mbabane": "SZ",
    "Indian/Antananarivo": "MG", "Indian/Mauritius": "MU",
    "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU",
    "Australia/Perth": "AU", "Australia/Adelaide": "AU", "Pacific/Auckland": "NZ",
    "Pacific/Fiji": "FJ", "Pacific/Port_Moresby": "PG", "Pacific/Guadalcanal": "SB",
    "Pacific/Noumea": "NC", "Pacific/Tongatapu": "TO", "Pacific/Apia": "WS", "Pacific/Guam": "GU",
  };
  function countryFromTimezone(tz) {
    if (typeof tz !== "string" || !tz) return "";
    return TZ[tz] || "";
  }

  // {lang, tz} 신호 결합. 둘 다 없으면 '' (호출부가 '전 세계'로 폴백).
  function detectCountry(opts) {
    opts = opts || {};
    return countryFromLocale(opts.lang) || countryFromTimezone(opts.tz) || "";
  }

  // 표시용 국가명(ko/en). 표에 없으면 코드 자체를 이름으로(불신 #1: 깨지지 않음).
  // ISO 3166-1 alpha-2 전수(UN 회원국 + 흔한 영토/속령). 기존 23국 표기는 그대로 보존.
  // 순수 데이터(deps·네트워크 0). centroid는 gc-globe.js CENTROIDS와 1:1 동기.
  var NAMES = {
    // ── 기존 23국(표기 보존) ──
    KR: ["대한민국", "Korea"], JP: ["일본", "Japan"], CN: ["중국", "China"], US: ["미국", "USA"],
    GB: ["영국", "UK"], FR: ["프랑스", "France"], DE: ["독일", "Germany"], TW: ["대만", "Taiwan"],
    VN: ["베트남", "Vietnam"], TH: ["태국", "Thailand"], ID: ["인도네시아", "Indonesia"],
    PH: ["필리핀", "Philippines"], IN: ["인도", "India"], BR: ["브라질", "Brazil"],
    CA: ["캐나다", "Canada"], AU: ["호주", "Australia"], MX: ["멕시코", "Mexico"],
    ES: ["스페인", "Spain"], IT: ["이탈리아", "Italy"], RU: ["러시아", "Russia"],
    SG: ["싱가포르", "Singapore"], MY: ["말레이시아", "Malaysia"], HK: ["홍콩", "Hong Kong"],
    // ── 아시아 ──
    KP: ["북한", "North Korea"], MO: ["마카오", "Macau"], MN: ["몽골", "Mongolia"],
    LA: ["라오스", "Laos"], KH: ["캄보디아", "Cambodia"], MM: ["미얀마", "Myanmar"],
    BN: ["브루나이", "Brunei"], TL: ["동티모르", "Timor-Leste"], BD: ["방글라데시", "Bangladesh"],
    LK: ["스리랑카", "Sri Lanka"], NP: ["네팔", "Nepal"], BT: ["부탄", "Bhutan"],
    MV: ["몰디브", "Maldives"], PK: ["파키스탄", "Pakistan"], AF: ["아프가니스탄", "Afghanistan"],
    UZ: ["우즈베키스탄", "Uzbekistan"], KZ: ["카자흐스탄", "Kazakhstan"], KG: ["키르기스스탄", "Kyrgyzstan"],
    TJ: ["타지키스탄", "Tajikistan"], TM: ["투르크메니스탄", "Turkmenistan"],
    IR: ["이란", "Iran"], IQ: ["이라크", "Iraq"], SA: ["사우디아라비아", "Saudi Arabia"],
    AE: ["아랍에미리트", "UAE"], QA: ["카타르", "Qatar"], BH: ["바레인", "Bahrain"],
    KW: ["쿠웨이트", "Kuwait"], OM: ["오만", "Oman"], YE: ["예멘", "Yemen"],
    JO: ["요르단", "Jordan"], LB: ["레바논", "Lebanon"], SY: ["시리아", "Syria"],
    IL: ["이스라엘", "Israel"], PS: ["팔레스타인", "Palestine"], TR: ["튀르키예", "Turkey"],
    CY: ["키프로스", "Cyprus"], AZ: ["아제르바이잔", "Azerbaijan"], AM: ["아르메니아", "Armenia"],
    GE: ["조지아", "Georgia"],
    // ── 유럽 ──
    IE: ["아일랜드", "Ireland"], PT: ["포르투갈", "Portugal"], NL: ["네덜란드", "Netherlands"],
    BE: ["벨기에", "Belgium"], LU: ["룩셈부르크", "Luxembourg"], CH: ["스위스", "Switzerland"],
    AT: ["오스트리아", "Austria"], NO: ["노르웨이", "Norway"], SE: ["스웨덴", "Sweden"],
    FI: ["핀란드", "Finland"], DK: ["덴마크", "Denmark"], IS: ["아이슬란드", "Iceland"],
    PL: ["폴란드", "Poland"], CZ: ["체코", "Czechia"], SK: ["슬로바키아", "Slovakia"],
    HU: ["헝가리", "Hungary"], RO: ["루마니아", "Romania"], BG: ["불가리아", "Bulgaria"],
    GR: ["그리스", "Greece"], RS: ["세르비아", "Serbia"], HR: ["크로아티아", "Croatia"],
    SI: ["슬로베니아", "Slovenia"], BA: ["보스니아헤르체고비나", "Bosnia and Herzegovina"],
    MK: ["북마케도니아", "North Macedonia"], AL: ["알바니아", "Albania"], ME: ["몬테네그로", "Montenegro"],
    XK: ["코소보", "Kosovo"], MD: ["몰도바", "Moldova"], UA: ["우크라이나", "Ukraine"],
    BY: ["벨라루스", "Belarus"], LT: ["리투아니아", "Lithuania"], LV: ["라트비아", "Latvia"],
    EE: ["에스토니아", "Estonia"], MT: ["몰타", "Malta"], AD: ["안도라", "Andorra"],
    MC: ["모나코", "Monaco"], LI: ["리히텐슈타인", "Liechtenstein"], SM: ["산마리노", "San Marino"],
    VA: ["바티칸", "Vatican City"],
    // ── 아메리카 ──
    GT: ["과테말라", "Guatemala"], BZ: ["벨리즈", "Belize"], SV: ["엘살바도르", "El Salvador"],
    HN: ["온두라스", "Honduras"], NI: ["니카라과", "Nicaragua"], CR: ["코스타리카", "Costa Rica"],
    PA: ["파나마", "Panama"], CU: ["쿠바", "Cuba"], JM: ["자메이카", "Jamaica"],
    HT: ["아이티", "Haiti"], DO: ["도미니카공화국", "Dominican Republic"], BS: ["바하마", "Bahamas"],
    BB: ["바베이도스", "Barbados"], TT: ["트리니다드토바고", "Trinidad and Tobago"],
    PR: ["푸에르토리코", "Puerto Rico"], CO: ["콜롬비아", "Colombia"], VE: ["베네수엘라", "Venezuela"],
    GY: ["가이아나", "Guyana"], SR: ["수리남", "Suriname"], PE: ["페루", "Peru"],
    BO: ["볼리비아", "Bolivia"], EC: ["에콰도르", "Ecuador"], PY: ["파라과이", "Paraguay"],
    CL: ["칠레", "Chile"], UY: ["우루과이", "Uruguay"], AR: ["아르헨티나", "Argentina"],
    // ── 아프리카 ──
    EG: ["이집트", "Egypt"], LY: ["리비아", "Libya"], TN: ["튀니지", "Tunisia"],
    DZ: ["알제리", "Algeria"], MA: ["모로코", "Morocco"], MR: ["모리타니", "Mauritania"],
    SN: ["세네갈", "Senegal"], GM: ["감비아", "Gambia"], GW: ["기니비사우", "Guinea-Bissau"],
    GN: ["기니", "Guinea"], SL: ["시에라리온", "Sierra Leone"], LR: ["라이베리아", "Liberia"],
    ML: ["말리", "Mali"], BF: ["부르키나파소", "Burkina Faso"], NE: ["니제르", "Niger"],
    CI: ["코트디부아르", "Côte d'Ivoire"], GH: ["가나", "Ghana"], TG: ["토고", "Togo"],
    BJ: ["베냉", "Benin"], NG: ["나이지리아", "Nigeria"], CM: ["카메룬", "Cameroon"],
    TD: ["차드", "Chad"], CF: ["중앙아프리카공화국", "Central African Republic"], GA: ["가봉", "Gabon"],
    CG: ["콩고공화국", "Congo-Brazzaville"], CD: ["콩고민주공화국", "DR Congo"], GQ: ["적도기니", "Equatorial Guinea"],
    AO: ["앙골라", "Angola"], SD: ["수단", "Sudan"], SS: ["남수단", "South Sudan"],
    ET: ["에티오피아", "Ethiopia"], ER: ["에리트레아", "Eritrea"], DJ: ["지부티", "Djibouti"],
    SO: ["소말리아", "Somalia"], KE: ["케냐", "Kenya"], UG: ["우간다", "Uganda"],
    RW: ["르완다", "Rwanda"], BI: ["부룬디", "Burundi"], TZ: ["탄자니아", "Tanzania"],
    ZM: ["잠비아", "Zambia"], ZW: ["짐바브웨", "Zimbabwe"], MZ: ["모잠비크", "Mozambique"],
    MW: ["말라위", "Malawi"], BW: ["보츠와나", "Botswana"], NA: ["나미비아", "Namibia"],
    ZA: ["남아프리카공화국", "South Africa"], LS: ["레소토", "Lesotho"], SZ: ["에스와티니", "Eswatini"],
    MG: ["마다가스카르", "Madagascar"], MU: ["모리셔스", "Mauritius"], SC: ["세이셸", "Seychelles"],
    KM: ["코모로", "Comoros"], CV: ["카보베르데", "Cape Verde"], ST: ["상투메프린시페", "São Tomé and Príncipe"],
    // ── 오세아니아 ──
    NZ: ["뉴질랜드", "New Zealand"], FJ: ["피지", "Fiji"], PG: ["파푸아뉴기니", "Papua New Guinea"],
    SB: ["솔로몬제도", "Solomon Islands"], VU: ["바누아투", "Vanuatu"], NC: ["뉴칼레도니아", "New Caledonia"],
    PF: ["프랑스령폴리네시아", "French Polynesia"], WS: ["사모아", "Samoa"], TO: ["통가", "Tonga"],
    KI: ["키리바시", "Kiribati"], FM: ["미크로네시아", "Micronesia"], MH: ["마셜제도", "Marshall Islands"],
    PW: ["팔라우", "Palau"], NR: ["나우루", "Nauru"], TV: ["투발루", "Tuvalu"], GU: ["괌", "Guam"],
  };
  function countryInfo(code) {
    var c = typeof code === "string" ? code.trim().toUpperCase() : "";
    var nm = NAMES[c];
    return {
      code: c,
      flag: flagOf(c),
      nameKo: nm ? nm[0] : c || "전 세계",
      nameEn: nm ? nm[1] : c || "Global",
    };
  }

  // 브라우저 실측 신호 수집(런타임 전용 — 순수 함수와 분리).
  function detectFromBrowser() {
    var lang = "", tz = "";
    try { lang = (navigator.languages && navigator.languages[0]) || navigator.language || ""; } catch (e) {}
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    return detectCountry({ lang: lang, tz: tz });
  }

  return {
    flagOf: flagOf,
    countryFromLocale: countryFromLocale,
    countryFromTimezone: countryFromTimezone,
    detectCountry: detectCountry,
    countryInfo: countryInfo,
    detectFromBrowser: detectFromBrowser,
  };
});
