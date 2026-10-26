import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import ProductDeleteButton from "@/components/admin/ProductDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await db.product.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Produits ({products.length})</h1>
        <Link href="/migel/products/new" className="btn-primary">+ Nouveau produit</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase">
            <tr>
              <th className="p-3 text-left">Image</th>
              <th className="p-3 text-left">Titre</th>
              <th className="p-3 text-left">Catégorie</th>
              <th className="p-3 text-right">Prix</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-zinc-500 py-10">Aucun produit. <Link href="/migel/products/new" className="underline">Ajouter</Link></td></tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="p-3"><Image src={p.image} alt={p.title} width={48} height={48} className="rounded object-cover" /></td>
                <td className="p-3">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-zinc-500 line-clamp-1 max-w-[280px]">{p.description}</div>
                </td>
                <td className="p-3"><span className="badge">{p.category}</span></td>
                <td className="p-3 text-right font-semibold">{p.price.toFixed(2)} DT</td>
                <td className="p-3 flex gap-2 justify-end">
                  <Link href={`/migel/products/${p.id}/edit`} className="btn-ghost text-xs">Modifier</Link>
                  <ProductDeleteButton id={p.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
