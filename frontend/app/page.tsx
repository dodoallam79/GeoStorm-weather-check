"use client";

import { useState } from "react";

type Point = {
  time: string;
  ws50m_knots?: number;
  hs_ft?: number;
  tp_s?: number;
  pass: boolean;
  failed: string[];
};

type Window = { start: string; end: string; count_points: number };

type Result = {
  thresholds: { ws50m_max_knots: number; hs_max_ft: number; tp_max_s: number };
  count_points: number;
  now: Point;
  next_window: Window | null;
  windows: Window[];
  points: Point[];
  note?: string;
};

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    try {
      setError(null);
      setData(null);

      if (!file) return setError("Please select a PDF first.");

      const apiBaseRaw = process.env.NEXT_PUBLIC_API_BASE || "";
      const apiBase = apiBaseRaw.replace(/\/+$/, "");
      if (!apiBase) return setError("Missing NEXT_PUBLIC_API_BASE in Vercel env variables.");

      const form = new FormData();
      form.append("file", file);

      const url = `${apiBase}/analyze?ws50m_max_knots=22&hs_max_ft=6&tp_max_s=5&min_consecutive_points=2&tz_offset=%2B04:00`;
      const res = await fetch(url, { method: "POST", body: form });

      if (!res.ok) throw new Error(await res.text());
      setData((await res.json()) as Result);
    } catch (e: any) {
      setError(e?.message || "Analyze failed");
    }
  }

  return (
    <div>
      <h1>Weather GO / NO-GO</h1>

      <div style={{ marginBottom: 12 }}>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button onClick={analyze} style={{ marginLeft: 10 }}>Analyze</button>
      </div>

      {error && <pre style={{ color: "red" }}>{error}</pre>}

      {data && (
        <div style={{ marginBottom: 16 }}>
          <h2>
            NOW: {data.now.pass ? "✅ GO" : "❌ NO-GO"}
          </h2>

          {!data.now.pass && data.now.failed?.length > 0 && (
            <div style={{ color: "red" }}>
              Failed: {data.now.failed.join(", ")}
            </div>
          )}

          <div>Parsed points: {data.count_points}</div>

          <h3 style={{ marginTop: 12 }}>Next Safe Window</h3>
          {data.next_window ? (
            <div>✅ {data.next_window.start} → {data.next_window.end} ({data.next_window.count_points} points)</div>
          ) : (
            <div>❌ No safe window found</div>
          )}

          {data.count_points === 0 && data.note && (
            <p style={{ color: "#555" }}>{data.note}</p>
          )}
        </div>
      )}

      {data?.points?.length ? (
        <table border={1} cellPadding={6}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Ws50m (kt)</th>
              <th>Hs (ft)</th>
              <th>Tp (s)</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {data.points.map((p, i) => (
              <tr key={i}>
                <td>{p.time}</td>
                <td>{p.ws50m_knots ?? "—"}</td>
                <td>{p.hs_ft ?? "—"}</td>
                <td>{p.tp_s ?? "—"}</td>
                <td>{p.pass ? "GO" : "NO-GO"}</td>
                <td>{p.failed?.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
