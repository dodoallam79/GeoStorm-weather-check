
"use client";
import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  async function upload() {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE + "/analyze", {
      method: "POST",
      body: form
    });
    const data = await res.json();
    setResult(data);
  }

  return (
    <div>
      <h1>Weather GO / NO-GO</h1>
      <input type="file" onChange={(e)=>setFile(e.target.files[0])} />
      <button onClick={upload}>Analyze</button>
      {result && (
        <table border="1" cellPadding="5" style={{marginTop:20}}>
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
            {result.points.map((p,i)=>(
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
