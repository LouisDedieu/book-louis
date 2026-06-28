"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import s from "./Cursor.module.css";

/**
 * Curseur custom : un disque en mix-blend-difference qui suit la souris avec
 * inertie et grandit en affichant un label au survol des éléments [data-cursor].
 * Désactivé sur tactile et en reduced-motion (cf. CSS).
 */
export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const [active, setActive] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    const el = ref.current!;
    gsap.set(el, { xPercent: -50, yPercent: -50 }); // centre le disque sur le pointeur
    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });

    const onMove = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      const target = (e.target as HTMLElement)?.closest<HTMLElement>("[data-cursor]");
      if (target) {
        setActive(true);
        setLabel(target.dataset.cursor || "");
      } else {
        setActive(false);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={ref} className={s.cursor} data-active={active} aria-hidden>
      <span className={s.label}>{label}</span>
    </div>
  );
}
