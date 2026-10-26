import { db } from "@/lib/db";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import TrackingPanel from "@/components/TrackingPanel";
import { verifyOrder } from "@/lib/orderToken";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;

  const tokenOk = verifyOrder(id, t ?? null);
  if (!tokenOk && !(await isAdmin())) notFound();

  const order = await db.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!order) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-6 text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="text-2xl font-bold mt-3">Commande confirmée</h1>
        <p className="text-[var(--ink-muted)] text-sm">#{order.id.slice(-8).toUpperCase()} · {order.total.toFixed(2)} TND</p>
        <p className="text-xs text-[var(--ink-muted)] mt-2">💵 Payez le livreur en cash à la réception.</p>
      </div>

      <div className="mt-6 card p-4 text-sm">
        <p className="font-medium mb-1">Livraison à</p>
        <p>{order.guestName}</p>
        <p>{order.shipAddress}</p>
        <p>{order.shipCity}, {order.shipGovernorate}</p>
        <p>{order.shipPhone}</p>
      </div>

      <div className="mt-6 space-y-3">
        {order.items.map((it) => (
          <div key={it.id} className="card p-3 flex gap-3 items-center">
            <Image src={it.product.image} alt={it.product.title} width={64} height={64} className="rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-medium line-clamp-1">{it.product.title}</p>
              <p className="text-sm text-[var(--ink-muted)]">{it.price.toFixed(2)} TND × {it.qty}</p>
            </div>
            <span className="font-semibold">{(it.price * it.qty).toFixed(2)} TND</span>
          </div>
        ))}
        {order.addOnsSummary && (
          <div className="card p-3 flex gap-3 items-center">
            <span className="text-2xl">🎁</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium line-clamp-2">{order.addOnsSummary}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-semibold mb-3">Suivi du colis</h2>
        <TrackingPanel id={order.id} token={t} />
      </div>

      <Link href="/" className="btn-primary w-full mt-6">Continuer mes achats</Link>
    </div>
  );
}
