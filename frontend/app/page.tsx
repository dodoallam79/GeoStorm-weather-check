"use client";

import { useState } from "react";

type Point = {
  time: string;
  ws50m_knots: number;
  hs_ft: number;
  tp_s: number;
  pass: boolean;
  failed: string[];
};

type Result = {
  points: Point[];
};

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    setError(null);
    setResult(null);

    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE;
    if (!apiBase) {
      setError("Missing NEXT_PUBLIC_API_BASE in Vercel env variables.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${apiBase}/analyze`, { method: "POST", body: form });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `HTTP ${res.status}`);
    }

    const data = (await res.json()) as Result;
    setResult(data);
  }

  return (
    <div>
      <h1>Weather GO / NO-GO</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button onClick={upload} style={{ marginLeft: 10 }}>
        Analyze
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <table border={1} cellPadding={5} style={{ marginTop: 20 }}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Ws50m</th>
              <th>Hs</th>
              <th>Tp</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {result.points.map((p, i) => (
              <tr key={i}>
                <td>{p.time}</td>
                <td>{p.ws50m_knots}</td>
                <td>{p.hs_ft}</td>
                <td>{p.tp_s}</td>
                <td>{p.pass ? "GO" : "NO-GO"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
