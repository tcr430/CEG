import { Pool, type QueryResultRow } from "pg";

import type {
  DatabaseClient,
  DatabaseModule,
  DatabaseQuery,
  DatabaseQueryResult,
  DatabaseTransaction,
} from "./index.js";

type PgLikeClient = {
  query(statement: string, params?: readonly unknown[]): Promise<{
    rows: QueryResultRow[];
  }>;
};

function mapRows<TRow>(
  query: DatabaseQuery<TRow>,
  rows: QueryResultRow[],
): DatabaseQueryResult<TRow> {
  if (query.mapper === undefined) {
    return {
      rows: rows as TRow[],
    };
  }

  return {
    rows: rows.map((row) => query.mapper!(row)),
  };
}

function createPgDatabaseClient(client: PgLikeClient): DatabaseClient {
  return {
    async query<TRow>(query: DatabaseQuery<TRow>) {
      const result = await client.query(query.statement, query.params);
      return mapRows(query, result.rows);
    },
    async transaction<TValue>(run: (tx: DatabaseTransaction) => Promise<TValue>) {
      await client.query("BEGIN");

      let committed = false;
      let rolledBack = false;

      const transaction: DatabaseTransaction = {
        async commit() {
          if (!committed && !rolledBack) {
            committed = true;
            await client.query("COMMIT");
          }
        },
        async rollback() {
          if (!rolledBack && !committed) {
            rolledBack = true;
            await client.query("ROLLBACK");
          }
        },
      };

      try {
        const value = await run(transaction);

        if (!committed && !rolledBack) {
          await transaction.commit();
        }

        return value;
      } catch (error) {
        if (!rolledBack && !committed) {
          await transaction.rollback();
        }

        throw error;
      }
    },
  };
}

export function createPostgresDatabaseModule(input: {
  connectionString: string;
  maxConnections?: number;
  ssl?: boolean | { rejectUnauthorized?: boolean };
}): DatabaseModule {
  const pool = new Pool({
    connectionString: input.connectionString,
    max: input.maxConnections ?? 5,
    ssl: input.ssl ?? { rejectUnauthorized: false },
  });

  return {
    getClient() {
      return createPgDatabaseClient({
        query(statement, params) {
          return params === undefined ? pool.query(statement) : pool.query(statement, [...params]);
        },
      });
    },
    async healthcheck() {
      const result = await pool.query("SELECT 1 AS ok");
      return result.rowCount === 1;
    },
  };
}

