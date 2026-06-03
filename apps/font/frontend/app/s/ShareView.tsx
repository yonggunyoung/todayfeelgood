"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Mascot, sanitizeColor } from "@webapp/ui";
import {
  type HandwritingResponse,
  type HangulComposeRequest,
  type HandwritingRequest,
} from "@webapp/core";
import { apiPath } from "../../lib/paths";
import { decodeShare, type SharePayload } from "../../lib/shareCodec";
import { renderShareCanvas } from "../../lib/shareRender";
import { SIZE_PRESETS, type Align, type BgKind } from "../../lib/imageTemplates";
import styles from "./share.module.css";

interface Props {
  /** URL의 ?d= 코드. 클라이언트에서 디코드 → 폰트 요청 → 렌더. */
  code: string;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

type Status = "decoding" | "loading" | "ready" | "error";

/**
 * 공유 뷰(클라이언트). 받은 사람은 **설치 없이** 결과를 보고 이미지 저장/리믹스한다.
 * 흐름: ?d= 디코드 → BFF(handwriting | hangul-compose)로 폰트 → @font-face 등록 →
 *      이미지 패널과 동일 렌더러(renderShareCanvas)로 문구 렌더 → PNG 저장 / 리믹스 CTA.
 * 설치 안내 일절 없음. "내 손글씨로 만든 이미지" 라벨.
 */
export default function ShareView({ code }: Props) {
  const [status, setStatus] = useState<Status>("decoding");
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [fontFamily, setFontFamily] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const seqRef = useRef(0);

  // 1) 디코드 → 폰트 요청 → FontFace 등록.
  useEffect(() => {
    let cancelled = false;
    let registered: FontFace | null = null;

    (async () => {
      let decoded: SharePayload;
      try {
        decoded = await decodeShare(code);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg("링크를 읽지 못했어요. 링크가 손상됐을 수 있어요.");
        }
        return;
      }
      if (cancelled) return;
      if (decoded.glyphs.length === 0 || !decoded.text.trim()) {
        setStatus("error");
        setErrorMsg("공유된 글씨 정보가 비어 있어요.");
        return;
      }
      setPayload(decoded);
      setStatus("loading");

      // BFF로 폰트 요청(script에 따라 엔드포인트 분기).
      try {
        const endpoint =
          decoded.script === "hangul" ? "/api/hangul-compose" : "/api/handwriting";
        const body =
          decoded.script === "hangul"
            ? ({
                jamo: decoded.glyphs,
                text: decoded.text,
                refine: decoded.refine,
                format: "woff",
              } satisfies HangulComposeRequest)
            : ({
                glyphs: decoded.glyphs,
                refine: decoded.refine,
                format: "woff",
              } satisfies HandwritingRequest);

        const res = await fetch(apiPath(endpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
        const data = (await res.json()) as HandwritingResponse;
        if (cancelled) return;

        const family = `ShareView-${++seqRef.current}`;
        const face = new FontFace(family, base64ToArrayBuffer(data.fontBase64));
        const loaded = await face.load();
        if (cancelled) return;
        (document.fonts as FontFaceSet).add(loaded);
        registered = loaded;
        setFontFamily(family);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg("글씨를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (registered) {
        try {
          (document.fonts as FontFaceSet).delete(registered);
        } catch {
          /* noop */
        }
      }
    };
  }, [code]);

  const safe = useMemo(() => {
    if (!payload) return null;
    return {
      ink: sanitizeColor(payload.style.ink, "#2b2a33"),
      bgColor: sanitizeColor(payload.style.bgColor, "#fef3e2"),
      accent: sanitizeColor(payload.style.accent, "#ffd66b"),
    };
  }, [payload]);

  // 2) 폰트 준비되면 캔버스 렌더(이미지 패널과 동일 규칙).
  useEffect(() => {
    if (status !== "ready" || !payload || !fontFamily || !safe) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderShareCanvas(canvas, {
      text: payload.text,
      fontFamily,
      sizeId: payload.style.size,
      templateId: payload.style.template,
      bg: (payload.style.bg as BgKind) ?? "transparent",
      align: (payload.style.align as Align) ?? "center",
      ink: safe.ink,
      bgColor: safe.bgColor,
      accent: safe.accent,
    });
  }, [status, payload, fontFamily, safe]);

  const handleSavePng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    const size = SIZE_PRESETS.find((s) => s.id === payload?.style.size) ?? SIZE_PRESETS[0]!;
    a.download = `handwriting-${size.width}x${size.height}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const transparentBg = payload?.style.bg === "transparent";

  return (
    <main className={`container ${styles.wrap}`}>
      <header className={styles.head}>
        <h1 className={`display ${styles.title}`}>받은 손글씨</h1>
        <p className={styles.sub}>
          누군가 자기 손글씨로 만든 문구예요. 설치 없이 바로 보고, 이미지로 저장하거나
          나도 내 글씨로 만들어 볼 수 있어요.
        </p>
      </header>

      <div className={`${styles.stage} ${transparentBg ? styles.checker : ""}`}>
        {status === "ready" ? (
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            role="img"
            aria-label={`손글씨 이미지: ${payload?.text ?? ""}`}
          />
        ) : (
          <div className={styles.stageEmpty}>
            <Mascot mood={status === "error" ? "sleepy" : "focused"} size={72} />
            <p>
              {status === "error"
                ? errorMsg
                : status === "loading"
                  ? "손글씨를 불러오는 중… 너굴."
                  : "링크를 읽는 중…"}
            </p>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Button
          variant="clay"
          onClick={handleSavePng}
          disabled={status !== "ready"}
          className={styles.action}
        >
          이미지 저장 (PNG){transparentBg ? " · 투명" : ""}
        </Button>
        {/* 리믹스 CTA — basePath(/font) 아래 스튜디오로. apiPath로 경로 prefix. */}
        <a className={styles.remix} href={apiPath("/studio")}>
          나도 내 글씨로 만들기
        </a>
      </div>

      <p className={styles.honesty}>
        <Mascot mood="happy" size={18} still label="" />
        직접 그린 손글씨로 만든 이미지예요. 색지결 등은 이미지 전용 효과예요.
      </p>
    </main>
  );
}
