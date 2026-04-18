import type { Metadata } from "next";
import type { ReactNode } from "react";

import { VercelAnalytics } from "../components/vercel-analytics";

import "./globals.css";

export const metadata: Metadata = {
  title: "OutFlow | Outbound workflow software for B2B agencies",
  description:
    "Outbound workflow software for agencies serving B2B clients. Keep campaign context, prospect research, draft review, and reply handling in one controlled system.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        {children}
        <VercelAnalytics />
      </body>
    </html>
  );
}
