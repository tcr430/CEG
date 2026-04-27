import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { UrlFeedbackToaster } from "../components/url-feedback-toaster";
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
        <Suspense fallback={null}>
          <UrlFeedbackToaster />
        </Suspense>
        <Toaster />
        <VercelAnalytics />
      </body>
    </html>
  );
}
