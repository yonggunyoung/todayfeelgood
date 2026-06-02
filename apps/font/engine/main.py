# -*- coding: utf-8 -*-
"""
Font Engine API (FastAPI) — Phase 1 전통(비AI) 방식.

[비용 가드] 이 서비스의 모든 경로(/generate, /health)는 로컬 fontTools 연산과
공개 폰트 미러 다운로드만 사용한다. 외부 유료 API(LLM/이미지 생성 등) 호출이
전혀 없으며, 운영 비용은 0이다.

엔드포인트:
  - POST /generate : GenerateRequest -> GenerateResponse(JSON)
  - GET  /health   : { status, font_loaded }
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Literal

import font_loader
import generator

app = FastAPI(title="Font Engine", version="1.0.0")

# 개발용 CORS: 프론트(localhost) 허용. 운영 시엔 도메인 제한 권장.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- 계약(packages/core)과 동일한 스키마 ----
class FontParamsModel(BaseModel):
    weight: float = Field(default=400)
    slant: float = Field(default=0)
    curvature: float = Field(default=0)


class GenerateRequest(BaseModel):
    params: FontParamsModel
    imagePng: Optional[str] = None  # 선택: Phase 1에서는 무시(향후 확장).


class GenerateResponse(BaseModel):
    fontWoffBase64: str
    fontFamily: str
    generatedBy: Literal["traditional"]
    appliedParams: FontParamsModel


@app.on_event("startup")
def _startup() -> None:
    # 서비스 기동 시 폰트를 한 번 받아 캐시 시도(실패해도 서비스는 뜬다).
    font_loader.ensure_font()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "font_loaded": font_loader.font_is_available()}


@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest) -> GenerateResponse:
    # 폰트가 없으면 한 번 더 받아본다. 그래도 없으면 503.
    font_path = font_loader.ensure_font()
    if font_path is None:
        raise HTTPException(
            status_code=503,
            detail="기본 가변폰트를 다운로드하지 못했습니다. 네트워크/미러 상태를 확인하세요.",
        )

    p = req.params
    woff_b64, family, applied = generator.generate_woff_base64(
        str(font_path),
        weight=p.weight,
        slant=p.slant,
        curvature=p.curvature,
        image_png=req.imagePng,  # Phase 1 미사용
    )

    return GenerateResponse(
        fontWoffBase64=woff_b64,
        fontFamily=family,
        generatedBy="traditional",
        appliedParams=FontParamsModel(
            weight=applied.weight,
            slant=applied.slant,
            curvature=applied.curvature,
        ),
    )
