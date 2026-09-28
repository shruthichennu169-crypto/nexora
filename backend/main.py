from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import agents
from hindsight import HindsightService
from incident import ACTIVE, IncidentStore, build_memory, verify
from simulator import Simulator

app = FastAPI(title="IncidentMind")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

sim = Simulator()
hs = HindsightService()
store = IncidentStore()


def system_info():
    m = sim.snapshot()

    return {
        "metrics": m,
        "status": "critical"
        if m["state"] == "incident"
        else "healthy",
        "hindsight": hs.status(),
        "llm": agents.llm_mode()
    }


def get_inc(iid):
    inc = store.get(iid)

    if not inc:
        raise HTTPException(
            404,
            f"Incident {iid} not found"
        )

    return inc


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        **system_info()
    }


@app.post("/api/incidents/trigger")
def trigger():
    cur = store.current()

    if (
        cur
        and cur["status"] in ACTIVE
        and sim.state == "incident"
    ):
        return cur

    try:
        sim.trigger()
    except Exception as e:
        raise HTTPException(
            500,
            f"Simulator failure: {e}"
        )

    return store.create(
        hs.next_id(store.ids()),
        sim.snapshot(),
        sim.get_logs()
    )


@app.post("/api/system/reset")
def reset():
    sim.reset()

    cur = store.current()

    if cur and cur["status"] in ACTIVE + (
        "resolved",
        "failed"
    ):
        cur["status"] = "closed"

    return system_info()


@app.get("/api/incidents/current")
def current():
    return {
        "incident": store.current(),
        "system": system_info()
    }


@app.get("/api/incidents")
def incidents():
    return [
        {
            "id": i["id"],
            "title": i["title"],
            "status": i["status"],
            "created_at": i["created_at"]
        }
        for i in store.items
    ]


@app.post("/api/incidents/{iid}/investigate")
def investigate(
    iid: str,
    bg: BackgroundTasks
):
    inc = get_inc(iid)

    if inc["status"] not in (
        "open",
        "rejected",
        "error"
    ):
        raise HTTPException(
            409,
            f"Cannot investigate incident in status '{inc['status']}'"
        )

    inc["status"] = "investigating"
    inc["error"] = None

    for a in inc["agents"].values():
        a.update(
            status="pending",
            detail=""
        )

    bg.add_task(
        agents.run_investigation,
        inc,
        sim,
        hs
    )

    return inc


@app.post("/api/incidents/{iid}/approve")
def approve(iid: str):
    inc = get_inc(iid)

    if inc["status"] != "awaiting_approval":
        raise HTTPException(
            409,
            "Incident is not awaiting approval"
        )

    try:
        sim.remediate()
    except Exception as e:
        inc["status"] = "failed"
        inc["error"] = f"Simulator failure: {e}"
        return inc

    after = sim.snapshot()

    inc["metrics_after"] = after
    inc["verification"] = verify(after)

    if inc["verification"]["healthy"]:
        inc["status"] = "resolved"

        try:
            res = hs.store(
                build_memory(inc)
            )

            inc.update(
                memory_updated=True,
                memory_mode=res["mode"],
                memory_warning=res["warning"]
            )

        except Exception as e:
            inc.update(
                memory_updated=False,
                error=f"Memory update failed: {e}"
            )

    else:
        inc["status"] = "failed"

    return inc


@app.post("/api/incidents/{iid}/reject")
def reject(iid: str):
    inc = get_inc(iid)

    if inc["status"] != "awaiting_approval":
        raise HTTPException(
            409,
            "Incident is not awaiting approval"
        )

    inc["status"] = "rejected"

    return inc


@app.get("/api/memory")
def memory():
    return {
        "hindsight": hs.status(),
        "incidents": hs.local()
    }