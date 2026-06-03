import type { ReactNode } from "react";
import type { Metadata } from "next";
import { RootShell, rootMetadata } from "../../components/RootShell";

export const metadata: Metadata = rootMetadata("ko");

export default function KoRootLayout({ children }: { children: ReactNode }) {
  return <RootShell locale="ko">{children}</RootShell>;
}
