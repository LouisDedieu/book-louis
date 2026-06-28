"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { destinations } from "@/lib/book";
import { useView, type Rect } from "@/components/ViewProvider";
import { warmGlTextures } from "@/lib/glTextures";
import Carousel, { type CarouselApi, type CarouselItem } from "./Carousel";
import s from "./Landing.module.css";

export default function Landing() {
  const { enter } = useView();
  const api = useRef<CarouselApi | null>(null);
  const [center, setCenter] = useState(0);

  // Exactement 3 cartes : les 3 destinations.
  const items: CarouselItem[] = useMemo(
    () =>
      destinations.map((d) => ({
        slug: d.slug,
        name: d.name,
        src: d.cover.src,
        aspect: d.cover.width / d.cover.height,
      })),
    [],
  );

  // Précharge (décode) les couvertures pour un shatter instantané au clic.
  useEffect(() => {
    warmGlTextures(items.map((i) => i.src));
  }, [items]);

  const current = items[center] ?? items[0];

  const handleSelect = (slug: string, rect: Rect) => {
    const item = items.find((i) => i.slug === slug);
    if (item) enter(slug, item.src, rect);
  };

  return (
    <div className={s.landing}>
      <div className={s.loader} aria-hidden>
        <span className={s.loaderBrand}>Louis Dedieu</span>
      </div>

      <p className={s.topline}>
        <u>Louis Dedieu</u> — photographe de destination.
      </p>

      <h1 className={s.title}>AILLEURS</h1>

      <div className={s.stage}>
        <Carousel
          items={items}
          onReady={(a) => (api.current = a)}
          onCenter={setCenter}
          onSelect={handleSelect}
        />
      </div>

      <div className={s.controls}>
        <button
          className={s.arrow}
          aria-label="Précédent"
          onClick={() => api.current?.rotate(-1)}
        >
          ←
        </button>
        <div className={s.category}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.thumb} src={current.src} alt="" />
          <span className={s.catText}>
            <span className={s.catLabel}>Destination</span>
            <span className={s.catName}>{current.name}</span>
          </span>
        </div>
        <button
          className={s.arrow}
          aria-label="Suivant"
          onClick={() => api.current?.rotate(1)}
        >
          →
        </button>
      </div>

      <span className={`caption ${s.hint}`}>Glisser · cliquer pour entrer</span>
    </div>
  );
}
