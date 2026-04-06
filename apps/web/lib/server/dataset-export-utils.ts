import type {
  DatasetExportArtifactType,
  DatasetExportFilters,
  DatasetExportTaskType,
  TrainingSignalActionType,
} from "@ceg/validation";

export function matchesDatasetExportFilters(input: {
  occurredAt: Date;
  artifactType: DatasetExportArtifactType;
  actionType?: TrainingSignalActionType | null;
  filters: DatasetExportFilters;
}): boolean {
  const { filters } = input;

  if (filters.dateFrom && input.occurredAt < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && input.occurredAt > filters.dateTo) {
    return false;
  }

  if (
    filters.artifactTypes.length > 0 &&
    !filters.artifactTypes.includes(input.artifactType)
  ) {
    return false;
  }

  if (filters.signalMode === "accepted_or_edited") {
    return input.actionType === "selected" || input.actionType === "edited";
  }

  if (filters.signalMode === "edited_only") {
    return input.actionType === "edited";
  }

  return true;
}

export function getDatasetTaskTypeForArtifact(input: {
  artifactType: DatasetExportArtifactType;
  actionType?: TrainingSignalActionType | null;
}): DatasetExportTaskType {
  if (input.artifactType === "research_snapshot") {
    return "research_profile_extraction";
  }

  if (input.artifactType === "reply_analysis") {
    return "reply_analysis";
  }

  if (input.actionType === "edited") {
    return "artifact_edit";
  }

  if (input.artifactType.startsWith("draft_reply")) {
    return "reply_drafting";
  }

  return "sequence_generation";
}

export function getDatasetExpectedPropertiesForArtifact(
  artifactType: DatasetExportArtifactType,
): string[] {
  switch (artifactType) {
    case "research_snapshot":
      return [
        "structured_company_profile",
        "evidence_attached",
        "confidence_present",
        "no_unsupported_claims",
      ];
    case "reply_analysis":
      return [
        "intent_present",
        "recommended_action_present",
        "confidence_present",
        "rationale_present",
      ];
    case "draft_reply_bundle":
    case "draft_reply_option":
      return [
        "relevant_to_inbound",
        "objection_handling_fit",
        "tone_fit",
        "no_invented_facts",
        "respect_hard_no",
      ];
    default:
      return [
        "personalized",
        "clear",
        "cta_present",
        "no_generic_fluff",
        "no_unsupported_claims",
      ];
  }
}
