"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scrollState } from "@/lib/scrollState";
import { glLoop } from "@/lib/glLoop";

gsap.registerPlugin(ScrollTrigger);

/**
 * Intègre Lenis (smooth scroll inertiel) avec le ticker GSAP : une seule boucle
 * RAF, ScrollTrigger synchronisé. Respecte prefers-reduced-motion (pas de
 * smooth scroll, on laisse le défilement natif).
 */
export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 1,
      smoothWheel: true,
    });

    // Skew dynamique piloté par la vitesse de scroll : la matière réagit au
    // mouvement (signature « fluide » des sites primés). Plafonné ; le lissage
    // visuel vient d'une transition CSS sur les conteneurs d'image.
    const root = document.documentElement;
    let idle: ReturnType<typeof setTimeout>;

    // ScrollTrigger doit se mettre à jour à chaque frame de Lenis.
    lenis.on("scroll", (e: { velocity: number }) => {
      ScrollTrigger.update();
      scrollState.velocity = e.velocity; // pour la couche WebGL
      glLoop.wake(); // réveille la boucle de rendu à la demande
      const skew = gsap.utils.clamp(-4, 4, e.velocity * 0.16);
      root.style.setProperty("--sk", `${skew}deg`);
      clearTimeout(idle);
      idle = setTimeout(() => {
        root.style.setProperty("--sk", "0deg");
        scrollState.velocity = 0;
      }, 120);
    });

    // Une seule boucle : on branche Lenis sur le ticker GSAP.
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Recalage après chargement des images (hauteurs qui changent).
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return <>{children}</>;
}
