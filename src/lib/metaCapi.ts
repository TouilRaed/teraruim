// Server-side Meta Conversions API sender. Bypasses ad blockers.
// Send events alongside the browser Pixel — dedupe via event_id.
import crypto from "crypto";

const PIXEL_ID = process.env.META_PIXEL_ID;
const TOKEN = process.env.META_CAPI_TOKEN;
const API = `https://graph.facebook.com/v18.0`;

export const capiEnabled = () => Boolean(PIXEL_ID && TOKEN);

function sha256(s: string) {
  return crypto.createHash("sha256").update(s.trim().toLowerCase()).digest("hex");
}

// Normalize phone to E.164 digits only (drop +, spaces, dashes)
function normPhone(p: string) {
  return p.replace(/[^\d]/g, "");
}

export type CapiUser = {
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;   // _fbp cookie
  fbc?: string | null;   // _fbc cookie
};

export type CapiEvent = {
  eventName:
    | "Purchase"
    | "InitiateCheckout"
    | "AddToCart"
    | "ViewContent"
    | "Lead"
    | "PageView";
  eventId?: string;        // for dedup with browser Pixel
  eventTime?: number;      // unix seconds, defaults to now
  eventSourceUrl?: string;
  user: CapiUser;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  contents?: { id: string; quantity: number }[];
};

export async function sendCapi(ev: CapiEvent): Promise<void> {
  if (!capiEnabled()) return;

  const userData: Record<string, unknown> = {};
  if (ev.user.phone) userData.ph = sha256(normPhone(ev.user.phone));
  if (ev.user.email) userData.em = sha256(ev.user.email);
  if (ev.user.name) {
    const parts = ev.user.name.trim().split(/\s+/);
    if (parts[0]) userData.fn = sha256(parts[0]);
    if (parts.length > 1) userData.ln = sha256(parts.slice(1).join(" "));
  }
  if (ev.user.ip) userData.client_ip_address = ev.user.ip;
  if (ev.user.userAgent) userData.client_user_agent = ev.user.userAgent;
  if (ev.user.fbp) userData.fbp = ev.user.fbp;
  if (ev.user.fbc) userData.fbc = ev.user.fbc;
  userData.country = sha256("tn");

  const customData: Record<string, unknown> = {};
  if (ev.value != null) customData.value = ev.value;
  if (ev.currency) customData.currency = ev.currency;
  if (ev.contentIds) customData.content_ids = ev.contentIds;
  if (ev.contentName) customData.content_name = ev.contentName;
  if (ev.contents) customData.contents = ev.contents;
  customData.content_type = "product";

  const event = {
    event_name: ev.eventName,
    event_time: ev.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: ev.eventId ?? crypto.randomUUID(),
    action_source: "website" as const,
    event_source_url: ev.eventSourceUrl,
    user_data: userData,
    custom_data: customData,
  };

  const url = `${API}/${PIXEL_ID}/events?access_token=${TOKEN}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [event] }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("CAPI failed", res.status, txt.slice(0, 300));
    }
  } catch (e) {
    console.error("CAPI error:", (e as Error).message);
  }
}
