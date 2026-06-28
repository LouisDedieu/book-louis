"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type Rect = { x: number; y: number; w: number; h: number };
export type Transition = { slug: string; src: string; rect: Rect };

type View = "landing" | string; // "landing" ou un slug de destination

type Ctx = {
  view: View;
  /** Transition shatter en cours (null si aucune). */
  transition: Transition | null;
  /** Démarre la transition shatter depuis une carte. */
  enter: (slug: string, src: string, rect: Rect) => void;
  /** Bascule la vue vers le contenu (appelé pendant le shatter). */
  reveal: () => void;
  /** Termine la transition (retire l'overlay). */
  finish: () => void;
  /** Retour à l'accueil. */
  back: () => void;
};

const ViewContext = createContext<Ctx | null>(null);

export function useView() {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error("useView must be used within ViewProvider");
  return ctx;
}

export default function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("landing");
  const [transition, setTransition] = useState<Transition | null>(null);

  const enter = useCallback((slug: string, src: string, rect: Rect) => {
    setTransition({ slug, src, rect });
  }, []);
  const reveal = useCallback(() => {
    setTransition((t) => {
      if (t) setView(t.slug);
      return t;
    });
  }, []);
  const finish = useCallback(() => setTransition(null), []);
  const back = useCallback(() => {
    setView("landing");
    setTransition(null);
  }, []);

  return (
    <ViewContext.Provider value={{ view, transition, enter, reveal, finish, back }}>
      {children}
    </ViewContext.Provider>
  );
}
