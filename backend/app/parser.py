import re
from typing import List, Dict, Any
import pdfplumber
from io import BytesIO
from datetime import datetime

NUM_RE = re.compile(r"^-?\d+(\.\d+)?$")

def _extract_year(all_text: str) -> int:
    # Try to find a year in the report (e.g., "18.02.2026")
    m = re.search(r"\b(\d{2})\.(\d{2})\.(\d{4})\b", all_text)
    if m:
        return int(m.group(3))
    return datetime.utcnow().year

def parse_stormgeo_pdf(pdf_bytes: bytes, tz_offset: str = "+04:00") -> List[Dict[str, Any]]:
    """
    Parses StormGeo table rows like:
      18/02 03 ● NNW 9 11 10 13 1.3 2.0 2.5 5.0 ...
    Maps the first 8 numeric columns after Dir to:
      Ws10m, Wg10m, Ws50m, Wg50m, Hs, Hmax, Tz, Tp
    """
    points: List[Dict[str, Any]] = []

    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        all_text = "\n".join([(p.extract_text() or "") for p in pdf.pages])

    year = _extract_year(all_text)

    for line in all_text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Identify data rows starting with dd/mm and hour (StormGeo format in your PDF)
        toks = line.split()
        if len(toks) < 10:
            continue

        if not re.match(r"^\d{2}/\d{2}$", toks[0]):  # dd/mm
            continue
        if not re.match(r"^\d{2}$", toks[1]):        # hour (03, 04, 16, ...)
            continue

        dd = int(toks[0].split("/")[0])
        mm = int(toks[0].split("/")[1])
        hh = int(toks[1])
        mi = 0

        # tokens usually: [dd/mm, HH, ●, DIR, ...numbers...]
        # sometimes conf may be a dot/bullet or "●"
        # find the direction token: first token after the "conf" marker
        # simplest: assume direction is toks[3], but make it robust:
        dir_idx = 3
        if toks[2] != "●" and re.match(r"^[A-Z]{1,3}$", toks[2]):
            # If bullet missing and direction is in position 2
            dir_idx = 2

        if dir_idx >= len(toks):
            continue

        wind_dir = toks[dir_idx]

        # Numeric values start after direction
        num_tokens = []
        for t in toks[dir_idx + 1:]:
            if NUM_RE.match(t):
                num_tokens.append(t)
            else:
                # stop at first non-number after numeric block
                # (the table continues with more sections, but we only need first block)
                pass

        # We need at least 8 values: Ws10 Wg10 Ws50 Wg50 Hs Hmax Tz Tp
        if len(num_tokens) < 8:
            continue

        try:
            ws10 = float(num_tokens[0])
            wg10 = float(num_tokens[1])
            ws50 = float(num_tokens[2])
            wg50 = float(num_tokens[3])
            hs = float(num_tokens[4])
            hmax = float(num_tokens[5])
            tz = float(num_tokens[6])
            tp = float(num_tokens[7])
        except:
            continue

        time_iso = f"{year:04d}-{mm:02d}-{dd:02d}T{hh:02d}:{mi:02d}:00{tz_offset}"

        points.append({
            "time": time_iso,
            "dir": wind_dir,
            "ws10_knots": ws10,
            "wg10_knots": wg10,
            "ws50m_knots": ws50,
            "wg50m_knots": wg50,
            "hs_ft": hs,
            "hmax_ft": hmax,
            "tz_s": tz,
            "tp_s": tp,
        })

    points.sort(key=lambda x: x["time"])
    return points
