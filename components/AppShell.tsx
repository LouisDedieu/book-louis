"use client";

import { useView } from "./ViewProvider";
import Landing from "./landing/Landing";
import DestinationSection from "./DestinationSection";
import ShatterTransition from "./ShatterTransition";
import { destinations } from "@/lib/book";
import s from "./AppShell.module.css";

export default function AppShell() {
  const { view, transition, back } = useView();

  const dest = destinations.find((d) => d.slug === view);

  return (
    <>
      {view === "landing" || !dest ? (
        <Landing />
      ) : (
        <main className={s.content} key={dest.slug}>
          <button className={s.back} onClick={back} aria-label="Retour à l'accueil">
            ← Toutes les destinations
          </button>
          <DestinationSection dest={dest} />
        </main>
      )}

      {/* Hors des vues : survit au changement landing → contenu. */}
      {transition ? <ShatterTransition t={transition} /> : null}
    </>
  );
}
