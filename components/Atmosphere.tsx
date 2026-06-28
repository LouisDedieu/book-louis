"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import s from "./Atmosphere.module.css";

gsap.registerPlugin(ScrollTrigger);

export type Mood = "cream" | "night" | "blue-night";

// Couleurs de backdrop + intensité de vignette par ambiance.
const MOOD: Record<Mood, { stage: string; vignette: number }> = {
  cream: { stage: "#f4efe6", vignette: 0 },
  night: { stage: "#141009", vignette: 0.45 },
  "blue-night": { stage: "#0c1316", vignette: 0.45 },
};

/**
 * Couche atmosphérique globale : grain animé, vignette, et un backdrop dont la
 * couleur suit l'ambiance du bloc qui occupe le centre de l'écran. C'est ce
 * passage clair ↔ sombre qui donne le rythme cinématographique.
 *
 * Chaque bloc déclare son ambiance via `data-mood` ; on crée un ScrollTrigger
 * par bloc et le dernier franchi au centre gagne (descente comme remontée).
 */
export default function Atmosphere() {
  useEffect(() => {
    const root = document.documentElement;
    const setMood = (mood: Mood) => {
      const m = MOOD[mood] ?? MOOD.cream;
      root.style.setProperty("--stage", m.stage);
      root.style.setProperty("--vignette", String(m.vignette));
    };

    let triggers: ScrollTrigger[] = [];
    const scan = () => {
      triggers.forEach((t) => t.kill());
      const els = gsap.utils.toArray<HTMLElement>("[data-mood]");
      triggers = els.map((el) => {
        const mood = (el.dataset.mood as Mood) || "cream";
        return ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 45%",
          onEnter: () => setMood(mood),
          onEnterBack: () => setMood(mood),
        });
      });
      // Aucune ambiance détectée (accueil) : on retombe sur le crème.
      if (els.length === 0) setMood("cream");
    };

    scan();

    // Les vues montent/démontent côté client (carousel ↔ récit) : on re-scanne
    // quand des éléments [data-mood] apparaissent/disparaissent.
    let raf = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => requestAnimationFrame(scan));
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      triggers.forEach((t) => t.kill());
    };
  }, []);

  return (
    <>
      <div className={s.stage} aria-hidden />
      <div className={s.vignette} aria-hidden />
      <div className={s.grain} aria-hidden />
    </>
  );
}
