"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProductGallery({ title, images }: { title: string; images: string[] }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  return (
    <div>
      <div className="card relative aspect-square">
        <Image src={main} alt={title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 576px" priority />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 mt-2">
          {images.map((src, i) => (
            <button
              key={src + i}
              onClick={() => setActive(i)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 ${i === active ? "border-red-600" : "border-transparent"}`}
              aria-label={`Image ${i + 1}`}
            >
              <Image src={src} alt={`${title} ${i + 1}`} fill className="object-cover" sizes="120px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
