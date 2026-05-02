"use client";

import { useDrag } from "react-dnd";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SchemaTable } from "@/components/DatabaseConnector";

export const DND_TYPES = {
  TABLE: "TABLE",
  FIELD: "FIELD"
} as const;

interface TableSelectorProps {
  tables: SchemaTable[];
  selectedTables: string[];
}

function DraggableField({ tableName, fieldName }: { tableName: string; fieldName: string }) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: DND_TYPES.FIELD,
    item: {
      table: tableName,
      field: fieldName
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  return (
    <button
      ref={(node) => {
        dragRef(node);
      }}
      type="button"
      className={`w-full rounded border border-[#30363d] px-2 py-1 text-left text-xs transition ${
        isDragging ? "opacity-40" : "opacity-100 hover:border-sky-500/60 hover:bg-[#132130]"
      }`}
    >
      {fieldName}
    </button>
  );
}

function DraggableTable({ table, selected }: { table: SchemaTable; selected: boolean }) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: DND_TYPES.TABLE,
    item: {
      table: table.name
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  return (
    <div
      ref={(node) => {
        dragRef(node);
      }}
      className={`rounded-lg border p-3 transition ${
        selected
          ? "border-sky-500/70 bg-sky-500/10"
          : "border-[#30363d] bg-[#10151d] hover:border-sky-500/60"
      } ${isDragging ? "opacity-50" : "opacity-100"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-white">{table.name}</h4>
        <Badge variant={selected ? "default" : "secondary"}>{table.columns.length} cols</Badge>
      </div>
      <div className="grid max-h-36 grid-cols-1 gap-1 overflow-auto pr-1">
        {table.columns.map((column) => (
          <DraggableField key={`${table.name}.${column.name}`} tableName={table.name} fieldName={column.name} />
        ))}
      </div>
    </div>
  );
}

export function TableSelector({ tables, selectedTables }: TableSelectorProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Schema Explorer</CardTitle>
        <CardDescription>Drag tables and fields into the canvas to build your query.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tables.map((table) => (
            <DraggableTable key={table.name} table={table} selected={selectedTables.includes(table.name)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
