import Link from "next/link";
import { db } from "@/lib/db";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/admin-auth";
import StatusSelect from "@/components/admin/StatusSelect";
import OrderDeleteButton from "@/components/admin/OrderDeleteButton";
import OrderEditButton from "@/components/admin/OrderEditButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function relTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "il y a 1 jour";
  return `il y a ${days} jours`;
}

export default async function OrdersDashboard({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = (sp.status && ORDER_STATUSES.includes(sp.status as OrderStatus)) ? (sp.status as OrderStatus) : null;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);

  const where: Record<string, unknown> = {};
  // Default view = real orders only. Abandoned carts are reachable via their
  // own tab (explicit ?status=cart_abandoned), not mixed into "Toutes".
  if (status) where.status = status;
  else where.status = { not: "cart_abandoned" };
  if (q) {
    // Postgres `contains` is case-sensitive; opt name search into insensitive
    // match there. SQLite (dev) ignores `mode` and is already case-insensitive,
    // so only pass it on Postgres to avoid an "Unknown argument" error.
    const ci = (process.env.DATABASE_URL ?? "").startsWith("postgres")
      ? { mode: "insensitive" as const }
      : {};
    where.OR = [
      { id: { contains: q } },
      { guestName: { contains: q, ...ci } },
      { shipPhone: { contains: q } },
    ];
  }

  const [orders, totalCount, counts] = await Promise.all([
    db.order.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countMap = new Map<string, number>(counts.map((c) => [c.status, c._count._all]));
  // "Toutes" mirrors the default view: real orders, abandoned carts excluded.
  const allCount = Array.from(countMap.entries())
    .filter(([s]) => s !== "cart_abandoned")
    .reduce((a, [, n]) => a + n, 0);

  const tabs: { key: OrderStatus | null; label: string; count: number; icon: string }[] = [
    { key: null, label: "Toutes les CMD", count: allCount, icon: "📋" },
    ...ORDER_STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s].fr, count: countMap.get(s) ?? 0, icon: STATUS_LABEL[s].icon })),
  ];

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => {
          const href = `/migel${t.key ? `?status=${t.key}` : ""}${q ? `${t.key ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`;
          const active = (t.key === null && !status) || t.key === status;
          return (
            <Link key={t.key ?? "all"} href={href}
              className={`flex flex-col items-center justify-center min-w-[110px] px-3 py-2 rounded-lg border text-xs ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"}`}>
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="mt-1 text-center leading-tight">{t.label}</span>
              <span className={`mt-1 font-bold ${active ? "text-white" : "text-zinc-700 dark:text-zinc-300"}`}>{t.count}</span>
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form action="/migel" className="mt-4 card p-2 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="🔎 Rechercher (client, référence, téléphone…)" className="input flex-1" />
        <button className="btn-primary">Rechercher</button>
      </form>

      {/* Table */}
      <div className="mt-4 card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase">
            <tr>
              <th className="p-3 text-left">Réf. Client</th>
              <th className="p-3 text-left">Contact</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Localisation</th>
              <th className="p-3 text-right">Montant</th>
              <th className="p-3 text-left">Produits</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-zinc-500 py-10">Aucune commande</td></tr>
            ) : orders.map((o) => {
              const phone = o.shipPhone ?? "";
              const phoneDigits = phone.replace(/[^\d]/g, "");
              const waPhone = phoneDigits.startsWith("216") ? phoneDigits : `216${phoneDigits}`;
              return (
                <tr key={o.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="p-3">
                    <div className="font-medium">{o.guestName ?? "—"}</div>
                    <div className="text-xs text-zinc-500">#{o.id.slice(-6).toUpperCase()}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-mono">{phone}</div>
                    <div className="flex gap-1 mt-1">
                      <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">WhatsApp</a>
                      <a href={`tel:${phone}`} className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">📞 Appeler</a>
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusSelect orderId={o.id} current={o.status as OrderStatus} />
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{o.shipGovernorate ?? "—"}</div>
                    <div className="text-xs text-zinc-500 line-clamp-1 max-w-[180px]">{o.shipCity} · {o.shipAddress}</div>
                  </td>
                  <td className="p-3 text-right font-semibold">{o.total.toFixed(2)} DT</td>
                  <td className="p-3">
                    <div className="text-xs">{o.items.reduce((s, i) => s + i.qty, 0)} article(s)</div>
                    <div className="text-xs text-zinc-500 line-clamp-1 max-w-[160px]">{o.items.map((i) => i.product.title).join(", ")}</div>
                    {o.addOnsSummary && (
                      <div className="mt-1 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">🎁 {o.addOnsSummary}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="text-xs">{o.createdAt.toLocaleDateString("fr-FR")}</div>
                    <div className="text-xs text-zinc-500">{relTime(o.createdAt)}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col items-end gap-1.5">
                      <Link href={`/orders/${o.id}`} className="text-xs underline" prefetch={false}>Voir</Link>
                      <OrderEditButton
                        id={o.id}
                        current={{
                          guestName: o.guestName ?? "",
                          shipPhone: o.shipPhone ?? "",
                          shipGovernorate: o.shipGovernorate ?? "",
                          shipCity: o.shipCity ?? "",
                          shipAddress: o.shipAddress ?? "",
                          total: String(o.total),
                        }}
                      />
                      <OrderDeleteButton id={o.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-zinc-500">{totalCount} commande(s)</span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={`/migel?${new URLSearchParams({ ...(status && { status }), ...(q && { q }), page: String(page - 1) }).toString()}`} className="btn-ghost px-3">‹</Link>
          )}
          <span className="px-3 py-1">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/migel?${new URLSearchParams({ ...(status && { status }), ...(q && { q }), page: String(page + 1) }).toString()}`} className="btn-ghost px-3">›</Link>
          )}
        </div>
      </div>
    </div>
  );
}
