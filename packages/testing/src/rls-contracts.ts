import { workspaceScopedRlsExpectations } from "./rls-fixtures.js";

export function summarizeRestrictedTables(): string[] {
  return workspaceScopedRlsExpectations
    .filter((expectation) => expectation.member === "deny")
    .map((expectation) => expectation.table);
}

export function getWorkspaceScopedTables(): string[] {
  return workspaceScopedRlsExpectations.map((expectation) => expectation.table);
}
