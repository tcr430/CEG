import { z } from "zod";

const identifierSchema = (label: string) =>
  z.string().uuid(`${label} must be a UUID`);

export const workspaceIdSchema = identifierSchema("workspaceId");
export const campaignIdSchema = identifierSchema("campaignId");
export const prospectIdSchema = identifierSchema("prospectId");

export const senderProfileTypeSchema = z.enum([
  "sdr",
  "saas_founder",
  "agency",
  "basic",
]);

export type WorkspaceId = z.infer<typeof workspaceIdSchema>;
export type CampaignId = z.infer<typeof campaignIdSchema>;
export type ProspectId = z.infer<typeof prospectIdSchema>;
export type SenderProfileType = z.infer<typeof senderProfileTypeSchema>;
