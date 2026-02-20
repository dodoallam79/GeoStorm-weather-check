from dataclasses import dataclass
from typing import Dict, Any, List

@dataclass
class Thresholds:
    ws50m_max_knots: float = 22.0
    hs_max_ft: float = 6.0
    tp_max_s: float = 5.0

def evaluate_point(p: Dict[str, Any], t: Thresholds) -> Dict[str, Any]:
    failed: List[str] = []

    ws50 = p.get("ws50m_knots")
    hs = p.get("hs_ft")
    tp = p.get("tp_s")

    if ws50 is None or hs is None or tp is None:
        failed.append("Missing data")
        return {**p, "pass": False, "failed": failed}

    if ws50 >= t.ws50m_max_knots:
        failed.append(f"Ws50m ≥ {t.ws50m_max_knots} kt")
    if hs >= t.hs_max_ft:
        failed.append(f"Hs ≥ {t.hs_max_ft} ft")
    if tp >= t.tp_max_s:
        failed.append(f"Tp ≥ {t.tp_max_s} s")

    return {**p, "pass": len(failed) == 0, "failed": failed}

def build_windows(points: List[Dict[str, Any]], min_consecutive_points: int = 2):
    windows = []
    start = None

    for i, p in enumerate(points):
        if p.get("pass"):
            if start is None:
                start = i
        else:
            if start is not None:
                end = i - 1
                if (end - start + 1) >= min_consecutive_points:
                    windows.append({
                        "start": points[start]["time"],
                        "end": points[end]["time"],
                        "count_points": end - start + 1
                    })
                start = None

    if start is not None:
        end = len(points) - 1
        if (end - start + 1) >= min_consecutive_points:
            windows.append({
                "start": points[start]["time"],
                "end": points[end]["time"],
                "count_points": end - start + 1
            })

    return windows
