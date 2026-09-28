from datetime import datetime

AGENTS = ["commander", "log", "metrics", "hindsight", "resolution"]
ACTIVE = ("open", "investigating", "awaiting_approval", "rejected", "error")


def now():
    return datetime.now().isoformat(timespec="seconds")


class IncidentStore:
    def __init__(self):
        self.items = []

    def ids(self):
        return [i["id"] for i in self.items]

    def create(self, iid, metrics, logs):
        inc = {
            "id": iid,
            "service": metrics["service"],
            "title": "High error rate and latency on payment-api",
            "status": "open",
            "created_at": now(),
            "metrics": metrics,
            "logs": logs,
            "agents": {
                a: {"status": "pending", "detail": ""}
                for a in AGENTS
            },
            "log_findings": None,
            "metric_findings": None,
            "hindsight": None,
            "resolution": None,
            "verification": None,
            "memory_updated": None,
            "memory_mode": None,
            "memory_warning": None,
            "error": None,
        }

        self.items.append(inc)
        return inc

    def get(self, iid):
        return next(
            (i for i in self.items if i["id"] == iid),
            None
        )

    def current(self):
        for i in reversed(self.items):
            if i["status"] != "closed":
                return i

        return None


def verify(m):
    checks = [
        {
            "name": "Error rate",
            "value": f"{m['error_rate']}%",
            "limit": "< 1%",
            "ok": m["error_rate"] < 1
        },
        {
            "name": "Latency",
            "value": f"{m['latency']} ms",
            "limit": "< 500 ms",
            "ok": m["latency"] < 500
        },
        {
            "name": "DB connections",
            "value": f"{m['db_connections']}/{m['pool_max']}",
            "limit": "< 60",
            "ok": m["db_connections"] < 60
        }
    ]

    return {
        "healthy": all(c["ok"] for c in checks),
        "checks": checks
    }


def build_memory(inc):
    r = inc["resolution"]

    return {
        "id": inc["id"],
        "service": inc["service"],
        "problem": "Database connection exhaustion",
        "symptoms": "error_rate 35%, latency 7800ms, db_connections 100/100, ConnectionPoolExhaustedException",
        "root_cause": r["root_cause"],
        "evidence": r["evidence"],
        "fix": r["recommended_action"],
        "result": "Resolved",
        "demo": False
    }