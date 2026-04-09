import type { OnboardingStepId, SenderProfileType } from "@ceg/validation";

export type OnboardingPersonaGuidance = {
  userType: SenderProfileType | null;
  audienceLabel: string;
  introTitle: string;
  introBody: string;
  recommendation: string;
  setupFocus: string;
  memoryNote: string;
  senderProfilePrompt: string;
  campaignPrompt: string;
  prospectPrompt: string;
  senderProfileDefaults: {
    name: string;
    companyName: string;
    offer: string;
    targetBuyer: string;
    valueProposition: string;
    proofPoints: string;
    goals: string;
    toneStyle: string;
  };
  campaignDefaults: {
    name: string;
    targetIcp: string;
    offerSummary: string;
    targetIndustries: string;
    frameworkPreferences: string;
    toneStyle: string;
  };
  prospectDefaults: {
    companyName: string;
    companyWebsite: string;
    contactName: string;
    email: string;
  };
};

export type OnboardingNextStepGuidance = {
  title: string;
  description: string;
  expectation: string;
};

const defaultGuidance: OnboardingPersonaGuidance = {
  userType: null,
  audienceLabel: "Agency workflow",
  introTitle: "Set the workflow foundation",
  introBody:
    "Use onboarding to establish reusable context for client work, not just to generate one draft.",
  recommendation:
    "Most teams should start with the agency workflow so sender context, campaign briefs, and prospect research line up around real client delivery.",
  setupFocus:
    "Confirm the workspace, choose the workflow shape, then add the first sender context, campaign brief, and target account.",
  memoryNote:
    "Operational memory starts building as soon as the workspace has real sender, campaign, and prospect records.",
  senderProfilePrompt:
    "Capture the sender context your team will want to reuse across client campaigns.",
  campaignPrompt:
    "Treat the first campaign as a concise client brief the team can review and improve over time.",
  prospectPrompt:
    "One real target account is enough to unlock research, draft review, and reply handling.",
  senderProfileDefaults: {
    name: "Agency workflow profile",
    companyName: "Northfield Growth",
    offer: "Hyperpersonalized outbound campaign support for B2B clients",
    targetBuyer: "Revenue leaders at B2B software companies",
    valueProposition:
      "Help client teams reach better-fit accounts with more credible, research-backed outbound messaging.",
    proofPoints:
      "Manual account research built into every campaign\nStructured messaging review before anything is used\nReusable campaign memory across accounts and replies",
    goals:
      "Book qualified client meetings\nReduce manual campaign setup time\nKeep campaign quality consistent across the team",
    toneStyle: "Credible, consultative, client-ready",
  },
  campaignDefaults: {
    name: "Client outbound workflow",
    targetIcp: "B2B SaaS revenue leaders",
    offerSummary: "Hyperpersonalized outbound support for a B2B client",
    targetIndustries: "B2B SaaS\nIT services",
    frameworkPreferences:
      "Lead with client context\nKeep claims reviewable\nUse soft CTAs and clear next steps",
    toneStyle: "Professional, calm, personalization-first",
  },
  prospectDefaults: {
    companyName: "Northstar Analytics",
    companyWebsite: "https://northstar.example.com",
    contactName: "Jordan Lee",
    email: "jordan@northstar.example.com",
  },
};

const personaGuidanceByType: Record<Exclude<SenderProfileType, null>, OnboardingPersonaGuidance> = {
  agency: {
    userType: "agency",
    audienceLabel: "Outbound agency",
    introTitle: "Set up the agency operating workflow",
    introBody:
      "This path is designed for small-to-mid outbound agencies running multiple B2B client campaigns with hands-on personalization and review.",
    recommendation:
      "Recommended for most teams here: establish reusable sender context, a client-ready campaign brief, and one real target account so the workflow starts on real work immediately.",
    setupFocus:
      "Prioritize the client context your team repeats most often: sender positioning, offer framing, review rules, and the first live campaign brief.",
    memoryNote:
      "The system becomes more useful as campaign memory builds across client briefs, research snapshots, reply handling, and reviewed edits.",
    senderProfilePrompt:
      "Start with the sender or delivery context your team will reuse across client campaigns so drafts stay grounded in real positioning.",
    campaignPrompt:
      "Think of this as the first client brief: who the client wants to reach, what offer matters, and how the team wants drafts reviewed.",
    prospectPrompt:
      "Add one real target account to move from setup into research, drafting, and reply handling with real company context.",
    senderProfileDefaults: {
      name: "Outbound agency workflow profile",
      companyName: "Northfield Growth",
      offer: "Agency-grade hyperpersonalized outbound execution for B2B clients",
      targetBuyer: "Founders, revenue leaders, and GTM operators at B2B software companies",
      valueProposition:
        "Give client teams more personalized outbound without losing reviewability or operational control.",
      proofPoints:
        "Manual account research folded into the workflow\nStructured review before messaging is used\nReusable campaign memory across client accounts",
      goals:
        "Launch client campaigns faster\nKeep personalization quality high\nPreserve reusable context for the whole team",
      toneStyle: "Credible, consultative, agency-ready",
    },
    campaignDefaults: {
      name: "Acme client outbound workflow",
      targetIcp: "B2B SaaS revenue leaders with manual outbound programs",
      offerSummary: "Agency support for hyperpersonalized outbound campaigns and reply handling",
      targetIndustries: "B2B SaaS\nTech-enabled services\nRevenue tooling",
      frameworkPreferences:
        "Lead with researched context\nKeep claims specific and supportable\nUse human-reviewed soft CTAs",
      toneStyle: "Professional, calm, review-ready",
    },
    prospectDefaults: {
      companyName: "Acme Analytics",
      companyWebsite: "https://acme.example.com",
      contactName: "Jordan Lee",
      email: "jordan@acme.example.com",
    },
  },
  sdr: {
    userType: "sdr",
    audienceLabel: "SDR team",
    introTitle: "Set up a team workflow for outbound execution",
    introBody:
      "This path fits teams that want structured sender context, repeatable campaign briefs, and reviewed drafts without losing speed.",
    recommendation:
      "Choose this when one team is working inside a single outbound motion and still wants the same review and memory benefits.",
    setupFocus:
      "Capture the sender voice, the segment you are targeting, and the operating rules the team wants to keep consistent.",
    memoryNote:
      "Structured campaign history helps the team reuse what worked without turning the workflow into a black box.",
    senderProfilePrompt:
      "Capture the sender positioning and proof points the team expects to reuse often.",
    campaignPrompt:
      "Use the first campaign as the operating brief for the sequence and reply workflow.",
    prospectPrompt:
      "One live account is enough to make the workflow concrete and reviewable.",
    senderProfileDefaults: {
      ...defaultGuidance.senderProfileDefaults,
      name: "SDR team workflow profile",
      companyName: "Pipeline Works",
      offer: "Outbound support for B2B pipeline teams",
      toneStyle: "Clear, credible, direct",
    },
    campaignDefaults: {
      ...defaultGuidance.campaignDefaults,
      name: "Pipeline team workflow",
      targetIcp: "VP Sales and RevOps leaders",
    },
    prospectDefaults: {
      companyName: "SignalOps",
      companyWebsite: "https://signalops.example.com",
      contactName: "Morgan Chen",
      email: "morgan@signalops.example.com",
    },
  },
  saas_founder: {
    userType: "saas_founder",
    audienceLabel: "SaaS founder",
    introTitle: "Set up a founder-led outbound workflow",
    introBody:
      "This path fits founder-led teams that want guidance and structure while keeping every decision reviewable.",
    recommendation:
      "Choose this when the founder is still close to messaging, proof, and prospect selection and wants a faster workflow without losing control.",
    setupFocus:
      "Capture the founder voice, offer clarity, and the first campaign brief so drafts stay grounded in the product story.",
    memoryNote:
      "Even for a small team, campaign history and reply patterns become useful operational memory over time.",
    senderProfilePrompt:
      "Start with the founder voice and proof points you want reflected consistently in reviewed drafts.",
    campaignPrompt:
      "Turn the first campaign into a concise outbound brief for one clear segment.",
    prospectPrompt:
      "Add one real company you want to reach so research and drafts start from actual market context.",
    senderProfileDefaults: {
      ...defaultGuidance.senderProfileDefaults,
      name: "Founder workflow profile",
      companyName: "Northfield Labs",
      offer: "Outbound support for founder-led B2B growth",
      toneStyle: "Founder-led, credible, concise",
    },
    campaignDefaults: {
      ...defaultGuidance.campaignDefaults,
      name: "Founder outbound sprint",
      targetIcp: "Founders and GTM leaders at early-stage B2B SaaS companies",
    },
    prospectDefaults: {
      companyName: "Metric Lane",
      companyWebsite: "https://metriclane.example.com",
      contactName: "Taylor Brooks",
      email: "taylor@metriclane.example.com",
    },
  },
  basic: {
    userType: "basic",
    audienceLabel: "Basic mode",
    introTitle: "Start quickly with a lighter workflow",
    introBody:
      "Basic mode skips sender-context setup so the team can move straight into a campaign brief and a first target account.",
    recommendation:
      "Use this when you want the fastest path into research and drafting, knowing richer sender context can be added later.",
    setupFocus:
      "Confirm the workspace, choose basic mode, create the first client brief, and add one real target account.",
    memoryNote:
      "Operational memory still starts building from campaign, prospect, reply, and outcome data even before sender-aware context is added.",
    senderProfilePrompt:
      "Sender context is optional in basic mode, so focus first on a real campaign brief and one real account.",
    campaignPrompt:
      "Create a practical campaign brief the team can review and refine later.",
    prospectPrompt:
      "A single real account is enough to prove the workflow before you add richer context.",
    senderProfileDefaults: {
      ...defaultGuidance.senderProfileDefaults,
      name: "Basic workflow profile",
    },
    campaignDefaults: {
      ...defaultGuidance.campaignDefaults,
      name: "Initial outbound workflow",
      offerSummary: "Basic-mode outbound workflow for a live campaign",
    },
    prospectDefaults: {
      companyName: "Northstar Systems",
      companyWebsite: "https://northstar.example.com",
      contactName: "Alex Morgan",
      email: "alex@northstar.example.com",
    },
  },
};

export function getOnboardingPersonaGuidance(
  userType: SenderProfileType | null | undefined,
): OnboardingPersonaGuidance {
  if (userType == null) {
    return defaultGuidance;
  }

  return personaGuidanceByType[userType];
}

export function getOnboardingNextStepGuidance(
  nextStep: OnboardingStepId | null,
): OnboardingNextStepGuidance {
  switch (nextStep) {
    case "workspace":
      return {
        title: "Confirm the workspace",
        description:
          "Everything that follows stays scoped to this workspace, including campaigns, prospects, review history, and team context.",
        expectation: "This takes one click and unlocks the guided setup path.",
      };
    case "user_type":
      return {
        title: "Choose the workflow shape",
        description:
          "The choice tunes the guidance, examples, and defaults so setup feels closer to your operating model.",
        expectation: "Pick the closest fit now. You can still evolve the workflow later.",
      };
    case "sender_profile":
      return {
        title: "Add reusable sender context",
        description:
          "This gives the workspace a reusable source of positioning, proof, tone, and goals for later reviewed drafts.",
        expectation: "A concise first profile is enough. It does not need to be perfect to be useful.",
      };
    case "campaign":
      return {
        title: "Create the first client brief",
        description:
          "The campaign record turns setup into a real workflow by anchoring offer, ICP, tone, and review preferences.",
        expectation: "A practical first brief is enough to unlock research and drafting.",
      };
    case "prospect":
      return {
        title: "Add one real target account",
        description:
          "Research, draft review, and reply handling become more useful as soon as one real company is in the workflow.",
        expectation: "Start with one account you would genuinely work on this week.",
      };
    default:
      return {
        title: "Move into the live workflow",
        description:
          "The workspace now has enough structure to run research, draft reviewed messaging, and learn from replies over time.",
        expectation: "Use the first campaign and account to validate the workflow before broadening it.",
      };
  }
}
