import type { CreateUsageEventInput, UsageEvent } from "@ceg/validation";

export type UsageEventRepository = {
  createUsageEvent(input: CreateUsageEventInput): Promise<UsageEvent>;
};
