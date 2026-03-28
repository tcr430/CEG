import {
  createInMemoryUsageEventRepository,
  type UsageEventRepository,
} from "@ceg/database";

declare global {
  var __cegSharedUsageEventRepository: UsageEventRepository | undefined;
}

export function getSharedUsageEventRepository(): UsageEventRepository {
  if (globalThis.__cegSharedUsageEventRepository === undefined) {
    globalThis.__cegSharedUsageEventRepository =
      createInMemoryUsageEventRepository();
  }

  return globalThis.__cegSharedUsageEventRepository;
}
