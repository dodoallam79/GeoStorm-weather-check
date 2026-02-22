"use client";

import React, { useMemo, useState } from "react";

type Point = {
  time: string;
  ws50m_knots?: number;
  tp_s?: number;
  hs_ft?: number;
  hmax_ft?: number;
  dir?: string;
  pass: boolean;
  failed: string[];
};

type Window = { start: string; end: string; count_points: number };

type Result = {
  thresholds?: {
    ws50m_max_knots?: number;
    hmax_max_ft?: number;
    tp_max_s?: number;
  };
  count_points: number;
  now: Point;
  next_window: Window | null;
  windows: Window[];
  points: Point[];
  note?: string;
};

const CRITERIA = {
  ws50mMax: 22, // kts
  hmaxMax: 6, // ft
  tpMax: 5.0, // s
};

function dayNameFromISO(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
}

function ddmmFromISO(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function hhmmFromISO(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatReasonFromValues(opts: { ws50m?: number; hmax?: number; tp?: number }) {
  const parts: string[] = [];

  if (opts.hmax !== undefined && Number.isFinite(opts.hmax) && opts.hmax >= CRITERIA.hmaxMax) {
    parts.push(`Sea ${opts.hmax}>${CRITERIA.hmaxMax}ft`);
  }
  if (opts.tp !== undefined && Number.isFinite(opts.tp) && opts.tp >= CRITERIA.tpMax) {
    parts.push(`Tp ${opts.tp}>${CRITERIA.tpMax}s`);
  }
  if (opts.ws50m !== undefined && Number.isFinite(opts.ws50m) && opts.ws50m >= CRITERIA.ws50mMax) {
    parts.push(`Wind ${opts.ws50m}>${CRITERIA.ws50mMax}kts`);
  }

  return parts.length ? parts.join(", ") : "Within limits";
}

function badgeFromPass(pass: boolean) {
  return pass ? "SUITABLE" : "NOT SUITABLE";
}

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apiBase = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_API_BASE || "";
    return raw.replace(/\/+$/, "");
  }, []);

  const location = useMemo(() => {
    if (!file?.name) return "—";
    // try extract ABK_FIELD, ZIRKU_AREA, etc.
    const n = file.name.replace(/\.pdf$/i, "");
    const m = n.match(/_(ABK[_-]?FIELD)/i) || n.match(/_([A-Z]+_[A-Z]+)_\d{6,}/i) || n.match(/_([A-Z]+_[A-Z]+)_/i);
    const rawLoc = m?.[1] || "";
    const cleaned = rawLoc.replace(/[-_]/g, " ").trim();
    return cleaned ? cleaned.toUpperCase() : "—";
  }, [file?.name]);

  const workableCount = useMemo(() => (data?.points || []).filter((p) => p.pass).length, [data]);
  const notWorkableCount = useMemo(() => (data?.points || []).filter((p) => !p.pass).length, [data]);
  const allMeet = useMemo(
    () => (data?.count_points || 0) > 0 && notWorkableCount === 0,
    [data?.count_points, notWorkableCount]
  );

  const dailySummary = useMemo(() => {
    const pts = data?.points || [];
    const byDate = new Map<string, Point[]>();

    for (const p of pts) {
      const key = ddmmFromISO(p.time);
      byDate.set(key, [...(byDate.get(key) || []), p]);
    }

    const rows = Array.from(byDate.entries()).map(([ddmm, arr]) => {
      const maxWind = Math.max(...arr.map((x) => x.ws50m_knots ?? -Infinity));
      const maxSea = Math.max(...arr.map((x) => x.hmax_ft ?? -Infinity));
      const maxTp = Math.max(...arr.map((x) => x.tp_s ?? -Infinity));

      const dayPass = arr.every((x) => x.pass);

      const reason = dayPass
        ? "Within limits"
        : formatReasonFromValues({
            ws50m: Number.isFinite(maxWind) ? Number(maxWind.toFixed(1)) : undefined,
            hmax: Number.isFinite(maxSea) ? Number(maxSea.toFixed(1)) : undefined,
            tp: Number.isFinite(maxTp) ? Number(maxTp.toFixed(1)) : undefined,
          });

      return {
        day: dayNameFromISO(arr[0].time),
        date: ddmm,
        maxWind: Number.isFinite(maxWind) ? Number(maxWind.toFixed(1)) : null,
        maxSea: Number.isFinite(maxSea) ? Number(maxSea.toFixed(1)) : null,
        maxTp: Number.isFinite(maxTp) ? Number(maxTp.toFixed(1)) : null,
        status: badgeFromPass(dayPass),
        reason,
      };
    });

    // Sort by actual time of the first point in each day
    rows.sort((a, b) => {
      const ta = pts.find((p) => ddmmFromISO(p.time) === a.date)?.time || "";
      const tb = pts.find((p) => ddmmFromISO(p.time) === b.date)?.time || "";
      return ta.localeCompare(tb);
    });

    return rows;
  }, [data]);

  const periodRows = useMemo(() => {
    const pts = data?.points || [];
    return pts.map((p) => {
      const sea = p.hmax_ft;
      const tp = p.tp_s;
      const wind = p.ws50m_knots;

      const reason = p.pass
        ? "Within limits"
        : formatReasonFromValues({
            ws50m: wind !== undefined ? Number(wind.toFixed(1)) : undefined,
            hmax: sea !== undefined ? Number(sea.toFixed(1)) : undefined,
            tp: tp !== undefined ? Number(tp.toFixed(1)) : undefined,
          });

      return {
        date: ddmmFromISO(p.time),
        time: hhmmFromISO(p.time),
        day: dayNameFromISO(p.time),
        dir: p.dir || "—",
        ws50m: wind ?? null,
        hmax: sea ?? null,
        tp: tp ?? null,
        pass: p.pass,
        status: p.pass ? "OK" : "NO",
        reason,
      };
    });
  }, [data]);

  async function analyze(selectedFile: File) {
    setError(null);
    setData(null);
    setBusy(true);

    try {
      if (!apiBase) throw new Error("Missing NEXT_PUBLIC_API_BASE in Vercel environment variables.");

      const form = new FormData();
      form.append("file", selectedFile);

      const url =
        `${apiBase}/analyze` +
        `?ws50m_max_knots=${encodeURIComponent(CRITERIA.ws50mMax)}` +
        `&hmax_max_ft=${encodeURIComponent(CRITERIA.hmaxMax)}` +
        `&tp_max_s=${encodeURIComponent(CRITERIA.tpMax)}` +
        `&min_consecutive_points=${encodeURIComponent(2)}` +
        `&tz_offset=${encodeURIComponent("+04:00")}`;

      const res = await fetch(url, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());

      const json = (await res.json()) as Result;
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  function onPickFile(f: File | null) {
    if (!f) return;
    setFile(f);
    void analyze(f);
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="logo">≋</div>
          <div>
            <div className="title">Weather Criteria Checker</div>
            <div className="subtitle">StormGeo Forecast Analyzer</div>
          </div>
        </div>
        <button className="ghostBtn" type="button">
          <span className="gear">⚙</span> Criteria
        </button>
      </header>

      <section className="criteriaRow">
        <div className="chip">
          <span className="chipIcon">〰</span>
          Wind (Ws50m): <b>&lt; {CRITERIA.ws50mMax} kts</b>
        </div>
        <div className="chip">
          <span className="chipIcon">≋</span>
          Sea (Hmax): <b>&lt; {CRITERIA.hmaxMax} ft</b>
        </div>
        <div className="chip">
          <span className="chipIcon">⟳</span>
          Tp: <b>&lt; {CRITERIA.tpMax} s</b>
        </div>
      </section>

      <section
        className={`dropzone ${dragOver ? "dragOver" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onPickFile(f);
        }}
      >
        <div className="dropInner">
          <div className="uploadIcon">⤴</div>
          <div className="dropTitle">Drop your PDF here or click to upload</div>
          <div className="dropHint">Supports StormGeo weather forecast PDFs</div>

          <label className="fileBtn">
            <input type="file" accept="application/pdf" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
            {file ? file.name : "Choose PDF"}
          </label>

          {busy && <div className="smallNote">Analyzing…</div>}
          {error && <pre className="errorBox">{error}</pre>}
        </div>
      </section>

      <section className="cards">
        <div className="card">
          <div className="cardLabel">Location</div>
          <div className="cardValue">{location}</div>
        </div>

        <div className="card">
          <div className="cardLabel">Total Periods</div>
          <div className="cardValue">{data?.count_points ?? "—"}</div>
        </div>

        <div className="card cardGood">
          <div className="cardLabel">Workable</div>
          <div className="cardValue">
            {data
              ? `${workableCount} (${data.count_points ? Math.round((workableCount / data.count_points) * 100) : 0}%)`
              : "—"}
          </div>
        </div>

        <div className="card cardBad">
          <div className="cardLabel">Not Workable</div>
          <div className="cardValue">{data ? notWorkableCount : "—"}</div>
        </div>
      </section>

      {data && (
        <section className={`banner ${allMeet ? "bannerOk" : "bannerNo"}`}>
          <div className="bannerIcon">{allMeet ? "✅" : "❌"}</div>
          <div>
            <div className="bannerTitle">{allMeet ? "All Periods Meet Criteria" : "Some Periods Do Not Meet Criteria"}</div>
            <div className="bannerSub">
              Based on Wind (Ws50m) &lt; {CRITERIA.ws50mMax} kts, Sea (Hmax) &lt; {CRITERIA.hmaxMax} ft, and Tp &lt;{" "}
              {CRITERIA.tpMax} s
            </div>
          </div>
        </section>
      )}

      <section className="tableCard">
        <div className="tableHeader">Daily Summary</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>DAY</th>
              <th>DATE</th>
              <th>MAX WIND (KTS)</th>
              <th>MAX SEA (FT)</th>
              <th>MAX TP (S)</th>
              <th>STATUS</th>
              <th>REASON</th>
            </tr>
          </thead>
          <tbody>
            {dailySummary.length === 0 ? (
              <tr>
                <td colSpan={7} className="emptyCell">
                  Upload a StormGeo PDF to view summary.
                </td>
              </tr>
            ) : (
              dailySummary.map((r, i) => (
                <tr key={i}>
                  <td className="mono">{r.day}</td>
                  <td className="mono">{r.date}</td>
                  <td className={r.maxWind !== null && r.maxWind >= CRITERIA.ws50mMax ? "badNum" : "goodNum"}>
                    {r.maxWind ?? "—"}
                  </td>
                  <td className={r.maxSea !== null && r.maxSea >= CRITERIA.hmaxMax ? "badNum" : "goodNum"}>
                    {r.maxSea ?? "—"}
                  </td>
                  <td className={r.maxTp !== null && r.maxTp >= CRITERIA.tpMax ? "badNum" : "goodNum"}>
                    {r.maxTp ?? "—"}
                  </td>
                  <td>
                    <span className={`pill ${r.status === "SUITABLE" ? "pillOk" : "pillNo"}`}>{r.status}</span>
                  </td>
                  <td className="reason">{r.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="tableCard" style={{ marginTop: 14 }}>
        <div className="tableHeader">Periods</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>DATE</th>
              <th>TIME</th>
              <th>DAY</th>
              <th>WIND DIR</th>
              <th>WS50M (KTS)</th>
              <th>HMAX (FT)</th>
              <th>TP (S)</th>
              <th>STATUS</th>
              <th>REASON</th>
            </tr>
          </thead>
          <tbody>
            {periodRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="emptyCell">
                  Upload a StormGeo PDF to view periods.
                </td>
              </tr>
            ) : (
              periodRows.map((r, i) => (
                <tr key={i}>
                  <td className="mono">{r.date}</td>
                  <td className="mono">{r.time}</td>
                  <td className="mono">{r.day}</td>
                  <td className="mono">{r.dir}</td>
                  <td className={r.ws50m !== null && r.ws50m >= CRITERIA.ws50mMax ? "badNum" : "goodNum"}>
                    {r.ws50m !== null ? Number(r.ws50m.toFixed(1)) : "—"}
                  </td>
                  <td className={r.hmax !== null && r.hmax >= CRITERIA.hmaxMax ? "badNum" : "goodNum"}>
                    {r.hmax !== null ? Number(r.hmax.toFixed(1)) : "—"}
                  </td>
                  <td className={r.tp !== null && r.tp >= CRITERIA.tpMax ? "badNum" : "goodNum"}>
                    {r.tp !== null ? Number(r.tp.toFixed(1)) : "—"}
                  </td>
                  <td>
                    <span className={`pill ${r.pass ? "pillOk" : "pillNo"}`}>{r.pass ? "OK" : "NO"}</span>
                  </td>
                  <td className="reason">{r.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
