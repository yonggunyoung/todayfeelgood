# -*- coding: utf-8 -*-
"""
손글씨 코어 — "내가 그린 획 → 진짜 글씨체".

[비용 가드] 이 모듈은 로컬 fontTools + 표준 math만 사용한다.
외부 유료 API(LLM/이미지 생성 등) 호출이 전혀 없고, 운영 비용은 0이다.
무거운 의존성(OpenCV/potrace/ML) 없이 stroke 기반으로 동작한다.

파이프라인(검증된 PoC):
  사용자가 그린 획(중심선 폴리라인, 셀 정규화 0..1)
  → 다듬기(refine: smoothing/nib/taper/straighten/spacing)
  → 좌우 오프셋 외곽선(stroke outline)
  → fontTools FontBuilder + TTGlyphPen으로 glyf 조립
  → 진짜 TTF/WOFF/WOFF2/OTF (base64)

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
    smoothing 0 = 날것(중복점만 제거), 1 = 강한 평활.
    점 솎기(RDP) + Catmull-Rom 보간. 형태(개성) 보존이 핵심.
    """
    pts = _dedupe(points)
    if len(pts) < 2:
        return pts
    if smoothing <= 0:
        return pts
    # RDP epsilon: smoothing 클수록 더 많이 솎음(0.5~8 유닛 상당, 셀 정규화 스케일).
    eps = 0.0015 + 0.012 * smoothing
    simplified = _rdp(pts, eps)
    # 보간 밀도: smoothing 클수록 부드럽게(세그먼트당 표본 수 ↑).
    samples = 4 + int(round(8 * smoothing))
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


def _stroke_outline(
    points: List[Point], half_width: float, taper: float
) -> List[Point]:
    """
    중심선 폴리라인 → 좌우 오프셋 외곽선(닫힌 폴리곤).
    taper>0: 획 끝으로 갈수록 폭 감소(필압 흉내). 양 끝을 가늘게.
    한 점(점/도트)인 경우 작은 원형 폴리곤 반환.
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

    # 각 점의 법선(인접 세그먼트 평균).
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
            nv = (mx / m, my / m) if m > 1e-9 else a
        normals.append(nv)

    left: List[Point] = []
    right: List[Point] = []
    for i in range(n):
        w = width_at(i)
        nx, ny = normals[i]
        x, y = pts[i]
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))

    # 닫힌 폴리곤: 좌측 정방향 + 우측 역방향.
    return left + right[::-1]


def _dot_polygon(center: Point, radius: float, segments: int = 12) -> List[Point]:
    """단일 점 → 원형 폴리곤(작은 점/도트)."""
    cx, cy = center
    r = max(8.0, radius)
    return [
        (cx + r * math.cos(2 * math.pi * k / segments), cy + r * math.sin(2 * math.pi * k / segments))
        for k in range(segments)
    ]


# ---------------- 글리프 조립 ----------------
def _nib_half_width(nib: float) -> float:
    """nib(0.2~1) → 펜 반폭(폰트 유닛)."""
    t = (max(0.2, min(1.0, nib)) - 0.2) / 0.8  # 0..1
    return NIB_HALF_MIN + t * (NIB_HALF_MAX - NIB_HALF_MIN)


def _build_glyph(
    strokes: Sequence[Sequence[Point]],
    refine: RefineParams,
) -> Tuple[object, float, float]:
    """
    한 글자의 획들 → (TTGlyph, xMin, xMax).
    좌표는 이미 폰트 유닛(_cell_to_font 적용 후)이어야 한다.
    반환 xMin/xMax는 사이드베어링/advance 계산용.
    """
    half = _nib_half_width(refine.nib)
    pen = TTGlyphPen(None)

    all_x: List[float] = []
    drew = False
    for stroke in strokes:
        outline = _stroke_outline(list(stroke), half, refine.taper)
        if len(outline) < 3:
            continue
        pen.moveTo(outline[0])
        for pt in outline[1:]:
            pen.lineTo(pt)
        pen.closePath()
        drew = True
        all_x.extend(px for px, _ in outline)

    glyph = pen.glyph()
    if not drew or not all_x:
        return glyph, 0.0, 0.0
    return glyph, min(all_x), max(all_x)


def _prepare_strokes_font_units(
    strokes: Sequence[Sequence[Point]],
    refine: RefineParams,
) -> List[List[Point]]:
    """셀 정규화 획 → (smoothing) → 폰트 유닛 변환 → (straighten)."""
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

        font_strokes = _prepare_strokes_font_units(strokes, refine)
        glyph, xmin, xmax = _build_glyph(font_strokes, refine)

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
