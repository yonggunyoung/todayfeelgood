import type { ReactNode } from "react";
import type { Metadata } from "next";
import { siteUrl } from "@webapp/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "획 — 손으로 빚는 웹 도구 공방",
    template: "%s · 획",
  },
  description:
    "글자체부터 시작하는 작은 도구 공방. 첫 작업대는 손글씨 폰트 만들기입니다.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
