import { scrollState } from "./scrollState";

/**
 * Boucle de rendu WebGL unique, partagée par toutes les images immersives.
 *
 * - **Une seule rAF** pour toute la page (au lieu d'une boucle par image) :
 *   moins d'overhead, rendus parfaitement synchronisés.
 * - **Lissage en delta-time** de la vélocité de scroll → ressenti identique
 *   quel que soit le taux de rafraîchissement (60 / 120 / 144 Hz).
 * - **Rendu à la demande** : la boucle s'endort dès que plus rien n'est animé,
 *   et se réveille via `wake()` (scroll, hover, reveal, resize, chargement de
 *   texture…). Économise le GPU et la batterie → ressenti plus « velouté ».
 */
type FrameFn = (dt: number) => boolean; // renvoie true tant qu'il faut animer

const frames = new Set<FrameFn>();
let running = false;
let last = 0;

// Taux de lissage continu équivalent à l'ancien facteur 0,1 par frame @60 Hz
// (0,1 = 1 − e^(−rate/60) ⇒ rate ≈ 6,3). Indépendant du framerate.
const VEL_RATE = 6.3;
const EPS = 0.5; // seuil en deçà duquel on considère la vélocité « au repos »

function tick(now: number) {
  // dt borné : évite un saut après un onglet en arrière-plan / gros lag.
  const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
  last = now;

  const target = scrollState.velocity;
  glLoop.velocity += (target - glLoop.velocity) * (1 - Math.exp(-dt * VEL_RATE));

  let needMore = Math.abs(glLoop.velocity) > EPS || Math.abs(target) > EPS;
  for (const frame of frames) {
    if (frame(dt)) needMore = true;
  }

  if (needMore) {
    requestAnimationFrame(tick);
  } else {
    running = false;
    last = 0;
  }
}

export const glLoop = {
  /** Vélocité de scroll lissée (frame-rate independent), partagée par tous. */
  velocity: 0,

  /** Enregistre une fonction de rendu ; renvoie son désenregistrement. */
  add(frame: FrameFn): () => void {
    frames.add(frame);
    glLoop.wake();
    return () => {
      frames.delete(frame);
    };
  },

  /** Relance la boucle si elle dort (à appeler quand quelque chose bouge). */
  wake() {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(tick);
  },
};
