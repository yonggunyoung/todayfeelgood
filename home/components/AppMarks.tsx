import type { ReactNode } from "react";
import type { Locale } from "../lib/i18n";
import type { AppEntry } from "../lib/appsRegistry";
import styles from "../app/hub.module.css";

/**
 * 레지스트리 미니앱(apps.json)의 카드 비주얼.
 * 썸네일은 "실제 앱 화면을 미니어처로" 그린 SVG 목업 — 각 앱의 진짜 UI/색/특징을 반영한다.
 *  - 광클대전: 실제 다크 게임 화면(민초 #12b39a / 반민초 #7b6ef0, 타이머·게이지·글로시 탭버튼).
 *  - 냉비서  : 실제 밝은 앱 화면(초록 #2fae5f 헤더·냉장고 재고 리스트·하단 탭).
 *  - 글꾸미  : 밝은 핑크(#ff5fa2) 멋글씨 변환 리스트(스타일별 변환 + 복사 버튼).
 *  - 오늘기분: 크림톤(#FBF6EE) 구름이 마스코트 + 기분 5종 칩 + 오늘의 노래 카드.
 * 새 앱은 AppMark(아이콘) + SCENES(썸네일) 두 곳에 항목만 추가하면 된다.
 * (설정이 없는 앱은 이모지 폴백 — 깨지지 않음.)
 */

const SANS = "Pretendard, -apple-system, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** 전용 비주얼이 있는 앱인지 — 타일/썸네일 분기에 사용. */
export function hasAppMark(id: string): boolean {
  return (
    id === "naengbiseo" ||
    id === "gwangclick" ||
    id === "geulkkumi" ||
    id === "mood"
  );
}

/** 앱별 고유 SVG 심볼(흰 면 + 본체색 악센트). 하단 아이콘 타일·메인홈 썸네일 공용. */
export function AppMark({ id, size = 30 }: { id: string; size?: number }): ReactNode {
  switch (id) {
    case "naengbiseo":
      // 양문형 냉장고 — 흰 본체에 본체색(currentColor) 분할선·손잡이.
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
          <rect x="15" y="5" width="18" height="38" rx="4.5" fill="#fff" />
          <line x1="15" y1="19" x2="33" y2="19" stroke="currentColor" strokeWidth="2.2" />
          <rect x="18.4" y="9" width="2.6" height="6.5" rx="1.3" fill="currentColor" />
          <rect x="18.4" y="23" width="2.6" height="9" rx="1.3" fill="currentColor" />
        </svg>
      );
    case "gwangclick":
      // 번개 — 속도·광클의 상징.
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
          <path d="M27 4 L12 27 h9 l-3 17 18-25 h-10 z" fill="#fff" />
        </svg>
      );
    case "geulkkumi":
      // 반짝이(별) — 멋글씨·꾸미기의 상징.
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
          <path d="M26 7 C27 18 30 21 41 23 C30 25 27 28 26 39 C25 28 22 25 11 23 C22 21 25 18 26 7 Z" fill="#fff" />
          <path d="M15 8 C15.5 12 16.5 13 20 13.5 C16.5 14 15.5 15 15 19 C14.5 15 13.5 14 10 13.5 C13.5 13 14.5 12 15 8 Z" fill="#fff" opacity="0.85" />
        </svg>
      );
    case "mood":
      // 구름 — 마스코트 '구름이'.
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
          <circle cx="17" cy="28" r="8" fill="#fff" />
          <circle cx="24" cy="21" r="10" fill="#fff" />
          <circle cx="32" cy="28" r="8" fill="#fff" />
          <rect x="13" y="26" width="22" height="9" rx="4.5" fill="#fff" />
          <circle cx="21" cy="26" r="1.7" fill="currentColor" />
          <circle cx="28" cy="26" r="1.7" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

/** 광클대전 썸네일 — 실제 다크 게임 화면 미니어처. */
function GwangclickScene(): ReactNode {
  return (
    <svg viewBox="0 0 300 276" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }} aria-hidden>
      <defs>
        <radialGradient id="gcGlow" cx="50%" cy="0%" r="85%">
          <stop offset="0" stopColor="#12b39a" stopOpacity="0.22" />
          <stop offset="1" stopColor="#0a0b0d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gcMint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3fe0c6" />
          <stop offset="0.46" stopColor="#12b39a" />
          <stop offset="1" stopColor="#0b7a69" />
        </linearGradient>
        <clipPath id="gcGauge">
          <rect x="22" y="54" width="256" height="12" rx="6" />
        </clipPath>
      </defs>
      <rect width="300" height="276" fill="#0a0b0d" />
      <rect width="300" height="276" fill="url(#gcGlow)" />

      {/* 헤더: LIVE · 타이머 */}
      <circle cx="26" cy="28" r="5" fill="#ff3a3a" />
      <text x="38" y="33" fill="#9da3ad" fontFamily={MONO} fontSize="13" fontWeight="700" letterSpacing="2">LIVE</text>
      <text x="278" y="38" textAnchor="end" fill="#f2f3f6" fontFamily={MONO} fontSize="30" fontWeight="900">0:42</text>

      {/* 분할 게이지(민초 vs 반민초) */}
      <rect x="22" y="54" width="256" height="12" rx="6" fill="#191c22" />
      <g clipPath="url(#gcGauge)">
        <rect x="22" y="54" width="150" height="12" fill="#12b39a" />
        <rect x="172" y="54" width="106" height="12" fill="#7b6ef0" />
      </g>
      <text x="22" y="86" fill="#3fe0c6" fontFamily={SANS} fontSize="13" fontWeight="800">민초 58%</text>
      <text x="278" y="86" textAnchor="end" fill="#a99ff7" fontFamily={SANS} fontSize="13" fontWeight="800">반민초 42%</text>

      {/* 글로시 탭 버튼 + 오브 + 라벨 */}
      <rect x="40" y="112" width="220" height="118" rx="22" fill="url(#gcMint)" />
      <rect x="40" y="112" width="220" height="40" rx="22" fill="#ffffff" opacity="0.16" />
      <circle cx="96" cy="171" r="30" fill="#0b6f5f" />
      <circle cx="87" cy="161" r="10" fill="#ffffff" opacity="0.5" />
      <text x="166" y="184" textAnchor="middle" fill="#04130f" fontFamily={SANS} fontSize="34" fontWeight="900" letterSpacing="1">민초!</text>

      {/* 콤보 배지 · 점수 팝 */}
      <rect x="206" y="96" width="50" height="26" rx="8" fill="#ffffff" />
      <text x="231" y="114" textAnchor="middle" fill="#08110d" fontFamily={MONO} fontSize="14" fontWeight="900">×3</text>
      <text x="244" y="146" fill="#ffe27a" fontFamily={SANS} fontSize="17" fontWeight="900">+2</text>
      <text x="70" y="104" fill="#ffffff" fontFamily={SANS} fontSize="14" fontWeight="900" opacity="0.85">+1</text>
    </svg>
  );
}

/** 냉비서 썸네일 — 실제 밝은 앱 화면(냉장고 재고 리스트) 미니어처. */
function NaengbiseoScene(): ReactNode {
  const rows = [
    { tint: "#eaf7ec", dot: "#2fae5f", qtyBg: "#e9f7ee", qty: "#1f9a4f", q: "2개", nameW: 116 },
    { tint: "#fdeeea", dot: "#ff453a", qtyBg: "#ffeceb", qty: "#d23b30", q: "300g", nameW: 92 },
    { tint: "#fdf6e3", dot: "#d9930d", qtyBg: "#fdf3dd", qty: "#b07a09", q: "1팩", nameW: 104 },
  ];
  return (
    <svg viewBox="0 0 300 276" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }} aria-hidden>
      <defs>
        <linearGradient id="nbHead" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34c46b" />
          <stop offset="1" stopColor="#1f9a4f" />
        </linearGradient>
      </defs>
      <rect width="300" height="276" fill="#f2f3f7" />

      {/* 초록 헤더: 브랜드 '냉' + 절약 배지 */}
      <rect x="0" y="0" width="300" height="58" fill="url(#nbHead)" />
      <rect x="18" y="15" width="28" height="28" rx="9" fill="#ffffff" opacity="0.24" />
      <text x="32" y="35" textAnchor="middle" fill="#ffffff" fontFamily={SANS} fontSize="16" fontWeight="800">냉</text>
      <text x="56" y="35" fill="#ffffff" fontFamily={SANS} fontSize="16" fontWeight="800">냉비서</text>
      <rect x="186" y="18" width="62" height="22" rx="11" fill="#ffffff" opacity="0.26" />
      <text x="217" y="33" textAnchor="middle" fill="#ffffff" fontFamily={SANS} fontSize="12" fontWeight="800">₩8,200</text>
      <rect x="254" y="18" width="30" height="22" rx="11" fill="#ffffff" opacity="0.26" />
      <text x="269" y="33" textAnchor="middle" fill="#ffffff" fontFamily={SANS} fontSize="12" fontWeight="800">🅿</text>

      {/* 재고 리스트 카드 */}
      <text x="20" y="82" fill="#17181c" fontFamily={SANS} fontSize="13" fontWeight="800">오늘의 냉장고</text>
      <rect x="16" y="90" width="268" height="120" rx="16" fill="#ffffff" />
      {rows.map((r, i) => {
        const y = 102 + i * 36;
        return (
          <g key={i}>
            <rect x="28" y={y} width="30" height="30" rx="9" fill={r.tint} />
            <circle cx="43" cy={y + 15} r="7" fill={r.dot} />
            <rect x="68" y={y + 6} width={r.nameW} height="9" rx="4.5" fill="#e7e8ee" />
            <rect x="68" y={y + 19} width="62" height="7" rx="3.5" fill="#f0f1f5" />
            <rect x="232" y={y + 7} width="40" height="17" rx="8.5" fill={r.qtyBg} />
            <text x="252" y={y + 19} textAnchor="middle" fill={r.qty} fontFamily={SANS} fontSize="10" fontWeight="800">{r.q}</text>
          </g>
        );
      })}

      {/* 하단 탭바 */}
      <rect x="16" y="222" width="268" height="40" rx="14" fill="#ffffff" />
      <rect x="24" y="229" width="126" height="26" rx="11" fill="#e9f7ee" />
      <text x="87" y="246" textAnchor="middle" fill="#1f9a4f" fontFamily={SANS} fontSize="12.5" fontWeight="800">🧊 냉장고</text>
      <text x="214" y="246" textAnchor="middle" fill="#9aa0ab" fontFamily={SANS} fontSize="12.5" fontWeight="700">🍳 레시피</text>
    </svg>
  );
}

/** 글꾸미 썸네일 — 실제 밝은 앱 화면(멋글씨 변환 리스트) 미니어처. */
function GeulkkumiScene(): ReactNode {
  // 멋글씨 변환 행: 스타일명 + 변환된 샘플(실제 유니코드) + 복사 버튼.
  const rows = [
    { label: "볼드", sample: "𝗛𝗲𝗹𝗹𝗼" },
    { label: "필기체", sample: "𝓗𝓮𝓵𝓵𝓸" },
    { label: "버블", sample: "Ⓗⓔⓛⓛⓞ" },
  ];
  return (
    <svg viewBox="0 0 300 276" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }} aria-hidden>
      <rect width="300" height="276" fill="#fff5fb" />

      {/* 헤더: 브랜드 + 탭(특수문자 / 멋글씨* / 사진) */}
      <text x="18" y="32" fill="#d6286f" fontFamily={SANS} fontSize="17" fontWeight="900">글꾸미 ✨</text>
      <rect x="146" y="18" width="58" height="22" rx="11" fill="#ff5fa2" />
      <text x="175" y="33" textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize="11.5" fontWeight="800">멋글씨</text>
      <text x="218" y="33" fill="#847b90" fontFamily={SANS} fontSize="11.5" fontWeight="700">사진</text>

      {/* 입력창 */}
      <rect x="16" y="48" width="268" height="34" rx="12" fill="#fff" stroke="#f0c8e2" strokeWidth="1.5" />
      <text x="30" y="70" fill="#2a2030" fontFamily={SANS} fontSize="15" fontWeight="700">Hello</text>
      <rect x="74" y="58" width="2" height="15" rx="1" fill="#ff5fa2" />

      {/* 변환 결과 행들 */}
      {rows.map((r, i) => {
        const y = 96 + i * 50;
        return (
          <g key={i}>
            <rect x="16" y={y} width="268" height="42" rx="13" fill="#fff" stroke="#f4e3f0" strokeWidth="1.2" />
            <rect x="28" y={y + 12} width="40" height="18" rx="9" fill="#ffe6f1" />
            <text x="48" y={y + 25} textAnchor="middle" fill="#d6286f" fontFamily={SANS} fontSize="10" fontWeight="800">{r.label}</text>
            <text x="80" y={y + 27} fill="#2a2030" fontFamily={SANS} fontSize="18" fontWeight="700">{r.sample}</text>
            <rect x="232" y={y + 9} width="40" height="24" rx="9" fill="#ff5fa2" />
            <text x="252" y={y + 25} textAnchor="middle" fill="#fff" fontFamily={SANS} fontSize="10.5" fontWeight="800">복사</text>
          </g>
        );
      })}
    </svg>
  );
}

/** 오늘 기분 썸네일 — 실제 크림톤 앱 화면(구름이 마스코트 + 기분 선택 + 오늘의 노래) 미니어처. */
function MoodScene(): ReactNode {
  // 기분 5종(색은 앱 css --mood-* 단일 출처와 동일).
  const moods = [
    { c: "#FFC95C", ko: "행복" },
    { c: "#FF9A8B", ko: "설렘" },
    { c: "#9CC3A6", ko: "평온" },
    { c: "#8AA0C9", ko: "우울" },
    { c: "#E2725B", ko: "화남" },
  ];
  const n = moods.length;
  const cw = 40, gap = 12;
  const startX = (300 - (n * cw + (n - 1) * gap)) / 2;
  return (
    <svg viewBox="0 0 300 276" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }} aria-hidden>
      <defs>
        <radialGradient id="mdHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FF9A8B" stopOpacity="0.34" />
          <stop offset="1" stopColor="#FBF6EE" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="276" fill="#FBF6EE" />
      <circle cx="150" cy="60" r="64" fill="url(#mdHalo)" />

      {/* 마스코트 '구름이' */}
      <g>
        <circle cx="126" cy="64" r="18" fill="#fff" />
        <circle cx="150" cy="52" r="23" fill="#fff" />
        <circle cx="174" cy="64" r="18" fill="#fff" />
        <rect x="118" y="58" width="64" height="20" rx="10" fill="#fff" />
        <circle cx="142" cy="60" r="2.8" fill="#2A2520" />
        <circle cx="160" cy="60" r="2.8" fill="#2A2520" />
        <circle cx="135" cy="68" r="3.4" fill="#FF9A8B" opacity="0.55" />
        <circle cx="167" cy="68" r="3.4" fill="#FF9A8B" opacity="0.55" />
        <path d="M146 66 q5 5 10 0" stroke="#2A2520" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
      <text x="150" y="108" textAnchor="middle" fill="#6B6258" fontFamily={SANS} fontSize="13" fontWeight="700">오늘 기분 어때요?</text>

      {/* 기분 칩 5종 (설렘 선택 상태) */}
      {moods.map((m, i) => {
        const x = startX + i * (cw + gap);
        const on = i === 1;
        return (
          <g key={i}>
            {on && <rect x={x - 4} y={120} width={cw + 8} height={cw + 8} rx="16" fill="none" stroke="#FF6F50" strokeWidth="2.4" />}
            <rect x={x} y={124} width={cw} height={cw} rx="13" fill={m.c} />
            <circle cx={x + 14} cy={140} r="2.4" fill="#fff" />
            <circle cx={x + 26} cy={140} r="2.4" fill="#fff" />
            <path d={`M${x + 13} 148 q7 5 14 0`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
            <text x={x + cw / 2} y={180} textAnchor="middle" fill={on ? "#2A2520" : "#8A8278"} fontFamily={SANS} fontSize="9.5" fontWeight={on ? 800 : 600}>{m.ko}</text>
          </g>
        );
      })}

      {/* 오늘의 노래 카드 */}
      <rect x="16" y="196" width="268" height="64" rx="16" fill="#fff" stroke="#EAE0CE" strokeWidth="1.4" strokeDasharray="5 4" />
      <rect x="28" y="208" width="42" height="42" rx="12" fill="#FFE9C9" />
      <text x="49" y="235" textAnchor="middle" fill="#FF6F50" fontFamily={SANS} fontSize="20" fontWeight="900">♪</text>
      <text x="82" y="218" fill="#8A8278" fontFamily={SANS} fontSize="9.5" fontWeight="700" letterSpacing="1">오늘의 노래</text>
      <text x="82" y="236" fill="#2A2520" fontFamily={SANS} fontSize="14.5" fontWeight="800">라일락</text>
      <text x="125" y="236" fill="#8A8278" fontFamily={SANS} fontSize="11" fontWeight="600">· 아이유</text>
      <circle cx="258" cy="228" r="17" fill="#FF6F50" />
      <path d="M254 221 l9 7 -9 7 z" fill="#fff" />
    </svg>
  );
}

const SCENES: Record<string, () => ReactNode> = {
  gwangclick: GwangclickScene,
  naengbiseo: NaengbiseoScene,
  geulkkumi: GeulkkumiScene,
  mood: MoodScene,
};

/** 허브 캐러셀 카드의 썸네일. 전용 화면 목업이 있으면 그걸, 없으면 이모지 폴백. */
export function AppThumb({
  app,
  locale,
  liveLabel,
}: {
  app: AppEntry;
  locale: Locale;
  liveLabel: string;
}): ReactNode {
  void locale;
  const Scene = SCENES[app.id];
  if (Scene) {
    // 풀블리드 화면 목업 — 패딩 제거, 모서리 라운드는 카드(overflow:hidden)가 처리.
    return (
      <div className={styles.thumb} style={{ padding: 0 }}>
        <Scene />
      </div>
    );
  }
  // 폴백: 색 배경 + 이모지(기존 동작 유지).
  return (
    <div
      className={styles.thumb}
      style={{
        background: app.color ?? "var(--candy-mint)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span className={styles.badge}>{liveLabel}</span>
      <span style={{ fontSize: "3.4rem" }} aria-hidden>
        {app.emoji ?? "🧩"}
      </span>
    </div>
  );
}
