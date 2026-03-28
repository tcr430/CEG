import type { CreateUsageEventInput, UsageEvent } from "@ceg/validation";

export type UsageEventRepository = {
  createUsageEvent(input: CreateUsageEventInput): Promise<UsageEvent>;
  listUsageEventsByWorkspace(workspaceId: string): Promise<UsageEvent[]>;
  listUsageEventsByWorkspaceAndOccurredAtRange(input: {
    workspaceId: string;
    occurredFrom: Date;
    occurredTo: Date;
  }): Promise<UsageEvent[]>;
};
