"use client";

import { useEffect, useState } from "react";

type HomeAuthFragmentBridgeProps = {
  redirectPath?: string;
};

export function HomeAuthFragmentBridge({
  redirectPath = "/app?notice=Welcome%20back.",
}: HomeAuthFragmentBridgeProps) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const error = params.get("error_description") ?? params.get("error");

    if (error) {
      setStatus(`We could not complete sign-in: ${error}`);
      return;
    }

    if (!accessToken || !refreshToken) {
      return;
    }

    let canceled = false;
    setStatus("Completing secure sign-in...");

    async function persistSession() {
      try {
        const response = await fetch("/auth/session", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            accessToken,
            refreshToken,
          }),
        });

        if (!response.ok) {
          throw new Error("Session could not be saved.");
        }

        if (!canceled) {
          window.location.replace(redirectPath);
        }
      } catch {
        if (!canceled) {
          setStatus("We could not save your session. Request a fresh magic link and try again.");
        }
      }
    }

    void persistSession();

    return () => {
      canceled = true;
    };
  }, [redirectPath]);

  if (status === null) {
    return null;
  }

  return (
    <div className="feedbackStack" aria-live="polite">
      <div className="dashboardCard statusCard infoCard">
        <p className="cardLabel">Secure sign-in</p>
        <p>{status}</p>
      </div>
    </div>
  );
}
