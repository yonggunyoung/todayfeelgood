/**
 * 공용 React UI 컴포넌트 모음 — "소프트 iOS 문방구" 디자인 시스템.
 * 폰트앱·홈이 함께 쓰는 순수 UI(복붙 금지 규칙). 무거운 의존성 없이 CSS Module/인라인 SVG만 사용.
 * 색/여백/모션 토큰은 각 앱 globals.css의 CSS 변수(--accent, --surface, --r-md 등)에 의존한다.
 */
export { Button, default as ButtonDefault } from "./Button";
export { Slider, default as SliderDefault } from "./Slider";
export { Card, default as CardDefault } from "./Card";
export { Segmented, default as SegmentedDefault } from "./Segmented";
export type { SegmentedOption } from "./Segmented";
export { Chip, default as ChipDefault } from "./Chip";
export { Mascot, default as MascotDefault } from "./Mascot";
export type { MascotMood } from "./Mascot";
export { BrushDivider, BrushUnderline, default as BrushStrokeDefault } from "./BrushStroke";
export { Sticker, default as StickerDefault } from "./Sticker";
export { LiveText, default as LiveTextDefault } from "./LiveText";
export { HelpTip, default as HelpTipDefault } from "./HelpTip";
export { sanitizeColor } from "./color";
