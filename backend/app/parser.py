import re
from typing import List, Dict, Any
import pdfplumber
from io import BytesIO
from datetime import datetime

def parse_stormgeo_pdf(pdf_bytes: bytes, tz_offset: str = "+04:00") -> List[Dict[str, Any]]:
    points: List[Dict[str, Any]] = []
    year = datetime.utcnow().year

    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""

            for line in text.splitlines():
                line = line.strip()

                # Look for lines containing time (HH:MM)
                if re.search(r"\d{2}:\d{2}", line):

                    # Extract numbers from the line
                    nums = re.findall(r"-?\d+\.?\d*", line)

                    # We expect at least 6 numeric columns
                    if len(nums) >= 6:

                        try:
                            ws10 = float(nums[0])
                            ws50m = float(nums[1])
                            wg = float(nums[2])
                            hs = float(nums[3])
                            tz = float(nums[4])
                            tp = float(nums[5])

                            # Extract date/time separately
                            dt_match = re.search(r"(\d{2})/(\d{2}).*(\d{2}):(\d{2})", line)
                            if not dt_match:
                                continue

                            dd = int(dt_match.group(1))
                            mm = int(dt_match.group(2))
                            hh = int(dt_match.group(3))
                            mi = int(dt_match.group(4))

                            time_iso = f"{year:04d}-{mm:02d}-{dd:02d}T{hh:02d}:{mi:02d}:00{tz_offset}"

                            points.append({
                                "time": time_iso,
                                "ws10_knots": ws10,
                                "ws50m_knots": ws50m,
                                "wg_knots": wg,
                                "hs_ft": hs,
                                "tz_s": tz,
                                "tp_s": tp,
                            })

                        except:
                            continue

    points.sort(key=lambda x: x["time"])
    return points
