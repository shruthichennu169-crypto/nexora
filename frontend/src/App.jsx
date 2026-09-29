import { useCallback, useEffect, useState } from "react";

const api = async (path, method = "GET") => {
  const r = await fetch("/api" + path, { method });

  if (!r.ok) {
    let d;
    try {
      d = (await r.json()).detail;
    } catch {}
    throw new Error(d || `HTTP ${r.status}`);
  }

  return r.json();
};

const BADGE = {
  green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  yellow: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  red: "bg-red-500/15 text-red-300 border-red-500/40",
  blue: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  gray: "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

const Badge = ({ color = "gray", children }) => (
  <span
    className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${BADGE[color]}`}
  >
    {children}
  </span>
);

const Card = ({ title, right, children, className = "" }) => (
  <section
    className={`rounded-xl border border-slate-800 bg-slate-900 p-5 ${className}`}
  >
    {(title || right) && (
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {title}
        </h2>
        {right}
      </div>
    )}

    {children}
  </section>
);

const Btn = ({ color = "blue", ...p }) => {
  const c = {
    blue: "bg-sky-600 hover:bg-sky-500",
    red: "bg-red-600 hover:bg-red-500",
    green: "bg-emerald-600 hover:bg-emerald-500",
    gray: "bg-slate-700 hover:bg-slate-600",
  }[color];

  return (
    <button
      {...p}
      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${c}`}
    />
  );
};

const THRESH = {
  error_rate: [1, 10],
  latency: [500, 3000],
  db_connections: [60, 90],
  cpu: [60, 80],
};

const sev = (k, v) =>
  v >= THRESH[k][1]
    ? "red"
    : v >= THRESH[k][0]
      ? "yellow"
      : "green";

const fmt = (k, v, max) =>
  k === "latency"
    ? v >= 1000
      ? `${(v / 1000).toFixed(1)} s`
      : `${v} ms`
    : k === "db_connections"
      ? `${v}/${max}`
      : `${v}%`;

const LABEL = {
  error_rate: "Error rate",
  latency: "Latency",
  db_connections: "DB connections",
  cpu: "CPU",
};

const TEXT = {
  green: "text-emerald-400",
  yellow: "text-amber-400",
  red: "text-red-400",
};

const Metrics = ({ m }) => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
    {Object.keys(LABEL).map((k) => (
      <Card key={k} title={LABEL[k]}>
        <div className={`text-3xl font-bold ${TEXT[sev(k, m[k])]}`}>
          {fmt(k, m[k], m.pool_max)}
        </div>
      </Card>
    ))}
  </div>
);

const AGENTS = [
  ["commander", "Incident Commander"],
  ["log", "Log Agent"],
  ["metrics", "Metrics Agent"],
  ["hindsight", "Hindsight Agent"],
  ["resolution", "Resolution Agent"],
];

const ICON = {
  complete: ["✓ Complete", "green"],
  running: ["● Running", "blue"],
  pending: ["○ Pending", "gray"],
  error: ["✗ Error", "red"],
};

/* =========================
   COMMAND CENTER
========================= */

const Dashboard = ({ inc, sys, list, act, go }) => {
  const active = list.filter((i) =>
    ["open", "investigating", "awaiting_approval", "rejected", "error"].includes(
      i.status
    )
  ).length;

  const resolved = list.filter((i) => i.status === "resolved").length;
  const critical = sys.status === "critical";

  return (
    <div className="space-y-6">

      {/* HERO */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />

          <span className="text-xs font-semibold tracking-[0.25em] text-slate-500">
            AI INCIDENT RESPONSE AGENT
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          NEXORA
        </h1>

        <p className="max-w-2xl text-sm text-slate-400">
          Multi-agent incident response system that investigates production
          incidents, recalls historical evidence, recommends resolutions,
          and learns from verified outcomes.
        </p>
      </div>

      {/* SYSTEM STATUS */}
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">
            System Status
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                critical ? "bg-red-400" : "bg-emerald-400"
              }`}
            />

            <span className="font-semibold text-slate-200">
              {critical ? "Incident Detected" : "All Systems Operational"}
            </span>
          </div>
        </div>

        <Badge color={critical ? "red" : "green"}>
          {critical ? "CRITICAL" : "OPERATIONAL"}
        </Badge>
      </div>

      {/* TOP STATS */}
      <div className="grid gap-4 md:grid-cols-3">

        <Card title="Active incidents">
          <div className="text-4xl font-bold text-red-400">
            {String(active).padStart(2, "0")}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Currently requiring attention
          </div>
        </Card>

        <Card title="Resolved today">
          <div className="text-4xl font-bold text-emerald-400">
            {resolved}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Successfully verified incidents
          </div>
        </Card>

        <Card title="MTTR">
          <div className="text-4xl font-bold text-sky-400">
            8m 42s
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Mean time to resolution
          </div>
        </Card>
      </div>

      {/* ACTIVE INCIDENT */}
      <Card
        title="Active incident"
        right={
          critical ? (
            <Badge color="red">CRITICAL</Badge>
          ) : (
            <Badge color="green">HEALTHY</Badge>
          )
        }
        className={
          critical
            ? "border-red-500/30 bg-gradient-to-br from-red-950/30 to-slate-900"
            : ""
        }
      >
        {critical ? (
          <>
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div>
                <div className="text-2xl font-bold text-white">
                  payment-api
                </div>

                <div className="mt-1 text-sm text-slate-400">
                  {inc?.title || "Severe production incident detected"}
                </div>

                {inc && (
                  <div className="mt-3 flex items-center gap-2">
                    <Badge color="blue">{inc.id}</Badge>

                    <Badge color="yellow">
                      {inc.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                )}
              </div>

              <Btn
                color="red"
                onClick={() => {
                  if (
                    inc &&
                    ["open", "rejected", "error"].includes(inc.status)
                  ) {
                    act(`/incidents/${inc.id}/investigate`);
                  } else {
                    go("investigation");
                  }
                }}
              >
                INVESTIGATE INCIDENT →
              </Btn>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">

              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">
                  Error rate
                </div>

                <div className="mt-2 text-2xl font-bold text-red-400">
                  {sys.metrics.error_rate}%
                </div>

                <div className="mt-1 text-xs text-red-300">
                  ↑ Critical
                </div>
              </div>

              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">
                  Latency
                </div>

                <div className="mt-2 text-2xl font-bold text-red-400">
                  {fmt("latency", sys.metrics.latency)}
                </div>

                <div className="mt-1 text-xs text-red-300">
                  ↑ Critical
                </div>
              </div>

              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">
                  DB connections
                </div>

                <div className="mt-2 text-2xl font-bold text-red-400">
                  {sys.metrics.db_connections}/{sys.metrics.pool_max}
                </div>

                <div className="mt-1 text-xs text-red-300">
                  🔴 Saturated
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="text-lg font-semibold text-emerald-400">
              No active production incidents
            </div>

            <div className="mt-1 text-sm text-slate-500">
              Nexora is monitoring all services.
            </div>

            <div className="mt-5">
              <Btn color="red" onClick={() => act("/incidents/trigger")}>
                TRIGGER DEMO INCIDENT
              </Btn>
            </div>
          </div>
        )}
      </Card>

      {/* SYSTEM HEALTH */}
      <Card title="System health">
        <div className="grid gap-3 md:grid-cols-4">

          <ServiceHealth
            name="payment-api"
            status={critical ? "Critical" : "Healthy"}
            color={critical ? "red" : "green"}
          />

          <ServiceHealth
            name="order-api"
            status="Healthy"
            color="green"
          />

          <ServiceHealth
            name="auth-service"
            status="Healthy"
            color="green"
          />

          <ServiceHealth
            name="database"
            status={critical ? "Degraded" : "Healthy"}
            color={critical ? "yellow" : "green"}
          />

        </div>
      </Card>

      {/* RECENT INCIDENTS */}
      <Card
        title="Recent incidents"
        right={
          <span className="text-xs text-slate-500">
            Incident history
          </span>
        }
      >
        {list.length === 0 ? (
          <div className="py-5 text-sm text-slate-500">
            No incidents yet.
          </div>
        ) : (
          <div className="space-y-2">

            {list.slice().reverse().slice(0, 5).map((i, index) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
              >

                <div className="flex items-center gap-4">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-300">
                    {i.id.replace("INC-", "")}
                  </div>

                  <div>
                    <div className="font-semibold text-slate-200">
                      {i.id}
                    </div>

                    <div className="text-xs text-slate-500">
                      {i.title}
                    </div>
                  </div>

                </div>

                <Badge
                  color={
                    i.status === "resolved"
                      ? "green"
                      : i.status === "error"
                        ? "red"
                        : "yellow"
                  }
                >
                  {i.status.replace("_", " ")}
                </Badge>

              </div>
            ))}

          </div>
        )}
      </Card>

      {/* DEMO CONTROL */}
      <div className="flex justify-end">
        <Btn
          color="gray"
          disabled={critical}
          onClick={() => act("/incidents/trigger")}
        >
          TRIGGER DEMO INCIDENT
        </Btn>
      </div>

    </div>
  );
};

const ServiceHealth = ({ name, status, color }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">

    <div className="flex items-center justify-between">

      <div className="font-semibold text-slate-200">
        {name}
      </div>

      <span
        className={`h-2.5 w-2.5 rounded-full ${
          color === "red"
            ? "bg-red-400"
            : color === "yellow"
              ? "bg-amber-400"
              : "bg-emerald-400"
        }`}
      />

    </div>

    <div
      className={`mt-2 text-sm ${
        color === "red"
          ? "text-red-400"
          : color === "yellow"
            ? "text-amber-400"
            : "text-emerald-400"
      }`}
    >
      {status}
    </div>

  </div>
);

/* =========================
   AGENT PANEL
========================= */

function AgentPanel({ inc }) {
  return (
    <Card
      title="AI investigation"
      right={
        <Badge color="blue">
          5 AGENTS
        </Badge>
      }
    >
      <div className="space-y-3">

        {AGENTS.map(([key, name]) => {

          const a = inc?.agents?.[key] || {
            status: "pending",
            detail: "",
          };

          const [label, color] = ICON[a.status] || ICON.pending;

          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-4"
            >

              <div>

                <div className="font-semibold text-slate-200">
                  {name}
                </div>

                {a.detail && (
                  <div className="mt-1 text-xs text-slate-500">
                    {a.detail}
                  </div>
                )}

              </div>

              <Badge color={color}>
                {label}
              </Badge>

            </div>
          );
        })}

      </div>
    </Card>
  );
}

/* =========================
   INVESTIGATION
========================= */

function Investigation({ inc }) {

  if (!inc) {
    return (
      <Card>
        <div className="py-10 text-center text-sm text-slate-500">
          No active incident. Trigger a demo incident from the Command Center.
        </div>
      </Card>
    );
  }

  const h = inc.hindsight;
  const r = inc.resolution;

  return (
    <div className="space-y-5">

      <div className="flex flex-wrap items-center justify-between gap-3">

        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">
            Incident investigation
          </div>

          <h1 className="mt-1 text-2xl font-bold text-white">
            {inc.id} · {inc.service}
          </h1>
        </div>

        <Badge color="red">
          {inc.status.replace("_", " ").toUpperCase()}
        </Badge>

      </div>

      <AgentPanel inc={inc} />

      <div className="grid gap-4 md:grid-cols-2">

        <Card title="Log findings">

          {inc.log_findings ? (
            <>
              <div className="mb-3 text-sm text-slate-300">
                {inc.log_findings.summary}
              </div>

              <pre className="max-h-72 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-400">
                {inc.logs.join("\n")}
              </pre>
            </>
          ) : (
            <div className="text-sm text-slate-500">
              Waiting for Log Agent…
            </div>
          )}

        </Card>

        <Card title="Metric findings">

          {inc.metric_findings ? (

            <ul className="space-y-2 text-sm">

              {inc.metric_findings.abnormal.map((a) => (

                <li
                  key={a.metric}
                  className="flex items-center justify-between rounded-lg bg-slate-950/60 p-3"
                >

                  <span>

                    {LABEL[a.metric]}:{" "}

                    <b>
                      {fmt(
                        a.metric,
                        a.value,
                        inc.metrics.pool_max
                      )}
                    </b>

                    <span className="ml-2 text-xs text-slate-500">
                      normal {a.normal}
                    </span>

                  </span>

                  <Badge
                    color={
                      a.severity === "critical"
                        ? "red"
                        : "yellow"
                    }
                  >
                    {a.severity}
                  </Badge>

                </li>

              ))}

            </ul>

          ) : (
            <div className="text-sm text-slate-500">
              Waiting for Metrics Agent…
            </div>
          )}

        </Card>

      </div>

      {/* HINDSIGHT */}
      <Card
        title="Hindsight memory"
        right={
          h && (
            <Badge
              color={
                h.mode === "connected"
                  ? "green"
                  : "yellow"
              }
            >
              {h.mode === "connected"
                ? "CONNECTED"
                : "DEMO MODE"}
            </Badge>
          )
        }
      >

        <div className="mb-4 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">

          <div className="font-semibold text-sky-300">
            Historical context ≠ final answer
          </div>

          <div className="mt-1 text-xs leading-5 text-slate-400">
            Nexora compares historical incidents with current logs,
            metrics, and evidence before recommending a resolution.
          </div>

        </div>

        {h ? (

          h.results.length ? (

            <div className="space-y-3">

              {h.results.map((x, i) => (

                <div
                  key={i}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"
                >

                  <div className="flex flex-wrap items-center gap-2">

                    <b className="text-slate-200">
                      {x.id}
                    </b>

                    <span className="text-xs text-slate-500">
                      {x.service}
                    </span>

                    {x.demo && (
                      <Badge color="yellow">
                        DEMO DATA
                      </Badge>
                    )}

                    <Badge color="blue">
                      {x.relevance != null
                        ? `relevance ${x.relevance}`
                        : `rank #${i + 1}`}
                    </Badge>

                  </div>

                  <div className="mt-3 space-y-1 text-sm text-slate-300">

                    <div>
                      <span className="text-slate-500">
                        Problem:
                      </span>{" "}
                      {x.problem}
                    </div>

                    <div>
                      <span className="text-slate-500">
                        Root cause:
                      </span>{" "}
                      {x.root_cause}
                    </div>

                    <div>
                      <span className="text-slate-500">
                        Fix:
                      </span>{" "}
                      {x.fix}
                    </div>

                    <div>
                      <span className="text-slate-500">
                        Result:
                      </span>{" "}
                      {x.result}
                    </div>

                  </div>

                  <div className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
                    Why relevant: similar service, symptoms, or
                    infrastructure evidence.
                  </div>

                </div>

              ))}

            </div>

          ) : (
            <div className="text-sm text-slate-400">
              No similar incidents found.
            </div>
          )

        ) : (
          <div className="text-sm text-slate-500">
            Waiting for Hindsight Agent…
          </div>
        )}

        {h?.repeat_analysis && (

          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4">

            <div className="mb-4 flex items-center justify-between">

              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Recurrence analysis
              </h3>

              <Badge
                color={
                  h.repeat_analysis.is_repeat
                    ? "red"
                    : "green"
                }
              >
                {h.repeat_analysis.pattern}
              </Badge>

            </div>

            <div className="grid gap-3 md:grid-cols-2">

              <div className="rounded-lg bg-slate-900 p-3">

                <div className="text-xs text-slate-500">
                  Current error occurrences
                </div>

                <div className="mt-1 text-xl font-bold">
                  {h.repeat_analysis.current_error_count}
                </div>

              </div>

              <div className="rounded-lg bg-slate-900 p-3">

                <div className="text-xs text-slate-500">
                  Similar historical incidents
                </div>

                <div className="mt-1 text-xl font-bold">
                  {h.repeat_analysis.historical_count}
                </div>

              </div>

            </div>

            {h.repeat_analysis.matching_incidents.length > 0 && (

              <div className="mt-4">

                <div className="mb-2 text-xs text-slate-500">
                  Matching incidents
                </div>

                <div className="flex flex-wrap gap-2">

                  {h.repeat_analysis.matching_incidents.map((id) => (
                    <Badge key={id} color="blue">
                      {id}
                    </Badge>
                  ))}

                </div>

              </div>

            )}

            {h.repeat_analysis.previous_causes.length > 0 && (

              <div className="mt-4">

                <div className="mb-2 text-xs text-slate-500">
                  Previous causes
                </div>

                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">

                  {h.repeat_analysis.previous_causes.map(
                    (cause, i) => (
                      <li key={i}>{cause}</li>
                    )
                  )}

                </ul>

              </div>

            )}

            {h.repeat_analysis.previous_fixes.length > 0 && (

              <div className="mt-4">

                <div className="mb-2 text-xs text-slate-500">
                  Previous fixes
                </div>

                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">

                  {h.repeat_analysis.previous_fixes.map(
                    (fix, i) => (
                      <li key={i}>{fix}</li>
                    )
                  )}

                </ul>

              </div>

            )}

          </div>

        )}

      </Card>

      {/* REASONING */}
      {r && (

        <Card title="Nexora's reasoning">

          <div className="grid gap-5 md:grid-cols-2">

            <div>

              <div className="text-xs uppercase tracking-widest text-slate-500">
                Most likely root cause
              </div>

              <div className="mt-2 text-xl font-bold text-sky-300">
                {r.root_cause}
              </div>

              <div className="mt-4 text-xs uppercase tracking-widest text-slate-500">
                Confidence
              </div>

              <div className="mt-2 flex items-center gap-3">

                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">

                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{
                      width: `${Math.round(
                        r.confidence * 100
                      )}%`,
                    }}
                  />

                </div>

                <span className="font-bold text-sky-300">
                  {Math.round(r.confidence * 100)}%
                </span>

              </div>

            </div>

            <div>

              <div className="text-xs uppercase tracking-widest text-slate-500">
                Evidence used
              </div>

              <ul className="mt-2 space-y-2 text-sm text-slate-300">

                {r.evidence?.map((e, i) => (
                  <li key={i}>
                    <span className="mr-2 text-emerald-400">
                      ✓
                    </span>
                    {e}
                  </li>
                ))}

              </ul>

            </div>

          </div>

          <div className="mt-5 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">

            <div className="text-xs uppercase tracking-widest text-slate-500">
              Historical reference
            </div>

            <div className="mt-1 font-semibold text-slate-200">
              {r.historical_reference === "None"
                ? "No matching historical incident"
                : r.historical_reference}
            </div>

          </div>

        </Card>

      )}

    </div>
  );
}

/* =========================
   RESOLUTION
========================= */

function Resolution({ inc, act }) {

  const r = inc?.resolution;

  if (!r) {
    return (
      <Card>
        <div className="py-10 text-center text-sm text-slate-500">
          Resolution is not ready yet.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">

      <div>
        <div className="text-xs uppercase tracking-widest text-slate-500">
          Resolution & approval
        </div>

        <h1 className="mt-1 text-2xl font-bold">
          Recommended resolution
        </h1>
      </div>

      <Card
        title="Recommended resolution"
        right={
          <Badge color="yellow">
            HUMAN APPROVAL REQUIRED
          </Badge>
        }
      >

        <div className="text-2xl font-bold text-sky-300">
          {r.root_cause}
        </div>

        <div className="mt-2 text-sm text-slate-400">
          Confidence: {Math.round(r.confidence * 100)}%
        </div>

        <div className="mt-6">

          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Evidence
          </div>

          <ul className="space-y-2 text-sm text-slate-300">

            {r.evidence.map((e, i) => (
              <li key={i}>
                <span className="mr-2 text-emerald-400">
                  ✓
                </span>
                {e}
              </li>
            ))}

          </ul>

        </div>

        <div className="mt-6 rounded-lg border border-sky-500/20 bg-sky-500/5 p-5">

          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Recommended action
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-200">
            {r.recommended_action}
          </div>

          <div className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Expected result
          </div>

          <div className="mt-2 text-sm text-slate-300">
            {r.expected_result}
          </div>

        </div>

        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">

          <div className="font-semibold text-amber-300">
            ⚠ Action requires approval
          </div>

          <div className="mt-1 text-xs text-slate-400">
            Nexora will execute the simulated remediation only
            after human approval.
          </div>

        </div>

        <div className="mt-5 flex gap-3">

          <Btn
            color="green"
            disabled={inc.status !== "awaiting_approval"}
            onClick={() =>
              act(`/incidents/${inc.id}/approve`)
            }
          >
            APPROVE FIX
          </Btn>

          <Btn
            color="red"
            disabled={inc.status !== "awaiting_approval"}
            onClick={() =>
              act(`/incidents/${inc.id}/reject`)
            }
          >
            REJECT
          </Btn>

        </div>

      </Card>

      {/* VERIFICATION */}

      {inc.verification && (

        <Card
          title="Remediation & verification"
          right={
            <Badge
              color={
                inc.verification.healthy
                  ? "green"
                  : "red"
              }
            >
              {inc.verification.healthy
                ? "RESOLVED"
                : "FAILED"}
            </Badge>
          }
        >

          <div className="grid gap-3 md:grid-cols-3">

            {inc.verification.checks.map((c) => (

              <div
                key={c.name}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"
              >

                <div className="text-xs text-slate-500">
                  {c.name}
                </div>

                <div
                  className={`mt-2 text-lg font-bold ${
                    c.ok
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {c.value}
                </div>

                <div className="mt-1 text-xs">
                  {c.ok
                    ? "✓ Healthy"
                    : "✗ Outside limit"}
                </div>

              </div>

            ))}

          </div>

          {inc.verification.healthy && (

            <div className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5">

              <div className="text-lg font-bold text-emerald-400">
                🟢 System health restored
              </div>

              <div className="mt-2 text-sm text-slate-400">
                Error rate, latency, and database connection
                utilization returned within healthy limits.
              </div>

            </div>

          )}

        </Card>

      )}

    </div>
  );
}

/* =========================
   MEMORY
========================= */

function Memory({ memory }) {

  return (
    <div className="space-y-5">

      <div>
        <div className="text-xs uppercase tracking-widest text-slate-500">
          Historical knowledge
        </div>

        <h1 className="mt-1 text-2xl font-bold">
          Hindsight Memory
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Historical incidents Nexora can use as context.
        </p>
      </div>

      <Card
        title="Hindsight memory"
        right={
          <Badge
            color={
              memory.hindsight.mode === "connected"
                ? "green"
                : "yellow"
            }
          >
            {memory.hindsight.mode}
          </Badge>
        }
      >

        {memory.hindsight.warning && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
            {memory.hindsight.warning}
          </div>
        )}

        <div className="mb-5 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">

          <div className="font-semibold text-sky-300">
            MEMORY ≠ ANSWER
          </div>

          <div className="mt-1 text-xs leading-5 text-slate-400">
            Historical incidents provide evidence. Nexora compares
            that evidence with the current incident before deciding
            whether it is relevant.
          </div>

        </div>

        <div className="space-y-3">

          {memory.incidents.map((x) => (

            <div
              key={x.id}
              className="rounded-lg border border-slate-800 bg-slate-950/60 p-5"
            >

              <div className="mb-3 flex flex-wrap items-center gap-2">

                <b className="text-lg">
                  {x.id}
                </b>

                {x.demo && (
                  <Badge color="yellow">
                    DEMO DATA
                  </Badge>
                )}

              </div>

              <div className="grid gap-2 text-sm">

                <div>
                  <span className="text-slate-500">
                    Service:
                  </span>{" "}
                  {x.service}
                </div>

                <div>
                  <span className="text-slate-500">
                    Problem:
                  </span>{" "}
                  {x.problem}
                </div>

                <div>
                  <span className="text-slate-500">
                    Root cause:
                  </span>{" "}
                  {x.root_cause}
                </div>

                <div>
                  <span className="text-slate-500">
                    Fix:
                  </span>{" "}
                  {x.fix}
                </div>

              </div>

            </div>

          ))}

        </div>

      </Card>

    </div>
  );
}

/* =========================
   APP
========================= */

export default function App() {

  const [tab, setTab] = useState("dashboard");
  const [system, setSystem] = useState(null);
  const [incident, setIncident] = useState(null);
  const [list, setList] = useState([]);
  const [memory, setMemory] = useState(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {

    try {

      const [c, l, m] = await Promise.all([
        api("/incidents/current"),
        api("/incidents"),
        api("/memory"),
      ]);

      setSystem(c.system);
      setIncident(c.incident);
      setList(l);
      setMemory(m);
      setError("");

    } catch (e) {
      setError(e.message);
    }

  }, []);

  useEffect(() => {

    refresh();

    const timer = setInterval(refresh, 1500);

    return () => clearInterval(timer);

  }, [refresh]);

  const act = async (path, method = "POST") => {

    try {

      await api(path, method);

      await refresh();

    } catch (e) {
      setError(e.message);
    }

  };

  if (!system || !memory) {

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">

        <div className="text-center">

          <div className="mb-3 text-2xl font-bold tracking-wide text-white">
            NEXORA
          </div>

          <div className="text-sm text-slate-500">
            Loading multi-agent incident response system…
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* HEADER */}

      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">

          <div>

            <div className="text-xl font-bold tracking-tight text-white">
              NEXORA
            </div>

            <div className="text-[10px] font-semibold tracking-[0.2em] text-slate-500">
              MULTI-AGENT INCIDENT RESPONSE SYSTEM
            </div>

          </div>

          <Badge
            color={
              system.status === "critical"
                ? "red"
                : "green"
            }
          >
            ●{" "}
            {system.status === "critical"
              ? "CRITICAL"
              : "ALL SYSTEMS OPERATIONAL"}
          </Badge>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* NAVIGATION */}

        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-1">

          {[
            ["dashboard", "🏠 Command Center"],
            ["investigation", "🔍 Investigation"],
            ["resolution", "🛠 Resolution"],
            ["memory", "🧠 Hindsight Memory"],
          ].map(([key, label]) => (

            <button
              key={key}
              onClick={() => setTab(key)}
              className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                tab === key
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-950/30"
                  : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              {label}
            </button>

          ))}

        </div>

        {/* SCREENS */}

        {tab === "dashboard" && (
          <Dashboard
            inc={incident}
            sys={system}
            list={list}
            act={act}
            go={setTab}
          />
        )}

        {tab === "investigation" && (
          <Investigation inc={incident} />
        )}

        {tab === "resolution" && (
          <Resolution
            inc={incident}
            act={act}
          />
        )}

        {tab === "memory" && (
          <Memory memory={memory} />
        )}

      </main>

      <footer className="mx-auto max-w-7xl px-5 pb-8 pt-2 text-center text-xs text-slate-700">
        NEXORA · Multi-Agent Incident Response System
      </footer>

    </div>
  );
}