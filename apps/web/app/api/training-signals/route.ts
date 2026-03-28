import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import {
  campaignIdSchema,
  generatedArtifactTypeSchema,
  prospectIdSchema,
  trainingSignalActionTypeSchema,
  workspaceIdSchema,
} from "@ceg/validation";

import { getServerAuthContext } from "../../../lib/server/auth";
import {
  recordReplyDraftDistributionSignalForProspect,
  recordReplyDraftSelectionForProspect,
} from "../../../lib/server/replies";
import {
  recordSequenceDistributionSignalForProspect,
  recordSequencePreferenceSignalForProspect,
} from "../../../lib/server/sequences";

type TrainingSignalRequestBody = {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  artifactType: string;
  actionType: string;
  optionIndex?: number;
  targetStepNumber?: number;
  targetSlotId?: string;
  exportFormat?: string;
};

function parseRequestBody(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be an object.");
  }

  const candidate = body as TrainingSignalRequestBody;
  const workspaceId = workspaceIdSchema.parse(candidate.workspaceId);
  const campaignId = campaignIdSchema.parse(candidate.campaignId);
  const prospectId = prospectIdSchema.parse(candidate.prospectId);
  const artifactType = generatedArtifactTypeSchema.parse(candidate.artifactType);
  const actionType = trainingSignalActionTypeSchema.parse(candidate.actionType);

  return {
    workspaceId,
    campaignId,
    prospectId,
    artifactType,
    actionType,
    optionIndex:
      typeof candidate.optionIndex === "number" ? candidate.optionIndex : undefined,
    targetStepNumber:
      typeof candidate.targetStepNumber === "number"
        ? candidate.targetStepNumber
        : undefined,
    targetSlotId:
      typeof candidate.targetSlotId === "string" && candidate.targetSlotId.trim() !== ""
        ? candidate.targetSlotId
        : undefined,
    exportFormat:
      typeof candidate.exportFormat === "string" && candidate.exportFormat.trim() !== ""
        ? candidate.exportFormat
        : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const auth = await getServerAuthContext();
    const body = parseRequestBody(await request.json());
    const membership = auth.user?.memberships.find(
      (item) => item.workspaceId === body.workspaceId,
    );

    if (!membership || auth.user === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      body.actionType === "selected" &&
      (body.artifactType === "sequence_subject_line_option" ||
        body.artifactType === "sequence_opener_option")
    ) {
      if (body.optionIndex === undefined) {
        return NextResponse.json({ error: "optionIndex is required." }, { status: 400 });
      }

      await recordSequencePreferenceSignalForProspect({
        workspaceId: body.workspaceId,
        campaignId: body.campaignId,
        prospectId: body.prospectId,
        artifactType: body.artifactType,
        optionIndex: body.optionIndex,
        userId: auth.user.userId,
        requestId: randomUUID(),
      });

      return NextResponse.json({ ok: true });
    }

    if (
      (body.actionType === "copied" || body.actionType === "exported") &&
      (body.artifactType === "sequence_initial_email" ||
        body.artifactType === "sequence_follow_up_step")
    ) {
      await recordSequenceDistributionSignalForProspect({
        workspaceId: body.workspaceId,
        campaignId: body.campaignId,
        prospectId: body.prospectId,
        artifactType: body.artifactType,
        actionType: body.actionType,
        targetStepNumber: body.targetStepNumber,
        exportFormat: body.exportFormat ?? null,
        userId: auth.user.userId,
        requestId: randomUUID(),
      });

      return NextResponse.json({ ok: true });
    }

    if (body.artifactType === "draft_reply_option") {
      if (!body.targetSlotId) {
        return NextResponse.json({ error: "targetSlotId is required." }, { status: 400 });
      }

      if (body.actionType === "selected") {
        await recordReplyDraftSelectionForProspect({
          workspaceId: body.workspaceId,
          campaignId: body.campaignId,
          prospectId: body.prospectId,
          targetSlotId: body.targetSlotId,
          userId: auth.user.userId,
          requestId: randomUUID(),
        });

        return NextResponse.json({ ok: true });
      }

      if (body.actionType === "copied" || body.actionType === "exported") {
        await recordReplyDraftDistributionSignalForProspect({
          workspaceId: body.workspaceId,
          campaignId: body.campaignId,
          prospectId: body.prospectId,
          targetSlotId: body.targetSlotId,
          actionType: body.actionType,
          exportFormat: body.exportFormat ?? null,
          userId: auth.user.userId,
          requestId: randomUUID(),
        });

        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json(
      { error: "This artifact action is not supported yet." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not record training signal.",
      },
      { status: 400 },
    );
  }
}
