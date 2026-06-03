"use client";

import { useCallback, useState } from "react";
import { Button } from "@webapp/ui";
import { apiPath } from "../lib/paths";
import {
  SHARE_MAX_CODE_LEN,
  encodeShare,
  type SharePayload,
} from "../lib/shareCodec";
import styles from "./ShareButton.module.css";

interface Props {
  /** 현재 상태로 공유 페이로드를 만든다(렌더 가능한 글자/자모만 담아 보낼 것). */
  buildPayload: () => SharePayload | null;
  /** 비활성(폰트 미생성/문구 없음 등). */
  disabled?: boolean;
}

type State =
  | { kind: "idle" }
  | { kind: "ok" }
  | { kind: "toobig" }
  | { kind: "error" };

/**
 * "공유 링크 복사" 버튼.
 * 현재 상태 → encodeShare → `/font/s?d=<코드>` URL을 클립보드 복사 + 토스트.
 * 코드가 너무 크면(>SHARE_MAX_CODE_LEN) "문구/글자 수를 줄이세요"로 정직하게 안내한다(저장소 0).
 */
export default function ShareButton({ buildPayload, disabled }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const onClick = useCallback(async () => {
    setState({ kind: "idle" });
    const payload = buildPayload();
    if (!payload || payload.glyphs.length === 0 || !payload.text.trim()) {
      setState({ kind: "error" });
      return;
    }
    try {
      const code = await encodeShare(payload);
      if (!code) {
        setState({ kind: "toobig" });
        return;
      }
      // basePath(/font)는 apiPath로, 절대 URL은 현재 origin과 합쳐 만든다.
      const path = apiPath(`/s?d=${code}`);
      const url =
        typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          copied = true;
        }
      } catch {
        copied = false;
      }
      if (!copied) {
        // 클립보드 권한 거부 시 폴백: textarea + execCommand.
        try {
          const ta = document.createElement("textarea");
          ta.value = url;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          copied = document.execCommand("copy");
          ta.remove();
        } catch {
          copied = false;
        }
      }
      setState({ kind: copied ? "ok" : "error" });
      if (copied) window.setTimeout(() => setState({ kind: "idle" }), 3000);
    } catch {
      setState({ kind: "error" });
    }
  }, [buildPayload]);

  return (
    <div className={styles.wrap}>
      <Button
        variant="ghost"
        onClick={onClick}
        disabled={disabled}
        className={styles.btn}
      >
        공유 링크 복사
      </Button>
      {state.kind === "ok" && (
        <span className={styles.ok} role="status" aria-live="polite">
          링크 복사됐다 너굴.
        </span>
      )}
      {state.kind === "toobig" && (
        <span className={styles.warn} role="alert">
          문구가 너무 길어요. 문구를 줄이거나 글자 수를 줄여 주세요.
        </span>
      )}
      {state.kind === "error" && (
        <span className={styles.warn} role="alert">
          복사하지 못했어요. 다시 시도해 주세요.
        </span>
      )}
      <span className={styles.note}>
        링크 하나로 공유 — 받는 사람은 설치 없이 바로 봐요. (URL 한도 {Math.round(SHARE_MAX_CODE_LEN / 1000)}KB)
      </span>
    </div>
  );
}
