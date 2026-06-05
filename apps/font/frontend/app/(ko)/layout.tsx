import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { RootShell, rootMetadata } from "../../components/RootShell";

export const metadata: Metadata = rootMetadata("ko");
// 모바일에서 화면 폭에 정확히 맞춰 들어가게(확대된 채 진입 방지).
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function KoRootLayout({ children }: { children: ReactNode }) {
  return <RootShell locale="ko">{children}</RootShell>;
}
