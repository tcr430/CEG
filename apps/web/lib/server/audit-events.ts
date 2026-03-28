import {
  createInMemoryAuditEventRepository,
  type AuditEventRepository,
} from "@ceg/database";

declare global {
  var __cegSharedAuditEventRepository: AuditEventRepository | undefined;
}

export function getSharedAuditEventRepository(): AuditEventRepository {
  if (globalThis.__cegSharedAuditEventRepository === undefined) {
    globalThis.__cegSharedAuditEventRepository =
      createInMemoryAuditEventRepository();
  }

  return globalThis.__cegSharedAuditEventRepository;
}
