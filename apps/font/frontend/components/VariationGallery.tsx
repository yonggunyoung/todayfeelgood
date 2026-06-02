"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampParams,
  PARAM_RANGES,
  type FontParams,
  type FontScript,
  type GenerateRequest,
  type GenerateResponse,
} from "@webapp/core";
import { Button } from "@webapp/ui";
import { apiPath } from "../lib/paths";
import styles from "./VariationGallery.module.css";

interface Props {
  base: FontParams;
  script: FontScript;
  onPick: (params: FontParams) => void;
  disabled?: boolean;
}

interface Variant {
  params: FontParams;
  fontBase64: string | null;
  family: string | null;
  status: "pending" | "ready" | "error";
}

// 동시 요청 throttle — 오라클 무료 티어/엔진 부담 의식.
// 라틴은 3개씩, 한글은 1개로 직렬화(엔진 한글 세마포어 MAX_CONCURRENT_HANGUL=1과 일치 → 자기 충돌 503 방지).
const CONCURRENCY_LATIN = 3;
const CONCURRENCY_HANGUL = 1;
// 503(엔진 동시성 한도) 시 백오프 후 재시도 횟수/지연.
const MAX_RETRIES = 2;
const BACKOFF_MS = 450;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 시드 기반 결정적 의사난수(0~1). 갤러리 재현성 확보. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904569) >>> 0;
    return s / 0xffffffff;
  };
}

function clampRange(v: number, key: keyof FontParams) {
  const r = PARAM_RANGES[key];
  return Math.min(r.max, Math.max(r.min, v));
}

/**
 * 현재 설정을 중심으로 9가지 변형 params를 만든다.
 * 첫 칸은 원본 그대로, 나머지 8칸은 seed + 굵기/기울기/곡률/구불구불을 흩뿌린다.
 * (자동 아님 — 버튼 트리거로만 생성)
 */
function buildVariants(base: FontParams): FontParams[] {
  const out: FontParams[] = [clampParams(base)];
  const rand = rng((base.seed || 1) * 2654435761);
  for (let i = 1; i < 9; i++) {
    const jitter = (amt: number) => (rand() * 2 - 1) * amt;
    out.push(
      clampParams({
        ...base,
        seed: Math.floor(rand() * PARAM_RANGES.seed.max),
        weight: Math.round(clampRange(base.weight + jitter(180), "weight")),
        slant: Math.round(clampRange(base.slant + jitter(8), "slant")),
        curvature: clampRange(base.curvature + jitter(0.35), "curvature"),
        waviness: clampRange(base.waviness + jitter(0.3), "waviness"),
        weirdness: Math.round(clampRange(base.weirdness + jitter(35), "weirdness")),
      })
    );
  }
  return out;
}

/** 변주 갤러리 — 3×3 라이브 프리뷰. 칸을 누르면 그 설정을 스튜디오에 적용. */
export default function VariationGallery({ base, script, onPick, disabled }: Props) {
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const seqRef = useRef(0);
  // 등록한 FontFace들을 정리하기 위한 참조
  const facesRef = useRef<FontFace[]>([]);

  const cleanupFaces = useCallback(() => {
    for (const f of facesRef.current) {
      try {
        (document.fonts as FontFaceSet).delete(f);
      } catch {
        /* noop */
      }
    }
    facesRef.current = [];
  }, []);

  useEffect(() => cleanupFaces, [cleanupFaces]);

  const b64ToBuf = (b64: string) => {
    const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  };

  const generate = useCallback(async () => {
    const myseq = ++seqRef.current;
    cleanupFaces();
    setGenerating(true);
    const built = buildVariants(base);
    setVariants(built.map((p) => ({ params: p, fontBase64: null, family: null, status: "pending" })));

    // throttle: 한글은 1개(직렬), 라틴은 3개씩 처리
    const concurrency = script === "hangul" ? CONCURRENCY_HANGUL : CONCURRENCY_LATIN;
    const indices = built.map((_, i) => i);
    let cursor = 0;

    // 한 칸을 굽는다. 엔진 동시성 한도(503)면 백오프 후 재시도해 "—" 깨짐을 줄인다.
    const bake = async (i: number) => {
      const payload: GenerateRequest = {
        params: built[i]!,
        script,
        format: "woff",
      };
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (myseq !== seqRef.current) return; // 새 요청이 시작됨 → 중단
        const res = await fetch(apiPath("/api/generate"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (myseq !== seqRef.current) return;
        if (res.ok) {
          const data = (await res.json()) as GenerateResponse;
          const family = `vary-${myseq}-${i}`;
          const face = new FontFace(family, b64ToBuf(data.fontBase64));
          const loaded = await face.load();
          if (myseq !== seqRef.current) return;
          // add 직후 즉시 추적(early-return 누수 방지)
          (document.fonts as FontFaceSet).add(loaded);
          facesRef.current.push(loaded);
          setVariants((prev) => {
            if (!prev) return prev;
            const copy = [...prev];
            copy[i] = { ...copy[i]!, fontBase64: data.fontBase64, family, status: "ready" };
            return copy;
          });
          return;
        }
        // 503/504(동시성·일시 과부하)면 백오프 후 재시도, 그 외/재시도 소진은 에러
        const retriable = res.status === 503 || res.status === 504;
        if (retriable && attempt < MAX_RETRIES) {
          await sleep(BACKOFF_MS * (attempt + 1));
          continue;
        }
        throw new Error(String(res.status));
      }
    };

    const worker = async () => {
      while (cursor < indices.length) {
        const i = indices[cursor++]!;
        try {
          await bake(i);
        } catch {
          if (myseq !== seqRef.current) return;
          setVariants((prev) => {
            if (!prev) return prev;
            const copy = [...prev];
            copy[i] = { ...copy[i]!, status: "error" };
            return copy;
          });
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    if (myseq === seqRef.current) setGenerating(false);
  }, [base, script, cleanupFaces]);

  // 자동 1회 생성 — 갤러리가 처음 화면에 나타나면(아코디언 열림/마운트) 바로 9종을 굽는다.
  // 첫인상 강화(W3). 이후엔 "다시 뽑기" 버튼으로만 재생성(슬라이더마다 재생성 방지).
  // generate를 의존성에 넣으면 base 변경마다 재실행되므로 ref로 1회만 고정한다.
  const didAuto = useRef(false);
  const generateRef = useRef(generate);
  generateRef.current = generate;
  useEffect(() => {
    if (didAuto.current) return;
    didAuto.current = true;
    void generateRef.current();
  }, []);

  // script 전환 시엔 새로 굽는다(라틴↔한글 견본/직렬화 정책이 다름).
  const lastScript = useRef(script);
  useEffect(() => {
    if (lastScript.current === script) return;
    lastScript.current = script;
    if (didAuto.current) void generateRef.current();
  }, [script]);

  const sample = script === "hangul" ? "가나" : "Aa";

  // 자동 생성 직전(variants 아직 null)에도 빈 칸 9개 스켈레톤을 보여 레이아웃을 잡는다.
  const placeholder = useMemo(
    () => Array.from({ length: 9 }, () => null),
    []
  );

  return (
    <div className={styles.wrap}>
      <Button
        variant="soft"
        onClick={generate}
        disabled={disabled || generating}
        className={styles.trigger}
      >
        {generating ? "변형 굽는 중…" : variants ? "다시 9가지 뽑기" : "9가지 변형 뽑는 중…"}
      </Button>

      {/* 첫 자동 생성 전: 스켈레톤 9칸(레이아웃 안정 + 로딩 신호) */}
      {!variants && (
        <div className={styles.grid} aria-hidden>
          {placeholder.map((_, i) => (
            <span key={i} className={`${styles.cell} ${styles.skeleton}`} />
          ))}
        </div>
      )}

      {variants && (
        <div className={styles.grid} role="list" aria-label="글자체 변형 9종">
          {variants.map((v, i) => {
            const ready = v.status === "ready" && v.family;
            const pending = v.status === "pending";
            return (
              <button
                key={i}
                type="button"
                role="listitem"
                className={`${styles.cell} ${pending ? styles.skeleton : ""}`}
                disabled={!ready || disabled}
                onClick={() => onPick(v.params)}
                aria-label={`변형 ${i + 1}${i === 0 ? " (지금 설정)" : ""} 적용`}
                title={i === 0 ? "지금 설정" : `변형 ${i + 1} 적용`}
              >
                <span
                  className={styles.glyph}
                  style={ready ? { fontFamily: `"${v.family}", system-ui` } : undefined}
                  aria-hidden
                >
                  {v.status === "error" ? "—" : sample}
                </span>
                {i === 0 && <span className={styles.badge}>지금</span>}
              </button>
            );
          })}
        </div>
      )}
      <p className={styles.hint}>
        마음에 드는 칸을 누르면 그 설정으로 바꿔 드려요. 모두 진짜 폰트로 적용돼요.
      </p>
    </div>
  );
}
