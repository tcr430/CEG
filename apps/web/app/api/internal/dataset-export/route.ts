import { randomUUID } from "node:crypto";

import {
  datasetExportArtifactTypeSchema,
  datasetExportSignalModeSchema,
} from "@ceg/validation";
import { getWorkspaceAppContext } from "../../../../lib/server/auth";
import { buildWorkspaceDatasetExport } from "../../../../lib/server/dataset-exports";
import {
  canAccessInternalAdminView,
  getInternalAdminAllowedEmails,
  isInternalAdminEnabled,
} from "../../../../lib/internal-admin-access";
import { assertTrustedAppRequest } from "../../../../lib/server/request-security";
import { toUserFacingError } from "../../../../lib/server/user-facing-errors";

function sanitizeFilenamePart(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace"
  );
}

function readNullableDate(formData: FormData, key: string): Date | null {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export async function POST(request: Request) {
  try {
    assertTrustedAppRequest(request);
    const formData = await request.formData();
    const workspaceId = formData.get("workspaceId");
    const rawArtifactType = formData.get("artifactType");
    const rawSignalMode = formData.get("signalMode");

    if (typeof workspaceId !== "string") {
      throw new Error("Workspace is required.");
    }

    const context = await getWorkspaceAppContext(workspaceId);
    if (context.workspace === null || context.needsWorkspaceSelection) {
      return Response.redirect(new URL("/app/workspaces", request.url), 303);
    }

    const canAccess =
      isInternalAdminEnabled() &&
      canAccessInternalAdminView({
        email: context.user.email,
        membership: context.workspace,
        allowedEmails: getInternalAdminAllowedEmails(),
      });

    if (!canAccess) {
      throw new Error("Internal admin access is required for dataset export.");
    }

    const artifactType =
      typeof rawArtifactType === "string" && rawArtifactType.trim() !== ""
        ? datasetExportArtifactTypeSchema.parse(rawArtifactType)
        : null;
    const signalMode =
      typeof rawSignalMode === "string" && rawSignalMode.trim() !== ""
        ? datasetExportSignalModeSchema.parse(rawSignalMode)
        : "all";

    const bundle = await buildWorkspaceDatasetExport({
      workspaceId,
      actorUserId: context.user.userId,
      actorEmail: context.user.email ?? "",
      actorMembership: context.workspace,
      filters: {
        dateFrom: readNullableDate(formData, "dateFrom"),
        dateTo: readNullableDate(formData, "dateTo"),
        artifactTypes: artifactType === null ? [] : [artifactType],
        signalMode,
      },
      requestId: randomUUID(),
    });

    const filename = `${sanitizeFilenamePart(String(bundle.metadata.workspaceSlug ?? "workspace"))}-dataset-export-${bundle.exportedAt.toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const userFacing = toUserFacingError(
      error,
      "We could not prepare that dataset export right now.",
    );

    return Response.json(
      {
        error: userFacing.message,
        code: userFacing.code,
      },
      { status: 400 },
    );
  }
}
