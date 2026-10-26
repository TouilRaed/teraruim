"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trackPixel } from "@/components/MetaPixel";
import { offerHasFreeShipping } from "@/lib/shipping";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem("teraruim_session");
  if (!sid) {
    sid = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) + Date.now().toString(36);
    localStorage.setItem("teraruim_session", sid);
  }
  return sid;
}

type Division = { id: number; name: string; value?: string };
type Offer = { name?: string; qty: number; price: number };
type AddOn = { label: string; price: number };
type Product = { id: string; title: string; price: number; compareAtPrice?: number | null; offers?: Offer[]; singleLabel?: string | null; hideSingle?: boolean | null; shippingFee?: number | null };
type Lang = "ar" | "fr";

const T = {
  ar: {
    quantity: "الكمية",
    name: "الاسم الكامل",
    phone: "رقم الهاتف (+216 …)",
    address: "العنوان: الشارع، العمارة، الشقة",
    gov: "— الولاية —",
    city: "— المدينة / المعتمدية —",
    cityManual: "المدينة / المعتمدية",
    subtotal: "المنتج",
    shipping: "التوصيل",
    total: "المجموع (الدفع عند الاستلام)",
    submit: "تأكيد الطلب",
    submitting: "جاري إرسال الطلب…",
    fillAll: "املأ جميع الحقول",
    failed: "فشل الطلب",
    singleUnit: "قطعة واحدة",
    offerLabel: (qty: number, price: number) => `${qty} بـ ${price} دينار`,
    offersTitle: "🎁 وفّر أكثر — عروض الحزمة",
    packOf: (n: number) => `حزمة ${n} قطع`,
    perUnit: "للقطعة",
    save: (amt: number) => `وفّر ${amt} د`,
    bestValue: "🔥 أفضل سعر",
    limited: "🔥 عرض محدود",
    addOnPrompt: "أضف إلى طلبك",
    addOnYes: "نعم، مع",
    addOnNo: "لا، بدون",
    addOnPick: "إضغط على أحد الخيارات: مع الألبوم أو بدون",
    freeDelivery: "توصيل مجاني",
    free: "مجاني",
  },
  fr: {
    quantity: "Quantité",
    name: "Nom complet",
    phone: "Téléphone (+216 …)",
    address: "Adresse: rue, immeuble, app",
    gov: "— Gouvernorat —",
    city: "— Ville / Délégation —",
    cityManual: "Ville / Délégation",
    subtotal: "Produit",
    shipping: "Livraison",
    total: "Total (COD)",
    submit: "Confirmer la commande",
    submitting: "Commande en cours…",
    fillAll: "Remplissez tous les champs",
    failed: "Échec",
    singleUnit: "1 pièce",
    offerLabel: (qty: number, price: number) => `${qty} pour ${price} TND`,
    offersTitle: "🎁 Économisez plus — packs",
    packOf: (n: number) => `Pack de ${n}`,
    perUnit: "/pièce",
    save: (amt: number) => `Économisez ${amt} DT`,
    bestValue: "🔥 Meilleur prix",
    limited: "🔥 Offre Limitée",
    addOnPrompt: "Ajoutez à votre commande",
    addOnYes: "Oui, avec",
    addOnNo: "Non, sans",
    addOnPick: "Appuyez sur une option : avec ou sans album",
    freeDelivery: "Livraison gratuite",
    free: "Gratuite",
  },
} as const;

export default function BuyForm({ product, addOn }: { product: Product; addOn?: AddOn | null }) {
  const router = useRouter();

  const [lang, setLang] = useState<Lang>("ar");
  // null = not chosen yet — checkout is blocked until the customer picks with/without.
  const [wantAddOn, setWantAddOn] = useState<boolean | null>(null);
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const baseShipFee = product.shippingFee ?? 0;
  const offers = (product.offers ?? []).slice().sort((a, b) => a.qty - b.qty);
  // Best deal = lowest per-unit price → gets the highlight ribbon.
  const bestOfferQty = offers.length
    ? offers.reduce((best, o) => (o.price / o.qty < best.price / best.qty ? o : best)).qty
    : null;
  // Offers-only mode: no single-unit option — pre-select the smallest pack so a
  // valid offer (and price) is always active.
  const offersOnly = !!product.hideSingle && offers.length > 0;
  const [qty, setQty] = useState(offersOnly ? offers[0].qty : 1);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(offersOnly ? offers[0] : null);
  // Bigger packs (3rd offer and up) ship free — same rule the checkout API applies.
  const freeShip = !!selectedOffer && offerHasFreeShipping(offers, selectedOffer.qty);
  const shipFee = freeShip ? 0 : baseShipFee;

  function pickOffer(o: Offer) {
    setSelectedOffer(o);
    setQty(o.qty);
  }
  function pickSingle() {
    setSelectedOffer(null);
    setQty(1);
  }
  function onQtyInput(v: number) {
    setSelectedOffer(null);
    setQty(Math.max(1, v || 1));
  }

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  // Governorate + delegation are sourced from /api/divisions, which is backed by
  // Intigo's own region list — so the customer's pick maps to a real Intigo
  // city/district and the parcel dispatch matches exactly.
  const [govs, setGovs] = useState<Division[]>([]);
  const [cities, setCities] = useState<Division[]>([]);
  const [govId, setGovId] = useState<number | null>(null);
  const [govName, setGovName] = useState("");
  const [cityName, setCityName] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abandonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const icFired = useRef(false);
  const addOnRef = useRef<HTMLDivElement>(null);
  // Bumped on each blocked checkout — keys the warning so its flash replays every time.
  const [addOnFlash, setAddOnFlash] = useState(0);

  // Fire InitiateCheckout once, when the user focuses a real checkout field
  // (name/phone/address/gov) — NOT on offer selection, lang toggle, or qty.
  // Selecting an offer is browsing, not checkout intent. Funnel: LPV → IC →
  // Purchase. Reads selectedOffer at fire time so the value matches the pack.
  function startCheckout() {
    if (icFired.current) return;
    icFired.current = true;
    trackPixel("InitiateCheckout", {
      content_ids: [product.id],
      content_name: product.title,
      contents: [{ id: product.id, quantity: qty }],
      num_items: qty,
      value: total,
      currency: "TND",
    });
  }

  // Load governorates (Intigo cities) once.
  useEffect(() => {
    fetch(`/api/divisions?level=1`).then((r) => r.json()).then((d) => Array.isArray(d) && setGovs(d)).catch(() => setGovs([]));
  }, []);

  // Load delegations (Intigo districts) for the chosen governorate.
  useEffect(() => {
    if (!govId) { setCities([]); return; }
    fetch(`/api/divisions?level=2&parent_id=${govId}`).then((r) => r.json()).then((d) => Array.isArray(d) && setCities(d)).catch(() => setCities([]));
  }, [govId]);

  // Auto-save abandoned cart when user has typed name or phone (debounced 1.2s)
  useEffect(() => {
    if (!name && !phone) return;
    if (abandonTimer.current) clearTimeout(abandonTimer.current);
    abandonTimer.current = setTimeout(() => {
      fetch("/api/checkout/abandon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          items: [{ productId: product.id, qty }],
          name, phone, address1,
          governorate: govName, city: cityName,
        }),
      }).catch(() => null);
    }, 1200);
    return () => { if (abandonTimer.current) clearTimeout(abandonTimer.current); };
  }, [name, phone, address1, govName, cityName, qty, product.id]);

  function flagMissingAddOn() {
    setErr(t.addOnPick);
    setAddOnFlash((n) => n + 1);
    addOnRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Runs on the submit button's click — before native `required` validation —
  // so a missing album choice wins over empty fields and gets scrolled to.
  function requireAddOnChoice(e: React.MouseEvent) {
    if (addOn && wantAddOn === null) {
      e.preventDefault();
      flagMissingAddOn();
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (addOn && wantAddOn === null) {
      flagMissingAddOn();
      return;
    }
    if (!name || !phone || !address1 || !govName || !cityName) {
      setErr(t.fillAll);
      return;
    }

    setBusy(true);
    // Shared event_id so the browser Purchase dedupes against the server CAPI
    // Purchase. Generated before the request so the server gets the same id —
    // but the browser event is NOT fired until the order is confirmed below.
    const eventId = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: product.id, qty, offerPrice: selectedOffer?.price, addOn: addOn && wantAddOn ? true : undefined }],
        name, phone, address1,
        governorate: govName, city: cityName,
        sessionId: getSessionId(),
        pixelEventId: eventId,
      }),
    });
    setBusy(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? t.failed);
      return;
    }
    const j = await res.json();
    // Order persisted server-side — only now fire the browser Purchase (COD model:
    // a confirmed order = the conversion). Same eventId dedupes with server CAPI.
    trackPixel("Purchase", {
      content_ids: [product.id],
      content_name: product.title,
      contents: [{ id: product.id, quantity: qty }],
      num_items: qty,
      value: total,
      currency: "TND",
    }, eventId);
    router.push(`/orders/${j.orderId}${j.token ? `?t=${j.token}` : ""}`);
  }

  const subtotal = selectedOffer ? selectedOffer.price : product.price * qty;
  const addOnTotal = addOn && wantAddOn ? addOn.price : 0;
  const total = subtotal + addOnTotal + shipFee;
  const oldSubtotal = !selectedOffer && product.compareAtPrice && product.compareAtPrice > product.price
    ? product.compareAtPrice * qty
    : null;

  return (
    <form onSubmit={submit} dir={dir} className="space-y-3">
      <div className="flex gap-1.5 text-xs justify-end" dir="ltr">
        <button type="button" onClick={() => setLang("ar")} className={`px-3 py-1 rounded-full border transition ${lang === "ar" ? "bg-[var(--clay)] text-white border-[var(--clay)]" : "border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--clay)]/60"}`}>عربي</button>
        <button type="button" onClick={() => setLang("fr")} className={`px-3 py-1 rounded-full border transition ${lang === "fr" ? "bg-[var(--clay)] text-white border-[var(--clay)]" : "border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--clay)]/60"}`}>FR</button>
      </div>

      {offers.length > 0 && (
        <div className="rounded-xl border-2 border-dashed border-[var(--clay)]/40 bg-[var(--clay)]/[0.04] p-3">
          <p className="text-sm font-bold text-[var(--clay-deep)] mb-2 flex items-center gap-1.5">
            {t.offersTitle}
          </p>
          <div className="space-y-2">
            {offers.map((o) => {
              const active = selectedOffer?.qty === o.qty;
              const oldTotal = product.price * o.qty;
              const pct = oldTotal > o.price ? Math.round((1 - o.price / oldTotal) * 100) : 0;
              const isBest = o.qty === bestOfferQty;
              const shipsFree = baseShipFee > 0 && offerHasFreeShipping(offers, o.qty);
              return (
                <button key={o.qty} type="button" onClick={() => pickOffer(o)}
                  className={`relative w-full flex items-center gap-3 rounded-lg border-2 p-3 pt-4 text-start transition ${
                    active
                      ? "border-[var(--clay)] bg-[var(--clay)]/10 shadow-sm ring-2 ring-[var(--clay)]/30"
                      : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--clay)]/60"
                  }`}>
                  {/* Top-end corner: limited-offer ribbon on the best deal, otherwise the % badge */}
                  {isBest ? (
                    <span className="absolute -top-2.5 end-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--mint-deep)] text-white shadow">
                      {t.limited}
                    </span>
                  ) : pct > 0 && (
                    <span className="absolute -top-2.5 end-3 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--ink)] text-white shadow">
                      -{pct}%
                    </span>
                  )}
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? "border-[var(--clay)] bg-[var(--clay)]" : "border-[var(--line)]"}`}>
                    {active && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-[var(--ink)] leading-snug">{o.name?.trim() || t.packOf(o.qty)}</span>
                    {shipsFree && (
                      <span className="free-ship inline-flex items-center gap-1.5 mt-1.5 text-xs font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full">
                        <span className="truck" aria-hidden>🚚</span>
                        {t.freeDelivery}
                      </span>
                    )}
                  </span>
                  <span className="flex-shrink-0 text-end">
                    <span className="block text-lg font-extrabold text-[var(--mint-deep)]">{o.price.toFixed(2)} TND</span>
                    {oldTotal > o.price && (
                      <span className="block text-xs text-[var(--ink-muted)] line-through">{oldTotal.toFixed(2)} TND</span>
                    )}
                  </span>
                </button>
              );
            })}
            {!offersOnly && (
              <button type="button" onClick={pickSingle}
                className={`w-full text-center text-xs py-2 rounded-lg border transition ${
                  !selectedOffer ? "border-[var(--clay)] bg-[var(--clay)]/5 text-[var(--ink)] font-semibold" : "border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink-soft)]"
                }`}>
                {product.singleLabel?.trim() || t.singleUnit} · {product.price} TND
              </button>
            )}
          </div>
        </div>
      )}

      {addOn && (() => {
        const albumName = addOn.label.replace(/^avec\s+/i, "");
        const cardBase = "rounded-lg border-2 p-3 text-center transition";
        const on = "border-[var(--clay)] bg-[var(--clay)]/10 ring-2 ring-[var(--clay)]/30";
        const off = "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--clay)]/60";
        const withAlbum = wantAddOn === true;
        const stickerOnly = wantAddOn === false;
        const missing = wantAddOn === null && addOnFlash > 0;
        return (
          <div ref={addOnRef} key={missing ? `flash-${addOnFlash}` : "addon"}
            className={`rounded-xl border-2 bg-[var(--paper)] p-3 ${missing ? "border-[#C8102E]" : "border-[var(--line)]"}`}>
            <p className="text-sm font-bold text-[var(--ink)] mb-2 flex items-center gap-1.5">
              🎁 {addOn.label}
            </p>
            <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setWantAddOn(true); setErr(null); }}
                  className={`${cardBase} ${withAlbum ? on : off}`}>
                  <span className="block font-bold text-[var(--ink)] leading-snug">{t.addOnYes} {albumName}</span>
                  <span className="block text-sm font-extrabold text-[var(--mint-deep)] mt-0.5">+{addOn.price} TND</span>
                </button>
                <button type="button" onClick={() => { setWantAddOn(false); setErr(null); }}
                  className={`${cardBase} ${stickerOnly ? on : off}`}>
                  <span className="block font-bold text-[var(--ink)] leading-snug">{t.addOnNo} {albumName}</span>
                  <span className="block text-sm text-[var(--ink-muted)] mt-0.5">+0 TND</span>
                </button>
            </div>
            {missing && (
              <p role="alert" className="flash-red-msg mt-2 text-[#C8102E] text-sm font-semibold text-center">
                {t.addOnPick}
              </p>
            )}
          </div>
        );
      })()}

      {!offersOnly && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-[var(--ink-soft)]">{t.quantity}</label>
          <input type="number" min={1} max={99} value={qty}
            onChange={(e) => onQtyInput(parseInt(e.target.value))}
            className="input w-20" />
        </div>
      )}

      <input className="input" placeholder={t.name} value={name} onFocus={startCheckout} onChange={(e) => setName(e.target.value)} required />
      <input className="input" placeholder={t.phone} value={phone} onFocus={startCheckout} onChange={(e) => setPhone(e.target.value)} required />
      <input className="input" placeholder={t.address} value={address1} onFocus={startCheckout} onChange={(e) => setAddress1(e.target.value)} required />
      <select className="input" value={govId ?? ""} onFocus={startCheckout} onChange={(e) => {
        const id = e.target.value ? Number(e.target.value) : null;
        setGovId(id);
        const g = govs.find((g) => g.id === id);
        setGovName(g?.value ?? g?.name ?? "");
        setCityName("");
      }} required>
        <option value="">{t.gov}</option>
        {govs.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      {cities.length > 0 ? (
        <select className="input" value={cityName} onFocus={startCheckout} onChange={(e) => setCityName(e.target.value)} required>
          <option value="">{t.city}</option>
          {cities.map((c) => <option key={c.id} value={c.value ?? c.name}>{c.name}</option>)}
        </select>
      ) : (
        <input className="input" placeholder={t.cityManual} value={cityName} onFocus={startCheckout} onChange={(e) => setCityName(e.target.value)} required />
      )}

      <div className="border-t border-[var(--line)] pt-3 mt-3 space-y-1">
        <div className="flex justify-between text-sm text-[var(--ink-soft)]">
          <span>{t.subtotal}</span>
          <span>
            {oldSubtotal && <span className="text-[var(--ink-muted)] line-through me-2">{oldSubtotal.toFixed(2)}</span>}
            <span className={oldSubtotal ? "text-[var(--ink)] font-semibold" : ""}>{subtotal.toFixed(2)} TND</span>
          </span>
        </div>
        {addOnTotal > 0 && addOn && (
          <div className="flex justify-between text-sm text-[var(--ink-soft)]">
            <span>{addOn.label}</span>
            <span>{addOn.price.toFixed(2)} TND</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-[var(--ink-soft)]">
          <span>{t.shipping}</span>
          {freeShip && baseShipFee > 0 ? (
            <span>
              <span className="text-[var(--ink-muted)] line-through me-2">{baseShipFee.toFixed(2)}</span>
              <span className="font-semibold text-[var(--mint-deep)]">{t.free}</span>
            </span>
          ) : (
            <span>{shipFee.toFixed(2)} TND</span>
          )}
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-[var(--line)]">
          <span>{t.total}</span>
          <span className="text-[var(--clay)]">{total.toFixed(2)} TND</span>
        </div>
      </div>
      {err && <p className="text-[var(--coral)] text-sm">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        onClick={requireAddOnChoice}
        className="w-full bg-[var(--clay)] hover:bg-[var(--clay-deep)] disabled:opacity-60 text-white text-base font-semibold py-4 rounded-lg tracking-wide transition shadow-sm"
      >
        {busy ? t.submitting : t.submit}
      </button>
    </form>
  );
}
