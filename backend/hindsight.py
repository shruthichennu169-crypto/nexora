import json
import os
import re
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "incidents.json"
STOP = {"and", "the", "for", "with", "resolved", "service", "that", "are", "was"}


def _tokens(text):
    return {
        w[:6]
        for w in re.findall(r"[a-z]+", text.lower())
        if len(w) > 2 and w not in STOP
    }


def _to_text(r):
    t = (
        f"Incident: {r['id']}\n"
        f"Service: {r['service']}\n"
        f"Problem: {r['problem']}\n"
        f"Root Cause: {r['root_cause']}\n"
        f"Fix: {r['fix']}\n"
        f"Result: {r['result']}"
    )

    if r.get("symptoms"):
        t += f"\nSymptoms: {r['symptoms']}"

    if r.get("evidence"):
        t += "\nEvidence: " + "; ".join(r["evidence"])

    return t


class HindsightService:

    def __init__(self):
        self.mode = "demo"
        self.error = None
        self.client = None
        self.bank = os.getenv("HINDSIGHT_BANK_ID", "incidentmind")

        self._connect()

    def local(self):
        return json.loads(DATA.read_text())

    def _save(self, items):
        DATA.write_text(json.dumps(items, indent=2))

    def status(self):
        return {
            "mode": self.mode,
            "error": self.error
        }

    def next_id(self, extra_ids=()):
        nums = [
            int(i.split("-")[1])
            for i in [r["id"] for r in self.local()] + list(extra_ids)
            if re.fullmatch(r"INC-\d+", i)
        ]

        return f"INC-{max(nums or [0]) + 1:03d}"

    def _connect(self):
        url = os.getenv("HINDSIGHT_BASE_URL")

        if not url:
            self.error = "HINDSIGHT_BASE_URL not set"
            return

        try:
            from hindsight_client import Hindsight

            self.client = Hindsight(
                base_url=url,
                api_key=os.getenv("HINDSIGHT_API_KEY") or None
            )

            found = self._recall(
                "INC-001 payment-api connection exhaustion"
            )

            if not any("INC-001" in t for t in found):
                for r in self.local():
                    if r.get("demo"):
                        self.client.retain(
                            bank_id=self.bank,
                            content="[DEMO DATA] " + _to_text(r)
                        )

            self.mode = "connected"
            self.error = None

        except Exception as e:
            self.client = None
            self.mode = "demo"
            self.error = f"Hindsight unavailable: {e}"

    def _recall(self, query):
        res = self.client.recall(
            bank_id=self.bank,
            query=query
        )

        items = getattr(res, "results", res)

        return [
            getattr(x, "text", None)
            or (x.get("text") if isinstance(x, dict) else str(x))
            for x in items
        ]

    def search(self, query, k=3):

        if self.mode == "connected":

            try:
                local = {
                    r["id"]: r
                    for r in self.local()
                }

                out = []

                for text in self._recall(query)[:k]:

                    m = re.search(r"INC-\d+", text)

                    base = (
                        local.get(m.group(0))
                        if m
                        else None
                    )

                    out.append({
                        **(
                            base
                            or {
                                "id": "MEMORY",
                                "service": "?",
                                "problem": text[:120],
                                "root_cause": "?",
                                "fix": "?",
                                "result": "?"
                            }
                        ),
                        "relevance": None,
                        "memory_text": text
                    })

                return {
                    "mode": "connected",
                    "results": out,
                    "warning": None
                }

            except Exception as e:
                self.mode = "demo"
                self.error = f"Hindsight unavailable: {e}"

        q = _tokens(query)

        scored = []

        for r in self.local():

            d = _tokens(
                f"{r['service']} "
                f"{r['problem']} "
                f"{r['root_cause']} "
                f"{r['fix']}"
            )

            score = len(q & d) / max(len(d), 1)

            if r["service"] in query:
                score += 0.1

            scored.append({
                **r,
                "relevance": round(
                    min(score, 0.99),
                    2
                )
            })

        scored.sort(
            key=lambda x: x["relevance"],
            reverse=True
        )

        return {
            "mode": "demo",
            "results": [
                s
                for s in scored[:k]
                if s["relevance"] > 0.2
            ],
            "warning": self.error
        }

    def store(self, rec):

        items = self.local()

        items.append(rec)

        self._save(items)

        if self.mode == "connected":

            try:
                self.client.retain(
                    bank_id=self.bank,
                    content=_to_text(rec)
                )

                return {
                    "mode": "connected",
                    "warning": None
                }

            except Exception as e:
                self.mode = "demo"
                self.error = (
                    f"Hindsight unavailable: {e}"
                )

        return {
            "mode": "demo",
            "warning": self.error
        }
        