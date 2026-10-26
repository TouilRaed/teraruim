"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function ProductDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm("Supprimer ce produit ?")) return;
    start(async () => {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Échec de la suppression");
        return;
      }
      router.refresh();
    });
  }

  return (
    <button onClick={onClick} disabled={pending} className="text-xs text-red-600 hover:underline">
      {pending ? "…" : "Supprimer"}
    </button>
  );
}
