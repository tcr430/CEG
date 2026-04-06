import type { UpsertUserInput, User } from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapUserRow,
  validateUpsertUserInput,
} from "./shared.js";

type UserRow = Parameters<typeof mapUserRow>[0];

export type UserRepository = {
  upsertUser(input: UpsertUserInput): Promise<User>;
  getUserById(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
};

export function createUserRepository(client: DatabaseClient): UserRepository {
  return {
    async upsertUser(input) {
      const values = validateUpsertUserInput(input);
      const result = await client.query<User>({
        statement: `
          INSERT INTO users (
            id,
            email,
            full_name,
            avatar_url,
            auth_provider,
            auth_provider_subject,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id)
          DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            avatar_url = EXCLUDED.avatar_url,
            auth_provider = EXCLUDED.auth_provider,
            auth_provider_subject = EXCLUDED.auth_provider_subject,
            status = EXCLUDED.status,
            updated_at = NOW()
          RETURNING
            id,
            email,
            full_name,
            avatar_url,
            auth_provider,
            auth_provider_subject,
            status,
            created_at,
            updated_at
        `,
        params: [
          values.id,
          values.email,
          values.fullName ?? null,
          values.avatarUrl ?? null,
          values.authProvider ?? null,
          values.authProviderSubject ?? null,
          values.status,
        ],
        mapper: (row) => mapUserRow(row as UserRow),
      });

      return getFirstRowOrThrow(result.rows, "user");
    },
    async getUserById(userId) {
      const result = await client.query<User>({
        statement: `
          SELECT
            id,
            email,
            full_name,
            avatar_url,
            auth_provider,
            auth_provider_subject,
            status,
            created_at,
            updated_at
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        params: [userId],
        mapper: (row) => mapUserRow(row as UserRow),
      });

      const row = result.rows[0];
      return row ?? null;
    },
    async getUserByEmail(email) {
      const result = await client.query<User>({
        statement: `
          SELECT
            id,
            email,
            full_name,
            avatar_url,
            auth_provider,
            auth_provider_subject,
            status,
            created_at,
            updated_at
          FROM users
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        params: [email],
        mapper: (row) => mapUserRow(row as UserRow),
      });

      const row = result.rows[0];
      return row ?? null;
    },
  };
}
