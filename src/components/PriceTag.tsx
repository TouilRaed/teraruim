export function discountPct(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export default function PriceTag({
  price,
  compareAt,
  size = "md",
}: {
  price: number;
  compareAt?: number | null;
  size?: "sm" | "md" | "lg";
}) {
  const pct = discountPct(price, compareAt);
  const cls = {
    sm: { main: "text-lg", old: "text-xs", unit: "text-xs", pct: "text-[10px] px-1.5 py-0.5" },
    md: { main: "text-3xl", old: "text-base", unit: "text-sm", pct: "text-xs px-2 py-0.5" },
    lg: { main: "text-5xl", old: "text-xl", unit: "text-base", pct: "text-sm px-2.5 py-1" },
  }[size];

  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <div className="flex items-baseline gap-1.5">
        <span className={`price-display ${cls.main} font-semibold text-[var(--clay)] leading-none`}>
          {price.toFixed(2)}
        </span>
        <span className={`${cls.unit} text-[var(--ink-muted)] tracking-wide`}>TND</span>
      </div>
      {pct !== null && (
        <>
          <span className={`${cls.old} text-[var(--ink-muted)] line-through leading-none`}>
            {compareAt!.toFixed(2)}
          </span>
          <span className={`${cls.pct} font-bold tracking-wider uppercase bg-[var(--gold)] text-[var(--on-gold)] rounded-sm`}>
            ‒{pct}%
          </span>
        </>
      )}
    </div>
  );
}
