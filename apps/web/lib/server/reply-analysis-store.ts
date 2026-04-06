import "server-only";

import {
  createInMemoryReplyAnalysisRepository,
  type ReplyAnalysisRepository,
} from "@ceg/database";

declare global {
  var __cegReplyAnalysisRepository: ReplyAnalysisRepository | undefined;
}

export function getSharedReplyAnalysisRepository(): ReplyAnalysisRepository {
  if (globalThis.__cegReplyAnalysisRepository === undefined) {
    globalThis.__cegReplyAnalysisRepository = createInMemoryReplyAnalysisRepository();
  }

  return globalThis.__cegReplyAnalysisRepository;
}
