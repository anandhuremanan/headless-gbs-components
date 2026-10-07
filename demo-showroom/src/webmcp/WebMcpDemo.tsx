"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createGridAgent,
  DataGrid,
  GRID_TOOL_NAME,
  registerGridTool,
  type GridAgent,
  type GridApi,
  type RegistrationResult,
} from "@/components/data-grid";
import fixture from "../../../eval/grid/v0/fixture.json";

/*
 * The grid the WebMCP proof drives.
 *
 * It renders the evaluation fixture rather than the showroom's employee data,
 * so "Show customers from Kerala" is the same request as corpus case grid-001
 * — the same columns, the same semantics, the same policy. A proof against
 * different data would prove something adjacent to what we want to know.
 */

type Row = Record<string, string | number | boolean>;

interface CallLog {
  at: string;
  input: unknown;
  result: Record<string, unknown>;
}

export function WebMcpDemo() {
  const apiRef = useRef<GridApi<Row>>(null);
  const [registration, setRegistration] = useState<RegistrationResult | null>(null);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [agent, setAgent] = useState<GridAgent<Row> | null>(null);
  const [stats, setStats] = useState<{ filteredRows: number | null; totalRows: number | null } | null>(null);

  const options = useMemo(
    () => ({
      data: fixture.rows as Row[],
      columns: fixture.columns as never,
      getRowId: fixture.getRowId as never,
      enableRowSelection: true,
    }),
    [],
  );

  /*
   * StrictMode runs effects twice in development, and WebMCP throws
   * "Duplicate tool name" on the second registration. One tool per page is the
   * intent, so the guard belongs here rather than in the adapter.
   */
  const registeredOnce = useRef(false);

  useEffect(() => {
    if (!apiRef.current || registeredOnce.current) return;
    registeredOnce.current = true;

    const [year, month, day] = fixture.today.split("-").map(Number);
    const built = createGridAgent<Row>({
      api: apiRef.current,
      options,
      semantics: fixture.semantics as never,
      policy: fixture.policy as never,
      locale: fixture.locale,
      now: () => new Date(year, month - 1, day),
    });
    setAgent(built);

    const result = registerGridTool(built as GridAgent<unknown>, {
      onCall: (entry) => {
        setCalls((previous) => [
          { at: new Date().toISOString(), input: entry.input, result: entry.result },
          ...previous,
        ]);
        // Read the contract again after the command ran, so the counter on
        // screen reflects the grid rather than the last render.
        setStats(built.contract().stats);
      },
    });
    setStats(built.contract().stats);
    setRegistration(result);

    // Exposed so a test driver can inspect the same objects the agent sees.
    (window as unknown as Record<string, unknown>).__GBS_WEBMCP = {
      agent: built,
      registration: result,
      toolName: GRID_TOOL_NAME,
    };
  }, [options]);

  const contract = agent?.contract();

  return (
    <div style={{ display: "grid", gap: 16, padding: 16 }}>
      <header>
        <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>WebMCP · operate_grid</h2>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
          One tool, exposing the existing validated command boundary. No model is bundled or
          downloaded; the browser's agent supplies the arguments.
        </p>
      </header>

      <div
        data-testid="registration"
        data-registered={String(registration?.registered ?? false)}
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 12,
          padding: 10,
          borderRadius: 6,
          border: "1px solid rgba(128,128,128,.35)",
        }}
      >
        <div>
          tool <strong>{GRID_TOOL_NAME}</strong> —{" "}
          {registration === null
            ? "registering…"
            : registration.registered
              ? "registered"
              : `not registered: ${registration.reason}`}
        </div>
        {contract && (
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            contract {contract.contractVersion} · {contract.columns.length} columns ·{" "}
            {contract.operations.length} operations · showing{" "}
            <span data-testid="rows-showing">{stats?.filteredRows ?? contract.stats.filteredRows}</span> of{" "}
            {stats?.totalRows ?? contract.stats.totalRows} rows
          </div>
        )}
      </div>

      <DataGrid
        ref={apiRef}
        data={options.data}
        columns={options.columns}
        getRowId={options.getRowId}
        enableRowSelection
        height={420}
        aria-label="Customers"
      />

      <section>
        <h3 style={{ fontSize: 13, margin: "0 0 6px", opacity: 0.75 }}>
          Tool calls ({calls.length})
        </h3>
        <pre
          data-testid="call-log"
          style={{
            margin: 0,
            fontSize: 11,
            maxHeight: 220,
            overflow: "auto",
            padding: 10,
            borderRadius: 6,
            border: "1px solid rgba(128,128,128,.35)",
            whiteSpace: "pre-wrap",
          }}
        >
          {calls.length === 0 ? "(none yet)" : JSON.stringify(calls, null, 2)}
        </pre>
      </section>
    </div>
  );
}
