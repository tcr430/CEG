import {
  createInMemorySubscriptionRepository,
  type SubscriptionRepository,
} from "@ceg/database";


declare global {
  var __cegSubscriptionRepository: SubscriptionRepository | undefined;
}

export function getSharedSubscriptionRepository(): SubscriptionRepository {
  if (globalThis.__cegSubscriptionRepository === undefined) {
    globalThis.__cegSubscriptionRepository =
      createInMemorySubscriptionRepository();
  }

  return globalThis.__cegSubscriptionRepository;
}
