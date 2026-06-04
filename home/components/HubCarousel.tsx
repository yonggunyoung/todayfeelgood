"use client";

import { useRef, type ReactNode } from "react";
import styles from "../app/hub.module.css";

/**
 * 웹앱 카드 가로 캐러셀. 화살표 클릭 + 마우스/터치 드래그로 부드럽게 슬라이드.
 * 카드 마크업(children)은 서버에서 렌더해 넘긴다(접근성·SEO 유지).
 */
export function HubCarousel({
  title,
  sub,
  prevLabel,
  nextLabel,
  children,
}: {
  title: string;
  sub: string;
  prevLabel: string;
  nextLabel: string;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, sx: 0, sl: 0, moved: false });

  function step() {
    const el = trackRef.current;
    if (!el) return 300;
    const card = el.querySelector<HTMLElement>("[data-card]");
    return card ? card.offsetWidth + 20 : 300;
  }
  function scroll(dir: number) {
    trackRef.current?.scrollBy({ left: dir * step(), behavior: "smooth" });
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el) return;
    drag.current = { down: true, sx: e.pageX, sl: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d.down || !trackRef.current) return;
    const dx = e.pageX - d.sx;
    if (Math.abs(dx) > 4) d.moved = true;
    trackRef.current.scrollLeft = d.sl - dx;
  }
  function onUp() {
    drag.current.down = false;
  }
  // 드래그였으면 카드 클릭(이동)을 막는다.
  function onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <>
      <div className={styles.sechead}>
        <div>
          <h2 className={styles.secTitle}>{title}</h2>
          <div className={styles.secSub}>{sub}</div>
        </div>
        <div className={styles.arrows}>
          <button type="button" className={styles.arrow} onClick={() => scroll(-1)} aria-label={prevLabel}>
            ‹
          </button>
          <button type="button" className={styles.arrow} onClick={() => scroll(1)} aria-label={nextLabel}>
            ›
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        className={styles.track}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </>
  );
}
