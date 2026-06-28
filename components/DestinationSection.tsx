"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Destination, Shot } from "@/lib/book";
import { buildBlocks } from "@/lib/treatments";

gsap.registerPlugin(ScrollTrigger);
import Reveal from "./Reveal";
import Marquee from "./Marquee";
import {
  Stage,
  Framed,
  RevealFig,
  Breath,
  DiptychFig,
  Pinned,
  FilmStrip,
} from "./Treatments";
import s from "./DestinationSection.module.css";

const REGISTRE_LABEL: Record<Shot["registre"], string> = {
  lumiere: "Lumière",
  portrait: "Portrait",
  rue: "Rue",
  detail: "Détail",
  paysage: "Paysage",
};

/** Numéro de planche depuis l'id (« maroc-07 » → 7). */
function shotNumber(id: string) {
  const part = id.split("-")[1];
  return Number.parseInt(part, 10) || 0;
}

export default function DestinationSection({ dest }: { dest: Destination }) {
  const root = useRef<HTMLElement>(null);
  const blocks = buildBlocks(dest);

  // Compteur d'alternance gauche/droite pour l'asymétrie.
  let alt = 0;
  const nextAlign = (): "left" | "right" => (alt++ % 2 === 0 ? "left" : "right");

  // Vue montée côté client (depuis le carousel) : recaler les ScrollTrigger
  // après le layout et après chargement des images (pins, pellicule).
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    const r1 = requestAnimationFrame(() => requestAnimationFrame(refresh));
    const t = setTimeout(refresh, 600);
    window.addEventListener("load", refresh);
    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t);
      window.removeEventListener("load", refresh);
    };
  }, []);

  return (
    <section className={s.chapter} ref={root} id={dest.slug} aria-label={dest.name}>
      <header className={s.opening} data-mood="cream">
        <Reveal className={s.openingHead} stagger={0.14}>
          <span className={`eyebrow ${s.chapterMark}`}>
            <span>{dest.role === "recit" ? "Le récit" : "Fragment"}</span>
            <span>{dest.shots.length} planches</span>
          </span>
          <h2 className={s.chapterName}>{dest.name}</h2>
        </Reveal>
        {dest.intro ? (
          <Reveal className={s.intro} as="p" start="top 80%">
            <span>{dest.intro}</span>
          </Reveal>
        ) : null}
      </header>

      {/* Bande typographique géante : transition graphique vers le récit. */}
      <Marquee text={dest.name} />


      {blocks.map((block) => {
        if (block.kind === "diptych") {
          return (
            <DiptychFig
              key={`dip-${block.left.id}`}
              left={block.left}
              right={block.right}
            />
          );
        }

        if (block.kind === "strip") {
          return (
            <FilmStrip
              key={`strip-${block.shots[0].id}`}
              shots={block.shots}
              title="La rue, en mouvement"
            />
          );
        }

        const { shot, treatment } = block;
        const n = shotNumber(shot.id);
        const key = shot.id;

        switch (treatment) {
          case "stage":
            return <Stage key={key} shot={shot} n={n} align="left" />;
          case "pinned":
            return (
              <Pinned key={key} shot={shot} caption={REGISTRE_LABEL[shot.registre]} />
            );
          case "reveal":
            return <RevealFig key={key} shot={shot} n={n} align="left" />;
          case "breath":
            return <Breath key={key} shot={shot} n={n} align={nextAlign()} />;
          case "framed":
          default:
            return <Framed key={key} shot={shot} n={n} align={nextAlign()} />;
        }
      })}
    </section>
  );
}
