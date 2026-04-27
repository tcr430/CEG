"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Phase 3e bridge: surfaces redirect-driven feedback as Sonner toasts.
 *
 * Server actions and route handlers used to redirect with `?error=...`,
 * `?success=...`, or `?notice=...` query strings, which `<FeedbackBanner>`
 * then rendered inline. Now that all in-app forms hand feedback to the
 * client through `useActionSubmit` + `toast`, the only remaining sources
 * of those query params are full-page redirects (sign-out, billing route
 * handlers, magic-link callbacks, etc.). This component reads those
 * params on mount, fires the matching toast, and strips them from the
 * URL so a refresh does not replay the message.
 *
 */
function decodeMessage(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function UrlFeedbackToaster() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastFiredKey = useRef<string | null>(null);

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    const error = decodeMessage(searchParams.get("error"));
    const notice = decodeMessage(searchParams.get("notice"));
    const success = decodeMessage(searchParams.get("success"));

    if (!error && !notice && !success) {
      return;
    }

    // Avoid re-firing if React 18 strict-mode double-invokes the effect
    // for the same search-param snapshot.
    const fingerprint = `${pathname}::${searchParams.toString()}`;
    if (lastFiredKey.current === fingerprint) {
      return;
    }
    lastFiredKey.current = fingerprint;

    if (success) {
      toast.success(success);
    }
    if (notice) {
      toast.info(notice);
    }
    if (error) {
      toast.error(error);
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("error");
    next.delete("notice");
    next.delete("success");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
