import type { ReactNode } from "react";
import type { Metadata } from "next";
import { siteUrl } from "@webapp/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "획 — 손글씨 폰트 공방",
    template: "%s · 획 폰트공방",
  },
  description:
    "굵기·기울기·곡률을 손끝으로 조율해 나만의 라틴 글자체를 빚는 폰트 공방. 그리고, 다듬고, 내려받으세요.",
  applicationName: "획 폰트공방",
  authors: [{ name: "획 폰트공방" }],
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="%23f7f4ec"/><text x="16" y="24" font-family="serif" font-size="24" font-weight="700" text-anchor="middle" fill="%231a1714">획</text></svg>`
          ),
      },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
