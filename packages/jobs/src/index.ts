import {
  prospectAsyncOperationsSchema,
  type AsyncOperationKind,
  type AsyncOperationRunState,
  type ProspectAsyncOperations,
} from "@ceg/validation";

export type { AsyncOperationKind, ProspectAsyncOperations } from "@ceg/validation";

export const jobsBoundary = {
  name: "@ceg/jobs",
  purpose: "Background job orchestration contracts",
} as const;

const JOB_KEY_MAP = {
  prospect_research: "prospectResearch",
  sequence_generation: "sequenceGeneration",
  reply_analysis: "replyAnalysis",
  reply_drafting: "replyDrafting",
} as const satisfies Record<AsyncOperationKind, keyof ProspectAsyncOperations>;

const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;

function getJobKey(kind: AsyncOperationKind): keyof ProspectAsyncOperations {
  return JOB_KEY_MAP[kind as keyof typeof JOB_KEY_MAP];
}

export type AsyncOperationBeginResult = {
  accepted: boolean;
  reason: "started" | "already_running";
  state: AsyncOperationRunState;
  nextOperations: ProspectAsyncOperations;
};

function createIdleState(kind: AsyncOperationKind): AsyncOperationRunState {
  return {
    kind,
    status: "idle",
    idempotencyKey: null,
    requestId: null,
    attemptCount: 0,
    startedAt: null,
    finishedAt: null,
    lastTriggeredAt: null,
    lastSucceededAt: null,
    errorSummary: null,
    resultSummary: {},
    updatedAt: null,
  };
}

export function readProspectAsyncOperations(metadata: unknown): ProspectAsyncOperations {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const candidate = (metadata as Record<string, unknown>).asyncOperations;
  const parsed = prospectAsyncOperationsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : {};
}

export function getAsyncOperationState(
  operations: ProspectAsyncOperations,
  kind: AsyncOperationKind,
): AsyncOperationRunState {
  return operations[getJobKey(kind)] ?? createIdleState(kind);
}

export function beginAsyncOperationRun(input: {
  operations: ProspectAsyncOperations;
  kind: AsyncOperationKind;
  requestId?: string | null;
  idempotencyKey: string;
  now?: Date;
  staleAfterMs?: number;
}): AsyncOperationBeginResult {
  const now = input.now ?? new Date();
  const staleAfterMs = input.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const current = getAsyncOperationState(input.operations, input.kind);
  const startedAt = current.startedAt instanceof Date ? current.startedAt : null;
  const runningStillFresh =
    current.status === "running" &&
    startedAt !== null &&
    now.getTime() - startedAt.getTime() < staleAfterMs;

  if (runningStillFresh) {
    return {
      accepted: false,
      reason: "already_running",
      state: current,
      nextOperations: input.operations,
    };
  }

  const nextState: AsyncOperationRunState = {
    kind: input.kind,
    status: "running",
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId ?? null,
    attemptCount: current.attemptCount + 1,
    startedAt: now,
    finishedAt: null,
    lastTriggeredAt: now,
    lastSucceededAt: current.lastSucceededAt ?? null,
    errorSummary: null,
    resultSummary: current.resultSummary ?? {},
    updatedAt: now,
  };

  return {
    accepted: true,
    reason: "started",
    state: nextState,
    nextOperations: {
      ...input.operations,
      [getJobKey(input.kind)]: nextState,
    },
  };
}

export function completeAsyncOperationRun(input: {
  operations: ProspectAsyncOperations;
  kind: AsyncOperationKind;
  requestId?: string | null;
  resultSummary?: Record<string, unknown>;
  now?: Date;
}): ProspectAsyncOperations {
  const now = input.now ?? new Date();
  const current = getAsyncOperationState(input.operations, input.kind);
  const nextState: AsyncOperationRunState = {
    ...current,
    kind: input.kind,
    requestId: input.requestId ?? current.requestId ?? null,
    status: "succeeded",
    finishedAt: now,
    lastSucceededAt: now,
    errorSummary: null,
    resultSummary: input.resultSummary ?? current.resultSummary ?? {},
    updatedAt: now,
  };

  return {
    ...input.operations,
    [getJobKey(input.kind)]: nextState,
  };
}

export function failAsyncOperationRun(input: {
  operations: ProspectAsyncOperations;
  kind: AsyncOperationKind;
  requestId?: string | null;
  errorSummary: string;
  resultSummary?: Record<string, unknown>;
  now?: Date;
}): ProspectAsyncOperations {
  const now = input.now ?? new Date();
  const current = getAsyncOperationState(input.operations, input.kind);
  const nextState: AsyncOperationRunState = {
    ...current,
    kind: input.kind,
    requestId: input.requestId ?? current.requestId ?? null,
    status: "failed",
    finishedAt: now,
    errorSummary: input.errorSummary,
    resultSummary: input.resultSummary ?? current.resultSummary ?? {},
    updatedAt: now,
  };

  return {
    ...input.operations,
    [getJobKey(input.kind)]: nextState,
  };
}

export function buildProspectAsyncOperationsMetadata(input: {
  metadata: Record<string, unknown> | null | undefined;
  operations: ProspectAsyncOperations;
}): Record<string, unknown> {
  return {
    ...(input.metadata ?? {}),
    asyncOperations: prospectAsyncOperationsSchema.parse(input.operations),
  };
}



