# -*- coding: utf-8 -*-
"""
Font Engine API (FastAPI) — Phase 1 전통(비AI) 방식. 계약 v2.

[비용 가드] 이 서비스의 모든 경로(/generate, /health)는 로컬 fontTools 연산과
공개 폰트 미러 다운로드(앱 시작 시 1회)만 사용한다. 외부 유료 API(LLM/이미지
생성 등) 호출이 전혀 없으며, 운영 비용은 0이다.

엔드포인트:
  - POST /generate : GenerateRequest -> GenerateResponse(JSON, 계약 v2)
  - GET  /health   : { status, font_loaded }

보안/견고성(review·security 보고서 반영):
  - 폰트는 startup(lifespan)에서 1회 로드/캐시. /generate는 다운로드 블로킹 없음.
  - 입력 검증(pydantic 범위 제약) + 서버 clamp(방어적) + NaN/Inf 거부.
  - imagePng 크기 상한(MAX_IMAGE_PNG_BYTES) 초과 시 413.
  - CORS 화이트리스트(ALLOWED_ORIGINS 환경변수).
  - CPU 집약 생성은 스레드풀(run_in_executor) + Semaphore로 동시성 제한.
  - 에러 살균: 내부 예외/경로/스택을 클라이언트에 노출하지 않음.
"""
from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

import font_loader
import generator

logger = logging.getLogger("font_engine")

# imagePng 업로드 상한(바이트). packages/core MAX_IMAGE_PNG_BYTES(2MB)와 동일.
MAX_IMAGE_PNG_BYTES = 2_000_000

# 동시 생성 수 제한(무료 티어 CPU/메모리 보호). 포화 시 503.
MAX_CONCURRENT_GENERATES = 3
_generate_semaphore = asyncio.Semaphore(MAX_CONCURRENT_GENERATES)


def _allowed_origins() -> list[str]:
    """ALLOWED_ORIGINS(쉼표구분) 환경변수 화이트리스트. 와일드카드 미사용."""
    raw = os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3001",
    )
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서비스 기동 시 폰트를 한 번 받아 캐시(실패해도 서비스는 뜬다 → /health=false).
    # 블로킹 다운로드는 startup에서만 발생. 요청 경로에서는 절대 다운로드하지 않는다.
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, font_loader.ensure_font)
    except Exception:
        logger.exception("startup: 기본 폰트 로드 중 예외")
    yield


app = FastAPI(title="Font Engine", version="2.0.0", lifespan=lifespan)

# CORS: 와일드카드 금지(security H2). 환경변수 화이트리스트 + 최소 메서드/헤더.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ---- 계약(packages/core) v2와 동일한 스키마 ----
class FontParamsModel(BaseModel):
    # pydantic 범위 제약(범위 밖이면 422). 서버 clamp는 generator에서 한 번 더(방어적).
    weight: float = Field(default=400, ge=100, le=900)
    slant: float = Field(default=0, ge=-15, le=0)
    curvature: float = Field(default=0, ge=0, le=1)

    @field_validator("weight", "slant", "curvature")
    @classmethod
    def _finite(cls, v: float) -> float:
        import math

        if not math.isfinite(v):  # NaN/Infinity 거부
            raise ValueError("값은 유한한 숫자여야 합니다.")
        return v


class GenerateRequest(BaseModel):
    params: FontParamsModel
    # 출력 포맷(기본 woff). 잘못된 값이면 pydantic이 422.
    format: Literal["woff", "ttf"] = "woff"
    # 선택: Phase 1에서는 무시. 크기 가드는 둔다(엔드포인트에서 413).
    imagePng: Optional[str] = None


class GenerateResponse(BaseModel):
    fontBase64: str
    format: Literal["woff", "ttf"]
    fontFamily: str
    generatedBy: Literal["traditional"]
    appliedParams: FontParamsModel


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    """에러 살균: 내부 예외/스택/경로를 노출하지 않고 일반 메시지만 반환(security M2)."""
    logger.exception("unhandled error at %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "내부 오류가 발생했습니다."},
    )


@app.get("/health")
def health() -> dict:
    # 전체 파일 read 금지: startup이 채운 캐시 상태(boolean)만 반환.
    return {"status": "ok", "font_loaded": font_loader.font_is_available()}


def _generate_blocking(req: GenerateRequest):
    """스레드풀에서 실행되는 CPU 집약 생성(이벤트루프 비블로킹)."""
    p = req.params
    return generator.generate_font_base64(
        font_loader.FONT_PATH.as_posix(),
        weight=p.weight,
        slant=p.slant,
        curvature=p.curvature,
        fmt=req.format,
        image_png=req.imagePng,  # Phase 1 미사용
    )


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    # 폰트가 startup에서 로드 안 됐으면 즉시 503(빠른 실패, 요청 경로 다운로드 금지).
    if not font_loader.font_is_available():
        raise HTTPException(
            status_code=503,
            detail="폰트 엔진이 아직 준비되지 않았습니다. 잠시 후 다시 시도하세요.",
        )

    # imagePng 크기 가드(security H1). Phase1 미사용이어도 페이로드 폭주 차단.
    if req.imagePng is not None and len(req.imagePng) > MAX_IMAGE_PNG_BYTES:
        raise HTTPException(
            status_code=413,
            detail="이미지 데이터가 허용 크기를 초과했습니다.",
        )

    # 동시성 제한: 포화 시 즉시 503(저비용 DoS 방어).
    if _generate_semaphore.locked():
        raise HTTPException(
            status_code=503,
            detail="요청이 많아 일시적으로 처리할 수 없습니다. 잠시 후 다시 시도하세요.",
        )

    async with _generate_semaphore:
        loop = asyncio.get_running_loop()
        try:
            b64, family, applied, out_format = await loop.run_in_executor(
                None, _generate_blocking, req
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("폰트 생성 실패")
            raise HTTPException(status_code=500, detail="폰트 생성에 실패했습니다.")

    return GenerateResponse(
        fontBase64=b64,
        format=out_format,
        fontFamily=family,
        generatedBy="traditional",
        appliedParams=FontParamsModel(
            weight=applied.weight,
            slant=applied.slant,
            curvature=applied.curvature,
        ),
    )
