import { randomUUID } from "node:crypto";

import {
  createConsoleLogger,
  listBufferedLogEntries,
  type LogContext,
  type StructuredLogger,
} from "@ceg/observability";

export type OperationContext = {
  requestId: string;
  logger: StructuredLogger;
};

function normalizeContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  ) as LogContext;
}

export function createOperationContext(input: {
  operation: string;
  requestId?: string;
  workspaceId?: string | null;
  userId?: string | null;
  campaignId?: string | null;
  prospectId?: string | null;
}): OperationContext {
  const requestId = input.requestId ?? randomUUID();
  const baseContext = normalizeContext({
    requestId,
    operation: input.operation,
    workspaceId: input.workspaceId ?? null,
    userId: input.userId ?? null,
    campaignId: input.campaignId ?? null,
    prospectId: input.prospectId ?? null,
  });

  return {
    requestId,
    logger: createConsoleLogger(baseContext),
  };
}

export function listRecentOperationLogs(input: {
  workspaceId?: string;
  requestId?: string;
  limit?: number;
} = {}) {
  return listBufferedLogEntries(input);
}
