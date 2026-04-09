"use client";

import { useState, useTransition } from "react";

import type { ShareablePerformanceSummary } from "@ceg/validation";

import { formatShareablePerformanceSummaryText } from "../lib/performance-summary";

type PerformanceSummaryCardProps = {
  summary: ShareablePerformanceSummary;
};

function formatRate(value: number | null): string {
  return value === null ? "n/a" : `${Math.round(value * 100)}%`;
}

export function PerformanceSummaryCard({
  summary,
}: PerformanceSummaryCardProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCopy() {
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(
          formatShareablePerformanceSummaryText(summary),
        );
        setMessage("Performance summary copied.");
      } catch {
        setMessage("Could not copy the performance summary.");
      }
    });
  }

  return (
    <div className="dashboardCard performanceSummaryCard">
      <div className="performanceSummaryHeader">
        <div>
          <p className="cardLabel">Performance summary</p>
          <h3>{summary.title}</h3>
          {summary.subtitle ? <p>{summary.subtitle}</p> : null}
          <p className="compactStatusMessage">
            Built from current sent-message and reply-classification history so teams can review performance with safe, structured signals.
          </p>
        </div>
        <button
          type="button"
          className="buttonGhost"
          onClick={handleCopy}
          disabled={isPending}
        >
          Copy summary
        </button>
      </div>

      <div className="performanceSummaryStats">
        <div>
          <strong>{summary.outboundMessages}</strong>
          <span>Outbound</span>
        </div>
        <div>
          <strong>{summary.replies}</strong>
          <span>Replies</span>
        </div>
        <div>
          <strong>{summary.positiveReplies}</strong>
          <span>Positive replies</span>
        </div>
        <div>
          <strong>{formatRate(summary.replyRate)}</strong>
          <span>Reply rate</span>
        </div>
        <div>
          <strong>{formatRate(summary.positiveReplyRate)}</strong>
          <span>Positive reply rate</span>
        </div>
      </div>

      {summary.highlights.length > 0 ? (
        <ul className="performanceSummaryHighlights">
          {summary.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      ) : null}

      {message ? <p className="compactStatusMessage">{message}</p> : null}
    </div>
  );
}


