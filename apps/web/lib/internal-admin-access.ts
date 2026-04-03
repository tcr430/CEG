import { canManageWorkspace, type WorkspaceMembership } from "@ceg/auth";

export function parseInternalAdminEmails(value: string | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function canAccessInternalAdminView(input: {
  email?: string | null;
  membership: WorkspaceMembership | null;
  allowedEmails: readonly string[];
}): boolean {
  if (input.membership === null || input.email == null) {
    return false;
  }

  return (
    canManageWorkspace(input.membership) &&
    input.allowedEmails.includes(input.email.trim().toLowerCase())
  );
}

export function getInternalAdminAllowedEmails(): string[] {
  return parseInternalAdminEmails(process.env.INTERNAL_ADMIN_EMAILS);
}

export function isInternalAdminEnabled(): boolean {
  return getInternalAdminAllowedEmails().length > 0;
}
