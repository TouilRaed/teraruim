// ADEX (adex.tn) courier API wrapper
// Docs: MC API ADEX/GuideAPI ADEX.pdf — base https://adex.tn/api_web/commande
// Auth: HTTP Basic (login:password of the ADEX account). Pull-only (no webhook).

import { TN_GOVERNORATES } from "@/lib/tn-divisions";

const BASE = process.env.ADEX_BASE_URL ?? "https://adex.tn/api_web/commande";
const USER = process.env.ADEX_USER ?? "";
const PWD = process.env.ADEX_PWD ?? "";

export const adexEnabled = () => Boolean(USER && PWD);

export class AdexError extends Error {
  constructor(public status: number, public body: string) {
    super(`ADEX ${status}: ${body.slice(0, 300)}`);
  }
}

async function call<T>(path: string, payload: unknown): Promise<T> {
  if (!adexEnabled()) throw new Error("ADEX_USER / ADEX_PWD not configured");
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      // PHP sample uses Basic auth; the PDF lists USER/PWD headers — send both.
      Authorization: `Basic ${Buffer.from(`${USER}:${PWD}`).toString("base64")}`,
      USER,
      PWD,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new AdexError(res.status, text);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ----- Create shipment (Add_colis) -----

export type AdexColisInput = {
  name: string;          // nom_cli
  address: string;       // adr_cli
  cityCode: number;      // ville_cli (ADEX governorate code 1-24)
  phone: string;         // tel_cli (also reused for tel_cli2/3)
  content: string;       // ContenuColis — free-text product summary
  codTotal: number;      // ttc_cmd — cash-on-delivery total
  externalId: string;    // your order id
  comment?: string;      // commentaire_cmd
};

export type AdexColisResult = { num_suivi_cmd: string; url_bl: string };

export async function createColis(input: AdexColisInput) {
  return call<AdexColisResult>("/add_colis.php", {
    nom_cli: input.name,
    adr_cli: input.address,
    ville_cli: String(input.cityCode),
    tel_cli: input.phone,
    tel_cli2: input.phone,
    tel_cli3: input.phone,
    nbr_colis: "1",
    ContenuColis: input.content,
    type_colis_tab: "0", // 0:léger 1:moyen 2:grand
    ttc_cmd: String(input.codTotal),
    fragile: "0",
    echange_cmd: "0",
    ancienne_commande_echange: "",
    produit_arecevoir: "",
    // Docs disagree on the field name — send both so the external code always matches.
    code_barres_ext: input.externalId,
    codearres_ext: input.externalId,
    commentaire_cmd: input.comment ?? "",
  });
}

// ----- Tracking (pull) -----

export type AdexEtat = {
  date_livraison_retour?: string;
  code_barres_cmd?: string;
  code_etat_cmd?: string;
  etat_cmd?: string;
  motif?: string;
  etat_paye?: string;
  etat_retour?: string;
};

export async function getEtat(barcodes: string[]) {
  return call<AdexEtat | AdexEtat[]>("/get_etat_cmd.php", { num_suivi_cmd: barcodes });
}

export type AdexLog = { date_log: string; description: string };

export async function getTracking(barcodes: string[]) {
  return call<AdexLog[]>("/tracking_cmd.php", { num_suivi_cmd: barcodes });
}

// ----- Governorate mapping -----
// ADEX ville_cli is a numeric code 1-24 in ALPHABETICAL order (1=Ariana … 23=Tunis …),
// which differs from this app's governorate ids in tn-divisions.ts (1=Tunis, 2=Ariana …).
// Map keyed by APP governorate id -> ADEX code.
const ADEX_CITY_CODE: Record<number, number> = {
  1: 23, // Tunis
  2: 1,  // Ariana
  3: 3,  // Ben Arous
  4: 13, // Manouba
  5: 16, // Nabeul
  6: 24, // Zaghouan
  7: 4,  // Bizerte
  8: 2,  // Béja
  9: 7,  // Jendouba
  10: 11, // Le Kef
  11: 19, // Siliana
  12: 20, // Sousse
  13: 15, // Monastir
  14: 12, // Mahdia
  15: 17, // Sfax
  16: 8,  // Kairouan
  17: 9,  // Kasserine
  18: 18, // Sidi Bouzid
  19: 5,  // Gabès
  20: 14, // Médenine
  21: 21, // Tataouine
  22: 6,  // Gafsa
  23: 22, // Tozeur
  24: 10, // Kébili
};

/**
 * Resolve a checkout governorate string (e.g. "تونس · Tunis") to its ADEX city code.
 * Returns null if it can't be matched.
 */
export function adexCityCode(governorateName: string): number | null {
  const needle = governorateName.trim().toLowerCase();
  let gov = TN_GOVERNORATES.find((g) => g.name.toLowerCase() === needle);
  if (!gov) {
    // Fall back to substring match (handles partial / French-token-only input).
    gov = TN_GOVERNORATES.find(
      (g) => g.name.toLowerCase().includes(needle) || needle.includes(g.name.toLowerCase()),
    );
  }
  if (!gov) return null;
  return ADEX_CITY_CODE[gov.id] ?? null;
}
