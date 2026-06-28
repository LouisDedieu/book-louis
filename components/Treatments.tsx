"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Shot } from "@/lib/book";
import Figure from "./Figure";
import GLImage from "./GLImage";
import Parallax from "./Parallax";
import s from "./Treatments.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const REGISTRE_LABEL: Record<Shot["registre"], string> = {
  lumiere: "Lumière",
  portrait: "Portrait",
  rue: "Rue",
  detail: "Détail",
  paysage: "Paysage",
};

function aspect(shot: Shot) {
  return `${shot.src.width} / ${shot.src.height}`;
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}

type SingleProps = { shot: Shot; n: number; align: "left" | "right" };

/** Plan immersif (intensité 3) — ratio respecté, image entière, numéro fantôme. */
export function Stage({ shot, n }: SingleProps) {
  return (
    <section className={s.stage} data-mood="night">
      <Parallax
        as="span"
        className={`${s.ghost} ${s.ghostNum} ${s.stageGhostEl}`}
        xFrom={-6}
        xTo={6}
      >
        {pad(n)}
      </Parallax>
      <div className={s.stageMedia} data-cursor={REGISTRE_LABEL[shot.registre]}>
        <GLImage image={shot.src} alt={shot.alt} fit="contain" />
      </div>
      <div className={s.stageCaption}>
        <b>{pad(n)}</b>
        <span className="caption">{REGISTRE_LABEL[shot.registre]}</span>
      </div>
    </section>
  );
}

/** Image cadrée — entrée latérale, mot fantôme en contrepoint, ombre portée. */
export function Framed({ shot, n, align }: SingleProps) {
  const driftIn = align === "left" ? { xFrom: -6, xTo: 3 } : { xFrom: 6, xTo: -3 };
  return (
    <section className={s.framed} data-align={align} data-mood="cream">
      <Parallax
        as="span"
        className={`${s.ghost} ${s.ghostInk} ${s.ghostWord}`}
        xFrom={align === "left" ? 4 : -4}
        xTo={align === "left" ? -4 : 4}
      >
        {pad(n)}
      </Parallax>
      <Parallax className={s.frame} {...driftIn}>
        <div
          className={s.frameMedia}
          style={{ aspectRatio: aspect(shot) }}
          data-cursor={REGISTRE_LABEL[shot.registre]}
        >
          <Figure shot={shot} sizes="(max-width: 720px) 92vw, 58vw" parallax={6} />
        </div>
      </Parallax>
      <figcaption className={s.meta}>
        <span className={s.metaIndex}>{pad(n)}</span>
        <span className="eyebrow">{REGISTRE_LABEL[shot.registre]}</span>
      </figcaption>
    </section>
  );
}

/** Reveal accentué — image étroite, beaucoup d'air, masque + légère dérive. */
export function RevealFig({ shot, n }: SingleProps) {
  return (
    <section className={s.revealBlock} data-mood="cream">
      <Parallax className={s.frame} yFrom={6} yTo={-6}>
        <div
          className={s.frameMedia}
          style={{ aspectRatio: aspect(shot) }}
          data-cursor={REGISTRE_LABEL[shot.registre]}
        >
          <Figure shot={shot} sizes="(max-width: 720px) 92vw, 50vw" parallax={5} />
        </div>
      </Parallax>
    </section>
  );
}

/** Respiration — petite image, mouvement minimal, énormément de vide. */
export function Breath({ shot, n, align }: SingleProps) {
  return (
    <section className={s.breath} data-align={align} data-mood="cream">
      <Parallax className={s.frame} yFrom={4} yTo={-4}>
        <div
          className={s.frameMedia}
          style={{ aspectRatio: aspect(shot) }}
          data-cursor={REGISTRE_LABEL[shot.registre]}
        >
          <Figure shot={shot} sizes="(max-width: 720px) 92vw, 33vw" />
        </div>
      </Parallax>
      <figcaption className={s.meta}>
        <span className={s.metaIndex}>{pad(n)}</span>
        <span className="eyebrow">{REGISTRE_LABEL[shot.registre]}</span>
      </figcaption>
    </section>
  );
}

/** Diptyque — paire côte à côte en parallaxes opposées + profondeur. */
export function DiptychFig({ left, right }: { left: Shot; right: Shot }) {
  return (
    <section className={s.diptych} data-mood="cream">
      <div className={s.frame}>
        <div
          className={s.frameMedia}
          style={{ aspectRatio: aspect(left) }}
          data-cursor={REGISTRE_LABEL[left.registre]}
        >
          <Figure shot={left} sizes="(max-width: 720px) 92vw, 48vw" parallax={8} />
        </div>
      </div>
      <div className={s.frame}>
        <div
          className={s.frameMedia}
          style={{ aspectRatio: aspect(right) }}
          data-cursor={REGISTRE_LABEL[right.registre]}
        >
          <Figure
            shot={right}
            sizes="(max-width: 720px) 92vw, 48vw"
            parallax={8}
            invert
          />
        </div>
      </div>
    </section>
  );
}

/** Pinned — image figée (ratio respecté, contain), un mot la traverse. */
export function Pinned({ shot, caption }: { shot: Shot; caption: string }) {
  const root = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          text.current,
          { yPercent: 70, opacity: 0 },
          {
            yPercent: -70,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "+=130%",
              scrub: true,
              pin: true,
            },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <div className={s.pinned} ref={root} data-mood="night">
      <div className={s.pinnedSticky}>
        <div className={s.pinnedMedia} data-cursor={REGISTRE_LABEL[shot.registre]}>
          <GLImage image={shot.src} alt={shot.alt} fit="contain" />
        </div>
        <div className={s.pinnedText} ref={text}>
          <p>{caption}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Pellicule horizontale — l'axe horizontal, frontalement.
 * Implémentée en `position: sticky` (pas de pin GSAP) pour rester robuste même
 * sous un ancêtre transformé : la hauteur du conteneur donne la course de scroll,
 * et on translate la bande en x selon la progression.
 */
export function FilmStrip({ shots, title }: { shots: Shot[]; title: string }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rootEl = root.current!;
        const trackEl = track.current!;

        const setHeight = () => {
          const distance = Math.max(0, trackEl.scrollWidth - window.innerWidth);
          // Course verticale = travel horizontal (+ un écran pour entrer/sortir).
          rootEl.style.height = `${window.innerHeight + distance}px`;
          return distance;
        };
        let distance = setHeight();

        const st = gsap.to(trackEl, {
          x: () => -distance,
          ease: "none",
          scrollTrigger: {
            trigger: rootEl,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
            onRefreshInit: () => {
              distance = setHeight();
            },
          },
        });
        return () => st.scrollTrigger?.kill();
      });
    },
    { scope: root },
  );

  return (
    <div className={s.strip} ref={root} data-mood="night">
      <div className={s.stripSticky}>
        <div className={s.stripTrack} ref={track}>
          <div className={s.stripIntro}>
            <span className="eyebrow">Interlude</span>
            <h3>{title}</h3>
          </div>
          {shots.map((shot) => (
            <div
              key={shot.id}
              className={s.stripItem}
              style={{ aspectRatio: aspect(shot) }}
              data-cursor={REGISTRE_LABEL[shot.registre]}
            >
              <Figure
                shot={shot}
                sizes="70vh"
                parallax={0}
                noReveal
                quality={85}
              />
              <span className={`caption ${s.stripCaption}`}>
                {REGISTRE_LABEL[shot.registre]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
