"use client";

import { useState, useTransition } from "react";

type ArtifactActionButtonsProps = {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  artifactType:
    | "sequence_subject_line_option"
    | "sequence_opener_option"
    | "sequence_initial_email"
    | "sequence_follow_up_step"
    | "draft_reply_option";
  optionIndex?: number;
  targetStepNumber?: number;
  targetSlotId?: string;
  copyText?: string;
  exportText?: string;
  exportFileName?: string;
  allowSelect?: boolean;
  allowCopy?: boolean;
  allowExport?: boolean;
};

type SignalAction = "selected" | "copied" | "exported";

function downloadTextFile(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ArtifactActionButtons(props: ArtifactActionButtonsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function postSignal(actionType: SignalAction, exportFormat?: string) {
    const response = await fetch("/api/training-signals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: props.workspaceId,
        campaignId: props.campaignId,
        prospectId: props.prospectId,
        artifactType: props.artifactType,
        actionType,
        optionIndex: props.optionIndex,
        targetStepNumber: props.targetStepNumber,
        targetSlotId: props.targetSlotId,
        exportFormat,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: "Could not record this action." }))) as {
        error?: string;
      };
      throw new Error(payload.error ?? "Could not record this action.");
    }
  }

  function runAction(actionType: SignalAction) {
    startTransition(async () => {
      try {
        if (actionType === "copied") {
          if (!props.copyText) {
            throw new Error("No copy text was provided for this artifact.");
          }

          await navigator.clipboard.writeText(props.copyText);
          await postSignal(actionType);
          setMessage("Copied and recorded.");
          return;
        }

        if (actionType === "exported") {
          if (!props.exportText) {
            throw new Error("No export text was provided for this artifact.");
          }

          downloadTextFile(props.exportFileName ?? "artifact.txt", props.exportText);
          await postSignal(actionType, "text/plain");
          setMessage("Exported and recorded.");
          return;
        }

        await postSignal(actionType);
        setMessage("Preference saved.");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not record this action.",
        );
      }
    });
  }

  const hasActions = props.allowSelect || props.allowCopy || props.allowExport;

  if (!hasActions) {
    return null;
  }

  return (
    <div className="artifactActionGroup">
      <div className="inlineActions artifactActionRow">
        {props.allowSelect ? (
          <button
            type="button"
            className="buttonGhost"
            onClick={() => runAction("selected")}
            disabled={isPending}
          >
            Mark preferred
          </button>
        ) : null}
        {props.allowCopy ? (
          <button
            type="button"
            className="buttonGhost"
            onClick={() => runAction("copied")}
            disabled={isPending}
          >
            Copy
          </button>
        ) : null}
        {props.allowExport ? (
          <button
            type="button"
            className="buttonGhost"
            onClick={() => runAction("exported")}
            disabled={isPending}
          >
            Export .txt
          </button>
        ) : null}
      </div>
      {message ? <p className="compactStatusMessage">{message}</p> : null}
    </div>
  );
}
