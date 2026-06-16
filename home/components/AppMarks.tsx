import type { ReactNode } from "react";
import type { Locale } from "../lib/i18n";
import type { AppEntry } from "../lib/appsRegistry";
import styles from "../app/hub.module.css";

/**
 * 레지스트리 미니앱(apps.json)의 카드 비주얼.
 * 썸네일은 "실제 앱 화면을 미니어처로" 그린 SVG 목업 — 각 앱의 진짜 UI/색/특징을 반영한다.
 *  - 광클대전: 실제 다크 게임 화면(민초 #12b39a / 반민초 #7b6ef0, 타이머·게이지·글로시 탭버튼).
 *  - 냉비서  : 실제 밝은 앱 화면(초록 #2fae5f 헤더·냉장고 재고 리스트·하단 탭).
 * 새 앱은 AppMark(아이콘) + SCENES(썸네일) 두 곳에 항목만 추가하면 된다.
 * (설정이 없는 앱은 이모지 폴백 — 깨지지 않음.)
 */

const SANS = "Pretendard, -apple-system, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** 전용 비주얼이 있는 앱인지 — 타일/썸네일 분기에 사용. */
export function hasAppMark(id: string): boolean {
  return id === "naengbiseo" || id === "gwangclick";
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

const SCENES: Record<string, () => ReactNode> = {
  gwangclick: GwangclickScene,
  naengbiseo: NaengbiseoScene,
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
