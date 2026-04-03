import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Outbound Copilot | AI outbound copilot for SDRs, founders, and agencies",
  description:
    "Sender-aware outbound copilot with prospect research, sequences, reply intelligence, and institutional-grade quality controls.",
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
