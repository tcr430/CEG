import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  campaignIdSchema,
  generatedArtifactTypeSchema,
  prospectIdSchema,
  trainingSignalActionTypeSchema,
  workspaceIdSchema,
} from "@ceg/validation";

import { getServerAuthContext } from "../../../lib/server/auth";
import { createOperationContext } from "../../../lib/server/observability";
import { assertTrustedAppRequest } from "../../../lib/server/request-security";
import {
  recordReplyDraftDistributionSignalForProspect,
  recordReplyDraftSelectionForProspect,
} from "../../../lib/server/replies";
import {
  recordSequenceDistributionSignalForProspect,
  recordSequencePreferenceSignalForProspect,
} from "../../../lib/server/sequences";

const trainingSignalRequestBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  campaignId: campaignIdSchema,
  prospectId: prospectIdSchema,
  artifactType: generatedArtifactTypeSchema,
  actionType: trainingSignalActionTypeSchema,
  optionIndex: z.number().int().min(0).optional(),
  targetStepNumber: z.number().int().positive().optional(),
  targetSlotId: z.string().trim().min(1).optional(),
  exportFormat: z.string().trim().min(1).max(32).optional(),
});

function parseRequestBody(body: unknown) {
  return trainingSignalRequestBodySchema.parse(body);
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "training_signal.record.route",
    requestId,
  });

  try {
    assertTrustedAppRequest(request);

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
        requestId,
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
        requestId,
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
          requestId,
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
          requestId,
        });

        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json(
      { error: "This artifact action is not supported yet." },
      { status: 400 },
    );
  } catch (error) {
    operation.logger.warn("Training signal route rejected request", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        error: "Could not record that artifact action.",
      },
      { status: 400 },
    );
  }
}
