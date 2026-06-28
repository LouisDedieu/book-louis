"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SEUIL_TEXT } from "@/lib/book";
import s from "./Seuil.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Seuil() {
  const root = useRef<HTMLElement>(null);
  const [lead, ...rest] = SEUIL_TEXT;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { motion } = ctx.conditions as { motion: boolean };
          const spans = root.current!.querySelectorAll<HTMLElement>("[data-line] > span");
          gsap.set(root.current, { opacity: 1 });
          if (!motion) {
            gsap.set(spans, { yPercent: 0 });
            return;
          }
          // Reveal éditorial : chaque ligne remonte derrière son masque.
          gsap.set(spans, { yPercent: 115 });
          gsap.to(spans, {
            yPercent: 0,
            duration: 1.1,
            ease: "power4.out",
            stagger: 0.09,
            scrollTrigger: { trigger: root.current, start: "top 75%" },
          });
        },
      );
    },
    { scope: root },
  );

  return (
    <section className={`shell ${s.seuil}`} ref={root} data-reveal>
      <div className={s.lead}>
        <span className={s.leadLine} data-line>
          <span>{lead}</span>
        </span>
      </div>
      <div className={s.body}>
        {rest.map((line, i) => (
          <span className={s.bodyLine} data-line key={i}>
            <span>{line}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
