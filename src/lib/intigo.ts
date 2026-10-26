// Intigo (intigo.net) courier — Partner V3 REST API.
// Docs: https://my.intigo.net/api/docs/  ·  Base https://api.intigo.net/api/v3
// Auth: X-API-Key header. Regions (cities/districts) are resolvable, so we no
// longer guess district ids — city + delegation are matched to real IDs.

const BASE = process.env.INTIGO_BASE_URL ?? "https://api.intigo.net/api/v3";
const KEY = process.env.INTIGO_API_KEY ?? "";
const PICKUP_INDEX = Number(process.env.INTIGO_PICKUP_INDEX ?? "1");

export const intigoEnabled = () => Boolean(KEY);

export class IntigoError extends Error {
  constructor(message: string) {
    super(`Intigo: ${message.slice(0, 300)}`);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!intigoEnabled()) throw new IntigoError("INTIGO_API_KEY not configured");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "X-API-Key": KEY, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!res.ok) {
    const detail = (body as { detail?: unknown })?.detail;
    const msg = typeof detail === "string" ? detail : text || `HTTP ${res.status}`;
    throw new IntigoError(`${res.status} ${msg}`);
  }
  return body as T;
}

// ----- Phone normalization (Intigo wants 8 local digits) -----

export function normalizeTnPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00216")) digits = digits.slice(5);
  else if (digits.startsWith("216") && digits.length === 11) digits = digits.slice(3);
  return /^\d{8}$/.test(digits) ? digits : null;
}

// ----- Regions (cached per warm instance) -----

export type Region = { id: number; name: string; name_ar?: string };
let citiesCache: Region[] | null = null;
const districtsCache = new Map<number, Region[]>();

const norm = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z؀-ۿ0-9]+/g, " ").trim();

export async function getCities(): Promise<Region[]> {
  if (!citiesCache) {
    const r = await api<{ cities: Region[] }>("/regions/cities");
    citiesCache = r.cities ?? [];
  }
  return citiesCache;
}

export async function getDistricts(cityId: number): Promise<Region[]> {
  const hit = districtsCache.get(cityId);
  if (hit) return hit;
  const r = await api<{ districts: Region[] }>(`/regions/cities/${cityId}/districts`);
  const list = r.districts ?? [];
  districtsCache.set(cityId, list);
  return list;
}

/** Match a free-text name against a region list by fr/ar, substring either way. */
function matchRegion(list: Region[], name: string): Region | null {
  const n = norm(name);
  if (!n) return null;
  let hit = list.find((r) => norm(r.name) === n || (r.name_ar && norm(r.name_ar) === n));
  if (!hit) hit = list.find((r) => {
    const fr = norm(r.name), ar = r.name_ar ? norm(r.name_ar) : "";
    return (fr && (n.includes(fr) || fr.includes(n))) || (ar && (n.includes(ar) || ar.includes(n)));
  });
  return hit ?? null;
}

export type Destination = { cityId: number; districtId: number; cityName: string; districtName: string };

/**
 * Resolve a checkout governorate + delegation to real Intigo city/district ids.
 * Falls back to the city's lowest district id (Intigo's own deterministic rule)
 * when the delegation can't be matched. Returns null if the governorate is unknown.
 */
export async function resolveDestination(governorate: string, delegation: string): Promise<Destination | null> {
  const cities = await getCities();
  const city = matchRegion(cities, governorate) ?? matchRegion(cities, delegation);
  if (!city) return null;
  const districts = await getDistricts(city.id);
  if (districts.length === 0) return null;
  const district =
    matchRegion(districts, delegation) ??
    matchRegion(districts, governorate) ??
    districts.slice().sort((a, b) => a.id - b.id)[0];
  return { cityId: city.id, districtId: district.id, cityName: city.name, districtName: district.name };
}

// ----- Create parcel -----

export type IntigoParcelInput = {
  name: string;
  phone: string;        // already normalized to 8 digits
  address: string;
  cityId: number;
  districtId: number;
  codTotal: number;
  description: string;
  cid?: string;         // client correlation id (our order id)
};

export type IntigoCreateResult = { success: boolean; nid: string };

export async function createParcel(i: IntigoParcelInput): Promise<IntigoCreateResult> {
  return api<IntigoCreateResult>("/parcels/", {
    method: "POST",
    body: JSON.stringify({
      recipient_name: i.name.slice(0, 255),
      phone1: i.phone,
      destination_address: i.address.slice(0, 500),
      destination_city_id: i.cityId,
      destination_district_id: i.districtId,
      price: Number(i.codTotal.toFixed(3)),
      package_size: 1, // sticker packs/albums are small
      description: i.description.slice(0, 500) || "Colis",
      pickup_index: PICKUP_INDEX,
      ...(i.cid ? { cid: i.cid.slice(0, 50) } : {}),
    }),
  });
}

// ----- Tracking / cancel -----

export type IntigoStatus = {
  nid: string;
  status: number;
  status_label?: string;
  cid?: string | null;
};

export async function getParcelStatus(nid: string): Promise<IntigoStatus> {
  return api<IntigoStatus>(`/parcels/${encodeURIComponent(nid)}`);
}

export async function cancelParcel(nid: string, reason?: string): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/parcels/${encodeURIComponent(nid)}/cancel`, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });
}
