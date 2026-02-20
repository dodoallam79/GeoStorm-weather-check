import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from .parser import parse_stormgeo_pdf
from .rules import Thresholds, evaluate_point, build_windows

app = FastAPI(title="Weather GO/NO-GO API")

cors = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[c.strip() for c in cors if c.strip()] if cors != ["*"] else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    ws50m_max_knots: float = 22.0,
    hs_max_ft: float = 6.0,
    tp_max_s: float = 5.0,
    min_consecutive_points: int = 2,
    tz_offset: str = "+04:00",
):
    pdf_bytes = await file.read()

    raw_points = parse_stormgeo_pdf(pdf_bytes, tz_offset=tz_offset)
    t = Thresholds(ws50m_max_knots=ws50m_max_knots, hs_max_ft=hs_max_ft, tp_max_s=tp_max_s)

    points = [evaluate_point(p, t) for p in raw_points]
    windows = build_windows(points, min_consecutive_points=min_consecutive_points)

    now = points[0] if points else {"pass": False, "failed": ["No data parsed from PDF"]}

    return {
        "thresholds": t.__dict__,
        "count_points": len(points),
        "now": now,
        "windows": windows,
        "next_window": windows[0] if windows else None,
        "points": points,
        "note": "If count_points=0, the PDF table layout may differ; share one PDF and I will tune the parser."
    }
