"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { hero, HERO_LINE } from "@/lib/book";
import GLImage from "./GLImage";
import s from "./Hero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const pre = useRef<HTMLDivElement>(null);

  const words = HERO_LINE.split(" ");

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
          const wordSpans = root.current!.querySelectorAll<HTMLElement>(
            `.${s.word} > span`,
          );

          if (!motion) {
            gsap.set(pre.current, { autoAlpha: 0, display: "none" });
            gsap.set(wordSpans, { yPercent: 0 });
            return;
          }

          // Mots cachés sous leur masque (le preloader couvre le hero en attendant).
          gsap.set(wordSpans, { yPercent: 100 });

          // Intro : preloader compose l'accroche, puis révèle le hero.
          const tl = gsap.timeline();
          tl.from(`.${s.preBrand}`, { autoAlpha: 0, y: 12, duration: 0.7, ease: "power2.out" })
            .from(`.${s.preLine}`, { autoAlpha: 0, y: 18, duration: 0.8, ease: "power3.out" }, "-=0.35")
            .to({}, { duration: 0.5 })
            // Le rideau se lève.
            .to(pre.current, { yPercent: -100, duration: 1, ease: "power4.inOut" })
            .set(pre.current, { display: "none" })
            // L'image respire en se posant.
            .from(media.current, { scale: 1.12, duration: 1.6, ease: "power3.out" }, "<")
            // L'accroche apparaît mot par mot.
            .to(wordSpans, { yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.12 }, "<0.2")
            .from(`.${s.cue}`, { autoAlpha: 0, duration: 0.8 }, "<0.3");

          // Repli de sécurité : si l'image traîne, l'intro ne bloque pas.
          gsap.delayedCall(2.6, () => {
            gsap.set(pre.current, { display: "none" });
            gsap.set(wordSpans, { yPercent: 0 });
          });

          // Parallaxe au départ du hero.
          gsap.to(media.current, {
            yPercent: 18,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });

          // L'indicateur de scroll s'efface au premier mouvement.
          ScrollTrigger.create({
            trigger: root.current,
            start: "top top-=1",
            onEnter: () => gsap.to(`.${s.cue}`, { autoAlpha: 0, duration: 0.4 }),
            onLeaveBack: () => gsap.to(`.${s.cue}`, { autoAlpha: 1, duration: 0.4 }),
          });
        },
      );
    },
    { scope: root },
  );

  return (
    <section className={s.hero} ref={root}>
      <div className={s.media} ref={media}>
        <GLImage image={hero.src} alt={hero.alt} fit="cover" instant />
      </div>
      <div className={s.scrim} />

      <div className={s.content}>
        <h1 className={s.line}>
          {words.map((w, i) => (
            <span className={s.word} key={i}>
              <span>{w}</span>
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </h1>
      </div>

      <div className={s.cue}>
        <span>Défiler</span>
        <span className={s.cueDot} />
      </div>

      <div className={s.preloader} ref={pre}>
        <div className={s.preInner}>
          <span className={s.preBrand}>Louis Dedieu</span>
          <span className={s.preLine}>Photographe de destination</span>
        </div>
      </div>
    </section>
  );
}
