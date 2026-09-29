import asyncio
import json
import os
import re
from collections import Counter, defaultdict

import prompts

LINE = re.compile(r"^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) (\w+) (.*)$")

NORMAL = {
    "error_rate": 0.2,
    "latency": 180,
    "db_connections": 30,
    "cpu": 35
}

LIMITS = {
    "error_rate": 1,
    "latency": 500,
    "db_connections": 60,
    "cpu": 60
}

REQUIRED = [
    "root_cause",
    "confidence",
    "evidence",
    "historical_reference",
    "recommended_action",
    "expected_result"
]


def llm_mode():
    if os.getenv("LLM_API_KEY"):
        return "LLM: CONNECTED"

    return "LLM: FALLBACK (rule-based)"


def call_llm(system, user):
    key = os.getenv("LLM_API_KEY")

    if not key:
        raise RuntimeError("LLM_API_KEY not set")

    from openai import OpenAI

    client = OpenAI(
        api_key=key,
        base_url=os.getenv("LLM_BASE_URL") or None,
        timeout=30
    )

    r = client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        temperature=0,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
    )

    return r.choices[0].message.content


# ---------------- LOG AGENT ----------------

def log_agent(logs):
    counts = Counter()
    times = defaultdict(list)

    for line in logs:
        m = LINE.match(line)

        if m and m.group(2) == "ERROR":
            counts[m.group(3)] += 1
            times[m.group(3)].append(m.group(1))

    errors = [
        {
            "message": k,
            "count": v,
            "first_seen": times[k][0],
            "last_seen": times[k][-1]
        }
        for k, v in counts.most_common()
    ]

    suspicious = [
        e["message"]
        for e in errors
        if e["count"] >= 3
    ]

    if any("pool usage" in l.lower() for l in logs):
        suspicious.append(
            "Connection pool usage warnings at 100/100"
        )

    summary = (
        f"{errors[0]['message']} detected ({errors[0]['count']}x)"
        if errors
        else "No errors found in logs"
    )

    return {
        "errors": errors,
        "suspicious_patterns": suspicious,
        "summary": summary
    }


# ---------------- METRICS AGENT ----------------

def metrics_agent(m):
    abnormal = []

    for k, limit in LIMITS.items():

        if m[k] >= limit:

            abnormal.append(
                {
                    "metric": k,
                    "value": m[k],
                    "normal": NORMAL[k],
                    "severity":
                        "critical"
                        if m[k] >= limit * (1.3 if k == "cpu" else 3)
                        else "warning"
                }
            )

    parts = []

    for a in abnormal:

        if a["metric"] == "db_connections":

            parts.append(
                f"Database connections at "
                f"{a['value']}/{m['pool_max']}"
            )

        else:

            parts.append(
                f"{a['metric']} "
                f"{a['value']} "
                f"(normal {a['normal']})"
            )

    return {
        "abnormal": abnormal,
        "summary": "; ".join(parts)
        if parts
        else "All metrics normal"
    }


# ---------------- HINDSIGHT AGENT ----------------
def hindsight_agent(hs, incident, log_r, met_r):
    current_errors = [
        e["message"]
        for e in log_r["errors"]
    ]

    query = (
        f"{incident['service']} "
        f"{incident['title']} "
        + " ".join(current_errors)
        + " "
        + " ".join(
            a["metric"].replace("_", " ")
            for a in met_r["abnormal"]
        )
        + " connection pool database"
    )

    res = hs.search(query, k=10)

    matches = res["results"]

    if matches:
        summary = (
            f"Found {len(matches)} similar historical incident(s)"
        )
    else:
        summary = "No similar previous incidents found"

    # Analyze whether the current problem is repeating
    repeated_error = None

    for error in log_r["errors"]:
        if error["count"] >= 3:
            repeated_error = error
            break

    historical_count = len(matches)

    is_repeat = (
        repeated_error is not None
        or historical_count > 0
    )

    matching_ids = [
        x["id"]
        for x in matches
        if x.get("id")
    ]

    previous_causes = [
        x["root_cause"]
        for x in matches
        if x.get("root_cause")
    ]

    previous_fixes = [
        x["fix"]
        for x in matches
        if x.get("fix")
    ]

    repeat_analysis = {
        "is_repeat": is_repeat,
        "current_error_repeated": repeated_error is not None,
        "current_error_count": (
            repeated_error["count"]
            if repeated_error
            else 0
        ),
        "historical_count": historical_count,
        "matching_incidents": matching_ids,
        "previous_causes": previous_causes[:5],
        "previous_fixes": previous_fixes[:5],
        "pattern": (
            "Recurring incident"
            if is_repeat
            else "No known recurrence"
        )
    }

    return {
        **res,
        "summary": summary,
        "query": query,
        "repeat_analysis": repeat_analysis
    }

# ---------------- RESOLUTION AGENT ----------------
def _fallback(incident, log_r, met_r, hs_r):
    pool_exc = any(
        "ConnectionPool" in e["message"]
        for e in log_r["errors"]
    )

    db = next(
        (
            a
            for a in met_r["abnormal"]
            if a["metric"] == "db_connections"
        ),
        None
    )

    history = hs_r.get("repeat_analysis", {})

    matches = history.get("matching_incidents", [])
    previous_causes = history.get("previous_causes", [])
    previous_fixes = history.get("previous_fixes", [])

    if not (pool_exc or db):
        return {
            "root_cause": "Undetermined - insufficient evidence",
            "confidence": 0.3,
            "evidence": [
                log_r["summary"],
                met_r["summary"],
                "No sufficient evidence for a confirmed root cause"
            ],
            "historical_reference": (
                matches[0] if matches else "None"
            ),
            "recommended_action": (
                "Escalate to on-call engineer for manual investigation"
            ),
            "expected_result": "Manual investigation required"
        }

    evidence = []

    if db:
        evidence.append(
            f"Database connections reached "
            f"{db['value']}/{incident['metrics']['pool_max']}"
        )

    if pool_exc:
        n = next(
            e["count"]
            for e in log_r["errors"]
            if "ConnectionPool" in e["message"]
        )

        evidence.append(
            f"ConnectionPoolExhaustedException "
            f"appears repeatedly ({n} times)"
        )

    if matches:
        evidence.append(
            f"Similar historical incidents found: "
            f"{', '.join(matches)}"
        )

    if previous_causes:
        evidence.append(
            f"Previous causes included: "
            f"{'; '.join(previous_causes[:3])}"
        )

    if previous_fixes:
        evidence.append(
            f"Previous successful fixes included: "
            f"{'; '.join(previous_fixes[:3])}"
        )

    repeat_text = (
        "The current incident appears to be a recurring problem."
        if history.get("is_repeat")
        else "No confirmed recurrence was found."
    )

    evidence.append(repeat_text)

    conf = (
        0.6
        + (0.15 if pool_exc else 0)
        + (0.10 if db else 0)
        + (0.06 if matches else 0)
    )

    action = (
        "Reduce the database connection pool and restart payment-api."
    )

    if previous_fixes:
        action += (
            " This follows fixes that resolved similar historical incidents."
        )

    return {
        "root_cause": "Database connection pool exhaustion",
        "confidence": round(conf, 2),
        "evidence": evidence,
        "historical_reference": (
            matches[0] if matches else "None"
        ),
        "recommended_action": action,
        "expected_result": (
            "Database connections drop below capacity, "
            "error rate and latency return to normal."
        )
    }
def _validate(res, hs_r):

    if not all(
        k in res
        for k in REQUIRED
    ):
        raise ValueError(
            "Missing keys in LLM output"
        )

    res["confidence"] = max(
        0.0,
        min(
            1.0,
            float(res["confidence"])
        )
    )

    if not isinstance(
        res["evidence"],
        list
    ):
        raise ValueError(
            "evidence must be a list"
        )

    known = {
        r["id"]
        for r in hs_r["results"]
    }

    if res["historical_reference"] not in known:
        res["historical_reference"] = "None"

    return {
        k: res[k]
        for k in REQUIRED
    }


def resolution_agent(
    incident,
    log_r,
    met_r,
    hs_r
):

    history = json.dumps(
        [
            {
                k: v
                for k, v in r.items()
                if k != "memory_text"
            }
            for r in hs_r["results"]
        ],
        indent=1
    )

    user = prompts.RESOLUTION_USER.format(
    incident=json.dumps({
        "id": incident["id"],
        "service": incident["service"],
        "metrics": incident["metrics"]
    }),
    logs=json.dumps(log_r),
    metrics=json.dumps(met_r),
    history=history or "[]",
    repeat_analysis=json.dumps(
        hs_r.get("repeat_analysis", {})
    )
)

    try:

        raw = call_llm(
            prompts.RESOLUTION_SYSTEM,
            user
        )

        obj = json.loads(
            re.search(
                r"\{.*\}",
                raw,
                re.S
            ).group(0)
        )

        return {
            **_validate(obj, hs_r),
            "source": "llm",
            "summary": obj["root_cause"]
        }

    except Exception as e:

        res = _fallback(
            incident,
            log_r,
            met_r,
            hs_r
        )

        return {
            **res,
            "source": "rule-based",
            "llm_note":
                f"LLM not used: {e}",
            "summary":
                res["root_cause"]
        }


# ---------------- INCIDENT COMMANDER ----------------

async def run_investigation(
    inc,
    sim,
    hs
):

    ag = inc["agents"]

    def st(
        name,
        status,
        detail=""
    ):
        ag[name] = {
            "status": status,
            "detail": detail
        }

    try:

        st(
            "commander",
            "running",
            "Collecting logs and metrics"
        )

        await asyncio.sleep(0.7)

        inc["metrics"] = sim.snapshot()
        inc["logs"] = sim.get_logs()

        async def run(
            name,
            fn,
            *args
        ):

            st(
                name,
                "running",
                "Analyzing..."
            )

            await asyncio.sleep(0.9)

            try:

                res = await asyncio.to_thread(
                    fn,
                    *args
                )

                st(
                    name,
                    "complete",
                    res["summary"]
                )

                return res

            except Exception as e:

                st(
                    name,
                    "error",
                    str(e)
                )

                raise

        log_r = await run(
            "log",
            log_agent,
            inc["logs"]
        )

        met_r = await run(
            "metrics",
            metrics_agent,
            inc["metrics"]
        )

        inc["log_findings"] = log_r
        inc["metric_findings"] = met_r

        hs_r = await run(
            "hindsight",
            hindsight_agent,
            hs,
            inc,
            log_r,
            met_r
        )

        inc["hindsight"] = hs_r

        st(
            "commander",
            "running",
            "Sending findings to Resolution Agent"
        )

        res = await run(
            "resolution",
            resolution_agent,
            inc,
            log_r,
            met_r,
            hs_r
        )

        inc["resolution"] = res

        st(
            "commander",
            "complete",
            "Investigation complete"
        )

        inc["status"] = "awaiting_approval"

    except Exception as e:

        inc["status"] = "error"
        inc["error"] = (
            f"Investigation failed: {e}"
        )

        st(
            "commander",
            "error",
            str(e)
        )