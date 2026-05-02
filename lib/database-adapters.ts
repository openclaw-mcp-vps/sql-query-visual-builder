import mysql from "mysql2/promise";
import { Client } from "pg";
import { z } from "zod";

export const databaseConfigSchema = z.object({
  type: z.enum(["postgres", "mysql", "sqlite"]),
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  database: z.string().min(1),
  ssl: z.boolean().optional(),
  sqlitePath: z.string().optional()
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

export interface SchemaColumn {
  name: string;
  dataType: string;
  nullable: boolean;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

export interface SchemaResult {
  tables: SchemaTable[];
}

function requireNetworkFields(config: DatabaseConfig): void {
  if (!config.host || !config.user || !config.port) {
    throw new Error("host, user, and port are required for postgres/mysql connections");
  }
}

export async function testConnection(config: DatabaseConfig): Promise<{ ok: true }> {
  if (config.type === "sqlite") {
    throw new Error("SQLite runtime adapter is not enabled in this deployment.");
  }

  if (config.type === "postgres") {
    requireNetworkFields(config);
    const client = new Client({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined
    });
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    return { ok: true };
  }

  requireNetworkFields(config);
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? {} : undefined
  });
  await connection.query("SELECT 1");
  await connection.end();
  return { ok: true };
}

async function fetchPostgresSchema(config: DatabaseConfig): Promise<SchemaResult> {
  requireNetworkFields(config);
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined
  });
  await client.connect();

  const tableRows = await client.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name;`
  );

  const tables: SchemaTable[] = [];

  for (const row of tableRows.rows) {
    const columnRows = await client.query<{ column_name: string; data_type: string; is_nullable: string }>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position;`,
      [row.table_name]
    );

    tables.push({
      name: row.table_name,
      columns: columnRows.rows.map((c) => ({
        name: c.column_name,
        dataType: c.data_type,
        nullable: c.is_nullable === "YES"
      }))
    });
  }

  await client.end();
  return { tables };
}

async function fetchMysqlSchema(config: DatabaseConfig): Promise<SchemaResult> {
  requireNetworkFields(config);
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? {} : undefined
  });

  const [tableRows] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT TABLE_NAME AS table_name
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [config.database]
  );

  const tables: SchemaTable[] = [];

  for (const row of tableRows) {
    const [columnRows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME AS column_name, DATA_TYPE AS data_type, IS_NULLABLE AS is_nullable
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [config.database, row.table_name]
    );

    tables.push({
      name: row.table_name,
      columns: columnRows.map((c) => ({
        name: c.column_name as string,
        dataType: c.data_type as string,
        nullable: c.is_nullable === "YES"
      }))
    });
  }

  await connection.end();
  return { tables };
}

export async function fetchSchema(config: DatabaseConfig): Promise<SchemaResult> {
  if (config.type === "postgres") {
    return fetchPostgresSchema(config);
  }

  if (config.type === "mysql") {
    return fetchMysqlSchema(config);
  }

  throw new Error("SQLite schema introspection is not enabled in this deployment.");
}
