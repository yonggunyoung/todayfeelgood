import type { ReactNode } from "react";
import type { Metadata } from "next";
import { RootShell, rootMetadata } from "../../components/RootShell";

export const metadata: Metadata = rootMetadata("en");

export default function EnRootLayout({ children }: { children: ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}
