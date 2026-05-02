"use client";

import { Database, Loader2, PlugZap } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type DatabaseType = "postgres" | "mysql" | "sqlite";

export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

export interface SchemaColumn {
  name: string;
  dataType: string;
  nullable: boolean;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

interface DatabaseConnectorProps {
  onSchemaLoaded: (schema: SchemaTable[], config: DatabaseConfig) => void;
}

const defaultPorts: Record<Exclude<DatabaseType, "sqlite">, number> = {
  postgres: 5432,
  mysql: 3306
};

export function DatabaseConnector({ onSchemaLoaded }: DatabaseConnectorProps) {
  const [config, setConfig] = useState<DatabaseConfig>({
    type: "postgres",
    host: "",
    port: 5432,
    user: "",
    password: "",
    database: "",
    ssl: false
  });
  const [loading, setLoading] = useState(false);

  const updateConfig = <K extends keyof DatabaseConfig>(key: K, value: DatabaseConfig[K]) => {
    setConfig((previous) => ({ ...previous, [key]: value }));
  };

  const loadSchema = async () => {
    setLoading(true);
    try {
      const connectResponse = await fetch("/api/database/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(config)
      });

      if (!connectResponse.ok) {
        const message = await connectResponse.text();
        throw new Error(message || "Connection failed");
      }

      const schemaResponse = await fetch("/api/database/schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(config)
      });

      if (!schemaResponse.ok) {
        const message = await schemaResponse.text();
        throw new Error(message || "Schema loading failed");
      }

      const payload = (await schemaResponse.json()) as { tables: SchemaTable[] };

      onSchemaLoaded(payload.tables, config);
      toast.success(`Loaded ${payload.tables.length} tables`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected connection error";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const disableNetworkInputs = config.type === "sqlite";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-sky-400" />
          Connect Database
        </CardTitle>
        <CardDescription>
          Use a read-only analytics user. This builder introspects tables and columns to generate SQL automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-[#8b949e]">Database Type</label>
            <Select
              value={config.type}
              onChange={(event) => {
                const type = event.target.value as DatabaseType;
                setConfig((previous) => ({
                  ...previous,
                  type,
                  port: type === "sqlite" ? previous.port : defaultPorts[type]
                }));
              }}
            >
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite (disabled)</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-[#8b949e]">Host</label>
            <Input
              value={config.host}
              onChange={(event) => updateConfig("host", event.target.value)}
              placeholder="analytics.db.internal"
              disabled={disableNetworkInputs}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-[#8b949e]">Port</label>
            <Input
              type="number"
              value={config.port}
              onChange={(event) => updateConfig("port", Number(event.target.value) || 0)}
              disabled={disableNetworkInputs}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-[#8b949e]">User</label>
            <Input
              value={config.user}
              onChange={(event) => updateConfig("user", event.target.value)}
              placeholder="readonly_analyst"
              disabled={disableNetworkInputs}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-[#8b949e]">Password</label>
            <Input
              type="password"
              value={config.password}
              onChange={(event) => updateConfig("password", event.target.value)}
              placeholder="••••••••"
              disabled={disableNetworkInputs}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-[#8b949e]">Database</label>
            <Input
              value={config.database}
              onChange={(event) => updateConfig("database", event.target.value)}
              placeholder="product_warehouse"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#c9d1d9]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border border-[#30363d] bg-[#0d1117]"
            checked={config.ssl}
            onChange={(event) => updateConfig("ssl", event.target.checked)}
            disabled={disableNetworkInputs}
          />
          Use SSL/TLS
        </label>

        {config.type === "sqlite" ? (
          <p className="rounded-md border border-amber-700/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            SQLite adapter is intentionally disabled in this deployment. Use PostgreSQL or MySQL for shared team access.
          </p>
        ) : null}

        <Button onClick={loadSchema} disabled={loading} className="w-full md:w-auto">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
          {loading ? "Connecting..." : "Connect & Load Schema"}
        </Button>
      </CardContent>
    </Card>
  );
}
