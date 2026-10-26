"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Order = { id: string; guestName: string | null; total: number; createdAt: string; shipPhone: string | null };

const STORAGE_SINCE = "teraruim_admin_last_seen";
const POLL_MS = 8000;

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const tones = [880, 1320, 880];
    let t = ctx.currentTime;
    for (const freq of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
      t += 0.22;
    }
    setTimeout(() => ctx.close(), 1500);
  } catch { /* audio context blocked until user interacts */ }
}

export default function LiveAlert() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Order[]>([]);
  const [enabled, setEnabled] = useState(false);
  const sinceRef = useRef<string>("");

  useEffect(() => {
    sinceRef.current = localStorage.getItem(STORAGE_SINCE) || new Date().toISOString();
  }, []);

  async function poll() {
    try {
      const r = await fetch(`/api/admin/orders/recent?since=${encodeURIComponent(sinceRef.current)}`);
      if (!r.ok) return;
      const j = await r.json() as { now: string; count: number; orders: Order[] };
      if (j.count > 0) {
        playBeep();
        for (const o of j.orders) {
          if (Notification.permission === "granted") {
            new Notification("📚 Nouvelle commande Teraruim", {
              body: `${o.guestName ?? "Client"} · ${o.total.toFixed(2)} TND${o.shipPhone ? ` · ${o.shipPhone}` : ""}`,
              icon: "/logo.png",
              tag: o.id,
            });
          }
        }
        setToasts((prev) => [...j.orders, ...prev].slice(0, 5));
        router.refresh();
      }
      sinceRef.current = j.now;
      localStorage.setItem(STORAGE_SINCE, j.now);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!enabled) return;
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  async function enable() {
    if ("Notification" in window) {
      if (Notification.permission === "default") await Notification.requestPermission();
    }
    // unlock AudioContext via user gesture
    playBeep();
    setEnabled(true);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <>
      {!enabled && (
        <button
          onClick={enable}
          className="fixed bottom-4 right-4 z-50 bg-amber-500 text-amber-950 font-bold px-4 py-2 rounded-lg shadow-lg hover:bg-amber-400"
          title="Activer les alertes son + notification de nouvelles commandes"
        >
          🔔 Activer alertes commandes
        </button>
      )}
      {enabled && toasts.length === 0 && (
        <span className="fixed bottom-4 right-4 z-50 bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full shadow">
          🔔 Alertes actives
        </span>
      )}

      <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((o) => (
          <div key={o.id} className="bg-white dark:bg-zinc-900 border-l-4 border-red-600 shadow-lg rounded p-3 animate-pulse">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-red-600">🛒 Nouvelle commande</p>
                <p className="text-sm font-medium">{o.guestName ?? "Client"}</p>
                <p className="text-xs text-zinc-500">{o.shipPhone}</p>
                <p className="text-sm font-semibold mt-1">{o.total.toFixed(2)} TND</p>
              </div>
              <button onClick={() => dismissToast(o.id)} className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">×</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
