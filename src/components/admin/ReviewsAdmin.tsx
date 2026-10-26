"use client";

import { useEffect, useState } from "react";

type Review = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
};

export default function ReviewsAdmin({ productId }: { productId: string }) {
  const [list, setList] = useState<Review[]>([]);
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`/api/admin/reviews?productId=${productId}`);
    if (r.ok) setList(await r.json());
  }
  useEffect(() => { load(); }, [productId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, author, rating, body }),
    });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error ?? "Échec"); return; }
    setAuthor(""); setRating(5); setBody("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cet avis ?")) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold text-lg">Avis clients ({list.length})</h2>

      <form onSubmit={add} className="space-y-2 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Nom auteur" value={author} onChange={(e) => setAuthor(e.target.value)} required maxLength={80} />
          <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            <option value={5}>★★★★★ (5)</option>
            <option value={4}>★★★★☆ (4)</option>
            <option value={3}>★★★☆☆ (3)</option>
            <option value={2}>★★☆☆☆ (2)</option>
            <option value={1}>★☆☆☆☆ (1)</option>
          </select>
        </div>
        <textarea className="input" rows={3} placeholder="Commentaire…" value={body} onChange={(e) => setBody(e.target.value)} required maxLength={2000} />
        {err && <p className="text-red-500 text-sm">{err}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? "…" : "Ajouter avis"}</button>
      </form>

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-zinc-500">Aucun avis. Ajoute des avis pour rassurer les clients.</p>}
        {list.map((r) => (
          <div key={r.id} className="border border-zinc-200 dark:border-zinc-800 rounded p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.author} · <span className="text-amber-500">{"★".repeat(r.rating)}</span></span>
              <button onClick={() => remove(r.id)} className="text-red-600 text-xs hover:underline">Supprimer</button>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1 whitespace-pre-line">{r.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
