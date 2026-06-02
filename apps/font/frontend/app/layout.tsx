import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // 페이지별 metadata가 title을 덮어쓸 수 있도록 template 제공
  title: {
    default: "글씨체 만들기 — 손글씨 폰트 자동 생성",
    template: "%s | 글씨체 만들기",
  },
  description:
    "그린 글씨에서 스타일을 변형해 나만의 손글씨 폰트를 자동으로 만드는 웹앱.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
