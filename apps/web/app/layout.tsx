import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "OutFlow | Operating system for agency-grade hyperpersonalized cold email",
  description:
    "Agency-first cold email workflow system with sender-aware research, sequence and reply workflows, human review, and structured campaign memory.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}