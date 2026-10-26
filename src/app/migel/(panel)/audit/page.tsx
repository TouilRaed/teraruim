import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const sp = await searchParams;
  const where = sp.orderId ? { orderId: sp.orderId } : {};
  const audits = await db.orderAudit.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Journal d&apos;audit ({audits.length})</h1>
      {sp.orderId && (
        <p className="text-sm text-zinc-500 mb-3">Filtré par commande <code>{sp.orderId}</code> · <Link href="/migel/audit" className="underline">Tout voir</Link></p>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Commande</th>
              <th className="p-3 text-left">De</th>
              <th className="p-3 text-left">À</th>
              <th className="p-3 text-left">Acteur</th>
              <th className="p-3 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {audits.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-zinc-500 py-10">Aucun événement</td></tr>
            ) : audits.map((a) => (
              <tr key={a.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="p-3 text-xs">{a.createdAt.toLocaleString("fr-FR")}</td>
                <td className="p-3"><Link href={`/migel/audit?orderId=${a.orderId}`} className="font-mono text-xs underline">#{a.orderId.slice(-6).toUpperCase()}</Link></td>
                <td className="p-3 text-xs text-zinc-500">{a.fromStatus ?? "—"}</td>
                <td className="p-3 text-xs font-medium">{a.toStatus}</td>
                <td className="p-3"><span className="badge">{a.actor}</span></td>
                <td className="p-3 text-xs text-zinc-500 font-mono">{a.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
