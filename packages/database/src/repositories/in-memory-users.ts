import type { UpsertUserInput, User } from "@ceg/validation";

import type { UserRepository } from "./users.js";
import { validateUpsertUserInput } from "./shared.js";

export function createInMemoryUserRepository(
  initialUsers: User[] = [],
): UserRepository {
  const records = new Map(initialUsers.map((user) => [user.id, user] as const));

  return {
    async upsertUser(input: UpsertUserInput) {
      const values = validateUpsertUserInput(input);
      const existingById = records.get(values.id);
      const existingByEmail =
        [...records.values()].find(
          (user) => user.email.toLowerCase() === values.email.toLowerCase(),
        ) ?? null;
      const existing = existingById ?? existingByEmail;
      const now = new Date();
      const record: User = {
        id: existing?.id ?? values.id,
        email: values.email,
        fullName: values.fullName ?? null,
        avatarUrl: values.avatarUrl ?? null,
        authProvider: values.authProvider ?? null,
        authProviderSubject: values.authProviderSubject ?? null,
        status: values.status,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      if (existing && existing.id !== record.id) {
        records.delete(existing.id);
      }

      records.set(record.id, record);
      return record;
    },
    async getUserById(userId) {
      return records.get(userId) ?? null;
    },
    async getUserByEmail(email) {
      return (
        [...records.values()].find(
          (user) => user.email.toLowerCase() === email.toLowerCase(),
        ) ?? null
      );
    },
  };
}
