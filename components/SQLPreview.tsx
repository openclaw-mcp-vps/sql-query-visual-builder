"use client";

import dynamic from "next/dynamic";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false
});

interface SQLPreviewProps {
  sql: string;
  score: number;
  suggestions: string[];
}

export function SQLPreview({ sql, score, suggestions }: SQLPreviewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generated SQL</CardTitle>
          <CardDescription>Updates in real time from your drag-and-drop selections.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-[#30363d]">
            <MonacoEditor
              height="280px"
              language="sql"
              theme="vs-dark"
              value={sql}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                scrollBeyondLastLine: false
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optimization Insights</CardTitle>
          <CardDescription>Heuristics to reduce latency and avoid expensive scans.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#8b949e]">Health score</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-[#21262d]">
              <div className="h-2 bg-sky-500" style={{ width: `${Math.max(10, Math.min(100, score))}%` }} />
            </div>
            <span className="text-sm font-semibold text-white">{score}/100</span>
          </div>
          <ul className="space-y-2 text-sm text-[#c9d1d9]">
            {suggestions.map((suggestion) => (
              <li key={suggestion} className="rounded-md border border-[#30363d] bg-[#10151d] p-2">
                {suggestion}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
