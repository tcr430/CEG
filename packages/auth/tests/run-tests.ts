import assert from "node:assert/strict";

import {
  AuthenticationRequiredError,
  canManageWorkspace,
  getDefaultWorkspaceMembership,
  hasWorkspaceRole,
  requireAuthenticatedUser,
  requireWorkspaceAccess,
  resolveWorkspaceAccess,
  type AuthContext,
} from "../src/index.ts";

const authContext: AuthContext = {
  user: {
    userId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
    email: "owner@example.com",
    memberships: [
      {
        workspaceId: "workspace-a",
        workspaceSlug: "acme",
        workspaceName: "Acme",
        role: "owner",
        isDefault: true,
      },
      {
        workspaceId: "workspace-b",
        workspaceSlug: "beta",
        workspaceName: "Beta",
        role: "member",
      },
    ],
  },
};

const authenticatedUser = authContext.user;

if (authenticatedUser === null) {
  throw new Error("Expected authenticated user in auth test context.");
}

assert.equal(
  getDefaultWorkspaceMembership(authenticatedUser.memberships)?.workspaceId,
  "workspace-a",
);
assert.equal(hasWorkspaceRole(authenticatedUser.memberships[0], "admin"), true);
assert.equal(canManageWorkspace(authenticatedUser.memberships[0]), true);
assert.equal(
  requireWorkspaceAccess(authContext, "workspace-a").membership.workspaceSlug,
  "acme",
);
assert.equal(
  resolveWorkspaceAccess(authContext)?.membership.workspaceId,
  "workspace-a",
);
assert.throws(
  () => requireAuthenticatedUser({ user: null }),
  AuthenticationRequiredError,
);

console.log("@ceg/auth contract tests passed");
