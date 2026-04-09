import type { SenderProfileType } from "@ceg/validation";

type EmptyStateGuidance = {
  title: string;
  description: string;
  nextAction: string;
};

function resolveAudienceContext(userType: SenderProfileType | null | undefined) {
  switch (userType) {
    case "sdr":
      return {
        sender: "Capture the rep, company positioning, and proof points before SDR outreach scales across accounts.",
        campaign:
          "Turn the offer, ICP, and talk track into one campaign brief your SDR workflow can reuse and review.",
        prospect:
          "Add one live account so SDR research and sequencing stay tied to a real buying context.",
      };
    case "saas_founder":
      return {
        sender:
          "Capture founder voice, product context, and credibility points before founder-led outreach goes live.",
        campaign:
          "Turn the product story, ICP, and founder tone into a campaign brief you can refine over time.",
        prospect:
          "Add one target company so founder-led research and messaging start from a real account.",
      };
    case "agency":
      return {
        sender:
          "Capture the agency offer, client positioning, delivery model, and proof points before you run client-facing outbound.",
        campaign:
          "Turn the offer, ICP, and delivery angle into a reusable campaign brief for agency execution across client work.",
        prospect:
          "Add one account so research, sequences, and reply handling stay grounded in a real client target.",
      };
    case "basic":
      return {
        sender:
          "Basic mode is available now, but a sender profile will sharpen tone, claims, and CTA choices later.",
        campaign:
          "Basic mode can start the workflow, with room to attach richer sender context once it is ready.",
        prospect:
          "Add one prospect so the workflow can move from setup into research and generation immediately.",
      };
    default:
      return {
        sender:
          "Capture sender context early so later outreach stays sharper, more credible, and easier for a team to review.",
        campaign:
          "Turn the offer, ICP, and tone into a reusable campaign brief before generation begins.",
        prospect:
          "Add one prospect so research, sequencing, and reply handling all start from real account data.",
      };
  }
}

export function getSenderProfilesEmptyState(
  userType: SenderProfileType | null | undefined,
): EmptyStateGuidance {
  const audience = resolveAudienceContext(userType);

  return {
    title: "Create the first sender profile",
    description: audience.sender,
    nextAction: "Create one sender profile, or continue in basic mode until richer context is ready.",
  };
}

export function getCampaignsEmptyState(
  userType: SenderProfileType | null | undefined,
): EmptyStateGuidance {
  const audience = resolveAudienceContext(userType);

  return {
    title: "Create the first client campaign brief",
    description: audience.campaign,
    nextAction: "Create one campaign so the workflow can move from setup into target accounts, research, drafting, review, and later reply handling.",
  };
}

export function getProspectsEmptyState(
  userType: SenderProfileType | null | undefined,
): EmptyStateGuidance {
  const audience = resolveAudienceContext(userType);

  return {
    title: "Add the first prospect",
    description: audience.prospect,
    nextAction: "Add a company and website so this campaign can move into research, reviewed drafts, and later thread handling.",
  };
}

export function getResearchEmptyState(input: {
  userType: SenderProfileType | null | undefined;
  hasWebsite: boolean;
}): EmptyStateGuidance {
  const audience = resolveAudienceContext(input.userType);

  return {
    title: input.hasWebsite ? "Start the research stage" : "Add a public website, then start research",
    description: input.hasWebsite
      ? `${audience.prospect} The first pass will preserve grounded company context, evidence, and confidence flags.`
      : "Website research starts from one public company URL and stores a structured snapshot with evidence and confidence signals.",
    nextAction: input.hasWebsite
      ? "Run website research to capture a structured company profile before drafting and review."
      : "Add the prospect website and run one research pass to establish grounded context for the rest of the workflow.",
  };
}

export function getSequenceEmptyState(input: {
  userType: SenderProfileType | null | undefined;
  hasResearch: boolean;
}): EmptyStateGuidance {
  const audience = resolveAudienceContext(input.userType);

  return {
    title: "Create the first sequence draft",
    description: input.hasResearch
      ? `${audience.campaign} The stored research snapshot will help keep the sequence more specific to this prospect.`
      : `${audience.campaign} You can generate now in basic mode, but output quality improves once research is available.`,
    nextAction: input.hasResearch
      ? "Create a sequence draft from the campaign brief, sender context, and latest research snapshot, then review it before use."
      : "Run research first if possible, then draft the sequence with better grounded personalization and a clearer review path.",
  };
}

export function getReplyDraftsEmptyState(input: {
  userType: SenderProfileType | null | undefined;
  state: "needs_inbound" | "needs_analysis" | "needs_drafts";
}): EmptyStateGuidance {
  const audience = resolveAudienceContext(input.userType);

  if (input.state === "needs_inbound") {
    return {
      title: "Store the first inbound reply",
      description: `${audience.prospect} Once an inbound message is saved, the thread can classify intent and prepare response options.`,
      nextAction: "Paste the latest prospect reply so analysis, reply drafting, and thread history stay connected to the real conversation.",
    };
  }

  if (input.state === "needs_analysis") {
    return {
      title: "Analyze the latest reply",
      description:
        "Reply analysis classifies intent, identifies objections where present, and recommends the next action before any draft is generated.",
      nextAction: "Run reply analysis first so the workflow can classify the reply before anyone drafts the response.",
    };
  }

  return {
    title: "Create the first reply-draft set",
    description:
      "Draft replies stay versioned, quality-checked, and aligned to the latest stored analysis so manual review stays efficient across client work.",
    nextAction: "Create reply draft options so the team can review response paths and decide what gets used.",
  };
}

