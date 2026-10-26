"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Division = { id: number; name: string; value?: string };

type OrderDetails = {
  guestName: string;
  shipPhone: string;
  shipGovernorate: string;
  shipCity: string;
  shipAddress: string;
  total: string; // kept as string for the input; sent as number
};

export default function OrderEditButton({ id, current }: { id: string; current: OrderDetails }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<OrderDetails>(current);
  const [govs, setGovs] = useState<Division[]>([]);
  const [cities, setCities] = useState<Division[]>([]);
  const [govId, setGovId] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function set<K extends keyof OrderDetails>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Load governorates (Intigo cities) when the modal opens.
  useEffect(() => {
    if (!open) return;
    fetch(`/api/divisions?level=1`).then((r) => r.json()).then((d) => Array.isArray(d) && setGovs(d)).catch(() => setGovs([]));
  }, [open]);

  // Once governorates are known, resolve the order's stored governorate to its id
  // (matches by exact value or bilingual display name) so the delegation list loads.
  useEffect(() => {
    if (!govs.length) return;
    const g = govs.find((x) => x.value === form.shipGovernorate || x.name === form.shipGovernorate);
    setGovId(g?.id ?? null);
  }, [govs, form.shipGovernorate]);

  // Load delegations (Intigo districts) for the resolved governorate.
  useEffect(() => {
    if (!govId) { setCities([]); return; }
    fetch(`/api/divisions?level=2&parent_id=${govId}`).then((r) => r.json()).then((d) => Array.isArray(d) && setCities(d)).catch(() => setCities([]));
  }, [govId]);

  function save() {
    const total = Number(form.total);
    if (!Number.isFinite(total) || total < 0) {
      alert("Montant invalide");
      return;
    }
    start(async () => {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, total }),
      });
      if (!res.ok) {
        alert("Échec de la modification");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => { setForm(current); setOpen(true); }} className="text-xs underline">
        Modifier
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md card p-5 bg-white dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-3">Modifier la commande #{id.slice(-6).toUpperCase()}</h3>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-zinc-500">Nom du client</span>
                <input className="input w-full mt-1" value={form.guestName} onChange={(e) => set("guestName", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Téléphone</span>
                <input className="input w-full mt-1 font-mono" value={form.shipPhone} onChange={(e) => set("shipPhone", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Gouvernorat</span>
                <select className="input w-full mt-1" value={form.shipGovernorate} onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, shipGovernorate: v, shipCity: "" }));
                }}>
                  {!govs.some((g) => (g.value ?? g.name) === form.shipGovernorate) && (
                    <option value={form.shipGovernorate}>{form.shipGovernorate || "— choisir —"}</option>
                  )}
                  {govs.map((g) => <option key={g.id} value={g.value ?? g.name}>{g.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Ville / Délégation</span>
                {cities.length > 0 ? (
                  <select className="input w-full mt-1" value={form.shipCity} onChange={(e) => set("shipCity", e.target.value)}>
                    {!cities.some((c) => (c.value ?? c.name) === form.shipCity) && (
                      <option value={form.shipCity}>{form.shipCity || "— choisir —"}</option>
                    )}
                    {cities.map((c) => <option key={c.id} value={c.value ?? c.name}>{c.name}</option>)}
                  </select>
                ) : (
                  <input className="input w-full mt-1" value={form.shipCity} onChange={(e) => set("shipCity", e.target.value)} />
                )}
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Adresse</span>
                <textarea className="input w-full mt-1" rows={2} value={form.shipAddress} onChange={(e) => set("shipAddress", e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Montant total (DT) — COD envoyé à ADEX</span>
                <input type="number" step="0.001" min="0" inputMode="decimal" className="input w-full mt-1 font-semibold" value={form.total} onChange={(e) => set("total", e.target.value)} />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost px-3" disabled={pending}>Annuler</button>
              <button onClick={save} className="btn-primary px-4" disabled={pending}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
