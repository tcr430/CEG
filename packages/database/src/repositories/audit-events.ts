import type { AuditEvent, CreateAuditEventInput } from "@ceg/validation";

export type AuditEventRepository = {
  createAuditEvent(input: CreateAuditEventInput): Promise<AuditEvent>;
  listAuditEventsByWorkspace(workspaceId: string): Promise<AuditEvent[]>;
  listRecentAuditEventsByWorkspace(input: {
    workspaceId: string;
    limit?: number;
  }): Promise<AuditEvent[]>;
};
