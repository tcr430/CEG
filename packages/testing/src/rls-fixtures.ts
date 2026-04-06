export type RlsExpectation = {
  table: string;
  ownerAdmin: "read" | "write" | "deny";
  member: "read" | "write" | "deny";
  outsider: "deny";
};

export const workspaceScopedRlsExpectations: RlsExpectation[] = [
  { table: "workspaces", ownerAdmin: "read", member: "read", outsider: "deny" },
  { table: "sender_profiles", ownerAdmin: "write", member: "write", outsider: "deny" },
  { table: "campaigns", ownerAdmin: "write", member: "write", outsider: "deny" },
  { table: "prospects", ownerAdmin: "write", member: "write", outsider: "deny" },
  { table: "research_snapshots", ownerAdmin: "write", member: "write", outsider: "deny" },
  { table: "sequences", ownerAdmin: "write", member: "write", outsider: "deny" },
  { table: "conversation_threads", ownerAdmin: "write", member: "write", outsider: "deny" },
  { table: "messages", ownerAdmin: "write", member: "write", outsider: "deny" },
  { table: "reply_analyses", ownerAdmin: "write", member: "write", outsider: "deny" },
  { table: "draft_replies", ownerAdmin: "write", member: "write", outsider: "deny" },
  { table: "usage_events", ownerAdmin: "read", member: "deny", outsider: "deny" },
  { table: "audit_events", ownerAdmin: "read", member: "deny", outsider: "deny" },
  { table: "subscriptions", ownerAdmin: "read", member: "deny", outsider: "deny" },
];
