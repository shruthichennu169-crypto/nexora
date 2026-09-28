import threading
from datetime import datetime, timedelta

SERVICE = "payment-api"
POOL_MAX = 100

HEALTHY = {
    "error_rate": 0.2,
    "latency": 180,
    "db_connections": 30,
    "cpu": 35
}

INCIDENT = {
    "error_rate": 35,
    "latency": 7800,
    "db_connections": 100,
    "cpu": 82
}

FIXED = {
    "error_rate": 0.3,
    "latency": 190,
    "db_connections": 38,
    "cpu": 41
}


class Simulator:

    def __init__(self):
        self._lock = threading.Lock()
        self.state = "healthy"
        self.metrics = dict(HEALTHY)

    def reset(self):
        with self._lock:
            self.state = "healthy"
            self.metrics = dict(HEALTHY)

    def trigger(self):
        with self._lock:
            self.state = "incident"
            self.metrics = dict(INCIDENT)

    def remediate(self):
        with self._lock:
            if self.state != "incident":
                raise RuntimeError("No active incident to remediate")

            self.metrics = dict(FIXED)
            self.state = "recovered"

    def snapshot(self):
        with self._lock:
            return {
                "service": SERVICE,
                "state": self.state,
                "pool_max": POOL_MAX,
                **self.metrics
            }

    def get_logs(self):
        now = datetime.now()

        ts = lambda s: (
            now - timedelta(seconds=s)
        ).strftime("%Y-%m-%d %H:%M:%S")

        lines = []

        if self.state == "incident":

            msgs = [
                "ConnectionPoolExhaustedException",
                "Unable to acquire database connection",
                "Request failed"
            ]

            for i in range(15):
                lines.append(
                    f"{ts((15 - i) * 4)} ERROR {msgs[i % 3]}"
                )

                if i % 5 == 4:
                    lines.append(
                        f"{ts((15 - i) * 4)} WARN Connection pool usage 100/100"
                    )

        elif self.state == "recovered":

            lines = [
                f"{ts(20)} INFO Service restarted",
                f"{ts(15)} INFO Connection pool size reduced",
                f"{ts(5)} INFO Request completed status=200"
            ]

        else:

            lines = [
                f"{ts(i * 5)} INFO Request completed status=200"
                for i in range(6, 0, -1)
            ]

        return lines