import re
from typing import List, Dict, Any
import pdfplumber
from io import BytesIO
from datetime import datetime

DAY_RE = r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun)"
DATE_RE = r"(\d{2})/(\d{2})"      # dd/mm
TIME_RE = r"(\d{2}):(\d{2})"
ROW_RE = re.compile(rf"^{DAY_RE}\s+{DATE_RE}\s+{TIME_RE}\s+(.*)$")
NUM_RE = re.compile(r"^-?\d+(\.\d+)?$")

def _guess_year() -> int:
    return datetime.utcnow().year

def parse_stormgeo_pdf(pdf_bytes: bytes, tz_offset: str = "+04:00") -> List[Dict[str, Any]]:
    """
    Expected data row pattern:
      Mon 16/02 01:00  32 29  38  7.1  5.8  7.3
    Map:
      Ws10, Ws50m, Wg, Hs, Tz, Tp  (common StormGeo order)
    """
    points: List[Dict[str, Any]] = []
    year = _guess_year()

    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for ln in text.splitlines():
                ln = ln.strip()
                m = ROW_RE.match(ln)
                if not m:
                    continue

                day = m.group(1)
                dd = int(m.group(2))
                mm = int(m.group(3))
                hh = int(m.group(4))
                mi = int(m.group(5))
                rest = m.group(6)

                toks = [t for t in re.split(r"\s+", rest) if t]
                nums = [t for t in toks if NUM_RE.match(t)]
                if len(nums) < 6:
                    continue

                ws10 = float(nums[0])
                ws50m = float(nums[1])
                wg = float(nums[2])
                hs = float(nums[3])
                tz = float(nums[4])
                tp = float(nums[5])

                time_iso = f"{year:04d}-{mm:02d}-{dd:02d}T{hh:02d}:{mi:02d}:00{tz_offset}"

                points.append({
                    "day": day,
                    "time": time_iso,
                    "ws10_knots": ws10,
                    "ws50m_knots": ws50m,
                    "wg_knots": wg,
                    "hs_ft": hs,
                    "tz_s": tz,
                    "tp_s": tp,
                })

    points.sort(key=lambda x: x["time"])
    return points
