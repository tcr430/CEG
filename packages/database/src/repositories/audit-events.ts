import type { AuditEvent, CreateAuditEventInput } from "@ceg/validation";

export type AuditEventRepository = {
  createAuditEvent(input: CreateAuditEventInput): Promise<AuditEvent>;
};
