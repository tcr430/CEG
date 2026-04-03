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
        sender: "Capture the rep, company positioning, and proof points before SDR outreach scales.",
        campaign:
          "Turn the offer, ICP, and talk track into one campaign brief your SDR workflow can reuse.",
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
          "Capture the agency offer, delivery model, and proof points before you run client-facing outbound.",
        campaign:
          "Turn the offer, ICP, and delivery angle into a reusable campaign brief for agency execution.",
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
          "Capture sender context early so later outreach stays sharper, more credible, and easier to review.",
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
    title: "Create the first campaign brief",
    description: audience.campaign,
    nextAction: "Create one campaign so research and sequence generation have a clear operating brief.",
  };
}

export function getProspectsEmptyState(
  userType: SenderProfileType | null | undefined,
): EmptyStateGuidance {
  const audience = resolveAudienceContext(userType);

  return {
    title: "Add the first prospect",
    description: audience.prospect,
    nextAction: "Add a company and website so this campaign can move into research and outreach preparation.",
  };
}

export function getResearchEmptyState(input: {
  userType: SenderProfileType | null | undefined;
  hasWebsite: boolean;
}): EmptyStateGuidance {
  const audience = resolveAudienceContext(input.userType);

  return {
    title: input.hasWebsite ? "Run the first website pass" : "Add a public website, then run research",
    description: input.hasWebsite
      ? `${audience.prospect} The first pass will preserve grounded company context, evidence, and confidence flags.`
      : "Website research starts from one public company URL and stores a structured snapshot with evidence and confidence signals.",
    nextAction: input.hasWebsite
      ? "Run website research to capture a structured company profile before personalizing outreach."
      : "Add the prospect website and run one research pass to establish a grounded company profile.",
  };
}

export function getSequenceEmptyState(input: {
  userType: SenderProfileType | null | undefined;
  hasResearch: boolean;
}): EmptyStateGuidance {
  const audience = resolveAudienceContext(input.userType);

  return {
    title: "Generate the first sequence",
    description: input.hasResearch
      ? `${audience.campaign} The stored research snapshot will help keep the sequence more specific to this prospect.`
      : `${audience.campaign} You can generate now in basic mode, but output quality improves once research is available.`,
    nextAction: input.hasResearch
      ? "Generate a sequence from the campaign brief, sender context, and latest research snapshot."
      : "Run research first if possible, then generate a sequence with better grounded personalization.",
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
      nextAction: "Paste the latest prospect reply so analysis and drafting can start from the real thread.",
    };
  }

  if (input.state === "needs_analysis") {
    return {
      title: "Analyze the latest reply",
      description:
        "Reply analysis classifies intent, identifies objections where present, and recommends the next action before any draft is generated.",
      nextAction: "Run reply analysis first so draft responses stay grounded in the actual inbound message.",
    };
  }

  return {
    title: "Generate the first reply drafts",
    description:
      "Draft replies stay versioned, quality-checked, and aligned to the latest stored analysis so manual review stays efficient.",
    nextAction: "Generate reply drafts to create three response options for the latest analyzed inbound message.",
  };
}
