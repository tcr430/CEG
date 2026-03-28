import assert from "node:assert/strict";

import {
  createSequenceEngineService,
  runSequenceQualityChecks,
  scoreCompiledSequenceQuality,
  sequenceGenerationInputSchema,
  validateInitialEmailOutput,
  type SequenceGenerationMetadata,
  type SequenceGenerationModelAdapter,
} from "../dist/index.js";

const metadata: SequenceGenerationMetadata = {
  provider: "test-provider",
  model: "test-model",
  promptVersion: "sequence.test",
  inputTokens: 10,
  outputTokens: 20,
  totalTokens: 30,
  costUsd: null,
  generatedAt: new Date("2026-03-27T10:00:00.000Z"),
};

const input = sequenceGenerationInputSchema.parse({
  senderContext: {
    mode: "sender_aware",
    senderProfile: {
      id: "54ad043c-9435-4388-92b9-9e0becbeff74",
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      name: "Founder profile",
      senderType: "saas_founder",
      companyName: "Acme",
      companyWebsite: "https://acme.com",
      productDescription: "Outbound copilot for lean teams",
      targetCustomer: "B2B SaaS founders",
      valueProposition: "Sharper outbound without manual research busywork",
      differentiation: "Structured evidence and sender-aware workflows",
      proofPoints: ["Trusted by 30 growth teams"],
      goals: ["Book qualified meetings"],
      tonePreferences: {
        style: "Direct and credible",
        do: ["Be concise", "Lead with specifics"],
        avoid: ["Hype", "Guarantees"],
      },
      metadata: {},
      status: "active",
      isDefault: true,
      createdAt: new Date("2026-03-27T10:00:00.000Z"),
      updatedAt: new Date("2026-03-27T10:00:00.000Z"),
    },
  },
  campaign: {
    id: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
    workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
    name: "Q2 Founder Motion",
    offerSummary: "Outbound support for founder-led sales",
    targetIcp: "Early-stage SaaS teams",
    targetIndustries: ["SaaS"],
    tonePreferences: {
      style: "Consultative",
      do: ["Use evidence"],
      avoid: ["Overpromise"],
    },
    frameworkPreferences: ["Problem -> proof -> CTA"],
    status: "draft",
    settings: {},
    createdAt: new Date("2026-03-27T10:00:00.000Z"),
    updatedAt: new Date("2026-03-27T10:00:00.000Z"),
  },
  prospectCompanyProfile: {
    domain: "prospect.com",
    websiteUrl: "https://prospect.com",
    companyName: "ProspectCo",
    summary: "ProspectCo helps revenue teams reduce manual outbound work.",
    likelyTargetCustomer: "Revenue teams at growing SaaS companies",
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
  },
  promptContext: {
    framework: "Problem -> proof -> CTA",
    tone: {
      style: "concise",
      do: ["specific"],
      avoid: ["guarantee"],
      fit: "balanced",
    },
    constraints: {
      maxSubjectLength: 60,
      maxOpenerLength: 180,
      maxEmailBodyLength: 700,
      maxFollowUpSteps: 3,
      requireCta: true,
      forbidUnsupportedClaims: true,
      forbidGenericFluff: true,
      bannedPhrases: ["touching base"],
      preferredCallToActionStyle: "soft",
    },
  },
  objective: "Book a short intro call",
});

const checks = runSequenceQualityChecks(
  {
    subject: "Reduce manual outbound work at ProspectCo",
    opener: "Your team appears to be focused on revenue workflow automation.",
    body: "You mentioned reducing manual outbound work. Open to a short conversation next week?",
    cta: "Open to a short conversation next week?",
  },
  input,
);

assert.equal(checks.find((item) => item.name === "cta_presence")?.passed, true);
assert.equal(checks.find((item) => item.name === "no_generic_fluff")?.passed, true);

const validatedEmail = validateInitialEmailOutput(
  {
    email: {
      subject: "Reduce manual outbound work at ProspectCo",
      opener: "Your team appears focused on revenue workflow automation.",
      body: "You mentioned reducing manual outbound work. We help founder-led teams structure outbound with evidence. Open to a short conversation next week?",
      cta: "Open to a short conversation next week?",
      rationale: "Connects the pain point to the offer without overstating outcomes.",
      qualityChecks: [],
    },
    rationale: "Keeps the message specific and sender-aware.",
    qualityChecks: [],
    generationMetadata: metadata,
  },
  input,
);

assert.ok(validatedEmail.qualityChecks.length >= 5);

const scoredSequence = scoreCompiledSequenceQuality(
  {
    subjectLineSet: {
      subjectLines: [
        {
          text: "Great company for a revolutionary workflow",
          rationale: "Intentionally risky for test coverage.",
        },
      ],
      rationale: "Test subject lines",
      qualityChecks: [],
      generationMetadata: metadata,
    },
    openerSet: {
      openerOptions: [
        {
          text: "Impressed by what your team is doing at ProspectCo!!!",
          rationale: "Intentionally hype-heavy.",
          evidenceSupport: [],
        },
      ],
      rationale: "Test opener",
      qualityChecks: [],
      generationMetadata: metadata,
    },
    initialEmail: {
      email: {
        subject: "Revolutionary workflow for ProspectCo",
        opener: "Impressed by what your team is doing.",
        body: "We can guarantee better outbound performance and double your pipeline fast. Open to a quick call next week?",
        cta: "Open to a quick call next week?",
        rationale: "Test email",
        qualityChecks: [],
      },
      rationale: "Test initial email",
      qualityChecks: [],
      generationMetadata: metadata,
    },
    followUpSequence: {
      sequenceSteps: [
        {
          stepNumber: 1,
          waitDays: 3,
          subject: "Still relevant?",
          opener: "Quick nudge.",
          body: "Following up quickly.",
          cta: "Worth a reply?",
          rationale: "Test",
          qualityChecks: [],
        },
        {
          stepNumber: 2,
          waitDays: 5,
          subject: "Any thoughts?",
          opener: "Another quick note.",
          body: "Happy to share details.",
          cta: "Want details?",
          rationale: "Test",
          qualityChecks: [],
        },
        {
          stepNumber: 3,
          waitDays: 7,
          subject: "Close the loop?",
          opener: "Last note.",
          body: "Happy to close the loop.",
          cta: "Should I close the loop?",
          rationale: "Test",
          qualityChecks: [],
        },
      ],
      rationale: "Test follow-ups",
      qualityChecks: [],
      generationMetadata: metadata,
    },
    sequenceVersion: 2,
    generatedForMode: "sender_aware",
  },
  input,
);

assert.ok(scoredSequence.summary.score < 80);
assert.equal(
  scoredSequence.checks.some((check) => check.code === "unverifiable_claims" && !check.passed),
  true,
);
assert.equal(
  scoredSequence.checks.some((check) => check.code === "spammy_or_overhyped_language" && !check.passed),
  true,
);

const adapter: SequenceGenerationModelAdapter = {
  async generateSubjectLines() {
    return {
      subjectLines: [
        {
          text: "Reduce manual outbound work at ProspectCo",
          rationale: "Ties directly to a supported pain point.",
        },
      ],
      rationale: "One focused subject line option.",
      qualityChecks: [],
      generationMetadata: metadata,
    };
  },
  async generateOpeners() {
    return {
      openerOptions: [
        {
          text: "Your team appears focused on revenue workflow automation.",
          rationale: "Uses a supported personalization hook.",
          evidenceSupport: ["Revenue workflow automation"],
        },
      ],
      rationale: "One focused opener.",
      qualityChecks: [],
      generationMetadata: metadata,
    };
  },
  async generateInitialEmail() {
    return {
      email: {
        subject: "Reduce manual outbound work at ProspectCo",
        opener: "Your team appears focused on revenue workflow automation.",
        body: "You mentioned reducing manual outbound work. We help founder-led teams structure outbound with evidence. Open to a short conversation next week?",
        cta: "Open to a short conversation next week?",
        rationale: "Specific, concise, and aligned to the profile.",
        qualityChecks: [],
      },
      rationale: "Initial email stays within the configured tone and length.",
      qualityChecks: [],
      generationMetadata: metadata,
    };
  },
  async generateFollowUpSequence() {
    return {
      sequenceSteps: [
        {
          stepNumber: 1,
          waitDays: 3,
          subject: "Worth a quick look?",
          opener: "Following up on manual outbound workflows.",
          body: "You mentioned reducing manual outbound work. Worth a quick look next week?",
          cta: "Worth a quick look next week?",
          rationale: "Short follow-up with a soft CTA.",
          qualityChecks: [],
        },
        {
          stepNumber: 2,
          waitDays: 5,
          subject: "Still relevant?",
          opener: "Circling back on the workflow angle.",
          body: "Manual outbound workflows still seem relevant here. Open to a short exchange next week?",
          cta: "Open to a short exchange next week?",
          rationale: "Keeps the thread lightweight.",
          qualityChecks: [],
        },
        {
          stepNumber: 3,
          waitDays: 7,
          subject: "Should I close the loop?",
          opener: "I can close the loop if this is not a fit.",
          body: "Happy to close the loop if this is not a priority, but I can share a concise example if helpful.",
          cta: "Want me to send the concise example or close the loop?",
          rationale: "Soft-close email with a low-pressure CTA.",
          qualityChecks: [],
        },
      ],
      rationale: "Three-step follow-up sequence placeholder.",
      qualityChecks: [],
      generationMetadata: metadata,
    };
  },
  async regenerateSequencePart() {
    return {
      regeneratedPart: {
        part: "subject_line",
        subjectLines: [
          {
            text: "A tighter outbound workflow for ProspectCo",
            rationale: "Reframes the same supported pain point.",
          },
        ],
      },
      rationale: "Adjusted the angle per feedback.",
      qualityChecks: [],
      generationMetadata: metadata,
    };
  },
};

const service = createSequenceEngineService(adapter);
const subjectOutput = await service.generateSubjectLines(input);
const emailOutput = await service.generateInitialEmail(input);

assert.equal(subjectOutput.subjectLines.length, 1);
assert.equal(subjectOutput.generationMetadata.provider, "test-provider");
assert.ok(emailOutput.email.qualityChecks.length >= 5);

console.log("@ceg/sequence-engine contract tests passed");
