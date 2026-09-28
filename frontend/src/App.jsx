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
      <div className="mb-3 flex items-center justify-between">
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
      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 ${c}`}
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
  running: ["… Running", "blue"],
  pending: ["○ Pending", "gray"],
  error: ["✗ Error", "red"],
};
const Dashboard = ({ inc, sys, list, act, go }) => {
  const active = list.filter((i) =>
    ["open", "investigating", "awaiting_approval", "rejected", "error"].includes(i.status)
  ).length;

  const resolved = list.filter((i) => i.status === "resolved").length;
  const critical = sys.status === "critical";

  return (
    <div className="space-y-4">
      <Card className={critical ? "border-red-500/50" : "border-emerald-500/30"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge color={critical ? "red" : "green"}>
                {critical ? "CRITICAL INCIDENT" : "SYSTEM HEALTHY"}
              </Badge>

              {inc && (
                <Badge color="blue">
                  {inc.id} · {inc.status.replace("_", " ").toUpperCase()}
                </Badge>
              )}
            </div>

            <div className="text-xl font-bold text-slate-100">
              payment-api
            </div>

            {critical && (
              <div className="text-sm text-slate-400">
                Error rate {sys.metrics.error_rate}% · Latency{" "}
                {fmt("latency", sys.metrics.latency)} · DB connections{" "}
                {sys.metrics.db_connections}/{sys.metrics.pool_max}
              </div>
            )}

            {inc?.status === "resolved" && (
              <div className="mt-1 font-semibold text-emerald-400">
                ✓ INCIDENT RESOLVED
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Btn
              color="red"
              disabled={critical}
              onClick={() => act("/incidents/trigger")}
            >
              TRIGGER DEMO INCIDENT
            </Btn>

            {inc &&
              ["open", "rejected", "error"].includes(inc.status) && (
                <Btn
                  onClick={() => act(`/incidents/${inc.id}/investigate`)}
                >
                  INVESTIGATE
                </Btn>
              )}

            {inc?.status === "awaiting_approval" && (
              <Btn onClick={() => go("resolution")}>
                REVIEW RESOLUTION
              </Btn>
            )}

            {inc?.status === "resolved" && (
              <Btn color="gray" onClick={() => act("/system/reset")}>
                RESET SYSTEM
              </Btn>
            )}
          </div>
        </div>
      </Card>

      <Metrics m={sys.metrics} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Active incidents">
          <div className="text-3xl font-bold text-red-400">
            {active}
          </div>
        </Card>

        <Card title="Resolved incidents">
          <div className="text-3xl font-bold text-emerald-400">
            {resolved}
          </div>
        </Card>

        <Card title="System state">
          <Badge color={critical ? "red" : "green"}>
            {sys.metrics.state.toUpperCase()}
          </Badge>
        </Card>
      </div>

      <Card title="Incident history">
        {list.length === 0 ? (
          <div className="text-sm text-slate-500">
            No incidents yet.
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-800/60 p-3"
              >
                <div>
                  <div className="font-semibold">{i.id}</div>
                  <div className="text-xs text-slate-500">
                    {i.title}
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
    </div>
  );
};
function AgentPanel({ inc }) {
  return (
    <Card title="Agent investigation">
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
              className="flex items-center justify-between rounded-lg bg-slate-800/60 p-3"
            >
              <div>
                <div className="font-semibold text-slate-200">
                  {name}
                </div>

                {a.detail && (
                  <div className="text-xs text-slate-500">
                    {a.detail}
                  </div>
                )}
              </div>

              <Badge color={color}>{label}</Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Investigation({ inc }) {
  if (!inc) {
    return (
      <Card>
        <div className="text-sm text-slate-500">
          No active incident. Trigger a demo incident first.
        </div>
      </Card>
    );
  }

  const h = inc.hindsight;
  const r = inc.resolution;

  return (
    <div className="space-y-4">
      <AgentPanel inc={inc} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Log findings">
          {inc.log_findings ? (
            <>
              <div className="mb-2 text-sm text-slate-300">
                {inc.log_findings.summary}
              </div>

              <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-400">
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
            <ul className="space-y-1 text-sm">
              {inc.metric_findings.abnormal.map((a) => (
                <li
                  key={a.metric}
                  className="flex justify-between"
                >
                  <span>
                    {LABEL[a.metric]}:{" "}
                    <b>
                      {fmt(
                        a.metric,
                        a.value,
                        inc.metrics.pool_max
                      )}
                    </b>{" "}
                    <span className="text-slate-500">
                      (normal {a.normal})
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

      <Card
        title="Hindsight results"
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
        {h ? (
          h.results.length ? (
            h.results.map((x, i) => (
              <div
                key={i}
                className="mb-2 rounded-lg bg-slate-800/60 p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <b>{x.id}</b>
                  <span className="text-slate-400">
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

                <div>Problem: {x.problem}</div>
                <div>Root cause: {x.root_cause}</div>
                <div>Fix: {x.fix}</div>
                <div>Result: {x.result}</div>
              </div>
            ))
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

        {h?.warning && (
          <div className="text-xs text-amber-400">
            {h.warning}
          </div>
        )}
      </Card>

      {r && (
        <Card title="Root cause">
          <div className="text-lg font-bold text-sky-300">
            {r.root_cause}
          </div>

          <div className="text-sm text-slate-400">
            Confidence {Math.round(r.confidence * 100)}%
          </div>
        </Card>
      )}
    </div>
  );
}
function Resolution({ inc, act }) {
  const r = inc?.resolution;

  if (!r) {
    return (
      <Card>
        <div className="text-sm text-slate-500">
          Resolution is not ready yet.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card title="Recommended resolution">
        <div className="mb-3 text-xl font-bold text-sky-300">
          {r.root_cause}
        </div>

        <div className="mb-4 text-sm text-slate-400">
          Confidence: {Math.round(r.confidence * 100)}%
        </div>

        <div className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
            Evidence
          </div>

          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            {r.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-slate-800/60 p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">
            Recommended action
          </div>

          <div className="mt-1 text-slate-200">
            {r.recommended_action}
          </div>

          <div className="mt-3 text-xs font-semibold uppercase text-slate-500">
            Expected result
          </div>

          <div className="mt-1 text-slate-300">
            {r.expected_result}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Btn
            color="green"
            disabled={inc.status !== "awaiting_approval"}
            onClick={() => act(`/incidents/${inc.id}/approve`)}
          >
            APPROVE FIX
          </Btn>

          <Btn
            color="red"
            disabled={inc.status !== "awaiting_approval"}
            onClick={() => act(`/incidents/${inc.id}/reject`)}
          >
            REJECT
          </Btn>
        </div>
      </Card>

      {inc.verification && (
        <Card title="Verification">
          <Badge color={inc.verification.healthy ? "green" : "red"}>
            {inc.verification.healthy
              ? "SYSTEM HEALTHY"
              : "VERIFICATION FAILED"}
          </Badge>

          <div className="mt-3 space-y-2">
            {inc.verification.checks.map((c) => (
              <div
                key={c.name}
                className="flex justify-between rounded-lg bg-slate-800/60 p-3 text-sm"
              >
                <span>{c.name}</span>
                <span
                  className={
                    c.ok
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {c.value} {c.ok ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Memory({ memory }) {
  return (
    <div className="space-y-4">
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
          <div className="mb-3 text-xs text-amber-400">
            {memory.hindsight.warning}
          </div>
        )}

        <div className="space-y-3">
          {memory.incidents.map((x) => (
            <div
              key={x.id}
              className="rounded-lg bg-slate-800/60 p-4"
            >
              <div className="mb-1 flex items-center gap-2">
                <b>{x.id}</b>

                {x.demo && (
                  <Badge color="yellow">
                    DEMO DATA
                  </Badge>
                )}
              </div>

              <div className="text-sm text-slate-300">
                <b>Service:</b> {x.service}
              </div>

              <div className="text-sm text-slate-300">
                <b>Problem:</b> {x.problem}
              </div>

              <div className="text-sm text-slate-300">
                <b>Root cause:</b> {x.root_cause}
              </div>

              <div className="text-sm text-slate-300">
                <b>Fix:</b> {x.fix}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

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
        Loading IncidentMind…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <div className="text-xl font-bold tracking-tight">
              IncidentMind
            </div>

            <div className="text-xs text-slate-500">
              Multi-agent incident response system
            </div>
          </div>

          <Badge
            color={
              system.status === "critical"
                ? "red"
                : "green"
            }
          >
            {system.status.toUpperCase()}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-5 flex gap-2 border-b border-slate-800">
          {[
            ["dashboard", "Dashboard"],
            ["investigation", "Investigation"],
            ["resolution", "Resolution"],
            ["memory", "Hindsight Memory"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border-b-2 px-3 py-2 text-sm font-semibold ${
                tab === key
                  ? "border-sky-400 text-sky-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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
    </div>
  );
}