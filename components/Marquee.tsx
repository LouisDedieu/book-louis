"use client";

import { Fragment, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import s from "./Marquee.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Bande typographique géante qui défile horizontalement au scroll. Type surdimensionné
 * + axe horizontal = signature graphique. Alterne plein / contour.
 */
export default function Marquee({
  text,
  dark = false,
  repeat = 4,
}: {
  text: string;
  dark?: boolean;
  repeat?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  const items = Array.from({ length: repeat });

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Défile vers la gauche à mesure qu'on traverse la bande.
        gsap.fromTo(
          track.current,
          { xPercent: 6 },
          {
            xPercent: -40,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <div className={`${s.marquee} ${dark ? s.dark : ""}`} ref={root} aria-hidden>
      <div className={s.track} ref={track}>
        {items.map((_, i) => (
          <Fragment key={i}>
            <span className={`${s.word} ${i % 2 ? s.outline : ""}`}>{text}</span>
            <span className={s.star}>✦</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
