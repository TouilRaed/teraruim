import { db } from "@/lib/db";

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, rating));
  return (
    <span className="text-[var(--gold)] text-sm tracking-wider" aria-label={`${r}/5`}>
      {"★".repeat(r)}<span className="text-[var(--line)]">{"★".repeat(5 - r)}</span>
    </span>
  );
}

export default async function ReviewsSection({ productId }: { productId: string }) {
  const reviews = await db.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (reviews.length === 0) return null;

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <section className="mt-20 pt-12 border-t border-[var(--line)]">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--olive)]">N° 02</p>
          <h2 className="font-display font-medium text-3xl md:text-4xl tracking-tight mt-1 text-[var(--ink)]"
              style={{ fontVariationSettings: '"SOFT" 50, "opsz" 80' }}>
            Ce qu&apos;en disent les clients
          </h2>
          <p className="font-arabic text-sm text-[var(--ink-muted)] mt-1" dir="rtl">آراء العملاء</p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--paper-deep)] border border-[var(--line)] rounded-md px-4 py-2">
          <Stars rating={Math.round(avg)} />
          <span className="text-sm">
            <strong className="text-[var(--ink)]">{avg.toFixed(1)}</strong>
            <span className="text-[var(--ink-muted)]"> / 5 · {reviews.length} avis</span>
          </span>
        </div>
      </div>

      {/* Swipe hint */}
      <p className="text-[11px] tracking-[0.2em] uppercase text-[var(--ink-muted)] mb-3 flex items-center gap-2">
        <span>Glissez pour voir plus</span>
        <span className="font-arabic" dir="rtl">اسحب لرؤية المزيد</span>
        <span className="text-[var(--coral)]">→</span>
      </p>

      {/* Horizontal swipe carousel — scroll-snap, native swipe, no JS */}
      <div className="reviews-track flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4">
        {reviews.map((r) => {
          const isArabic = /[؀-ۿ]/.test(r.body);
          return (
            <article
              key={r.id}
              className="card p-5 relative snap-start shrink-0 w-[82%] sm:w-[46%] lg:w-[31%]"
            >
              {/* Decorative quote mark */}
              <span className="absolute top-2 right-4 font-display text-5xl text-[var(--gold)]/30 leading-none select-none"
                    style={{ fontVariationSettings: '"SOFT" 100' }}>"</span>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-semibold text-[var(--ink)] ${isArabic ? "font-arabic" : ""}`}>{r.author}</p>
                  <Stars rating={r.rating} />
                </div>
              </div>
              <p
                dir={isArabic ? "rtl" : "ltr"}
                className={`text-[15px] text-[var(--ink-soft)] mt-3 leading-relaxed whitespace-pre-line ${isArabic ? "font-arabic" : ""}`}
              >
                {r.body}
              </p>
              <p className="text-[11px] tracking-wider uppercase text-[var(--ink-muted)] mt-4 pt-3 border-t border-[var(--line-soft)]">
                {r.createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
