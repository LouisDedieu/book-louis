"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Shot } from "@/lib/book";
import styles from "./Figure.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = {
  shot: Shot;
  /** Attribut sizes pour next/image (responsive srcset). */
  sizes: string;
  className?: string;
  /** Amplitude de parallaxe verticale en % de la hauteur (0 = aucune). */
  parallax?: number;
  /** Inverse le sens de la parallaxe (diptyques en mouvement opposé). */
  invert?: boolean;
  /** Charger en priorité (hero / 1re image). */
  preload?: boolean;
  /** quality next/image. */
  quality?: number;
  /** Ajustement : `cover` (conteneur au ratio natif) ou `contain` (ratio respecté, letterbox). */
  fit?: "cover" | "contain";
  /** Désactive le reveal par masque (utile quand un parent gère l'entrée). */
  noReveal?: boolean;
};

/**
 * Image animée : reveal par masque (clip-path qui s'ouvre) à l'entrée dans le
 * viewport + parallaxe optionnelle (mouvement différentiel = profondeur).
 * Anime uniquement transform/clip-path. Dégradé propre en reduced-motion.
 */
export default function Figure({
  shot,
  sizes,
  className,
  parallax = 0,
  invert = false,
  preload = false,
  quality = 80,
  fit = "cover",
  noReveal = false,
}: Props) {
  const dir = invert ? -1 : 1;
  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = gsap.matchMedia();

      reduce.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { motion } = ctx.conditions as { motion: boolean };

          // Reveal : le masque se lève, l'image monte et se résout en échelle.
          gsap.set(root.current, { opacity: 1 });
          if (!motion) return; // reduced : image simplement visible

          if (!noReveal) {
            gsap.fromTo(
              root.current,
              { clipPath: "inset(100% 0% 0% 0%)" },
              {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 1.15,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: root.current,
                  start: "top 88%",
                },
              },
            );
            gsap.from(inner.current, {
              yPercent: 8,
              // L'échelle d'entrée recadrerait une image `contain` : réservée au cover.
              scale: fit === "cover" ? 1.06 : 1,
              duration: 1.3,
              ease: "power3.out",
              scrollTrigger: {
                trigger: root.current,
                start: "top 88%",
              },
            });
          }

          // Parallaxe continue : l'image se déplace plus lentement que le scroll.
          if (parallax > 0) {
            gsap.fromTo(
              inner.current,
              { yPercent: -parallax * dir },
              {
                yPercent: parallax * dir,
                ease: "none",
                scrollTrigger: {
                  trigger: root.current,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          }
        },
      );
    },
    { scope: root },
  );

  // En cover on sur-dimensionne légèrement pour absorber la parallaxe sans
  // montrer de bord. En contain on garde l'échelle 1 (ratio strict, letterbox).
  const innerStyle =
    fit === "cover" && parallax > 0
      ? { scale: `${1 + parallax / 100 + 0.04}` }
      : undefined;

  return (
    <div
      ref={root}
      className={`${styles.fig} ${fit === "contain" ? styles.figContain : ""} ${className ?? ""}`}
      data-reveal={noReveal ? undefined : ""}
    >
      <div ref={inner} className={styles.inner} style={innerStyle}>
        <Image
          src={shot.src}
          alt={shot.alt}
          fill
          sizes={sizes}
          quality={quality}
          preload={preload}
          placeholder="blur"
          className={fit === "contain" ? styles.imgContain : styles.img}
        />
      </div>
    </div>
  );
}
