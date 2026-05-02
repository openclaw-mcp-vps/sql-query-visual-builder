"use client";

import { Copy, Filter, Link2, RefreshCw, Sparkles, SortAsc } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import toast from "react-hot-toast";

import { DatabaseConnector, type DatabaseConfig, type SchemaTable } from "@/components/DatabaseConnector";
import { FieldDropzone } from "@/components/FieldDropzone";
import { SQLPreview } from "@/components/SQLPreview";
import { TableSelector } from "@/components/TableSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface QueryField {
  table: string;
  name: string;
}

interface QueryJoin {
  leftTable: string;
  leftField: string;
  rightTable: string;
  rightField: string;
  type: "INNER" | "LEFT" | "RIGHT" | "FULL";
}

interface QueryFilter {
  table: string;
  field: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN";
  value: string;
  combinator: "AND" | "OR";
}

interface QuerySort {
  table: string;
  field: string;
  direction: "ASC" | "DESC";
}

const emptySql = "-- Build a query by dragging tables and fields to generate SQL";

export function QueryBuilder() {
  const [schemaTables, setSchemaTables] = useState<SchemaTable[]>([]);
  const [dbConfig, setDbConfig] = useState<DatabaseConfig | null>(null);

  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<QueryField[]>([]);
  const [baseTable, setBaseTable] = useState("");
  const [joins, setJoins] = useState<QueryJoin[]>([]);
  const [filters, setFilters] = useState<QueryFilter[]>([]);
  const [sorts, setSorts] = useState<QuerySort[]>([]);
  const [limit, setLimit] = useState<number>(200);

  const [sql, setSql] = useState(emptySql);
  const [score, setScore] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Connect a database and drag fields into the canvas to begin optimization analysis."
  ]);
  const [analyzing, setAnalyzing] = useState(false);

  const tableMap = useMemo(() => {
    const map = new Map<string, SchemaTable>();
    schemaTables.forEach((table) => map.set(table.name, table));
    return map;
  }, [schemaTables]);

  const allFieldOptions = useMemo(() => {
    return selectedTables.flatMap((tableName) => {
      const table = tableMap.get(tableName);
      if (!table) {
        return [] as Array<{ table: string; field: string }>;
      }
      return table.columns.map((column) => ({
        table: tableName,
        field: column.name
      }));
    });
  }, [selectedTables, tableMap]);

  const onSchemaLoaded = (tables: SchemaTable[], config: DatabaseConfig) => {
    setSchemaTables(tables);
    setDbConfig(config);
    setSelectedTables([]);
    setSelectedFields([]);
    setBaseTable("");
    setJoins([]);
    setFilters([]);
    setSorts([]);
    setSql(emptySql);
    setSuggestions(["Drag at least one table and one field to generate SQL."]);
    setScore(0);
  };

  const addTable = (tableName: string) => {
    setSelectedTables((previous) => {
      if (previous.includes(tableName)) {
        return previous;
      }
      const next = [...previous, tableName];
      if (!baseTable) {
        setBaseTable(tableName);
      }
      return next;
    });
  };

  const addField = (tableName: string, fieldName: string) => {
    addTable(tableName);
    setSelectedFields((previous) => {
      if (previous.some((field) => field.table === tableName && field.name === fieldName)) {
        return previous;
      }
      return [...previous, { table: tableName, name: fieldName }];
    });
  };

  const removeField = (tableName: string, fieldName: string) => {
    setSelectedFields((previous) => previous.filter((field) => !(field.table === tableName && field.name === fieldName)));
  };

  const sanitizeJoin = (join: QueryJoin): QueryJoin => {
    const leftTable = selectedTables.includes(join.leftTable) ? join.leftTable : selectedTables[0] || "";
    const rightTable = selectedTables.includes(join.rightTable) ? join.rightTable : selectedTables[1] || leftTable;

    const leftFields = tableMap.get(leftTable)?.columns ?? [];
    const rightFields = tableMap.get(rightTable)?.columns ?? [];

    return {
      ...join,
      leftTable,
      rightTable,
      leftField: leftFields.some((c) => c.name === join.leftField) ? join.leftField : leftFields[0]?.name || "",
      rightField: rightFields.some((c) => c.name === join.rightField) ? join.rightField : rightFields[0]?.name || ""
    };
  };

  useEffect(() => {
    setJoins((previous) => previous.map(sanitizeJoin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTables, schemaTables]);

  useEffect(() => {
    if (!baseTable || selectedFields.length === 0) {
      setSql(emptySql);
      setSuggestions(["Drop at least one field to generate query SQL."]);
      setScore(0);
      return;
    }

    const model = {
      baseTable,
      fields: selectedFields,
      joins: joins.filter((join) => join.leftTable && join.rightTable && join.leftField && join.rightField),
      filters: filters.filter((filter) => filter.table && filter.field && filter.value.trim().length > 0),
      sorts: sorts.filter((sort) => sort.table && sort.field),
      limit
    };

    const timer = setTimeout(async () => {
      setAnalyzing(true);

      try {
        const sqlResponse = await fetch("/api/sql/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(model)
        });

        if (!sqlResponse.ok) {
          throw new Error(await sqlResponse.text());
        }

        const sqlPayload = (await sqlResponse.json()) as { sql: string };
        setSql(sqlPayload.sql);

        const optimizationResponse = await fetch("/api/sql/optimize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ model, sql: sqlPayload.sql })
        });

        if (!optimizationResponse.ok) {
          throw new Error(await optimizationResponse.text());
        }

        const optimization = (await optimizationResponse.json()) as {
          score: number;
          suggestions: string[];
        };

        setScore(optimization.score);
        setSuggestions(optimization.suggestions);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate SQL";
        toast.error(message);
      } finally {
        setAnalyzing(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [baseTable, filters, joins, limit, selectedFields, sorts]);

  const addJoin = () => {
    if (selectedTables.length < 2) {
      toast.error("Add at least two tables before creating a join.");
      return;
    }

    const [leftTable, rightTable] = selectedTables;
    const leftField = tableMap.get(leftTable)?.columns[0]?.name ?? "";
    const rightField = tableMap.get(rightTable)?.columns[0]?.name ?? "";

    setJoins((previous) => [
      ...previous,
      {
        leftTable,
        leftField,
        rightTable,
        rightField,
        type: "INNER"
      }
    ]);
  };

  const addFilter = () => {
    if (selectedTables.length === 0) {
      toast.error("Add a table before creating filters.");
      return;
    }

    const table = selectedTables[0];
    const field = tableMap.get(table)?.columns[0]?.name ?? "";

    setFilters((previous) => [
      ...previous,
      {
        table,
        field,
        operator: "=",
        value: "",
        combinator: "AND"
      }
    ]);
  };

  const addSort = () => {
    if (selectedTables.length === 0) {
      toast.error("Add a table before creating sort rules.");
      return;
    }

    const table = selectedTables[0];
    const field = tableMap.get(table)?.columns[0]?.name ?? "";

    setSorts((previous) => [
      ...previous,
      {
        table,
        field,
        direction: "ASC"
      }
    ]);
  };

  const copySql = async () => {
    await navigator.clipboard.writeText(sql);
    toast.success("SQL copied to clipboard");
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <DatabaseConnector onSchemaLoaded={onSchemaLoaded} />

        {dbConfig ? (
          <p className="text-sm text-[#8b949e]">
            Connected to <span className="font-semibold text-white">{dbConfig.type}</span> database <span className="font-semibold text-white">{dbConfig.database}</span>
          </p>
        ) : null}

        {schemaTables.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr_480px]">
            <TableSelector tables={schemaTables} selectedTables={selectedTables} />

            <div className="space-y-4">
              <FieldDropzone
                selectedTables={selectedTables}
                selectedFields={selectedFields}
                baseTable={baseTable}
                onTableDropped={addTable}
                onFieldDropped={addField}
                onRemoveField={removeField}
                onBaseTableChanged={setBaseTable}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-4 w-4" /> Joins
                  </CardTitle>
                  <CardDescription>Create explicit joins between selected tables.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {joins.map((join, index) => {
                    const leftColumns = tableMap.get(join.leftTable)?.columns ?? [];
                    const rightColumns = tableMap.get(join.rightTable)?.columns ?? [];

                    return (
                      <div key={`join-${index}`} className="grid grid-cols-1 gap-2 rounded border border-[#30363d] p-3 md:grid-cols-5">
                        <Select
                          value={join.type}
                          onChange={(event) => {
                            const type = event.target.value as QueryJoin["type"];
                            setJoins((previous) => previous.map((item, idx) => (idx === index ? { ...item, type } : item)));
                          }}
                        >
                          <option value="INNER">INNER</option>
                          <option value="LEFT">LEFT</option>
                          <option value="RIGHT">RIGHT</option>
                          <option value="FULL">FULL</option>
                        </Select>

                        <Select
                          value={join.leftTable}
                          onChange={(event) => {
                            const leftTable = event.target.value;
                            const leftField = tableMap.get(leftTable)?.columns[0]?.name ?? "";
                            setJoins((previous) =>
                              previous.map((item, idx) => (idx === index ? { ...item, leftTable, leftField } : item))
                            );
                          }}
                        >
                          {selectedTables.map((table) => (
                            <option key={table} value={table}>
                              {table}
                            </option>
                          ))}
                        </Select>

                        <Select
                          value={join.leftField}
                          onChange={(event) => {
                            const leftField = event.target.value;
                            setJoins((previous) => previous.map((item, idx) => (idx === index ? { ...item, leftField } : item)));
                          }}
                        >
                          {leftColumns.map((column) => (
                            <option key={column.name} value={column.name}>
                              {column.name}
                            </option>
                          ))}
                        </Select>

                        <Select
                          value={join.rightTable}
                          onChange={(event) => {
                            const rightTable = event.target.value;
                            const rightField = tableMap.get(rightTable)?.columns[0]?.name ?? "";
                            setJoins((previous) =>
                              previous.map((item, idx) => (idx === index ? { ...item, rightTable, rightField } : item))
                            );
                          }}
                        >
                          {selectedTables.map((table) => (
                            <option key={table} value={table}>
                              {table}
                            </option>
                          ))}
                        </Select>

                        <Select
                          value={join.rightField}
                          onChange={(event) => {
                            const rightField = event.target.value;
                            setJoins((previous) =>
                              previous.map((item, idx) => (idx === index ? { ...item, rightField } : item))
                            );
                          }}
                        >
                          {rightColumns.map((column) => (
                            <option key={column.name} value={column.name}>
                              {column.name}
                            </option>
                          ))}
                        </Select>

                        <button
                          type="button"
                          className="text-left text-xs text-rose-300 hover:text-rose-200 md:col-span-5"
                          onClick={() => setJoins((previous) => previous.filter((_, idx) => idx !== index))}
                        >
                          Remove join
                        </button>
                      </div>
                    );
                  })}

                  <Button type="button" variant="outline" size="sm" onClick={addJoin}>
                    Add Join
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4" /> Filters
                  </CardTitle>
                  <CardDescription>Apply WHERE clauses without writing syntax manually.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filters.map((filter, index) => {
                    const fieldOptions = tableMap.get(filter.table)?.columns ?? [];

                    return (
                      <div key={`filter-${index}`} className="grid grid-cols-1 gap-2 rounded border border-[#30363d] p-3 md:grid-cols-5">
                        <Select
                          value={filter.combinator}
                          onChange={(event) => {
                            const combinator = event.target.value as QueryFilter["combinator"];
                            setFilters((previous) =>
                              previous.map((item, idx) => (idx === index ? { ...item, combinator } : item))
                            );
                          }}
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </Select>

                        <Select
                          value={filter.table}
                          onChange={(event) => {
                            const table = event.target.value;
                            const field = tableMap.get(table)?.columns[0]?.name ?? "";
                            setFilters((previous) =>
                              previous.map((item, idx) => (idx === index ? { ...item, table, field } : item))
                            );
                          }}
                        >
                          {selectedTables.map((table) => (
                            <option key={table} value={table}>
                              {table}
                            </option>
                          ))}
                        </Select>

                        <Select
                          value={filter.field}
                          onChange={(event) => {
                            const field = event.target.value;
                            setFilters((previous) => previous.map((item, idx) => (idx === index ? { ...item, field } : item)));
                          }}
                        >
                          {fieldOptions.map((column) => (
                            <option key={column.name} value={column.name}>
                              {column.name}
                            </option>
                          ))}
                        </Select>

                        <Select
                          value={filter.operator}
                          onChange={(event) => {
                            const operator = event.target.value as QueryFilter["operator"];
                            setFilters((previous) =>
                              previous.map((item, idx) => (idx === index ? { ...item, operator } : item))
                            );
                          }}
                        >
                          <option value="=">=</option>
                          <option value="!=">!=</option>
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<=">&lt;=</option>
                          <option value="LIKE">LIKE</option>
                          <option value="IN">IN</option>
                        </Select>

                        <Input
                          value={filter.value}
                          onChange={(event) => {
                            const value = event.target.value;
                            setFilters((previous) => previous.map((item, idx) => (idx === index ? { ...item, value } : item)));
                          }}
                          placeholder="e.g. active"
                        />

                        <button
                          type="button"
                          className="text-left text-xs text-rose-300 hover:text-rose-200 md:col-span-5"
                          onClick={() => setFilters((previous) => previous.filter((_, idx) => idx !== index))}
                        >
                          Remove filter
                        </button>
                      </div>
                    );
                  })}

                  <Button type="button" variant="outline" size="sm" onClick={addFilter}>
                    Add Filter
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SortAsc className="h-4 w-4" /> Sort & Limit
                  </CardTitle>
                  <CardDescription>Choose output ordering and row cap for fast analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sorts.map((sort, index) => {
                    const fieldOptions = tableMap.get(sort.table)?.columns ?? [];

                    return (
                      <div key={`sort-${index}`} className="grid grid-cols-1 gap-2 rounded border border-[#30363d] p-3 md:grid-cols-4">
                        <Select
                          value={sort.table}
                          onChange={(event) => {
                            const table = event.target.value;
                            const field = tableMap.get(table)?.columns[0]?.name ?? "";
                            setSorts((previous) => previous.map((item, idx) => (idx === index ? { ...item, table, field } : item)));
                          }}
                        >
                          {selectedTables.map((table) => (
                            <option key={table} value={table}>
                              {table}
                            </option>
                          ))}
                        </Select>

                        <Select
                          value={sort.field}
                          onChange={(event) => {
                            const field = event.target.value;
                            setSorts((previous) => previous.map((item, idx) => (idx === index ? { ...item, field } : item)));
                          }}
                        >
                          {fieldOptions.map((column) => (
                            <option key={column.name} value={column.name}>
                              {column.name}
                            </option>
                          ))}
                        </Select>

                        <Select
                          value={sort.direction}
                          onChange={(event) => {
                            const direction = event.target.value as QuerySort["direction"];
                            setSorts((previous) =>
                              previous.map((item, idx) => (idx === index ? { ...item, direction } : item))
                            );
                          }}
                        >
                          <option value="ASC">ASC</option>
                          <option value="DESC">DESC</option>
                        </Select>

                        <button
                          type="button"
                          className="text-left text-xs text-rose-300 hover:text-rose-200"
                          onClick={() => setSorts((previous) => previous.filter((_, idx) => idx !== index))}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr]">
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={limit}
                      onChange={(event) => setLimit(Math.max(1, Math.min(10000, Number(event.target.value) || 1)))}
                    />
                    <p className="text-sm text-[#8b949e]">Rows returned (`LIMIT`)</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={addSort}>
                      Add Sort
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setJoins([]);
                        setFilters([]);
                        setSorts([]);
                        setLimit(200);
                        setSql(emptySql);
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset Rules
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-md border border-[#30363d] bg-[#10151d] px-3 py-1 text-sm text-[#8b949e]">
                  <Sparkles className={`h-4 w-4 ${analyzing ? "animate-pulse text-sky-400" : "text-sky-500"}`} />
                  {analyzing ? "Refreshing SQL..." : "Live SQL preview"}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={copySql}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy SQL
                </Button>
              </div>
              <SQLPreview sql={sql} score={score} suggestions={suggestions} />
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No schema loaded yet</CardTitle>
              <CardDescription>Connect a database above to start building SQL visually.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#8b949e]">
                This workspace supports PostgreSQL and MySQL. Once connected, you can drag tables/columns and export optimized SQL.
              </p>
            </CardContent>
          </Card>
        )}

        {allFieldOptions.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Field Catalog</CardTitle>
              <CardDescription>Quick reference of currently selected table columns.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {allFieldOptions.map((entry) => (
                <div
                  key={`${entry.table}.${entry.field}`}
                  className="rounded-md border border-[#30363d] bg-[#10151d] px-2 py-1 text-xs text-[#c9d1d9]"
                >
                  {entry.table}.{entry.field}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DndProvider>
  );
}
