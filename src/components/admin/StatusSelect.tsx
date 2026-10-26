"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const STATUSES = [
  { v: "cart_abandoned",      l: "Panier abandonné" },
  { v: "pending",             l: "En attente" },
  { v: "confirmed",           l: "Confirmée" },
  { v: "ready_to_ship",       l: "Prêt à expédier" },
  { v: "shipped",             l: "Expédiée" },
  { v: "delivered",           l: "Livrée" },
  { v: "return_not_received", l: "Retour non reçu" },
  { v: "cancelled",           l: "Annulée" },
  { v: "return_received",     l: "Retour reçue" },
  { v: "paid",                l: "Payée" },
];

export default function StatusSelect({ orderId, current }: { orderId: string; current: string }) {
  const [val, setVal] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setVal(next);
    start(async () => {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setVal(current);
        alert("Échec de la mise à jour");
        return;
      }
      router.refresh();
    });
  }

  return (
    <select value={val} onChange={onChange} disabled={pending} className="input text-xs py-1 px-2 w-36">
      {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
    </select>
  );
}
