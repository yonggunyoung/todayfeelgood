"use client";

import { useEffect, useRef } from "react";
import styles from "./AdSlot.module.css";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface Props {
  /** 애드센스 광고 단위 슬롯 ID(콘솔에서 발급, 숫자). 없으면 NEXT_PUBLIC_ADSENSE_SLOT 사용. */
  slot?: string;
  /** 광고 포맷. 기본 "auto"(반응형). */
  format?: string;
  className?: string;
}

/**
 * 애드센스 광고 단위(반응형) — **웹 전용**, 환경변수 기반.
 *
 * client(ca-pub-XXXX) + slot(숫자) 둘 다 있어야 렌더한다.
 *   - 미설정(기본)·승인 전·토스 미니앱 빌드에선 아무것도 그리지 않는다(정책: 외부 광고망 금지).
 *   - 로더 스크립트는 SiteScripts가 <body>에 한 번 넣고, 여기선 단위만 push 한다.
 *   - 그리기/스튜디오 같은 작업 화면엔 두지 않는다(UX). 랜딩·콘텐츠·푸터 부근에만.
 *
 * [비용·정책] 외부 서비스. 식별자는 공개값(ca-pub/slot)이라 노출돼도 안전.
 */
export function AdSlot({ slot, format = "auto", className }: Props) {
  const client = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "").trim();
  const slotId = (slot || process.env.NEXT_PUBLIC_ADSENSE_SLOT || "").trim();
  // 형식 가드 — 잘못된 값으로 빈 광고 박스가 뜨는 것 방지.
  const ready = /^ca-pub-\d+$/.test(client) && /^\d+$/.test(slotId);
  const pushed = useRef(false);

  useEffect(() => {
    if (!ready || pushed.current) return;
    pushed.current = true; // 단위당 한 번만 push(중복 시 애드센스 오류)
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* 로더 미로드/광고차단 환경은 조용히 무시 */
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default AdSlot;
