import {
  assertRequiredStringFields,
  findDiscouragedFluff,
  findHardNoPushiness,
  findUnsupportedClaims,
} from "./harness.js";
import type { EvaluationExpectedProperty } from "./golden-examples.js";

type SafeParseIssue = {
  path: Array<string | number>;
  message: string;
};

type SafeParseSuccess<TOutput> = {
  success: true;
  data: TOutput;
};

type SafeParseFailure = {
  success: false;
  error: {
    issues: SafeParseIssue[];
  };
};

export type EvalSchema<TOutput> = {
  safeParse(input: unknown): SafeParseSuccess<TOutput> | SafeParseFailure;
};

export type EvalWorkflowName =
  | "research_profile_extraction"
  | "sequence_generation"
  | "reply_analysis"
  | "reply_drafting";

export type WorkflowEvalCheck = {
  name:
    | "schema_correctness"
    | "required_fields_presence"
    | "no_unsupported_claims_markers"
    | "no_hard_no_pushiness"
    | "tone_consistency"
    | "no_discouraged_fluff";
  passed: boolean;
  details: string;
};

export type WorkflowEvalCase<TOutput> = {
  id: string;
  workflow: EvalWorkflowName;
  description: string;
  schema: EvalSchema<TOutput>;
  output: unknown;
  expectedProperties: EvaluationExpectedProperty[];
  textBlocks: string[];
  discouragedPatterns?: string[];
  toneAvoidPhrases?: string[];
  enforceHardNoGuard?: boolean;
};

export type WorkflowEvalResult = {
  id: string;
  workflow: EvalWorkflowName;
  passed: boolean;
  checks: WorkflowEvalCheck[];
};

export type WorkflowEvalSuiteSummary = {
  totalCases: number;
  passedCases: number;
  failedCases: number;
};

export type WorkflowEvalSuiteResult = {
  summary: WorkflowEvalSuiteSummary;
  results: WorkflowEvalResult[];
};

function hasPresentProperty(candidate: Record<string, unknown>, key: string): boolean {
  const value = candidate[key];

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return value !== null && value !== undefined;
}

function evaluateRequiredProperties(
  output: unknown,
  expectedProperties: EvaluationExpectedProperty[],
): WorkflowEvalCheck {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return {
      name: "required_fields_presence",
      passed: false,
      details: "Output is not an object, so required-field checks could not run.",
    };
  }

  const requiredStringFields = expectedProperties
    .filter((property) => property.required)
    .map((property) => property.key)
    .filter((propertyKey) => {
      const value = (output as Record<string, unknown>)[propertyKey];
      return typeof value === "string";
    });
  const missingStringFields = assertRequiredStringFields(
    output as Record<string, unknown>,
    requiredStringFields,
  );
  const missingOtherFields = expectedProperties
    .filter((property) => property.required)
    .map((property) => property.key)
    .filter((propertyKey) => !hasPresentProperty(output as Record<string, unknown>, propertyKey))
    .filter((propertyKey) => !missingStringFields.includes(propertyKey));
  const missingFields = [...missingStringFields, ...missingOtherFields];

  return {
    name: "required_fields_presence",
    passed: missingFields.length === 0,
    details:
      missingFields.length === 0
        ? "All required output fields were present."
        : `Missing required output fields: ${missingFields.join(", ")}.`,
  };
}

function evaluateTextRules(input: {
  textBlocks: string[];
  discouragedPatterns?: string[];
  toneAvoidPhrases?: string[];
  enforceHardNoGuard?: boolean;
}): WorkflowEvalCheck[] {
  const combinedText = input.textBlocks.join("\n\n");
  const unsupportedClaims = findUnsupportedClaims(combinedText);
  const discouragedFluff = findDiscouragedFluff(combinedText);
  const hardNoPushiness = input.enforceHardNoGuard
    ? findHardNoPushiness(combinedText)
    : [];
  const toneAvoidMatches = (input.toneAvoidPhrases ?? []).filter((phrase) =>
    combinedText.toLowerCase().includes(phrase.toLowerCase()),
  );
  const discouragedPatternMatches = (input.discouragedPatterns ?? []).filter((phrase) =>
    combinedText.toLowerCase().includes(phrase.toLowerCase()),
  );

  return [
    {
      name: "no_unsupported_claims_markers",
      passed: unsupportedClaims.length === 0,
      details:
        unsupportedClaims.length === 0
          ? "No unsupported-claim markers were detected."
          : `Unsupported-claim markers detected: ${unsupportedClaims.join(", ")}.`,
    },
    {
      name: "no_hard_no_pushiness",
      passed: hardNoPushiness.length === 0,
      details:
        hardNoPushiness.length === 0
          ? "No hard-no pushiness markers were detected."
          : `Hard-no pushiness markers detected: ${hardNoPushiness.join(", ")}.`,
    },
    {
      name: "tone_consistency",
      passed: toneAvoidMatches.length === 0,
      details:
        toneAvoidMatches.length === 0
          ? "Output stayed within the configured tone-avoid list."
          : `Tone-avoid phrases detected: ${toneAvoidMatches.join(", ")}.`,
    },
    {
      name: "no_discouraged_fluff",
      passed: discouragedFluff.length === 0 && discouragedPatternMatches.length === 0,
      details:
        discouragedFluff.length === 0 && discouragedPatternMatches.length === 0
          ? "No discouraged fluff markers were detected."
          : `Discouraged fluff markers detected: ${[
              ...discouragedFluff,
              ...discouragedPatternMatches,
            ].join(", ")}.`,
    },
  ];
}

export function runWorkflowEvalCase<TOutput>(
  input: WorkflowEvalCase<TOutput>,
): WorkflowEvalResult {
  const parsed = input.schema.safeParse(input.output);
  const schemaCheck: WorkflowEvalCheck = parsed.success
    ? {
        name: "schema_correctness",
        passed: true,
        details: "Output matched the expected schema.",
      }
    : {
        name: "schema_correctness",
        passed: false,
        details: `Schema issues: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
          .join("; ")}.`,
      };

  const requiredFieldsCheck = evaluateRequiredProperties(
    parsed.success ? parsed.data : input.output,
    input.expectedProperties,
  );
  const textChecks = evaluateTextRules({
    textBlocks: input.textBlocks,
    discouragedPatterns: input.discouragedPatterns,
    toneAvoidPhrases: input.toneAvoidPhrases,
    enforceHardNoGuard: input.enforceHardNoGuard,
  });
  const checks = [schemaCheck, requiredFieldsCheck, ...textChecks];

  return {
    id: input.id,
    workflow: input.workflow,
    passed: checks.every((check) => check.passed),
    checks,
  };
}

export function runWorkflowEvalSuite(
  cases: Array<WorkflowEvalCase<unknown>>,
): WorkflowEvalSuiteResult {
  const results = cases.map((testCase) => runWorkflowEvalCase(testCase));
  const passedCases = results.filter((result) => result.passed).length;

  return {
    summary: {
      totalCases: results.length,
      passedCases,
      failedCases: results.length - passedCases,
    },
    results,
  };
}
