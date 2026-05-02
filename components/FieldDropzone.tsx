"use client";

import { useDrop } from "react-dnd";

import { DND_TYPES } from "@/components/TableSelector";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SelectedField {
  table: string;
  name: string;
}

interface FieldDropzoneProps {
  selectedTables: string[];
  selectedFields: SelectedField[];
  baseTable: string;
  onTableDropped: (tableName: string) => void;
  onFieldDropped: (tableName: string, fieldName: string) => void;
  onRemoveField: (tableName: string, fieldName: string) => void;
  onBaseTableChanged: (tableName: string) => void;
}

export function FieldDropzone({
  selectedTables,
  selectedFields,
  baseTable,
  onTableDropped,
  onFieldDropped,
  onRemoveField,
  onBaseTableChanged
}: FieldDropzoneProps) {
  const [{ tableHovering }, tableDropRef] = useDrop(
    () => ({
      accept: DND_TYPES.TABLE,
      drop: (item: { table: string }) => onTableDropped(item.table),
      collect: (monitor) => ({
        tableHovering: monitor.isOver()
      })
    }),
    [onTableDropped]
  );

  const [{ fieldHovering }, fieldDropRef] = useDrop(
    () => ({
      accept: DND_TYPES.FIELD,
      drop: (item: { table: string; field: string }) => onFieldDropped(item.table, item.field),
      collect: (monitor) => ({
        fieldHovering: monitor.isOver()
      })
    }),
    [onFieldDropped]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Query Canvas</CardTitle>
          <CardDescription>Drop tables first, then drop columns to include in SELECT.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            ref={(node) => {
              tableDropRef(node);
            }}
            className={`rounded-lg border border-dashed p-4 text-sm ${
              tableHovering ? "border-sky-400 bg-sky-500/10" : "border-[#30363d]"
            }`}
          >
            <p className="text-[#8b949e]">Drop tables here</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTables.length === 0 ? (
                <span className="text-xs text-[#6e7681]">No tables selected yet.</span>
              ) : (
                selectedTables.map((table) => (
                  <Badge key={table} variant={table === baseTable ? "default" : "secondary"}>
                    {table}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-[#8b949e]">Base Table</label>
            <select
              value={baseTable}
              onChange={(event) => onBaseTableChanged(event.target.value)}
              className="flex h-10 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#c9d1d9]"
            >
              {selectedTables.map((table) => (
                <option key={table} value={table}>
                  {table}
                </option>
              ))}
            </select>
          </div>

          <div
            ref={(node) => {
              fieldDropRef(node);
            }}
            className={`rounded-lg border border-dashed p-4 ${
              fieldHovering ? "border-sky-400 bg-sky-500/10" : "border-[#30363d]"
            }`}
          >
            <p className="mb-2 text-sm text-[#8b949e]">Drop fields here</p>
            <div className="flex flex-wrap gap-2">
              {selectedFields.length === 0 ? (
                <span className="text-xs text-[#6e7681]">No fields selected yet.</span>
              ) : (
                selectedFields.map((field) => (
                  <button
                    key={`${field.table}.${field.name}`}
                    type="button"
                    className="rounded-md border border-[#30363d] bg-[#121821] px-2 py-1 text-xs text-[#c9d1d9] hover:border-rose-400/70 hover:text-rose-300"
                    onClick={() => onRemoveField(field.table, field.name)}
                    title="Remove field"
                  >
                    {field.table}.{field.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
