"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartContext";
import { useRouter } from "next/navigation";
import { trackPixel } from "@/components/MetaPixel";

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
type Lang = "ar" | "fr";

const T = {
  ar: {
    cart: "سلة التسوق",
    empty: "السلة فارغة",
    browse: "تصفح الستيكرات",
    remove: "إزالة",
    address: "عنوان التوصيل",
    name: "الاسم الكامل",
    phone: "رقم الهاتف (+216 …)",
    addr: "العنوان: الشارع، العمارة، الشقة",
    gov: "— الولاية —",
    city: "— المدينة / المعتمدية —",
    cityManual: "المدينة / المعتمدية",
    summary: "الملخص",
    subtotal: "المجموع الجزئي",
    shipping: "التوصيل",
    total: "المجموع (الدفع عند الاستلام)",
    submit: "تأكيد الطلب",
    submitting: "جاري الإرسال…",
    fillAll: "املأ جميع الحقول",
    failed: "فشل الطلب",
    cod: "💵 ادفع للموزع نقداً عند الاستلام.",
  },
  fr: {
    cart: "Votre panier",
    empty: "Panier vide",
    browse: "Voir la collection",
    remove: "Retirer",
    address: "Adresse de livraison",
    name: "Nom complet",
    phone: "Téléphone (+216 …)",
    addr: "Adresse: rue, immeuble, app",
    gov: "— Gouvernorat —",
    city: "— Ville / Délégation —",
    cityManual: "Ville / Délégation",
    summary: "Résumé",
    subtotal: "Sous-total",
    shipping: "Livraison",
    total: "Total (COD)",
    submit: "Confirmer la commande",
    submitting: "Commande…",
    fillAll: "Remplissez tous les champs",
    failed: "Échec",
    cod: "💵 Paiement à la livraison — payez le livreur en cash.",
  },
} as const;

export default function CartPage() {
  const { items, total, setQty, remove, clear } = useCart();
  const router = useRouter();
  // Per-product delivery fee, once per distinct product line.
  const shipping = items.reduce((s, i) => s + (i.shippingFee ?? 0), 0);

  const [lang, setLang] = useState<Lang>("ar");
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [govs, setGovs] = useState<Division[]>([]);
  const [cities, setCities] = useState<Division[]>([]);
  const [govName, setGovName] = useState("");
  const [cityName, setCityName] = useState("");
  const [govId, setGovId] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abandonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const icFired = useRef(false);

  // Fire InitiateCheckout once, when the user first engages the address form.
  // Top of the checkout funnel: LPV → IC → Purchase.
  function startCheckout() {
    if (icFired.current || items.length === 0) return;
    icFired.current = true;
    trackPixel("InitiateCheckout", {
      content_ids: items.map((i) => i.id),
      contents: items.map((i) => ({ id: i.id, quantity: i.qty })),
      num_items: items.reduce((s, i) => s + i.qty, 0),
      value: total + shipping,
      currency: "TND",
    });
  }

  useEffect(() => {
    fetch(`/api/divisions?level=1`).then((r) => r.json()).then((d) => Array.isArray(d) && setGovs(d)).catch(() => setGovs([]));
  }, []);

  useEffect(() => {
    if (!govId) { setCities([]); return; }
    fetch(`/api/divisions?level=2&parent_id=${govId}`).then((r) => r.json()).then((d) => Array.isArray(d) && setCities(d)).catch(() => setCities([]));
  }, [govId]);

  // Auto-save abandoned cart (debounced 1.2s) once user has typed name or phone
  useEffect(() => {
    if (items.length === 0) return;
    if (!name && !phone) return;
    if (abandonTimer.current) clearTimeout(abandonTimer.current);
    abandonTimer.current = setTimeout(() => {
      fetch("/api/checkout/abandon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          items: items.map((i) => ({ productId: i.id, qty: i.qty })),
          name, phone, address1,
          governorate: govName, city: cityName,
        }),
      }).catch(() => null);
    }, 1200);
    return () => { if (abandonTimer.current) clearTimeout(abandonTimer.current); };
  }, [name, phone, address1, govName, cityName, items]);

  async function checkout() {
    setBusy(true); setErr(null);
    if (!name || !phone || !address1 || !govName || !cityName) {
      setBusy(false); setErr(t.fillAll); return;
    }
    // eventId generated pre-request so it dedupes with the server CAPI Purchase;
    // the browser event itself fires only after the order is confirmed below.
    const eventId = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.id, qty: i.qty })),
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
    // Order persisted — fire the browser Purchase now (same eventId dedupes with CAPI).
    trackPixel("Purchase", {
      content_ids: items.map((i) => i.id),
      contents: items.map((i) => ({ id: i.id, quantity: i.qty })),
      num_items: items.reduce((s, i) => s + i.qty, 0),
      value: total + shipping,
      currency: "TND",
    }, eventId);
    clear();
    router.push(`/orders/${j.orderId}${j.token ? `?t=${j.token}` : ""}`);
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20" dir={dir}>
        <h1 className="text-2xl font-bold mb-2">{t.empty}</h1>
        <Link href="/" className="btn-primary mt-4 inline-flex">{t.browse}</Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8" dir={dir}>
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t.cart}</h1>
          <div className="flex gap-2 text-xs">
            <button onClick={() => setLang("ar")} className={`px-3 py-1 rounded-full border transition ${lang === "ar" ? "bg-[var(--coral)] text-[var(--on-gold)] border-[var(--coral)]" : "border-[var(--line)] text-[var(--ink-muted)]"}`}>عربي</button>
            <button onClick={() => setLang("fr")} className={`px-3 py-1 rounded-full border transition ${lang === "fr" ? "bg-[var(--coral)] text-[var(--on-gold)] border-[var(--coral)]" : "border-[var(--line)] text-[var(--ink-muted)]"}`}>FR</button>
          </div>
        </div>
        {items.map((i) => (
          <div key={i.id} className="card p-3 flex gap-3 items-center">
            <Image src={i.image} alt={i.title} width={72} height={72} className="rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <Link href={`/products/${i.id}`} className="font-medium hover:underline line-clamp-1">{i.title}</Link>
              <p className="text-sm text-[var(--ink-muted)]">{i.price.toFixed(2)} TND</p>
            </div>
            <input type="number" min={1} value={i.qty} onChange={(e) => setQty(i.id, parseInt(e.target.value) || 1)} className="input w-16" />
            <button onClick={() => remove(i.id)} className="text-red-500 text-sm hover:underline">{t.remove}</button>
          </div>
        ))}

        <div className="card p-4 mt-6 space-y-3" onFocusCapture={startCheckout}>
          <h2 className="font-semibold">{t.address}</h2>
          <input className="input" placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <select className="input" value={govId ?? ""} onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            setGovId(id);
            const g = govs.find((g) => g.id === id);
            setGovName(g?.value ?? g?.name ?? "");
            setCityName("");
          }}>
            <option value="">{t.gov}</option>
            {govs.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {cities.length > 0 ? (
            <select className="input" value={cityName} onChange={(e) => setCityName(e.target.value)}>
              <option value="">{t.city}</option>
              {cities.map((c) => <option key={c.id} value={c.value ?? c.name}>{c.name}</option>)}
            </select>
          ) : (
            <input className="input" placeholder={t.cityManual} value={cityName} onChange={(e) => setCityName(e.target.value)} />
          )}
          <input className="input" placeholder={t.addr} value={address1} onChange={(e) => setAddress1(e.target.value)} />
        </div>
      </div>

      <aside className="card p-5 h-fit">
        <h2 className="font-semibold mb-3">{t.summary}</h2>
        <div className="flex justify-between text-sm mb-2"><span>{t.subtotal}</span><span>{total.toFixed(2)} TND</span></div>
        <div className="flex justify-between text-sm mb-2"><span>{t.shipping}</span><span className="font-bold text-[var(--mint-deep)]">{shipping.toFixed(2)} TND</span></div>
        <div className="flex justify-between font-semibold border-t border-[var(--line)] pt-2 mt-2"><span>{t.total}</span><span>{(total + shipping).toFixed(2)} TND</span></div>
        {err && <p className="text-red-500 text-sm mt-3">{err}</p>}
        <button onClick={checkout} disabled={busy} className="btn-primary w-full mt-4">{busy ? t.submitting : t.submit}</button>
        <p className="text-xs text-[var(--ink-muted)] mt-2">{t.cod}</p>
      </aside>
    </div>
  );
}
