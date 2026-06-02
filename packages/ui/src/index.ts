/**
 * 공용 React UI 컴포넌트 모음.
 * 폰트앱·홈이 함께 쓰는 순수 UI(복붙 금지 규칙). 무거운 의존성 없이 CSS Module만 사용.
 * 색/여백 토큰은 각 앱의 globals.css가 제공하는 CSS 변수(--ink, --paper, --accent 등)에 의존한다.
 */
export { Button, default as ButtonDefault } from "./Button";
export { Slider, default as SliderDefault } from "./Slider";
export { Card, default as CardDefault } from "./Card";
