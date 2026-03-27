export type DatabaseTransaction = {
  commit(): Promise<void>;
  rollback(): Promise<void>;
};

export type DatabaseQuery<TRow = unknown> = {
  statement: string;
  params?: readonly unknown[];
  mapper?: (row: unknown) => TRow;
};

export type DatabaseQueryResult<TRow> = {
  rows: TRow[];
};

export type DatabaseClient = {
  query<TRow>(query: DatabaseQuery<TRow>): Promise<DatabaseQueryResult<TRow>>;
  transaction<TValue>(
    run: (tx: DatabaseTransaction) => Promise<TValue>,
  ): Promise<TValue>;
};

/**
 * The concrete database driver will be introduced later.
 * Application services should depend on this interface instead of a vendor SDK.
 */
export type DatabaseModule = {
  getClient(): DatabaseClient;
  healthcheck(): Promise<boolean>;
};

export * from "./repositories/index.js";
export * from "./schema.js";
