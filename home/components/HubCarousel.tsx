"use client";

import { useRef, type ReactNode } from "react";
import styles from "../app/hub.module.css";

/**
 * 웹앱 카드 가로 캐러셀.
 * - 화살표: 부드럽게 한 칸 스크롤.
 * - 마우스 드래그: 끌다 놓으면 ★관성(momentum)★으로 미끄러진다.
 * - 포인터 캡처를 쓰지 않아 카드(<a>) 클릭이 정상 동작(드래그한 경우에만 클릭 차단).
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
  const track = useRef<HTMLDivElement>(null);
  const st = useRef({ down: false, moved: false, startX: 0, startLeft: 0, lastX: 0, lastT: 0, v: 0, raf: 0 });

  function step() {
    const el = track.current;
    if (!el) return 320;
    const c = el.querySelector<HTMLElement>("[data-card]");
    return c ? c.offsetWidth + 20 : 320;
  }
  function scrollByDir(dir: number) {
    cancelAnimationFrame(st.current.raf);
    track.current?.scrollBy({ left: dir * step(), behavior: "smooth" });
  }

  function glide() {
    const el = track.current;
    const s = st.current;
    if (!el) return;
    el.scrollLeft -= s.v * 16; // v: px/ms (오른쪽으로 끌면 왼쪽으로 스크롤)
    s.v *= 0.94; // 감쇠
    if (Math.abs(s.v) > 0.02) {
      s.raf = requestAnimationFrame(glide);
    }
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    // 모바일(터치)은 브라우저 네이티브 관성 스크롤이 가장 부드러움 → 커스텀 드래그 미개입.
    if (e.pointerType === "touch") return;
    const el = track.current;
    if (!el) return;
    cancelAnimationFrame(st.current.raf);
    const s = st.current;
    s.down = true;
    s.moved = false;
    s.startX = e.clientX;
    s.startLeft = el.scrollLeft;
    s.lastX = e.clientX;
    s.lastT = performance.now();
    s.v = 0;
  }
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = st.current;
    const el = track.current;
    if (!s.down || !el) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    el.scrollLeft = s.startLeft - dx;
    const now = performance.now();
    const dt = now - s.lastT || 16;
    s.v = (e.clientX - s.lastX) / dt;
    s.lastX = e.clientX;
    s.lastT = now;
  }
  function endDrag() {
    const s = st.current;
    if (!s.down) return;
    s.down = false;
    if (Math.abs(s.v) > 0.04) s.raf = requestAnimationFrame(glide); // 관성 시작
  }
  // 실제로 끌었을 때만 카드 클릭(이동)을 막는다. 그냥 클릭은 통과 → 웹앱으로 이동.
  function onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (st.current.moved) {
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
          <button type="button" className={styles.arrow} onClick={() => scrollByDir(-1)} aria-label={prevLabel}>
            ‹
          </button>
          <button type="button" className={styles.arrow} onClick={() => scrollByDir(1)} aria-label={nextLabel}>
            ›
          </button>
        </div>
      </div>
      <div
        ref={track}
        className={styles.track}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </>
  );
}
