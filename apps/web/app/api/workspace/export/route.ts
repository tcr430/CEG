import { randomUUID } from "node:crypto";

import { getWorkspaceAppContext } from "../../../../lib/server/auth";
import { buildWorkspaceExport } from "../../../../lib/server/data-handling";
import { assertTrustedAppRequest } from "../../../../lib/server/request-security";
import { toUserFacingError } from "../../../../lib/server/user-facing-errors";

function sanitizeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
}

export async function POST(request: Request) {
  try {
    assertTrustedAppRequest(request);
    const formData = await request.formData();
    const workspaceId = formData.get("workspaceId");

    if (typeof workspaceId !== "string") {
      throw new Error("Workspace is required.");
    }

    const context = await getWorkspaceAppContext(workspaceId);
    if (context.workspace === null || context.needsWorkspaceSelection) {
      return Response.redirect(new URL("/app/workspaces", request.url), 303);
    }

    const bundle = await buildWorkspaceExport({
      workspaceId,
      actorUserId: context.user.userId,
      actorEmail: context.user.email ?? "",
      actorMembership: context.workspace,
      requestId: randomUUID(),
    });

    const filename = `${sanitizeFilenamePart(bundle.workspace.slug)}-workspace-export-${bundle.exportedAt.slice(0, 10)}.json`;
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
      "We could not prepare that workspace export right now.",
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
