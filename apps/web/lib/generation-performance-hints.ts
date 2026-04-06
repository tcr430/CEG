import {
  campaignPerformanceSnapshotSchema,
  generationPerformanceHintsSchema,
  trainingSignalPayloadSchema,
  type CampaignPerformanceSnapshot,
  type GenerationPerformanceHints,
  type TrainingSignalPayload,
  type UsageEvent,
} from "@ceg/validation";

type HintArtifactKind = "sequence" | "reply";

type HintSignal = TrainingSignalPayload & {
  occurredAt: Date;
};

type PatternDefinition = {
  key: GenerationPerformanceHints["effectivePatterns"][number]["key"];
  matches: (text: string) => boolean;
  guidance: {
    prefer: string;
    caution: string;
  };
};

const MIN_HINT_SAMPLE_SIZE = 3;
const MIN_TONE_SUPPORT = 2;
const MIN_PATTERN_SUPPORT = 2;
const SUCCESS_ACTIONS = new Set(["selected", "copied", "exported", "positive_outcome"]);
const NEGATIVE_ACTIONS = new Set(["negative_outcome"]);

const sequencePatterns: PatternDefinition[] = [
  {
    key: "soft_cta",
    matches: (text) =>
      /\b(open to|if useful|would it be helpful|happy to share|happy to send|worth a quick)\b/i.test(
        text,
      ),
    guidance: {
      prefer: "Low-pressure CTA language has performed better in recent accepted sequence outputs.",
      caution: "Low-pressure CTA language has not clearly helped in recent sequence outputs.",
    },
  },
  {
    key: "direct_cta",
    matches: (text) =>
      /\b(15 min|15-minute|quick call|book time|schedule|calendar)\b/i.test(text),
    guidance: {
      prefer: "Direct meeting asks have performed better in recent accepted sequence outputs.",
      caution: "Direct meeting asks have underperformed relative to other sequence patterns.",
    },
  },
  {
    key: "evidence_led_personalization",
    matches: (text) =>
      /\b(noticed|saw|based on|because you|from your site|on your site|your team)\b/i.test(text),
    guidance: {
      prefer:
        "Evidence-led personalization has performed better in recent accepted sequence outputs.",
      caution:
        "Evidence-led personalization has not shown a clear lift in recent sequence history.",
    },
  },
  {
    key: "concise_structure",
    matches: (text) => normalizeComparableText(text).length <= 500,
    guidance: {
      prefer: "Shorter, tighter sequence copy has performed better in recent accepted outputs.",
      caution: "Recent sequence history does not support pushing for extra-short copy by default.",
    },
  },
];

const replyPatterns: PatternDefinition[] = [
  {
    key: "soft_cta",
    matches: (text) =>
      /\b(if useful|happy to share|happy to send|open to|would it help)\b/i.test(text),
    guidance: {
      prefer: "Low-pressure next steps have performed better in recent accepted reply drafts.",
      caution: "Low-pressure next steps have not clearly improved reply draft outcomes recently.",
    },
  },
  {
    key: "courteous_closure",
    matches: (text) =>
      /\b(understood|appreciate the clarity|thanks for letting me know|i'll close the loop|won't keep following up)\b/i.test(
        text,
      ),
    guidance: {
      prefer:
        "Courteous acknowledgement and graceful closure have performed better on recent reply handling.",
      caution:
        "Graceful closure language has not been a strong differentiator in recent reply handling.",
    },
  },
  {
    key: "clarifying_question",
    matches: (text) =>
      /\?|could you share|would it help to clarify|what would be most useful/i.test(text),
    guidance: {
      prefer: "Clarifying questions have performed better in recent accepted reply drafts.",
      caution: "Clarifying questions have not shown a clear lift in recent reply draft history.",
    },
  },
  {
    key: "concise_structure",
    matches: (text) => normalizeComparableText(text).length <= 420,
    guidance: {
      prefer: "Concise reply drafts have performed better in recent accepted outputs.",
      caution: "Reply history does not strongly support extra-short drafts by default.",
    },
  },
];

function normalizeComparableText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function toHintSignal(event: UsageEvent): HintSignal | null {
  const candidate =
    typeof event.metadata === "object" && event.metadata !== null
      ? (event.metadata as Record<string, unknown>).trainingSignal
      : null;
  const parsed = trainingSignalPayloadSchema.safeParse(candidate);

  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    occurredAt: event.occurredAt,
  };
}

function matchesArtifactKind(signal: HintSignal, kind: HintArtifactKind): boolean {
  return kind === "sequence"
    ? signal.artifactType.startsWith("sequence_")
    : signal.artifactType.startsWith("draft_reply");
}

function getPatternDefinitions(kind: HintArtifactKind): PatternDefinition[] {
  return kind === "sequence" ? sequencePatterns : replyPatterns;
}

function readToneStyle(signal: HintSignal): string | null {
  return signal.senderProfileSnapshot?.toneStyle ?? signal.campaignSnapshot?.toneStyle ?? null;
}

function determineConfidence(sampleSize: number): GenerationPerformanceHints["confidence"] {
  if (sampleSize >= 8) {
    return "high";
  }

  if (sampleSize >= 5) {
    return "medium";
  }

  return "low";
}

export function extractHintSignalsFromUsageEvents(input: {
  events: UsageEvent[];
  kind: HintArtifactKind;
}): HintSignal[] {
  return input.events
    .map(toHintSignal)
    .filter((signal): signal is HintSignal => signal !== null)
    .filter((signal) => matchesArtifactKind(signal, input.kind))
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
}

export function buildGenerationPerformanceHintsFromSignals(input: {
  kind: HintArtifactKind;
  sourceScope: GenerationPerformanceHints["sourceScope"];
  signals: HintSignal[];
  campaignPerformance?: CampaignPerformanceSnapshot | null;
}): GenerationPerformanceHints {
  const campaignPerformance =
    input.campaignPerformance == null
      ? null
      : campaignPerformanceSnapshotSchema.parse(input.campaignPerformance);
  const successfulSignals = input.signals.filter((signal) => SUCCESS_ACTIONS.has(signal.actionType));
  const negativeSignals = input.signals.filter((signal) => NEGATIVE_ACTIONS.has(signal.actionType));
  const sampleSize = successfulSignals.length + negativeSignals.length;

  if (sampleSize < MIN_HINT_SAMPLE_SIZE) {
    return generationPerformanceHintsSchema.parse({
      available: false,
      sampleSize,
      sourceScope: input.sourceScope === "none" ? "none" : input.sourceScope,
      confidence: "low",
      preferredToneStyle: null,
      effectivePatterns: [],
      cautionPatterns: [],
      notes: [
        "No strong historical signal yet, so generation should rely on current sender, campaign, and prospect context first.",
      ],
    });
  }

  const toneCounts = new Map<string, number>();
  for (const signal of successfulSignals) {
    const toneStyle = readToneStyle(signal);
    if (!toneStyle) {
      continue;
    }

    toneCounts.set(toneStyle, (toneCounts.get(toneStyle) ?? 0) + 1);
  }

  const preferredToneEntry = [...toneCounts.entries()].sort((left, right) => right[1] - left[1])[0];
  const preferredToneStyle =
    preferredToneEntry && preferredToneEntry[1] >= MIN_TONE_SUPPORT ? preferredToneEntry[0] : null;

  const effectivePatterns: GenerationPerformanceHints["effectivePatterns"] = [];
  const cautionPatterns: GenerationPerformanceHints["cautionPatterns"] = [];

  for (const pattern of getPatternDefinitions(input.kind)) {
    const positiveSignals = successfulSignals.filter((signal) =>
      signal.afterText ? pattern.matches(signal.afterText) : false,
    ).length;
    const negativeMatches = negativeSignals.filter((signal) =>
      signal.afterText ? pattern.matches(signal.afterText) : false,
    ).length;

    if (positiveSignals >= MIN_PATTERN_SUPPORT && positiveSignals > negativeMatches) {
      effectivePatterns.push({
        key: pattern.key,
        guidance: pattern.guidance.prefer,
        positiveSignals,
        negativeSignals: negativeMatches,
      });
      continue;
    }

    if (negativeMatches >= MIN_PATTERN_SUPPORT && negativeMatches > positiveSignals) {
      cautionPatterns.push({
        key: pattern.key,
        guidance: pattern.guidance.caution,
        positiveSignals,
        negativeSignals: negativeMatches,
      });
    }
  }

  const notes = [
    input.sourceScope === "campaign"
      ? "Hints are based on this campaign's recent accepted and outcome-linked artifacts."
      : "Campaign-specific history was thin, so hints are based on broader workspace history.",
  ];

  if (campaignPerformance?.positiveReplyRate != null && campaignPerformance.outboundMessages >= 5) {
    notes.push(
      `Current campaign positive reply rate is ${(campaignPerformance.positiveReplyRate * 100).toFixed(0)}% across ${campaignPerformance.outboundMessages} sent messages.`,
    );
  }

  if (effectivePatterns.length === 0 && cautionPatterns.length === 0 && preferredToneStyle === null) {
    notes.push(
      "Historical volume exists, but no stable tone or text pattern has cleared the minimum support threshold yet.",
    );
  }

  return generationPerformanceHintsSchema.parse({
    available:
      preferredToneStyle !== null ||
      effectivePatterns.length > 0 ||
      cautionPatterns.length > 0,
    sampleSize,
    sourceScope: input.sourceScope,
    confidence: determineConfidence(sampleSize),
    preferredToneStyle,
    effectivePatterns,
    cautionPatterns,
    notes,
  });
}
