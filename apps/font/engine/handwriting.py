# -*- coding: utf-8 -*-
"""
손글씨 코어 — "내가 그린 획 → 진짜 글씨체".

[비용 가드] 이 모듈은 로컬 fontTools + 표준 math만 사용한다.
외부 유료 API(LLM/이미지 생성 등) 호출이 전혀 없고, 운영 비용은 0이다.
무거운 의존성(OpenCV/potrace/ML) 없이 stroke 기반으로 동작한다.

파이프라인(검증된 PoC):
  사용자가 그린 획(중심선 폴리라인, 셀 정규화 0..1)
  → 다듬기(refine: smoothing/nib/taper/straighten/spacing)
  → 좌우 오프셋 외곽선(stroke outline) — 2차 베지어 곡선(qCurveTo)으로 매끈하게
  → fontTools FontBuilder + TTGlyphPen으로 glyf 조립
  → 진짜 TTF/WOFF/WOFF2/OTF (base64)

품질 개선(Q판):
  - 중심선을 약하게라도 자연 곡선화하고, 외곽선을 직선 폴리라인이 아니라
    2차 베지어(qCurveTo) 로 그려 매끈하게. smoothing=0이어도 약한 곡선,
    높으면 더 정리(원래 점 근처를 통과 → 형태/개성 보존).
  - 좌우 오프셋의 날카로운 코너/자기교차 아티팩트를 라운드 조인 + 마이터 클램프로 완화.
    획 끝은 taper 프로파일 + 둥근 캡.
  - 가이드(어센더/캡/x-height/베이스라인/디센더) 기준으로 글자 수직 배치를
    약하게 정규화(과도 금지 — 개성 유지)하고, 일관된 advance/사이드베어링.

좌표 규약(가이드 그리드와 합의):
  - 입력 셀은 0..1 정규화. (0,0)=좌상단, (1,1)=우하단(이미지 y 하향).
  - 셀 윗변(y=0)=어센더, 아랫변(y=1)=디센더로 매핑(폰트 y 상향으로 뒤집음).
  - UPM=1000. 베이스라인/어센더/디센더는 아래 메트릭 상수로 배치.
"""
from __future__ import annotations

import base64
import io
import math
import struct
from dataclasses import dataclass
from typing import List, Literal, Sequence, Tuple

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

FontFormat = Literal["woff", "woff2", "ttf", "otf"]
ALLOWED_FORMATS: Tuple[FontFormat, ...] = ("woff", "woff2", "ttf", "otf")

Point = Tuple[float, float]

# ---------------- 폰트 메트릭(UPM 1000) ----------------
UPM = 1000
# 셀 규약: 윗변=어센더, 아랫변=디센더. 폰트 좌표(y 상향)로 매핑.
ASCENDER = 800
DESCENDER = -200
CELL_TOP_Y = ASCENDER       # 셀 y=0  → 폰트 y=800
CELL_BOTTOM_Y = DESCENDER   # 셀 y=1  → 폰트 y=-200
CELL_HEIGHT_UNITS = CELL_TOP_Y - CELL_BOTTOM_Y  # 1000
# 셀 가로폭(폰트 유닛). x=0..1 → 0..CELL_WIDTH_UNITS.
CELL_WIDTH_UNITS = 1000
LINE_GAP = 90

# 읽힘용 가이드(폰트 유닛, y 상향). 메트릭 정렬의 기준선.
BASELINE_Y = 0
CAP_HEIGHT = 700        # 대문자/숫자 윗선
X_HEIGHT = 500          # 소문자 본체 윗선
# 디센더가 있는 소문자(g,j,p,q,y)는 베이스라인 아래로 내려감.
DESCENDER_GLYPHS = set("gjpqy")
# 어센더/캡 영역까지 올라가는 소문자(b,d,f,h,k,l,t).
ASCENDER_GLYPHS = set("bdfhklt")
# 메트릭 정렬 강도(0=날것 위치, 1=가이드에 꽉 맞춤). 개성 보존 위해 부분만.
METRIC_SNAP = 0.55

# refine 계수(REFINE_RANGES 의미와 일치).
# nib(0.2~1) → 펜 반폭(half-width, 폰트 유닛). 0.2≈얇게, 1≈두껍게.
NIB_HALF_MIN = 14.0
NIB_HALF_MAX = 70.0
# 한 점짜리 획(점/도트) 반경.
DOT_RADIUS_SCALE = 1.6

# 무료티어 가드(계약 packages/core와 동일).
MAX_STROKE_POINTS_PER_GLYPH = 4000
MAX_TOTAL_GLYPHS = 120

# 재현성: head.modified 고정(같은 입력 → 동일 바이트). (2020-01-01 기준 epoch 무관 상수)
_FIXED_TIMESTAMP = 3786825600  # fontTools epoch 기준 임의 고정값


@dataclass
class RefineParams:
    smoothing: float = 0.4
    nib: float = 0.5
    taper: float = 0.0
    straighten: float = 0.2
    spacing: float = 0.05


# ---------------- 좌표 변환 ----------------
def _cell_to_font(p: Point) -> Point:
    """셀 정규화(0..1, y 하향) → 폰트 유닛(y 상향)."""
    x, y = p
    fx = x * CELL_WIDTH_UNITS
    # y=0(윗변)→CELL_TOP_Y, y=1(아랫변)→CELL_BOTTOM_Y
    fy = CELL_TOP_Y - y * CELL_HEIGHT_UNITS
    return (fx, fy)


# ---------------- 다듬기(refine) 단계 ----------------
def _dedupe(points: Sequence[Point], eps: float = 1e-4) -> List[Point]:
    """연속 중복점 제거."""
    out: List[Point] = []
    for p in points:
        if not out or abs(p[0] - out[-1][0]) > eps or abs(p[1] - out[-1][1]) > eps:
            out.append((float(p[0]), float(p[1])))
    return out


def _rdp(points: List[Point], epsilon: float) -> List[Point]:
    """Ramer-Douglas-Peucker 점 솎기(형태 유지하며 노이즈/과밀 제거)."""
    if len(points) < 3 or epsilon <= 0:
        return points
    # 최대 수직거리 점 탐색.
    start, end = points[0], points[-1]
    dx, dy = end[0] - start[0], end[1] - start[1]
    seg_len = math.hypot(dx, dy)
    dmax, idx = 0.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        if seg_len < 1e-9:
            d = math.hypot(px - start[0], py - start[1])
        else:
            d = abs(dy * px - dx * py + end[0] * start[1] - end[1] * start[0]) / seg_len
        if d > dmax:
            dmax, idx = d, i
    if dmax > epsilon:
        left = _rdp(points[: idx + 1], epsilon)
        right = _rdp(points[idx:], epsilon)
        return left[:-1] + right
    return [start, end]


def _catmull_rom(points: List[Point], samples_per_seg: int) -> List[Point]:
    """Catmull-Rom 스플라인으로 평활(원래 점을 통과하므로 형태 보존)."""
    if len(points) < 3 or samples_per_seg < 1:
        return points
    pts = [points[0]] + points + [points[-1]]  # 끝점 복제
    out: List[Point] = [points[0]]
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for s in range(1, samples_per_seg + 1):
            t = s / samples_per_seg
            t2 = t * t
            t3 = t2 * t
            x = 0.5 * (
                (2 * p1[0])
                + (-p0[0] + p2[0]) * t
                + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
            )
            y = 0.5 * (
                (2 * p1[1])
                + (-p0[1] + p2[1]) * t
                + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
            )
            out.append((x, y))
    return out


def _smooth_stroke(points: List[Point], smoothing: float) -> List[Point]:
    """
    smoothing 0 = 약한 자연 곡선만(개성 100% 보존), 1 = 강한 평활(더 정리).
    점 솎기(RDP) + Catmull-Rom 보간. 원래 점 근처를 통과하므로 형태(개성) 보존이 핵심.

    핵심 변경: smoothing 0이어도 곡선 외곽선을 위해 부드러운 중심선을 만든다.
    (이전엔 0이면 폴리라인 그대로 → 외곽선이 각졌음.)
    """
    pts = _dedupe(points)
    if len(pts) < 2:
        return pts
    # RDP epsilon: smoothing 클수록 더 많이 솎음. smoothing 0이면 거의 안 솎음(원형 보존).
    eps = 0.0008 + 0.012 * smoothing
    simplified = _rdp(pts, eps)
    if len(simplified) < 3:
        # 점 2개(직선)는 보간 불필요 — 그대로 둔다(원형 보존, 직선은 직선).
        return simplified
    # 보간 밀도: smoothing 0이어도 약한 곡선(samples>=3), 클수록 부드럽게.
    samples = 3 + int(round(9 * smoothing))
    return _catmull_rom(simplified, samples)


def _straighten_stroke(
    points: List[Point], angle_rad: float, pivot: Point
) -> List[Point]:
    """전체(글자 묶음) 기울기 보정용 회전. pivot 기준 -angle 회전."""
    if abs(angle_rad) < 1e-6:
        return points
    ca, sa = math.cos(-angle_rad), math.sin(-angle_rad)
    px, py = pivot
    out = []
    for x, y in points:
        dx, dy = x - px, y - py
        out.append((px + dx * ca - dy * sa, py + dx * sa + dy * ca))
    return out


# ---------------- 외곽선(stroke → outline) ----------------
def _normal(p0: Point, p1: Point) -> Point:
    """세그먼트 p0->p1의 단위 법선(좌측)."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    n = math.hypot(dx, dy)
    if n < 1e-9:
        return (0.0, 0.0)
    return (-dy / n, dx / n)


def _arc_points(
    center: Point, radius: float, a0: float, a1: float, max_step: float = 0.6
) -> List[Point]:
    """center 중심 반지름 radius 의 호(a0→a1, 라디안)를 폴리라인 점으로.
    라운드 조인/캡에서 외곽선이 각지지 않게 한다(짧은 호는 점 1~2개로 절약)."""
    cx, cy = center
    sweep = a1 - a0
    if abs(sweep) < 1e-6 or radius < 1e-6:
        return []
    steps = max(1, int(math.ceil(abs(sweep) / max_step)))
    out: List[Point] = []
    for k in range(1, steps + 1):
        a = a0 + sweep * (k / steps)
        out.append((cx + radius * math.cos(a), cy + radius * math.sin(a)))
    return out


def _offset_side(
    pts: List[Point],
    normals: List[Point],
    widths: List[float],
    sign: float,
) -> List[Point]:
    """한쪽(좌/우) 오프셋 외곽선을 라운드 조인으로 생성.
    볼록한 꺾임(외측)에선 호를 끼워 넣어 날카로운 코너/마이터 폭주를 막는다.
    오목한 쪽(내측)에선 평균 법선만 써서 미세 자기교차를 무해화한다.
    sign: +1=좌측, -1=우측."""
    n = len(pts)
    out: List[Point] = []
    for i in range(n):
        x, y = pts[i]
        w = widths[i]
        nx, ny = normals[i][0] * sign, normals[i][1] * sign
        if 0 < i < n - 1:
            # 들어오는/나가는 세그먼트의 법선(이 점에서의 꺾임 판정).
            na = _normal(pts[i - 1], pts[i])
            nb = _normal(pts[i], pts[i + 1])
            ax, ay = na[0] * sign, na[1] * sign
            bx, by = nb[0] * sign, nb[1] * sign
            # 이 쪽이 외측(볼록)인지: 두 세그먼트 법선이 벌어지면 외측.
            cross = ax * by - ay * bx  # 부호로 회전 방향 판정
            dot = ax * bx + ay * by
            turn = math.atan2(abs(cross), dot)  # 0..pi 꺾임각
            # 외측(라운드 필요) 판정: sign 방향으로 꺾이면 호를 끼운다.
            outer = cross > 1e-9
            if outer and turn > 0.35:
                a0 = math.atan2(ay, ax)
                a1 = math.atan2(by, bx)
                # 짧은 방향으로 보간.
                if a1 - a0 > math.pi:
                    a1 -= 2 * math.pi
                elif a0 - a1 > math.pi:
                    a1 += 2 * math.pi
                out.append((x + ax * w, y + ay * w))
                out.extend(_arc_points((x, y), w, a0, a1))
                continue
        out.append((x + nx * w, y + ny * w))
    return out


def _stroke_outline(
    points: List[Point], half_width: float, taper: float
) -> List[Point]:
    """
    중심선 폴리라인 → 좌우 오프셋 외곽선(닫힌 폴리곤, on-curve 점 시퀀스).
    - 좌우 오프셋을 라운드 조인 + 마이터 클램프로 생성(날카로운 코너/자기교차 완화).
    - 획 끝은 taper 프로파일 + 둥근 캡(반원 호).
    한 점(점/도트)인 경우 작은 원형 폴리곤 반환.
    반환 점들은 이후 _to_quad_contour 가 2차 베지어로 매끄럽게 그린다.
    """
    pts = _dedupe(points)
    if len(pts) == 0:
        return []
    if len(pts) == 1:
        return _dot_polygon(pts[0], half_width * DOT_RADIUS_SCALE)

    n = len(pts)
    # 각 점의 누적 길이(taper 진행도용).
    seg_lens = [0.0]
    for i in range(1, n):
        seg_lens.append(seg_lens[-1] + math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    total = seg_lens[-1] if seg_lens[-1] > 1e-9 else 1.0

    def width_at(i: int) -> float:
        if taper <= 0:
            return half_width
        # 양 끝에서 가늘어지는 종(bell) 프로파일. 중앙=full, 끝=full*(1-taper).
        t = seg_lens[i] / total  # 0..1
        edge = min(t, 1.0 - t) * 2.0  # 0(끝)..1(중앙)
        factor = (1.0 - taper) + taper * edge
        return half_width * max(0.12, factor)

    widths = [width_at(i) for i in range(n)]

    # 각 점의 법선(인접 세그먼트 평균 + 마이터 클램프로 폭주 방지).
    normals: List[Point] = []
    for i in range(n):
        if i == 0:
            nv = _normal(pts[0], pts[1])
        elif i == n - 1:
            nv = _normal(pts[n - 2], pts[n - 1])
        else:
            a = _normal(pts[i - 1], pts[i])
            b = _normal(pts[i], pts[i + 1])
            mx, my = a[0] + b[0], a[1] + b[1]
            m = math.hypot(mx, my)
            if m > 1e-9:
                # 마이터 길이 = 1/cos(반각). 너무 길면(날카로운 코너) 단순 법선으로 클램프.
                miter = 2.0 / m  # m = 2*cos(반각)
                nv = (mx / m, my / m) if miter <= 2.2 else a
            else:
                nv = a  # 180도 꺾임(되돌아옴) — 평균 무의미, 한쪽 법선.
        normals.append(nv)

    left = _offset_side(pts, normals, widths, +1.0)
    right = _offset_side(pts, normals, widths, -1.0)

    # 끝 캡(둥근 반원): 시작 캡은 right끝→left시작, 끝 캡은 left끝→right시작.
    start_cap = _end_cap(pts[0], normals[0], widths[0], start=True)
    end_cap = _end_cap(pts[-1], normals[-1], widths[-1], start=False)

    # 닫힌 폴리곤: 좌측 정방향 + 끝캡 + 우측 역방향 + 시작캡.
    return left + end_cap + right[::-1] + start_cap


def _end_cap(p: Point, normal: Point, w: float, start: bool) -> List[Point]:
    """획 끝 둥근 캡: 법선 +w 지점에서 -w 지점으로 도는 반원 호."""
    x, y = p
    nx, ny = normal
    base = math.atan2(ny, nx)
    if start:
        # 우측끝(-) → 좌측시작(+) 방향으로 도는 반원(중심선 바깥쪽으로 볼록).
        a0, a1 = base - math.pi, base
    else:
        a0, a1 = base, base + math.pi
    return _arc_points((x, y), max(1.0, w), a0, a1)


def _dot_polygon(center: Point, radius: float, segments: int = 16) -> List[Point]:
    """단일 점 → 원형 폴리곤(작은 점/도트)."""
    cx, cy = center
    r = max(8.0, radius)
    return [
        (cx + r * math.cos(2 * math.pi * k / segments), cy + r * math.sin(2 * math.pi * k / segments))
        for k in range(segments)
    ]


# ---------------- 폴리곤 → 2차 베지어 컨투어 ----------------
def _to_quad_contour(poly: List[Point], pen) -> None:
    """
    닫힌 폴리곤(외곽선 점열)을 2차 베지어(qCurveTo) 로 매끄럽게 그린다.

    방법: 각 폴리곤 점을 off-curve(컨트롤) 점으로 두고, 인접 두 점의 중점을
    on-curve 점으로 삼는 표준 "midpoint" 트릭. 폴리라인의 각 꼭짓점이
    부드러운 곡선의 정점이 되어, 직선 폴리라인보다 훨씬 매끈한 외곽선이 된다.
    꼭짓점이 거의 일직선이면 사실상 직선처럼 보여 'l'(직선)도 자연스럽다.
    """
    pts = _dedupe(poly)
    if len(pts) < 3:
        return
    n = len(pts)
    # 시작 on-curve 점: 마지막↔첫 점의 중점.
    start = ((pts[-1][0] + pts[0][0]) / 2.0, (pts[-1][1] + pts[0][1]) / 2.0)
    pen.moveTo(start)
    for i in range(n):
        ctrl = pts[i]
        nxt = pts[(i + 1) % n]
        mid = ((ctrl[0] + nxt[0]) / 2.0, (ctrl[1] + nxt[1]) / 2.0)
        pen.qCurveTo(ctrl, mid)
    pen.closePath()


# ---------------- 글리프 조립 ----------------
def _nib_half_width(nib: float) -> float:
    """nib(0.2~1) → 펜 반폭(폰트 유닛)."""
    t = (max(0.2, min(1.0, nib)) - 0.2) / 0.8  # 0..1
    return NIB_HALF_MIN + t * (NIB_HALF_MAX - NIB_HALF_MIN)


def _build_glyph(
    strokes: Sequence[Sequence[Point]],
    refine: RefineParams,
) -> Tuple[object, float, float, int]:
    """
    한 글자의 획들 → (TTGlyph, xMin, xMax, contourCount).
    좌표는 이미 폰트 유닛(_cell_to_font + 메트릭 정렬 적용 후)이어야 한다.
    외곽선은 2차 베지어(qCurveTo)로 그려 매끈하다.
    반환 xMin/xMax는 사이드베어링/advance 계산용, contourCount는 자체 점검 로깅용.
    """
    half = _nib_half_width(refine.nib)
    pen = TTGlyphPen(None)

    all_x: List[float] = []
    contours = 0
    for stroke in strokes:
        outline = _stroke_outline(list(stroke), half, refine.taper)
        if len(outline) < 3:
            continue
        _to_quad_contour(outline, pen)
        contours += 1
        all_x.extend(px for px, _ in outline)

    glyph = pen.glyph()
    if contours == 0 or not all_x:
        return glyph, 0.0, 0.0, 0
    return glyph, min(all_x), max(all_x), contours


def _target_band(ch: str) -> Tuple[float, float]:
    """글자별 목표 수직 밴드(베이스라인 기준, 폰트 유닛 y 상향).
    (bottom, top). 메트릭 정렬에서 글자를 이 밴드로 약하게 끌어온다."""
    if ch.isdigit() or ("A" <= ch <= "Z"):
        return (BASELINE_Y, CAP_HEIGHT)
    if "a" <= ch <= "z":
        bottom = DESCENDER if ch in DESCENDER_GLYPHS else BASELINE_Y
        top = CAP_HEIGHT if ch in ASCENDER_GLYPHS else X_HEIGHT
        return (bottom, top)
    # 기타(기호/한글 등): 디센더~어센더 전체 높이를 약하게만.
    return (DESCENDER, CAP_HEIGHT)


def _align_to_guides(
    font_strokes: List[List[Point]], ch: str, strength: float
) -> List[List[Point]]:
    """
    글자의 잉크 세로 범위를 가이드 밴드(목표)로 약하게 이동/스케일(읽힘 정렬).
    strength(0~1)만큼만 보정해 개성을 보존한다(과도 정규화 금지).
    """
    if strength <= 0:
        return font_strokes
    ys = [y for s in font_strokes for _, y in s]
    if len(ys) < 2:
        return font_strokes
    cur_bot, cur_top = min(ys), max(ys)
    cur_h = cur_top - cur_bot
    if cur_h < 1e-3:
        return font_strokes
    tgt_bot, tgt_top = _target_band(ch)
    tgt_h = tgt_top - tgt_bot
    if tgt_h < 1e-3:
        return font_strokes

    # 목표 스케일/오프셋을 strength 비율로 섞는다(1=완전 정렬, 0=원형).
    full_scale = tgt_h / cur_h
    # 극단 스케일 방지(0.7~1.4 안에서만): 개성 유지, 폭주 방지.
    full_scale = max(0.7, min(1.4, full_scale))
    scale = 1.0 + (full_scale - 1.0) * strength

    # 스케일 후 바닥을 목표 바닥으로 끌어오기(strength 비율).
    new_bot_if_scaled = cur_bot  # pivot=cur_bot 기준 스케일
    full_shift = tgt_bot - new_bot_if_scaled
    shift = full_shift * strength

    out: List[List[Point]] = []
    for s in font_strokes:
        ns = []
        for x, y in s:
            ny = cur_bot + (y - cur_bot) * scale + shift
            ns.append((x, ny))
        out.append(ns)
    return out


def _prepare_strokes_font_units(
    strokes: Sequence[Sequence[Point]],
    refine: RefineParams,
    ch: str = "",
) -> List[List[Point]]:
    """셀 정규화 획 → (smoothing) → 폰트 유닛 변환 → (straighten) → (메트릭 정렬)."""
    # 1) 셀 좌표에서 평활.
    smoothed = [_smooth_stroke([(float(x), float(y)) for x, y in s], refine.smoothing) for s in strokes]
    smoothed = [s for s in smoothed if len(s) >= 1]
    # 2) 폰트 유닛 변환.
    font_strokes = [[_cell_to_font(p) for p in s] for s in smoothed]
    # 3) straighten: 전체 점들의 회귀선 기울기를 약하게 펴기.
    if refine.straighten > 0:
        pts = [p for s in font_strokes for p in s if len(s) >= 2]
        angle = _regression_angle(pts)
        if abs(angle) > 1e-4:
            # straighten 비율만큼만 보정(과도 정규화 방지).
            corr = angle * min(1.0, max(0.0, refine.straighten))
            pivot = _centroid(pts)
            font_strokes = [_straighten_stroke(s, corr, pivot) for s in font_strokes]
    # 4) 메트릭 정렬: 가이드 밴드로 수직 배치/높이 약하게 정규화(읽힘).
    #    straighten 슬라이더와 연동해 강도 조절(straighten 높을수록 더 정렬, 단 상한 METRIC_SNAP).
    snap = METRIC_SNAP * min(1.0, 0.5 + 0.5 * max(0.0, min(1.0, refine.straighten)))
    font_strokes = _align_to_guides(font_strokes, ch, snap)
    return font_strokes


def _centroid(points: Sequence[Point]) -> Point:
    if not points:
        return (0.0, 0.0)
    sx = sum(p[0] for p in points)
    sy = sum(p[1] for p in points)
    return (sx / len(points), sy / len(points))


def _regression_angle(points: Sequence[Point]) -> float:
    """
    점들의 최소제곱 회귀선 각도(라디안). 글자가 기운 정도를 추정.
    수평(가로 글씨) 가정 — y = a*x + b 의 기울기 arctan.
    """
    n = len(points)
    if n < 2:
        return 0.0
    mx = sum(p[0] for p in points) / n
    my = sum(p[1] for p in points) / n
    sxx = sum((p[0] - mx) ** 2 for p in points)
    sxy = sum((p[0] - mx) * (p[1] - my) for p in points)
    if sxx < 1e-6:
        return 0.0
    slope = sxy / sxx
    return math.atan(slope)


# ---------------- 폰트 빌드 ----------------
def _short_id(glyphs: Sequence[Tuple[str, Sequence[Sequence[Point]]]]) -> str:
    """그린 내용 기반 짧은 결정적 ID(fontFamily 접미사)."""
    import hashlib

    h = hashlib.sha1()
    for ch, strokes in glyphs:
        h.update(ch.encode("utf-8"))
        for s in strokes:
            for x, y in s:
                h.update(struct.pack("<ff", round(float(x), 4), round(float(y), 4)))
    return h.hexdigest()[:8]


def build_handwriting_font(
    glyphs: Sequence[Tuple[str, Sequence[Sequence[Point]]]],
    refine: RefineParams,
    fmt: FontFormat = "woff",
) -> Tuple[bytes, str, int]:
    """
    그린 글자들 → 진짜 폰트 bytes.
    glyphs: [(char, [stroke, ...]), ...]  stroke=[(x,y) 0..1, ...]
    반환: (font_bytes, font_family, glyph_count)
    """
    if fmt not in ALLOWED_FORMATS:
        fmt = "woff"
    if not glyphs:
        raise ValueError("그린 글자가 없습니다.")

    family = f"MyHand-{_short_id(glyphs)}"

    # 글리프 순서: .notdef, space, 그린 글자들.
    glyph_order = [".notdef", "space"]
    char_map: dict[int, str] = {ord(" "): "space"}
    glyf: dict[str, object] = {}
    advances: dict[str, int] = {}
    lsbs: dict[str, int] = {}

    spacing_units = int(round(refine.spacing * UPM))  # em 비율 → 유닛
    spacing_units = max(-int(0.05 * UPM), min(int(0.4 * UPM), spacing_units))

    # .notdef: 빈 글리프(advance만).
    glyf[".notdef"] = TTGlyphPen(None).glyph()
    advances[".notdef"] = 600
    lsbs[".notdef"] = 0

    # space: 빈 글리프 + 적당한 advance.
    glyf["space"] = TTGlyphPen(None).glyph()
    space_adv = int(round(0.32 * UPM)) + max(0, spacing_units)
    advances["space"] = space_adv
    lsbs["space"] = 0

    seen: set[str] = set()
    count = 0
    for ch, strokes in glyphs:
        if not ch or len(ch) != 1:
            continue
        if ch in seen or ch == " ":
            continue
        seen.add(ch)

        font_strokes = _prepare_strokes_font_units(strokes, refine, ch)
        glyph, xmin, xmax, _contours = _build_glyph(font_strokes, refine)

        gname = _glyph_name(ch)
        # 이름 충돌 방어(드물게 동일 이름).
        base_name = gname
        k = 1
        while gname in glyf:
            gname = f"{base_name}.{k}"
            k += 1

        glyf[gname] = glyph
        glyph_order.append(gname)
        char_map[ord(ch)] = gname

        # 사이드베어링/advance: 잉크 폭 + 양쪽 spacing.
        side = max(20, spacing_units if spacing_units > 0 else 30)
        if xmax > xmin:
            ink_w = xmax - xmin
            lsb = int(round(side))
            adv = int(round(ink_w + 2 * side))
        else:
            # 빈(안 그린/실패) 글리프: 공백 폭.
            lsb = 0
            adv = space_adv
        advances[gname] = max(adv, 1)
        lsbs[gname] = lsb
        count += 1

    if count == 0:
        raise ValueError("유효한 글자가 없습니다.")

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(glyph_order)
    fb.setupCharacterMap(char_map)
    fb.setupGlyf(glyf)

    metrics = {name: (advances[name], lsbs.get(name, 0)) for name in glyph_order}
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=ASCENDER, descent=DESCENDER, lineGap=LINE_GAP)

    name_strings = {
        "familyName": family,
        "styleName": "Regular",
        "fullName": family,
        "psName": family.replace("-", ""),
        "version": "1.0",
        "uniqueFontIdentifier": f"{family};1.0",
        "copyright": "Generated from user handwriting. No AI.",
    }
    fb.setupNameTable(name_strings)
    fb.setupOS2(
        sTypoAscender=ASCENDER,
        sTypoDescender=DESCENDER,
        sTypoLineGap=LINE_GAP,
        usWinAscent=ASCENDER,
        usWinDescent=abs(DESCENDER),
        achVendID="MYHD",
    )
    fb.setupPost()

    # 재현성: head.modified 고정.
    font = fb.font
    if "head" in font:
        font["head"].modified = _FIXED_TIMESTAMP

    # 포맷 인코딩.
    font.flavor = _flavor_for_format(fmt)
    buf = io.BytesIO()
    font.save(buf)
    return buf.getvalue(), family, count


def _flavor_for_format(fmt: FontFormat) -> str | None:
    if fmt == "woff":
        return "woff"
    if fmt == "woff2":
        return "woff2"
    return None  # ttf, otf (비압축 sfnt)


def _glyph_name(ch: str) -> str:
    """문자 → 글리프 이름. 영문/숫자는 가독 이름, 그 외는 uniXXXX."""
    cp = ord(ch)
    if "a" <= ch <= "z" or "A" <= ch <= "Z":
        # 대문자는 충돌 방지를 위해 접미사.
        return ch if ("a" <= ch <= "z") else f"{ch}.uc"
    if "0" <= ch <= "9":
        names = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
        return names[cp - ord("0")]
    return f"uni{cp:04X}"


def build_handwriting_font_base64(
    glyphs: Sequence[Tuple[str, Sequence[Sequence[Point]]]],
    refine: RefineParams,
    fmt: FontFormat = "woff",
) -> Tuple[str, str, int]:
    """build_handwriting_font 결과를 base64로."""
    font_bytes, family, count = build_handwriting_font(glyphs, refine, fmt)
    return base64.b64encode(font_bytes).decode("ascii"), family, count


def reopen_ok(font_bytes: bytes) -> bool:
    """생성된 폰트가 재오픈 가능한지 검증(자체 점검용)."""
    try:
        TTFont(io.BytesIO(font_bytes))
        return True
    except Exception:
        return False
