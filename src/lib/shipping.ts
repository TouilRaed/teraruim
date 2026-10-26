export const SHIPPING_FEE_TND: number = 0;

// Packs from the 3rd one up (by qty, smallest first) ship free.
export const FREE_SHIPPING_FROM_OFFER = 3;

export function offerHasFreeShipping(offers: { qty: number }[], qty: number): boolean {
  const sorted = offers.map((o) => o.qty).sort((a, b) => a - b);
  const idx = sorted.indexOf(qty);
  return idx >= FREE_SHIPPING_FROM_OFFER - 1;
}
