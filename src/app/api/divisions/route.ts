import { NextResponse } from "next/server";
import { TN_GOVERNORATES, TN_DELEGATIONS } from "@/lib/tn-divisions";
import { getCities, getDistricts, intigoEnabled, type Region } from "@/lib/intigo";

// Region picker source. When Intigo is enabled the dropdowns are driven by
// Intigo's OWN city/district list — so a customer's selection maps to a real
// Intigo region and the parcel dispatch (resolveDestination) matches exactly,
// no fuzzy guessing. Falls back to the static TN table if Intigo is off/unreachable.
export const dynamic = "force-dynamic";

const CACHE = { "Cache-Control": "public, max-age=3600, s-maxage=86400" };

// Bilingual label (Arabic-first) but keeps the exact Intigo name so it still
// resolves cleanly at dispatch.
function label(r: Region): string {
  return r.name_ar && r.name_ar.trim() ? `${r.name_ar} · ${r.name}` : r.name;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const level = url.searchParams.get("level");
  const parentId = url.searchParams.get("parent_id");

  if (intigoEnabled()) {
    try {
      if (!level || level === "1") {
        const cities = await getCities();
        return NextResponse.json(
          // `value` = exact Intigo name (used for dispatch matching); `name` = bilingual display.
          cities.map((c) => ({ id: c.id, name: label(c), value: c.name, level: 1, parent_id: null })),
          { headers: CACHE },
        );
      }
      if (level === "2" && parentId) {
        const pid = Number(parentId);
        if (Number.isFinite(pid)) {
          const districts = await getDistricts(pid);
          return NextResponse.json(
            districts.map((d) => ({ id: d.id, name: label(d), value: d.name, level: 2, parent_id: pid })),
            { headers: CACHE },
          );
        }
      }
      return NextResponse.json([]);
    } catch (e) {
      // Intigo unreachable — degrade to the static table below rather than 500.
      console.error("divisions: Intigo regions failed, using static fallback:", (e as Error).message);
    }
  }

  // Static fallback (Intigo disabled or errored).
  if (!level || level === "1") {
    return NextResponse.json(TN_GOVERNORATES.map((d) => ({ ...d, value: d.name, level: 1, parent_id: null })));
  }
  if (level === "2" && parentId) {
    const pid = Number(parentId);
    const list = TN_DELEGATIONS[pid] ?? [];
    return NextResponse.json(list.map((d) => ({ ...d, value: d.name, level: 2, parent_id: pid })));
  }
  return NextResponse.json([]);
}
