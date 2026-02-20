
def evaluate_point(p, ws50m_max=22.0, hs_max=6.0, tp_max=5.0):
    failed = []
    if p["ws50m_knots"] >= ws50m_max:
        failed.append("Ws50m too high")
    if p["hs_ft"] >= hs_max:
        failed.append("Hs too high")
    if p["tp_s"] >= tp_max:
        failed.append("Tp too high")
    return {**p, "pass": len(failed) == 0, "failed": failed}
