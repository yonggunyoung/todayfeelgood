"use client";

import { useEffect, useRef, useState } from "react";
import { PARAM_RANGES } from "@webapp/core";
import { Slider } from "@webapp/ui";
import styles from "./InteractiveSpecimen.module.css";

/**
 * 히어로용 대형 인터랙티브 스페시먼.
 * 엔진 없이도 동작하도록, 시스템 가변폰트 축(font-weight / font-style oblique)을
 * 라이브로 조정해 "살아있는 글자"를 즉시 보여 준다. (실 폰트 생성은 /font 스튜디오)
 */
const SAMPLE = "Hwoek";

export default function InteractiveSpecimen() {
  const [weight, setWeight] = useState(620);
  const [slant, setSlant] = useState(-4);
  const draggingRef = useRef(false);

  // 입장 직후 살짝 호흡하듯 굵기를 한 번 흔들어 "살아있음"을 암시
  useEffect(() => {
    const t = setTimeout(() => {
      if (!draggingRef.current) setWeight(720);
    }, 600);
    const t2 = setTimeout(() => {
      if (!draggingRef.current) setWeight(540);
    }, 1300);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  const style = {
    fontWeight: weight,
    transform: `skewX(${slant}deg)`,
  } as const;

  return (
    <div className={styles.wrap}>
      <div className={styles.stage} aria-hidden>
        <span className={styles.glyphLine} style={style}>
          {SAMPLE}
        </span>
        <span className={styles.glyphLine2} style={style}>
          가나다 ABG 0 1 2
        </span>
      </div>

      <div className={`sans ${styles.controls}`}>
        <Slider
          label="굵기"
          display={String(weight)}
          value={weight}
          min={PARAM_RANGES.weight.min}
          max={PARAM_RANGES.weight.max}
          step={PARAM_RANGES.weight.step}
          onValueChange={(v) => {
            draggingRef.current = true;
            setWeight(v);
          }}
        />
        <Slider
          label="기울기"
          display={`${slant}°`}
          value={slant}
          min={PARAM_RANGES.slant.min}
          max={PARAM_RANGES.slant.max}
          step={PARAM_RANGES.slant.step}
          onValueChange={(v) => {
            draggingRef.current = true;
            setSlant(v);
          }}
        />
      </div>
    </div>
  );
}
