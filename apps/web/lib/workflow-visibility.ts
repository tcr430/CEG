export type VisibleWorkflowStageKey =
  | "setup"
  | "campaign"
  | "prospect"
  | "research"
  | "draft"
  | "review"
  | "reply"
  | "iteration";

export type VisibleWorkflowStage = {
  key: VisibleWorkflowStageKey;
  label: string;
  status: "complete" | "current" | "upcoming";
  note: string;
};

const stageDefinitions: Array<{
  key: VisibleWorkflowStageKey;
  label: string;
  buildNote: (ready: boolean) => string;
}> = [
  {
    key: "setup",
    label: "Setup context",
    buildNote: (ready) =>
      ready
        ? "Reusable sender or operating context is available for this workflow."
        : "Establish the operating context the team will reuse before live work expands.",
  },
  {
    key: "campaign",
    label: "Create campaign",
    buildNote: (ready) =>
      ready
        ? "A campaign brief is anchoring offer, ICP, and workflow preferences."
        : "Turn the offer and ICP into a campaign brief before the workflow fans out.",
  },
  {
    key: "prospect",
    label: "Add prospects",
    buildNote: (ready) =>
      ready
        ? "Real target accounts are in the workflow queue."
        : "Add at least one real target account so the workflow moves beyond setup.",
  },
  {
    key: "research",
    label: "Run research",
    buildNote: (ready) =>
      ready
        ? "Stored research is helping ground later drafting and review."
        : "Capture a research snapshot before relying on tailored claims.",
  },
  {
    key: "draft",
    label: "Draft outreach",
    buildNote: (ready) =>
      ready
        ? "The workflow already has draft messaging to work from."
        : "Generate the first sequence or reply draft once the brief and research are ready.",
  },
  {
    key: "review",
    label: "Review and refine",
    buildNote: (ready) =>
      ready
        ? "Humans can review, edit, and approve the current draft set."
        : "Keep approval with the team by reviewing and refining drafts before use.",
  },
  {
    key: "reply",
    label: "Handle replies",
    buildNote: (ready) =>
      ready
        ? "Reply handling is active through thread history, analysis, or drafts."
        : "Once replies arrive, keep them in the same thread workflow for analysis and response drafting.",
  },
  {
    key: "iteration",
    label: "Learn and iterate",
    buildNote: (ready) =>
      ready
        ? "Outcome signals are available to support better future decisions."
        : "The workflow gets stronger as replies, edits, and outcomes accumulate over time.",
  },
];

export function buildVisibleWorkflowStages(input: {
  setupReady: boolean;
  campaignReady: boolean;
  prospectReady: boolean;
  researchReady: boolean;
  draftReady: boolean;
  reviewReady: boolean;
  replyReady: boolean;
  iterationReady: boolean;
}): VisibleWorkflowStage[] {
  const readinessByKey: Record<VisibleWorkflowStageKey, boolean> = {
    setup: input.setupReady,
    campaign: input.campaignReady,
    prospect: input.prospectReady,
    research: input.researchReady,
    draft: input.draftReady,
    review: input.reviewReady,
    reply: input.replyReady,
    iteration: input.iterationReady,
  };

  const currentStage = stageDefinitions.find((stage) => !readinessByKey[stage.key])?.key ?? null;

  return stageDefinitions.map((stage) => ({
    key: stage.key,
    label: stage.label,
    status: readinessByKey[stage.key]
      ? "complete"
      : currentStage === stage.key
        ? "current"
        : "upcoming",
    note: stage.buildNote(readinessByKey[stage.key]),
  }));
}

export function getVisibleWorkflowNextAction(stages: VisibleWorkflowStage[]) {
  const current = stages.find((stage) => stage.status === "current");
  return current ?? stages.at(-1) ?? null;
}
