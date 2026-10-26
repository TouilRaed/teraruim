"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

function Inner() {
  const pathname = usePathname();
  const search = useSearchParams();
  const firstFire = useRef(true);
  useEffect(() => {
    // Skip the very first call — the inline pixel snippet already fired PageView
    if (firstFire.current) { firstFire.current = false; return; }
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    w.fbq?.("track", "PageView");
  }, [pathname, search]);
  return null;
}

export default function PixelRouteTracker() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
