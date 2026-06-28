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
  /** Décalage entre enfants directs (reveal éditorial par lignes). */
  stagger?: number;
  start?: string;
  delay?: number;
};

/**
 * Révèle ses enfants directs par masque + montée au scroll. Chaque enfant doit
 * être un bloc (ligne/paragraphe). Dégradé en reduced-motion (apparition nette).
 */
export default function Reveal({
  children,
  as,
  className,
  stagger = 0.12,
  start = "top 85%",
  delay = 0,
}: Props) {
  const Tag = (as ?? "div") as ElementType;
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const targets = root.current?.children;
      if (!targets || targets.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { motion } = ctx.conditions as { motion: boolean };
          // Root révélé immédiatement (anti-FOUC) ; on anime les enfants.
          gsap.set(root.current, { opacity: 1 });
          gsap.set(targets, { opacity: 1 });
          if (!motion) return;

          gsap.from(targets, {
            yPercent: 110,
            opacity: 0,
            duration: 1,
            ease: "power3.out",
            stagger,
            delay,
            scrollTrigger: { trigger: root.current, start },
          });
        },
      );
    },
    { scope: root },
  );

  return (
    <Tag ref={root} className={className} data-reveal>
      {children}
    </Tag>
  );
}
