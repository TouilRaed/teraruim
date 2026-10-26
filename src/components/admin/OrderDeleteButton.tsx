"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function OrderDeleteButton({ id, label }: { id: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm("Supprimer cette commande ? Action irréversible.")) return;
    start(async () => {
      const res = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Échec de la suppression");
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      title="Supprimer la commande"
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "…" : (label ?? "🗑")}
    </button>
  );
}
