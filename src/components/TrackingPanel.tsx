"use client";

import { useEffect, useState } from "react";

type Shipment = { uuid?: string; tracking_number?: string; status?: string; logs?: { status: string; date: string }[] };

export default function TrackingPanel({ id, token }: { id: string; token?: string }) {
  const [data, setData] = useState<{ status?: string; shipments?: Shipment[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const qs = token ? `?t=${encodeURIComponent(token)}` : "";
    fetch(`/api/tracking/order/${id}${qs}`)
      .then(async (r) => {
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) setErr(j.error ?? "Suivi indisponible");
        else setData(j);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, token]);

  if (loading) return <p className="text-sm text-zinc-500">Chargement du suivi…</p>;
  if (err) return <p className="text-sm text-red-500">{err}</p>;
  if (!data || data.status === "not_tracked" || !data.shipments?.length) {
    return <p className="text-sm text-zinc-500">Aucun suivi transporteur pour le moment.</p>;
  }
  return (
    <div className="space-y-3">
      {data.status && <p className="text-sm">Statut: <span className="badge">{data.status}</span></p>}
      {data.shipments.map((s, i) => (
        <div key={s.uuid ?? i} className="card p-3">
          <p className="text-sm font-medium">Suivi #{s.tracking_number ?? "—"} <span className="badge ml-2">{s.status ?? "en attente"}</span></p>
          {s.logs && s.logs.length > 0 && (
            <ol className="mt-2 space-y-1 text-xs text-zinc-500">
              {s.logs.map((l, j) => (
                <li key={j}>{new Date(l.date).toLocaleString()} — {l.status}</li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
