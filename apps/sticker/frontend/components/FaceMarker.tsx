"use client";

import { useRef } from "react";
import type { FaceAnchor } from "../lib/render";
import styles from "./FaceMarker.module.css";

type Key = "eyeL" | "eyeR" | "mouth";
const LABELS: Record<Key, string> = { eyeL: "왼눈", eyeR: "오눈", mouth: "입" };
const KEYS: Key[] = ["eyeL", "eyeR", "mouth"];

/**
 * 얼굴 위치 마커 — 잘라낸 내 그림 위에 눈·입 점을 끌어 위치를 지정한다.
 * 좌표는 본체(content box) 기준 정규화(0~1)로 onChange에 전달 → 렌더가 그 자리에 표정을 그린다.
 */
export default function FaceMarker({
  src,
  aspect,
  anchor,
  onChange,
}: {
  src: string;
  aspect: number;
  anchor: FaceAnchor;
  onChange: (a: FaceAnchor) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const active = useRef<Key | null>(null);

  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  function moveActive(e: React.PointerEvent) {
    const k = active.current;
    if (!k || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    onChange({
      ...anchor,
      [k]: { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) },
    });
  }
  function onDown(k: Key) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      active.current = k;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    };
  }
  function onUp() {
    active.current = null;
  }

  return (
    <div className={styles.wrap}>
      <div
        ref={boxRef}
        className={styles.stage}
        style={{ aspectRatio: String(aspect) }}
        onPointerMove={moveActive}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.img} src={src} alt="내 그림 미리보기" draggable={false} />
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={`${styles.handle} ${k === "mouth" ? styles.h_mouth : ""}`}
            style={{ left: `${anchor[k].x * 100}%`, top: `${anchor[k].y * 100}%` }}
            onPointerDown={onDown(k)}
            aria-label={`${LABELS[k]} 위치`}
          >
            <span className={styles.dot} />
            <span className={styles.tag}>{LABELS[k]}</span>
          </button>
        ))}
      </div>
      <p className={styles.hint}>눈·입을 자동으로 잡았어요. 안 맞으면 점을 끌어 맞춰요 — 표정이 그 자리에 그려져요.</p>
    </div>
  );
}
