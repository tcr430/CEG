const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

const USER_FACING_ERROR_MAP: Array<{
  pattern: RegExp;
  code: string;
  message: string;
}> = [
  {
    pattern: /supabase.*not.*configured/i,
    code: "auth-not-configured",
    message: "Sign-in is not configured yet. Add the required environment variables and try again.",
  },
  {
    pattern: /missing email/i,
    code: "missing-email",
    message: "Enter a work email to continue.",
  },
  {
    pattern: /auth session missing|not authenticated/i,
    code: "auth-required",
    message: "Sign in to continue.",
  },
  {
    pattern: /workspace.*access.*denied|access to workspace/i,
    code: "workspace-access-denied",
    message: "You do not have access to that workspace.",
  },
  {
    pattern: /workspace id.*required/i,
    code: "missing-workspace",
    message: "Select a workspace and try again.",
  },
  {
    pattern: /workspace setup pending|no workspace memberships/i,
    code: "workspace-not-ready",
    message: "This account does not have a workspace yet.",
  },
  {
    pattern: /sender profile not found/i,
    code: "sender-profile-not-found",
    message: "That sender profile could not be found.",
  },
  {
    pattern: /campaign not found/i,
    code: "campaign-not-found",
    message: "That campaign could not be found.",
  },
  {
    pattern: /prospect not found/i,
    code: "prospect-not-found",
    message: "That prospect could not be found.",
  },
  {
    pattern: /website url.*required|public website url/i,
    code: "missing-website-url",
    message: "Add a public website URL to run research.",
  },
  {
    pattern: /unsafe url|invalid url|private host|localhost|blocked port/i,
    code: "invalid-website-url",
    message: "Use a valid public website URL. Private or local addresses are not allowed.",
  },
  {
    pattern: /sequence before/i,
    code: "sequence-required",
    message: "Generate a sequence first, then try that action again.",
  },
  {
    pattern: /inbound reply.*not.*stored|no inbound reply/i,
    code: "reply-required",
    message: "Save an inbound reply before analyzing it.",
  },
  {
    pattern: /analyze.*before generating drafts/i,
    code: "reply-analysis-required",
    message: "Analyze the latest inbound reply before generating drafts.",
  },
  {
    pattern: /hard_no/i,
    code: "hard-no",
    message: "This prospect looks like a hard no. Keep follow-up light and respectful.",
  },
  {
    pattern: /already been added to this thread/i,
    code: "sequence-already-added",
    message: "The latest generated sequence is already attached to this thread.",
  },
  {
    pattern: /no stripe customer/i,
    code: "billing-portal-unavailable",
    message: "Billing portal becomes available after the first successful checkout syncs.",
  },
  {
    pattern: /feature .* not available|plan does not include|not included on the current plan/i,
    code: "feature-not-included",
    message: "That feature is not included on the current plan.",
  },
  {
    pattern: /monthly usage limit|usage limit|quota/i,
    code: "usage-limit-reached",
    message: "This workspace has reached its plan limit for that action this month.",
  },
];

export type UserFacingError = {
  code: string;
  message: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : DEFAULT_ERROR_MESSAGE;
}

export function toUserFacingError(error: unknown, fallbackMessage: string = DEFAULT_ERROR_MESSAGE): UserFacingError {
  const message = getErrorMessage(error);
  const matched = USER_FACING_ERROR_MAP.find((entry) => entry.pattern.test(message));

  if (matched) {
    return {
      code: matched.code,
      message: matched.message,
    };
  }

  return {
    code: "unknown-error",
    message: fallbackMessage,
  };
}

export function encodeUserFacingError(error: unknown, fallbackMessage?: string) {
  return encodeURIComponent(toUserFacingError(error, fallbackMessage).message);
}

export function decodeUserFacingMessage(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
