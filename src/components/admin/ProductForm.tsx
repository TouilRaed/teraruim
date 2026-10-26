"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Offer = { name?: string; qty: number; price: number };

type Initial = {
  id?: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  hidePrice: boolean;
  image: string;
  gallery: string[];
  category: string;
  stock: number;
  weight: number;
  sku?: string;
  offers: Offer[];
  singleLabel: string | null;
  hideSingle: boolean;
  shippingFee: number | null;
  addOnLabel: string | null;
  addOnPrice: number | null;
};

const empty: Initial = { title: "", description: "", price: 0, compareAtPrice: null, hidePrice: false, image: "", gallery: [], category: "", stock: 100, weight: 0.5, sku: "", offers: [], singleLabel: null, hideSingle: false, shippingFee: null, addOnLabel: null, addOnPrice: null };

async function uploadFiles(files: FileList | File[]): Promise<string[]> {
  const fd = new FormData();
  for (const f of Array.from(files)) fd.append("file", f);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? "Upload failed");
  return j.urls as string[];
}

export default function ProductForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [data, setData] = useState<Initial>(initial ?? empty);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Initial>(k: K, v: Initial[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  async function onMainFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true); setErr(null);
    try {
      const [url] = await uploadFiles([f]);
      set("image", url);
    } catch (ex) { setErr((ex as Error).message); }
    finally { setUploading(false); e.target.value = ""; }
  }

  async function onGalleryFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const fs = e.target.files;
    if (!fs || fs.length === 0) return;
    setUploading(true); setErr(null);
    try {
      const urls = await uploadFiles(fs);
      set("gallery", [...data.gallery, ...urls].slice(0, 10));
    } catch (ex) { setErr((ex as Error).message); }
    finally { setUploading(false); e.target.value = ""; }
  }

  function removeGallery(i: number) {
    set("gallery", data.gallery.filter((_, idx) => idx !== i));
  }

  function addOffer() {
    if (data.offers.length >= 5) return;
    set("offers", [...data.offers, { qty: 2, price: 0 }]);
  }
  function updateOffer(i: number, patch: Partial<Offer>) {
    set("offers", data.offers.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function removeOffer(i: number) {
    set("offers", data.offers.filter((_, idx) => idx !== i));
  }

  const offerQtys = data.offers.map((o) => o.qty);
  const dupOffer = new Set(offerQtys).size !== offerQtys.length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const url = data.id ? `/api/admin/products/${data.id}` : "/api/admin/products";
    const method = data.id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        price: Number(data.price),
        compareAtPrice: data.compareAtPrice && data.compareAtPrice > 0 ? Number(data.compareAtPrice) : null,
        hidePrice: data.hidePrice,
        image: data.image,
        gallery: data.gallery,
        category: data.category,
        stock: Number(data.stock),
        weight: Number(data.weight),
        sku: data.sku || null,
        offers: data.offers
          .filter((o) => o.qty >= 2 && o.price > 0)
          .map((o) => ({ name: o.name?.trim() || undefined, qty: Number(o.qty), price: Number(o.price) })),
        singleLabel: data.singleLabel?.trim() || null,
        hideSingle: data.hideSingle && data.offers.length > 0,
        shippingFee: data.shippingFee != null && data.shippingFee >= 0 ? Number(data.shippingFee) : null,
        addOnLabel: data.addOnLabel?.trim() || null,
        addOnPrice: data.addOnPrice && data.addOnPrice > 0 ? Number(data.addOnPrice) : null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Échec");
      return;
    }
    router.push("/migel/products");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Titre</span>
        <input className="input mt-1" value={data.title} onChange={(e) => set("title", e.target.value)} required maxLength={120} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Description</span>
        <textarea className="input mt-1" rows={5} value={data.description} onChange={(e) => set("description", e.target.value)} required maxLength={2000} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">Prix (DT)</span>
          <input className="input mt-1" type="number" step="0.01" min={0} value={data.price} onChange={(e) => set("price", Number(e.target.value))} required disabled={data.hidePrice} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Ancien prix (DT) <span className="text-xs text-zinc-500">— optionnel, pour promo</span></span>
          <input className="input mt-1" type="number" step="0.01" min={0} placeholder="ex: 89.90"
            value={data.compareAtPrice ?? ""}
            onChange={(e) => set("compareAtPrice", e.target.value === "" ? null : Number(e.target.value))} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Catégorie</span>
          <input className="input mt-1" value={data.category} onChange={(e) => set("category", e.target.value)} required maxLength={60} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Poids (kg)</span>
          <input className="input mt-1" type="number" step="0.01" min={0} value={data.weight} onChange={(e) => set("weight", Number(e.target.value))} />
        </label>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={data.hidePrice} onChange={(e) => set("hidePrice", e.target.checked)} />
        <span className="text-sm font-medium">Sans prix · masquer le prix sur la page produit</span>
        <span className="text-xs text-zinc-500">(prix toujours utilisé pour le paiement à la livraison)</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">SKU (optionnel)</span>
          <input className="input mt-1" value={data.sku ?? ""} onChange={(e) => set("sku", e.target.value)} maxLength={50} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Livraison (DT) <span className="text-xs text-zinc-500">— vide ou 0 = gratuite</span></span>
          <input className="input mt-1" type="number" step="0.01" min={0} placeholder="0 = gratuite"
            value={data.shippingFee ?? ""}
            onChange={(e) => set("shippingFee", e.target.value === "" ? null : Number(e.target.value))} />
        </label>
      </div>

      {/* Main image upload */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <span className="text-sm font-medium">Image principale</span>
        <div className="flex items-center gap-3 mt-2">
          {data.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.image} alt="Aperçu" className="w-24 h-24 object-cover rounded border" />
          )}
          <label className="btn-ghost cursor-pointer">
            📁 {data.image ? "Remplacer" : "Téléverser"}
            <input type="file" accept="image/*" onChange={onMainFile} className="hidden" />
          </label>
          {data.image && <button type="button" onClick={() => set("image", "")} className="text-xs text-red-600 hover:underline">Supprimer</button>}
        </div>
        <p className="text-xs text-zinc-500 mt-1">JPG/PNG/WebP/AVIF · max 5 MB</p>
      </div>

      {/* Gallery upload */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <span className="text-sm font-medium">Galerie · images supplémentaires ({data.gallery.length}/10)</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {data.gallery.map((u, i) => (
            <div key={u + i} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Galerie ${i + 1}`} className="w-20 h-20 object-cover rounded border" />
              <button type="button" onClick={() => removeGallery(i)} className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full text-xs leading-none">×</button>
            </div>
          ))}
          {data.gallery.length < 10 && (
            <label className="w-20 h-20 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded flex items-center justify-center cursor-pointer hover:border-red-500">
              <span className="text-2xl text-zinc-400">+</span>
              <input type="file" accept="image/*" multiple onChange={onGalleryFiles} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Bulk offers */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <span className="text-sm font-medium">Offres groupées · عروض الحزمة ({data.offers.length}/5)</span>
        <p className="text-xs text-zinc-500 mt-1">Ex: 2 pièces pour 45 DT. Le prix est le total du pack.</p>
        <label className="block mt-3">
          <span className="text-xs text-zinc-500">Nom de l’offre standard (1 pièce) — optionnel</span>
          <input className="input mt-1 w-64" type="text" maxLength={60} placeholder="ex: À l’unité"
            value={data.singleLabel ?? ""}
            disabled={data.hideSingle}
            onChange={(e) => set("singleLabel", e.target.value || null)} />
        </label>
        <label className="flex items-center gap-2 cursor-pointer mt-3">
          <input type="checkbox" checked={data.hideSingle} disabled={data.offers.length === 0}
            onChange={(e) => set("hideSingle", e.target.checked)} />
          <span className="text-sm font-medium">Packs uniquement · masquer l’offre à l’unité</span>
          <span className="text-xs text-zinc-500">(nécessite au moins une offre)</span>
        </label>
        <div className="space-y-2 mt-2">
          {data.offers.map((o, i) => (
            <div key={i} className="flex items-end gap-2 flex-wrap">
              <label className="block">
                <span className="text-xs text-zinc-500">Nom (optionnel)</span>
                <input className="input mt-1 w-44" type="text" maxLength={40} placeholder="ex: Offre famille"
                  value={o.name ?? ""}
                  onChange={(e) => updateOffer(i, { name: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Quantité</span>
                <input className="input mt-1 w-24" type="number" min={2} max={99} value={o.qty}
                  onChange={(e) => updateOffer(i, { qty: parseInt(e.target.value) || 2 })} />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Prix total (DT)</span>
                <input className="input mt-1 w-32" type="number" step="0.01" min={0} value={o.price}
                  onChange={(e) => updateOffer(i, { price: Number(e.target.value) })} />
              </label>
              <button type="button" onClick={() => removeOffer(i)} className="text-xs text-red-600 hover:underline pb-3">Supprimer</button>
            </div>
          ))}
        </div>
        {dupOffer && <p className="text-red-500 text-xs mt-2">Deux offres ont la même quantité.</p>}
        {data.offers.length < 5 && (
          <button type="button" onClick={addOffer} className="btn-ghost mt-2 text-sm">+ Ajouter une offre</button>
        )}
      </div>

      {/* Inline cross-sell add-on (e.g. album) — shown as an optional checkbox on the buy page.
          Defined right here, not a separate catalog product. Both fields required to activate. */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <span className="text-sm font-medium">Produit complémentaire · add-on (optionnel)</span>
        <p className="text-xs text-zinc-500 mt-1">Ex: un album. Le client peut cocher une case pour l’ajouter à sa commande. Laissez vide pour aucun.</p>
        <div className="flex items-end gap-2 flex-wrap mt-2">
          <label className="block">
            <span className="text-xs text-zinc-500">Nom (ex: Album)</span>
            <input className="input mt-1 w-56" type="text" maxLength={80} placeholder="Album"
              value={data.addOnLabel ?? ""}
              onChange={(e) => set("addOnLabel", e.target.value || null)} />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500">Prix (DT)</span>
            <input className="input mt-1 w-32" type="number" step="0.01" min={0} placeholder="ex: 15"
              value={data.addOnPrice ?? ""}
              onChange={(e) => set("addOnPrice", e.target.value === "" ? null : Number(e.target.value))} />
          </label>
        </div>
      </div>

      {uploading && <p className="text-sm text-amber-600">📤 Téléversement en cours…</p>}
      {err && <p className="text-red-500 text-sm">{err}</p>}
      <button disabled={busy || uploading || !data.image || dupOffer} className="btn-primary w-full">
        {busy ? "Enregistrement…" : data.id ? "Enregistrer" : "Créer le produit"}
      </button>
    </form>
  );
}
