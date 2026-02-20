
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
from io import BytesIO
from .rules import evaluate_point

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    content = await file.read()
    points = []

    with pdfplumber.open(BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.split("\n"):
                parts = line.split()
                if len(parts) >= 8 and ":" in parts[2]:
                    try:
                        ws50m = float(parts[4])
                        hs = float(parts[6])
                        tp = float(parts[8])
                        p = {
                            "time": parts[0] + " " + parts[1] + " " + parts[2],
                            "ws50m_knots": ws50m,
                            "hs_ft": hs,
                            "tp_s": tp,
                        }
                        points.append(evaluate_point(p))
                    except:
                        continue

    return {"points": points}
