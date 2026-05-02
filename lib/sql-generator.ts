import { z } from "zod";

export const joinOperatorSchema = z.enum(["INNER", "LEFT", "RIGHT", "FULL"]);

export const queryFieldSchema = z.object({
  table: z.string().min(1),
  name: z.string().min(1),
  alias: z.string().optional()
});

export const queryFilterSchema = z.object({
  table: z.string().min(1),
  field: z.string().min(1),
  operator: z.enum(["=", "!=", ">", "<", ">=", "<=", "LIKE", "IN"]),
  value: z.string().min(1),
  combinator: z.enum(["AND", "OR"]).default("AND")
});

export const queryJoinSchema = z.object({
  leftTable: z.string().min(1),
  leftField: z.string().min(1),
  rightTable: z.string().min(1),
  rightField: z.string().min(1),
  type: joinOperatorSchema.default("INNER")
});

export const querySortSchema = z.object({
  table: z.string().min(1),
  field: z.string().min(1),
  direction: z.enum(["ASC", "DESC"]).default("ASC")
});

export const queryModelSchema = z.object({
  baseTable: z.string().min(1),
  fields: z.array(queryFieldSchema).min(1),
  joins: z.array(queryJoinSchema).default([]),
  filters: z.array(queryFilterSchema).default([]),
  sorts: z.array(querySortSchema).default([]),
  limit: z.number().int().min(1).max(10000).optional()
});

export type QueryField = z.infer<typeof queryFieldSchema>;
export type QueryFilter = z.infer<typeof queryFilterSchema>;
export type QueryJoin = z.infer<typeof queryJoinSchema>;
export type QuerySort = z.infer<typeof querySortSchema>;
export type QueryModel = z.infer<typeof queryModelSchema>;

function formatValue(value: string, operator: QueryFilter["operator"]): string {
  if (operator === "IN") {
    const values = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => `'${v.replace(/'/g, "''")}'`);
    return `(${values.join(", ") || "''"})`;
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, "''")}'`;
}

export function generateSQL(model: QueryModel): string {
  const fieldSql = model.fields
    .map((f) => {
      const raw = `${f.table}.${f.name}`;
      return f.alias ? `${raw} AS ${f.alias}` : raw;
    })
    .join(",\n  ");

  const joinSql = model.joins
    .map(
      (j) =>
        `${j.type} JOIN ${j.rightTable} ON ${j.leftTable}.${j.leftField} = ${j.rightTable}.${j.rightField}`
    )
    .join("\n");

  const whereSql = model.filters.length
    ? `WHERE ${model.filters
        .map((f, index) => {
          const prefix = index === 0 ? "" : `${f.combinator} `;
          return `${prefix}${f.table}.${f.field} ${f.operator} ${formatValue(f.value, f.operator)}`;
        })
        .join(" ")}`
    : "";

  const orderSql = model.sorts.length
    ? `ORDER BY ${model.sorts.map((s) => `${s.table}.${s.field} ${s.direction}`).join(", ")}`
    : "";

  const limitSql = model.limit ? `LIMIT ${model.limit}` : "";

  return [
    "SELECT",
    `  ${fieldSql}`,
    `FROM ${model.baseTable}`,
    joinSql,
    whereSql,
    orderSql,
    limitSql
  ]
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

export interface OptimizationResult {
  score: number;
  suggestions: string[];
}

export function optimizeSQL(model: QueryModel, sql: string): OptimizationResult {
  const suggestions: string[] = [];

  if (model.fields.length > 8) {
    suggestions.push("Select only required columns to reduce scan and transfer cost.");
  }

  if (model.filters.length === 0) {
    suggestions.push("Add at least one filter clause to avoid full-table reads.");
  }

  const noLimit = typeof model.limit === "undefined";
  if (noLimit) {
    suggestions.push("Use LIMIT during exploration to keep response time predictable.");
  }

  const joinColumns = new Set(model.joins.map((j) => `${j.rightTable}.${j.rightField}`));
  if (joinColumns.size > 0) {
    suggestions.push("Ensure join keys are indexed on both sides of each join condition.");
  }

  if (!/ORDER BY/i.test(sql) && model.fields.length > 0) {
    suggestions.push("Add ORDER BY when exporting reports to ensure deterministic result ordering.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Query shape is lean. Next step: run EXPLAIN in your database to confirm index use.");
  }

  const score = Math.max(0, 100 - (suggestions.length - 1) * 12);

  return { score, suggestions };
}
