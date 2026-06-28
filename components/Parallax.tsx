"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Déplacement horizontal en % de la largeur, du début à la fin du parcours. */
  xFrom?: number;
  xTo?: number;
  /** Déplacement vertical en % de la hauteur. */
  yFrom?: number;
  yTo?: number;
  /** Plage du scrub : déclencheur = l'élément lui-même par défaut. */
};

/**
 * Translate ses enfants en x/y au scroll (scrub). Brique de profondeur et
 * d'axe horizontal : en donnant des amplitudes différentes aux plans, on crée
 * du mouvement différentiel. Inerte en reduced-motion.
 */
export default function Parallax({
  children,
  as,
  className,
  xFrom = 0,
  xTo = 0,
  yFrom = 0,
  yTo = 0,
}: Props) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ref.current,
          { xPercent: xFrom, yPercent: yFrom },
          {
            xPercent: xTo,
            yPercent: yTo,
            ease: "none",
            scrollTrigger: {
              trigger: ref.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </Tag>
  );
}
