import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const sp = await searchParams;

  const where: Record<string, unknown> = {};
  if (sp.q) where.OR = [
    { title: { contains: sp.q } },
    { description: { contains: sp.q } },
  ];
  if (sp.cat) where.category = sp.cat;

  const [products, categories] = await Promise.all([
    db.product.findMany({ where, orderBy: { createdAt: "desc" } }),
    db.product.findMany({ select: { category: true }, distinct: ["category"] }),
  ]);

  return (
    <div className="wc-theme">
      {/* Hero — compact, centered */}
      <section className="pt-8 pb-10 md:pt-12 md:pb-12 text-center">
        <p className="text-[11px] tracking-[0.35em] uppercase text-[var(--olive)] mb-4">
          Stickers Panini · Mondial 2026
        </p>
        <h1 className="font-display font-light text-[clamp(2.25rem,6vw,4rem)] leading-[1] tracking-[-0.02em] text-[var(--ink)]">
          Collectionnez <em className="text-[var(--clay)]" style={{ fontStyle: "italic", fontVariationSettings: '"SOFT" 100, "opsz" 144' }}>le Mondial</em>
        </h1>
        <p className="mt-4 text-base md:text-lg text-[var(--ink-soft)] max-w-lg mx-auto leading-relaxed">
          Packs et albums livrés partout en Tunisie 🇹🇳 · Paiement à la réception.
        </p>
      </section>

      {/* Search bar */}
      <form action="/" className="mb-10 max-w-2xl mx-auto">
        <div className="card-elev p-2 flex flex-col sm:flex-row gap-2">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Recherchez un pack, une équipe…  ·  ابحث عن باكو"
            className="flex-1 bg-transparent px-4 py-2.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-none"
          />
          <select name="cat" defaultValue={sp.cat ?? ""} className="bg-[var(--paper-sand)] border border-[var(--line)] rounded-md px-3 py-2 text-sm text-[var(--ink-soft)] cursor-pointer">
            <option value="">Toutes catégories</option>
            {categories.map((c) => <option key={c.category} value={c.category}>{c.category}</option>)}
          </select>
          <button className="btn-clay">Rechercher</button>
        </div>
      </form>

      {/* Section header */}
      {products.length > 0 && (
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display text-2xl md:text-3xl font-medium" style={{ fontVariationSettings: '"SOFT" 50, "opsz" 80' }}>
            La collection
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">
            {products.length} pack{products.length > 1 ? "s" : ""}
          </p>
        </div>
      )}

      {products.length === 0 ? (
        <div className="card-elev p-16 text-center">
          <p className="font-display text-3xl text-[var(--clay)]">— Bientôt —</p>
          <p className="text-[var(--ink-muted)] mt-2">La collection arrive très vite. Repassez d&apos;ici peu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p, i) => (
            <div key={p.id} className={`rise ${["rise-1","rise-2","rise-3","rise-4"][i % 4]}`}>
              <ProductCard product={p} num={i + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
