import "server-only";

import type { WorkspaceMembership } from "@ceg/auth";
import {
  type Workspace,
  type WorkspaceInstitutionalControls,
  workspaceInstitutionalControlsSchema,
} from "@ceg/validation";
import { getOptionalEnv } from "@ceg/security";

import { canEditWorkspaceSettings } from "../workspace-team-policy";
import {
  canAccessInternalAdminView,
  getInternalAdminAllowedEmails,
  isInternalAdminEnabled,
} from "../internal-admin-access";
import { getSharedAuditEventRepository } from "./audit-events";
import { isDatabaseConfigured } from "./database";
import { createOperationContext } from "./observability";
import { getWorkspaceRecordById, updateWorkspaceSettings } from "./workspaces";

export type InstitutionalReadinessIndicator = {
  key: string;
  label: string;
  status: "ready" | "partial" | "not_configured";
  detail: string;
};

export type InstitutionalControlsState = {
  controls: WorkspaceInstitutionalControls;
  permissions: {
    canEdit: boolean;
    canViewAuditSummary: boolean;
  };
  summaries: {
    exportDeleteVisibility: string;
    auditAccessVisibility: string;
    operationalConfiguration: string[];
    securityPosture: string[];
    implementedNow: string[];
    roadmap: string[];
  };
  readinessIndicators: InstitutionalReadinessIndicator[];
};

function getConfiguredFlag(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function readWorkspaceInstitutionalControls(
  settings: Workspace["settings"],
): WorkspaceInstitutionalControls {
  const candidate =
    typeof settings === "object" &&
    settings !== null &&
    "institutionalControls" in settings
      ? (settings as { institutionalControls?: unknown }).institutionalControls
      : undefined;

  return workspaceInstitutionalControlsSchema.parse(candidate ?? {});
}

export function buildInstitutionalControlsState(input: {
  workspace: Workspace;
  membership: WorkspaceMembership;
  userEmail: string;
  supportEmail?: string | null;
}): InstitutionalControlsState {
  const controls = readWorkspaceInstitutionalControls(input.workspace.settings);
  const canEdit = canEditWorkspaceSettings(input.membership.role);
  const internalAdminVisibility =
    isInternalAdminEnabled() &&
    canAccessInternalAdminView({
      email: input.userEmail,
      membership: input.membership,
      allowedEmails: getInternalAdminAllowedEmails(),
    });

  const supabaseConfigured =
    getConfiguredFlag(getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL")) &&
    getConfiguredFlag(getOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const aiConfigured =
    getConfiguredFlag(getOptionalEnv("OPENAI_API_KEY")) &&
    getConfiguredFlag(getOptionalEnv("OPENAI_SEQUENCE_MODEL")) &&
    getConfiguredFlag(getOptionalEnv("OPENAI_REPLY_MODEL"));
  const stripeConfigured =
    getConfiguredFlag(getOptionalEnv("STRIPE_SECRET_KEY")) &&
    getConfiguredFlag(getOptionalEnv("STRIPE_WEBHOOK_SECRET")) &&
    getConfiguredFlag(getOptionalEnv("STRIPE_PRICE_STARTER_MONTHLY")) &&
    getConfiguredFlag(getOptionalEnv("STRIPE_PRICE_PRO_MONTHLY")) &&
    getConfiguredFlag(getOptionalEnv("STRIPE_PRICE_AGENCY_MONTHLY")) &&
    getConfiguredFlag(getOptionalEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"));

  const readinessIndicators: InstitutionalReadinessIndicator[] = [
    {
      key: "auth",
      label: "Supabase auth",
      status: supabaseConfigured ? "ready" : "not_configured",
      detail: supabaseConfigured
        ? "Auth environment is configured for protected workspace access."
        : "Supabase auth variables are still missing.",
    },
    {
      key: "database",
      label: "Database runtime",
      status: isDatabaseConfigured() ? "ready" : "partial",
      detail: isDatabaseConfigured()
        ? "DATABASE_URL is configured for database-backed runtime access."
        : "The app can still fall back to in-memory adapters in development.",
    },
    {
      key: "providers",
      label: "AI provider configuration",
      status: aiConfigured ? "ready" : "partial",
      detail: aiConfigured
        ? "Sequence and reply provider settings are present."
        : "Sequence and reply generation stay unavailable until provider variables are set.",
    },
    {
      key: "billing",
      label: "Stripe billing",
      status: stripeConfigured ? "ready" : "partial",
      detail: stripeConfigured
        ? "Checkout, portal, and webhook sync can operate."
        : "Billing UI can render, but checkout and portal actions need full Stripe configuration.",
    },
    {
      key: "gmail",
      label: "Inbox integration",
      status:
        getConfiguredFlag(getOptionalEnv("GOOGLE_GMAIL_CLIENT_ID")) &&
        getConfiguredFlag(getOptionalEnv("GOOGLE_GMAIL_CLIENT_SECRET")) &&
        getConfiguredFlag(getOptionalEnv("INBOX_CREDENTIALS_ENCRYPTION_KEY"))
          ? "ready"
          : "partial",
      detail:
        getConfiguredFlag(getOptionalEnv("GOOGLE_GMAIL_CLIENT_ID")) &&
        getConfiguredFlag(getOptionalEnv("GOOGLE_GMAIL_CLIENT_SECRET")) &&
        getConfiguredFlag(getOptionalEnv("INBOX_CREDENTIALS_ENCRYPTION_KEY"))
          ? "Gmail OAuth is configured for inbox connection and draft workflows."
          : "Inbox settings remain visible, but Gmail connection is not enabled yet.",
    },
  ];

  const supportChannel =
    controls.requestVisibility.contactChannel ??
    input.supportEmail ??
    "Use the workspace support contact or founder support process.";
  const exportDeleteVisibility =
    controls.requestVisibility.exportRequestsVisible ||
    controls.requestVisibility.deleteRequestsVisible
      ? `Export and delete requests are visible as a manual support workflow. Current contact channel: ${supportChannel}`
      : "Export and delete requests are not exposed as a self-serve workflow yet.";
  const auditAccessVisibility = internalAdminVisibility
    ? "Workspace admins can review normal workspace activity, and trusted internal admins can inspect restricted operational summaries."
    : controls.auditAccess.visibleToWorkspaceAdmins
      ? "Owners and admins can review workspace activity summaries. Internal support access stays restricted."
      : "Operational audit visibility is intentionally limited.";

  return {
    controls,
    permissions: {
      canEdit,
      canViewAuditSummary:
        controls.auditAccess.visibleToWorkspaceAdmins &&
        (input.membership.role === "owner" || input.membership.role === "admin"),
    },
    summaries: {
      exportDeleteVisibility,
      auditAccessVisibility,
      operationalConfiguration: [
        `Retention preference: ${controls.dataRetention.preference.replaceAll("_", " ")}.`,
        controls.providerVisibility.configurationSummaryVisible
          ? "Provider configuration summaries are visible without exposing secrets."
          : "Provider configuration summaries are intentionally hidden.",
        "Operational settings remain workspace-scoped and server-evaluated.",
      ],
      securityPosture: [
        "Workspace access is enforced through server-side auth and workspace membership checks.",
        "Provider tokens and service-role credentials stay server-only.",
        "Audit and usage events are captured for core operational flows.",
        "This surface summarizes controls and readiness. It does not claim compliance certification.",
      ],
      implementedNow: [
        "Workspace-level retention preference and operational notes.",
        "Visibility summary for export/delete requests and audit access.",
        "Provider and environment readiness indicators for enabled product areas.",
      ],
      roadmap: [
        "Self-serve export and deletion request workflows.",
        "Stricter policy-driven audit access segmentation.",
        "Automated retention enforcement beyond preference visibility.",
      ],
    },
    readinessIndicators,
  };
}

export async function getInstitutionalControlsState(input: {
  workspaceId: string;
  membership: WorkspaceMembership;
  userEmail: string;
  supportEmail?: string | null;
}): Promise<InstitutionalControlsState> {
  if (input.membership.workspaceId !== input.workspaceId) {
    throw new Error("Workspace access is denied.");
  }

  const workspace = await getWorkspaceRecordById(input.workspaceId);
  if (workspace === null) {
    throw new Error("Workspace not found.");
  }

  return buildInstitutionalControlsState({
    workspace,
    membership: input.membership,
    userEmail: input.userEmail,
    supportEmail: input.supportEmail,
  });
}

export async function updateInstitutionalControls(input: {
  workspaceId: string;
  actorUserId: string;
  actorMembership: WorkspaceMembership;
  actorEmail: string;
  controls: WorkspaceInstitutionalControls;
  requestId?: string;
}): Promise<Workspace> {
  if (input.actorMembership.workspaceId !== input.workspaceId) {
    throw new Error("Workspace access is denied.");
  }

  if (!canEditWorkspaceSettings(input.actorMembership.role)) {
    throw new Error("You do not have permission to update institutional controls.");
  }

  const workspace = await getWorkspaceRecordById(input.workspaceId);
  if (workspace === null) {
    throw new Error("Workspace not found.");
  }

  const validatedControls = workspaceInstitutionalControlsSchema.parse(input.controls);
  const operation = createOperationContext({
    operation: "workspace.institutional_controls.update",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
  });

  const updatedWorkspace = await updateWorkspaceSettings({
    workspaceId: input.workspaceId,
    settings: {
      ...workspace.settings,
      institutionalControls: validatedControls,
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    actorType: "user",
    action: "workspace.institutional_controls.updated",
    entityType: "workspace",
    entityId: updatedWorkspace.id,
    requestId: operation.requestId,
    changes: {
      dataRetentionPreference: validatedControls.dataRetention.preference,
      exportRequestsVisible: validatedControls.requestVisibility.exportRequestsVisible,
      deleteRequestsVisible: validatedControls.requestVisibility.deleteRequestsVisible,
      auditVisibleToWorkspaceAdmins: validatedControls.auditAccess.visibleToWorkspaceAdmins,
    },
    metadata: {
      actorEmail: input.actorEmail,
      providerSummaryVisible: validatedControls.providerVisibility.configurationSummaryVisible,
    },
  });

  operation.logger.info("Institutional controls updated", {
    dataRetentionPreference: validatedControls.dataRetention.preference,
    exportRequestsVisible: validatedControls.requestVisibility.exportRequestsVisible,
    deleteRequestsVisible: validatedControls.requestVisibility.deleteRequestsVisible,
  });

  return updatedWorkspace;
}




