type EvaluationSenderProfile = {
  id: string;
  workspaceId: string;
  name: string;
  senderType: "sdr" | "saas_founder" | "agency" | "basic";
  companyName: string | null;
  companyWebsite: string | null;
  productDescription: string | null;
  targetCustomer: string | null;
  valueProposition: string | null;
  differentiation: string | null;
  proofPoints: string[];
  goals: string[];
  tonePreferences: {
    style: string | null;
    do: string[];
    avoid: string[];
    notes?: string | null;
  };
  metadata: Record<string, unknown>;
  status: "draft" | "active" | "archived";
  isDefault: boolean;
  createdByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type EvaluationCompanyProfile = {
  domain: string;
  websiteUrl: string;
  canonicalUrl?: string | null;
  companyName: string | null;
  headline?: string | null;
  summary: string | null;
  productDescription?: string | null;
  likelyTargetCustomer?: string | null;
  targetCustomers: string[];
  industries: string[];
  valuePropositions: string[];
  proofPoints: string[];
  differentiators: string[];
  likelyPainPoints: string[];
  personalizationHooks: string[];
  callsToAction: string[];
  sourceEvidence: Array<{
    snippet: string;
    sourceUrl: string;
    title?: string | null;
    selectorHint?: string | null;
    confidence: {
      score: number;
      label: "low" | "medium" | "high";
      reasons: string[];
    };
    supports: string[];
  }>;
  confidence: {
    score: number;
    label: "low" | "medium" | "high";
    reasons: string[];
  };
  flags: Array<{
    code: string;
    severity: "info" | "warning" | "critical";
    message: string;
  }>;
  metadata: Record<string, unknown>;
};

type EvaluationReplyAnalysisInput = {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  threadId: string;
  latestInboundMessage: {
    messageId: string;
    subject: string;
    bodyText: string;
  };
  threadMessages: Array<{
    direction: "outbound" | "inbound";
    subject: string;
    bodyText: string;
  }>;
  campaignSummary: string;
  senderContextSummary: string;
  prospectCompanyProfileSummary: string;
};

export const evaluationWorkspaceId = "5f07db2d-8abd-49db-a5ca-a877ef2fe53c";
export const evaluationCampaignId = "a6092054-22bf-4a2e-bf5c-6ca287c3dab1";
export const evaluationProspectId = "90d113d3-b398-4820-8cd0-b09185220545";
export const evaluationThreadId = "b8fa04ac-430d-4a62-85be-e290be1d029a";
export const evaluationMessageId = "6127e49b-3e1a-494e-93c0-22256cf09d00";
export const evaluationTimestamp = new Date("2026-03-28T10:00:00.000Z");

const baseTonePreferences = {
  style: "Direct and credible",
  do: ["Be concise", "Lead with specifics"] as string[],
  avoid: ["Hype", "Guarantees"] as string[],
  notes: null,
} as const;

const baseSenderProfile = {
  workspaceId: evaluationWorkspaceId,
  metadata: {},
  status: "active",
  isDefault: true,
  createdByUserId: null,
  createdAt: evaluationTimestamp,
  updatedAt: evaluationTimestamp,
} as const;

export const senderProfileFixtures = {
  sdr: {
    id: "4d533c03-e1ea-4ed8-a697-7c6a48405952",
    name: "Enterprise SDR",
    senderType: "sdr",
    companyName: "Northstar Data",
    companyWebsite: null,
    productDescription: "Outbound workflow software for high-volume SDR teams.",
    targetCustomer: "Revenue teams at mid-market B2B companies.",
    valueProposition: "Help SDR teams personalize faster without dropping message quality.",
    differentiation: "Structured workflows with evidence-backed messaging controls.",
    proofPoints: ["Used by 40 revenue teams."],
    goals: ["Book qualified intro meetings."],
    tonePreferences: baseTonePreferences,
    ...baseSenderProfile,
  } satisfies EvaluationSenderProfile,
  saasFounder: {
    id: "54ad043c-9435-4388-92b9-9e0becbeff74",
    name: "Founder profile",
    senderType: "saas_founder",
    companyName: "Acme",
    companyWebsite: "https://acme.com",
    productDescription: "Outbound copilot for lean teams.",
    targetCustomer: "B2B SaaS founders.",
    valueProposition: "Sharper outbound without manual research busywork.",
    differentiation: "Structured evidence and sender-aware workflows.",
    proofPoints: ["Trusted by 30 growth teams."],
    goals: ["Book qualified meetings."],
    tonePreferences: baseTonePreferences,
    ...baseSenderProfile,
  } satisfies EvaluationSenderProfile,
  agency: {
    id: "23fbbebd-d77b-49a2-ae8f-1458f67d37fb",
    name: "Agency operator",
    senderType: "agency",
    companyName: "Signal Lane",
    companyWebsite: "https://signallane.example",
    productDescription: "Lead generation agency operating outbound programs for SaaS clients.",
    targetCustomer: "B2B SaaS teams outsourcing outbound execution.",
    valueProposition: "Launch client campaigns faster with consistent research and message controls.",
    differentiation: "Workspace-based operating model designed for multi-client delivery.",
    proofPoints: ["Supports 12 active client campaigns."],
    goals: ["Increase booked meetings across client accounts."],
    tonePreferences: {
      ...baseTonePreferences,
      style: "Professional and consultative",
    },
    ...baseSenderProfile,
  } satisfies EvaluationSenderProfile,
  basic: {
    id: "71c54346-97bc-4a17-a5fb-f454c0854f2a",
    name: "Basic mode fallback",
    senderType: "basic",
    companyName: null,
    companyWebsite: null,
    productDescription: "Basic outbound mode without sender-aware personalization.",
    targetCustomer: "Teams that need a generic fallback workflow.",
    valueProposition: "Provide safe default messaging when sender context is missing.",
    differentiation: "Schema-validated fallback instead of ad hoc prompting.",
    proofPoints: [],
    goals: ["Keep workflows moving when sender context is incomplete."],
    tonePreferences: {
      style: "Neutral and careful",
      do: ["Stay factual"],
      avoid: ["Specific unsupported claims"],
      notes: "Use softer language by default.",
    },
    ...baseSenderProfile,
  } satisfies EvaluationSenderProfile,
} as const;

export const prospectWebsiteSummaryFixtures = {
  revenueAutomation: {
    domain: "prospect.com",
    websiteUrl: "https://prospect.com",
    canonicalUrl: "https://prospect.com",
    companyName: "ProspectCo",
    headline: "Automate revenue workflows without extra admin work.",
    summary: "ProspectCo helps revenue teams reduce manual outbound work.",
    productDescription: "Workflow software for outbound and reporting operations.",
    likelyTargetCustomer: "Revenue teams at growing SaaS companies.",
    targetCustomers: ["Revenue teams"],
    industries: ["SaaS"],
    valuePropositions: ["Reduce manual outbound work"],
    proofPoints: ["Used by growth-stage revenue teams"],
    differentiators: ["Structured workflows"],
    likelyPainPoints: ["Manual personalization takes too long"],
    personalizationHooks: ["Revenue workflow automation"],
    callsToAction: ["Book a demo"],
    sourceEvidence: [
      {
        snippet: "Reduce manual outbound work.",
        sourceUrl: "https://prospect.com",
        title: "ProspectCo homepage",
        selectorHint: "hero",
        confidence: {
          score: 0.81,
          label: "high",
          reasons: ["Direct website copy"],
        },
        supports: ["value_propositions"],
      },
    ],
    confidence: {
      score: 0.79,
      label: "medium",
      reasons: ["Public website evidence"],
    },
    flags: [],
    metadata: {},
  } satisfies EvaluationCompanyProfile,
  financeAutomation: {
    domain: "prospect-finance.com",
    websiteUrl: "https://prospect-finance.com",
    canonicalUrl: "https://prospect-finance.com",
    companyName: "FinanceFlow",
    headline: "Automated reporting for finance teams.",
    summary: "FinanceFlow helps finance teams automate reporting and reduce spreadsheet work.",
    productDescription: "Reporting workflow platform for finance operators.",
    likelyTargetCustomer: "Finance teams at scaling companies.",
    targetCustomers: ["Finance teams"],
    industries: ["Fintech"],
    valuePropositions: ["Automated reporting"],
    proofPoints: [],
    differentiators: [],
    likelyPainPoints: ["Manual reporting"],
    personalizationHooks: ["Recent product launch"],
    callsToAction: [],
    sourceEvidence: [],
    confidence: {
      score: 0.42,
      label: "low",
      reasons: ["Only one source was available."],
    },
    flags: [],
    metadata: {},
  } satisfies EvaluationCompanyProfile,
} as const;

export const inboundReplyFixtures = {
  needsMoreInfo: {
    workspaceId: evaluationWorkspaceId,
    campaignId: evaluationCampaignId,
    prospectId: evaluationProspectId,
    threadId: evaluationThreadId,
    latestInboundMessage: {
      messageId: evaluationMessageId,
      subject: "Re: outbound",
      bodyText:
        "Timing is not right for us this quarter. Can you send more context?",
    },
    threadMessages: [
      {
        direction: "outbound",
        subject: "Outbound",
        bodyText: "Open to a quick conversation next week?",
      },
      {
        direction: "inbound",
        subject: "Re: outbound",
        bodyText:
          "Timing is not right for us this quarter. Can you send more context?",
      },
    ],
    campaignSummary: "Founder-led outreach for outbound quality software.",
    senderContextSummary: "Founder writing directly with grounded tone.",
    prospectCompanyProfileSummary: "Finance workflow software company.",
  } satisfies EvaluationReplyAnalysisInput,
  hardNo: {
    workspaceId: evaluationWorkspaceId,
    campaignId: evaluationCampaignId,
    prospectId: evaluationProspectId,
    threadId: evaluationThreadId,
    latestInboundMessage: {
      messageId: "fe0f7359-f1f8-45cf-bdda-cf013f40ce47",
      subject: "Re: outreach",
      bodyText:
        "Please take me off this list. We are not interested and do not want more follow-up.",
    },
    threadMessages: [
      {
        direction: "outbound",
        subject: "Outbound",
        bodyText: "Would a short intro next week be relevant?",
      },
      {
        direction: "inbound",
        subject: "Re: outreach",
        bodyText:
          "Please take me off this list. We are not interested and do not want more follow-up.",
      },
    ],
    campaignSummary: "Respectful outbound for operations software.",
    senderContextSummary: "Calm, professional tone.",
    prospectCompanyProfileSummary: "Finance workflow software company.",
  } satisfies EvaluationReplyAnalysisInput,
} as const;
