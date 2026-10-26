"use client";

import { useEffect } from "react";
import { trackPixel } from "@/components/MetaPixel";

export default function PixelViewContent({ id, name, price }: { id: string; name: string; price: number }) {
  useEffect(() => {
    trackPixel("ViewContent", {
      content_ids: [id],
      content_name: name,
      content_type: "product",
      value: price,
      currency: "TND",
    });
  }, [id, name, price]);
  return null;
}
