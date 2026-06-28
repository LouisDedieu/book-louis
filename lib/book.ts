import type { StaticImageData } from "next/image";

// --- Imports statiques : dimensions + blurDataURL générés au build. ---
import maroc01 from "@/public/images/maroc-01.jpg";
import maroc02 from "@/public/images/maroc-02.jpg";
import maroc03 from "@/public/images/maroc-03.jpg";
import maroc04 from "@/public/images/maroc-04.jpg";
import maroc05 from "@/public/images/maroc-05.jpg";
import maroc06 from "@/public/images/maroc-06.jpg";
import maroc07 from "@/public/images/maroc-07.jpg";
import maroc08 from "@/public/images/maroc-08.jpg";
import maroc09 from "@/public/images/maroc-09.jpg";
import maroc10 from "@/public/images/maroc-10.jpg";
import maroc11 from "@/public/images/maroc-11.jpg";
import maroc12 from "@/public/images/maroc-12.jpg";
import maroc13 from "@/public/images/maroc-13.jpg";
import maroc14 from "@/public/images/maroc-14.jpg";
import maroc15 from "@/public/images/maroc-15.jpg";
import maroc16 from "@/public/images/maroc-16.jpg";

import espagne01 from "@/public/images/espagne-01.jpg";
import espagne02 from "@/public/images/espagne-02.jpg";
import espagne03 from "@/public/images/espagne-03.jpg";
import espagne04 from "@/public/images/espagne-04.jpg";
import espagne05 from "@/public/images/espagne-05.jpg";

import antibes01 from "@/public/images/antibes-01.jpg";
import antibes02 from "@/public/images/antibes-02.jpg";
import antibes03 from "@/public/images/antibes-03.jpg";
import antibes04 from "@/public/images/antibes-04.jpg";
import antibes05 from "@/public/images/antibes-05.jpg";

export type Registre =
  | "lumiere"
  | "portrait"
  | "rue"
  | "detail"
  | "paysage";
export type Echelle = "serre" | "moyen" | "large";
export type Orientation = "paysage" | "portrait";

export type Shot = {
  id: string;
  src: StaticImageData;
  alt: string;
  registre: Registre;
  echelle: Echelle;
  orientation: Orientation;
  intensite: 1 | 2 | 3;
  /** Image noir & blanc — pilote les transitions de tonalité de fond. */
  bw?: boolean;
  /** Respiration : beaucoup de vide, mouvement minimal. */
  breath?: boolean;
};

/**
 * Diptyque : paire présentée côte à côte.
 * - `left`/`right` = ordre d'affichage (ordre du brief v2).
 * - `anchor` = id à la position duquel la paire se rend dans la séquence ;
 *   l'autre membre est « consommé » (retiré de sa propre position). Ce découplage
 *   permet de garder la clôture sur la bonne image et d'espacer les diptyques
 *   malgré des membres dispersés dans le montage linéaire.
 */
export type Diptych = {
  left: string;
  right: string;
  anchor: string;
};

export type Destination = {
  name: string;
  slug: string;
  role: "recit" | "fragment";
  /** Image de couverture (carte du carousel d'accueil). */
  cover: StaticImageData;
  /** Tonalité dominante du chapitre, pour les transitions de fond. */
  tone: "warm" | "blue";
  /** Phrase de transition à l'entrée du chapitre (peut être vide). */
  intro?: string;
  shots: Shot[];
  diptychs: Diptych[];
  /**
   * Pellicule horizontale : ids rendus en bande à défilement latéral pinné, à
   * la position de la 1re image (les suivantes sont retirées du flux vertical).
   * Sert l'axe horizontal et casse le défilement purement vertical.
   */
  strip?: string[];
};

// =========================================================================
// Textes figés (brief v2). Source de vérité unique.
// =========================================================================

export const HERO_LINE = "Ailleurs, tout se réveille.";
export const MAROC_INTRO = "Loin de chez moi, je vois mieux.";

export const SEUIL_TEXT = [
  "Louis Dedieu, photographe de destination.",
  "Je couvre un lieu sous tous ses angles : le grand paysage, les visages, la rue, le détail qu'on ne voit qu'en s'arrêtant.",
  "Ce qui m'intéresse, c'est de faire exister un endroit en images, pas juste de l'illustrer.",
  "Ouvert aux missions, où qu'elles m'emmènent.",
];

export const APPROCHE_TEXT = [
  "Quand je pars, tout ce qui m'encombre au quotidien tombe. Les tracas, les automatismes, le décor connu, les visages familiers. Ce qui reste, c'est un regard neuf, disponible, qui voit pour de vrai.",
  "C'est dans cet état que je photographie. À l'instinct, sans calcul, en attrapant le moment où un lieu me saisit. Je ne cherche pas à reproduire ce que je vois, mais à lui donner en image la force qu'il avait sous mes yeux.",
  "J'aime le changement. Il réveille ce que la routine endort. C'est sans doute pour ça que je pars, et sûrement pour ça que je photographie.",
];

export const INSTAGRAM_URL = "https://instagram.com/";

// =========================================================================
// Séquences (dérivées de book-sequence.json). Ordre = ordre de montage.
// Mapping fichiers d'origine → renommés conservé pour mémoire.
// =========================================================================

export const maroc: Destination = {
  name: "Maroc",
  slug: "maroc",
  role: "recit",
  cover: maroc01,
  tone: "warm",
  intro: MAROC_INTRO,
  shots: [
    // hero = maroc-01 ; le récit démarre à la 2 pour ne pas répéter le hero.
    { id: "maroc-02", src: maroc02, alt: "Homme en turban serrant la tête d'un cheval sur la plage, en noir et blanc.", registre: "portrait", echelle: "moyen", orientation: "paysage", intensite: 2, bw: true },
    { id: "maroc-03", src: maroc03, alt: "Cour-marché bondée, colonnes et foule de dos sous un ciel bleu vif.", registre: "rue", echelle: "large", orientation: "paysage", intensite: 2 },
    { id: "maroc-04", src: maroc04, alt: "Arche et coupole d'une porte monumentale en bois, silhouette en contrebas.", registre: "detail", echelle: "moyen", orientation: "portrait", intensite: 2 },
    { id: "maroc-05", src: maroc05, alt: "Vieil homme riant, la mer floue en arrière-plan, en noir et blanc.", registre: "portrait", echelle: "serre", orientation: "portrait", intensite: 3, bw: true },
    { id: "maroc-06", src: maroc06, alt: "Drapeau marocain au vent, cheval blanc et surfeur sur la plage.", registre: "rue", echelle: "moyen", orientation: "portrait", intensite: 3 },
    { id: "maroc-07", src: maroc07, alt: "Homme âgé assis dans une bibliothèque aux rayonnages pleins, en noir et blanc.", registre: "portrait", echelle: "large", orientation: "paysage", intensite: 2, bw: true },
    { id: "maroc-08", src: maroc08, alt: "Enfants dans un champ, une fillette en robe bleue, la ville au loin.", registre: "rue", echelle: "moyen", orientation: "paysage", intensite: 2 },
    { id: "maroc-09", src: maroc09, alt: "Trois garçons et leurs vélos en silhouette sur la plage, en noir et blanc.", registre: "paysage", echelle: "large", orientation: "paysage", intensite: 1, bw: true, breath: true },
    { id: "maroc-10", src: maroc10, alt: "Groupe de gamins euphoriques autour d'un homme en maillot rouge du Maroc.", registre: "portrait", echelle: "moyen", orientation: "paysage", intensite: 3 },
    { id: "maroc-11", src: maroc11, alt: "Ruelle en clair-obscur, femmes voilées marchant, en noir et blanc contrasté.", registre: "rue", echelle: "large", orientation: "paysage", intensite: 3, bw: true },
    { id: "maroc-12", src: maroc12, alt: "Arche sombre la nuit, un chat blanc assis dans la lumière de la médina.", registre: "lumiere", echelle: "moyen", orientation: "paysage", intensite: 2, breath: true },
    { id: "maroc-13", src: maroc13, alt: "Skateur en plein saut au grand-angle, un spectateur en casquette au premier plan, en noir et blanc.", registre: "rue", echelle: "serre", orientation: "paysage", intensite: 3, bw: true },
    { id: "maroc-14", src: maroc14, alt: "Skateur de dos en jean baggy tenant sa planche au coucher du soleil.", registre: "portrait", echelle: "moyen", orientation: "portrait", intensite: 2 },
    { id: "maroc-15", src: maroc15, alt: "Ruelle étroite, une silhouette marchant dans la lumière dorée, du linge suspendu.", registre: "rue", echelle: "moyen", orientation: "portrait", intensite: 2 },
    { id: "maroc-16", src: maroc16, alt: "Skatepark sous une arche, skateur en mouvement et public au coucher du soleil.", registre: "lumiere", echelle: "large", orientation: "portrait", intensite: 3 },
  ],
  diptychs: [
    // arches / ruelles — ancré tôt (pos. 4)
    { left: "maroc-04", right: "maroc-15", anchor: "maroc-04" },
    // deux portraits N&B d'hommes âgés — ancré au milieu (pos. 7)
    { left: "maroc-05", right: "maroc-07", anchor: "maroc-07" },
    // clôture skate / coucher de soleil (brief : 9615 + 9773) — ancré à la fin (pos. 16)
    { left: "maroc-16", right: "maroc-14", anchor: "maroc-16" },
  ],
  // Interlude horizontal « la vie dans la rue » : marché, enfants, euphorie.
  strip: ["maroc-03", "maroc-08", "maroc-10"],
};

export const espagne: Destination = {
  name: "Espagne",
  slug: "espagne",
  role: "fragment",
  cover: espagne01,
  tone: "warm",
  shots: [
    { id: "espagne-01", src: espagne01, alt: "Promenade en bord de mer, une femme au chapeau blanc, plage et parasols au loin.", registre: "lumiere", echelle: "large", orientation: "paysage", intensite: 2 },
    { id: "espagne-02", src: espagne02, alt: "Passants entre des grilles bleues dans une ruelle blanche ensoleillée.", registre: "rue", echelle: "moyen", orientation: "portrait", intensite: 2 },
    { id: "espagne-03", src: espagne03, alt: "Contre-plongée sur des balcons en fer forgé d'une façade ocre.", registre: "detail", echelle: "moyen", orientation: "paysage", intensite: 2 },
    { id: "espagne-04", src: espagne04, alt: "Porte en bois encadrée d'un mur carrelé à motifs, numéro 68.", registre: "detail", echelle: "moyen", orientation: "portrait", intensite: 2 },
    { id: "espagne-05", src: espagne05, alt: "Détail d'un auvent rayé bleu et d'un claustra, ombre nette.", registre: "lumiere", echelle: "serre", orientation: "portrait", intensite: 1, breath: true },
  ],
  diptychs: [{ left: "espagne-03", right: "espagne-04", anchor: "espagne-03" }],
};

export const antibes: Destination = {
  name: "Antibes",
  slug: "antibes",
  role: "fragment",
  cover: antibes01,
  tone: "blue",
  shots: [
    { id: "antibes-01", src: antibes01, alt: "Côte rocheuse, tour-phare et voilier sur une mer bleue, fleurs jaunes au premier plan.", registre: "paysage", echelle: "large", orientation: "paysage", intensite: 3 },
    { id: "antibes-02", src: antibes02, alt: "Église et tour en pierre se détachant sur un ciel bleu net.", registre: "detail", echelle: "moyen", orientation: "paysage", intensite: 2, breath: true },
    { id: "antibes-03", src: antibes03, alt: "Homme âgé de dos, assis face à la mer, encadré par des buissons.", registre: "portrait", echelle: "moyen", orientation: "paysage", intensite: 2 },
    { id: "antibes-04", src: antibes04, alt: "Personne assise sur une chaise face à la mer brumeuse, montagnes estompées.", registre: "lumiere", echelle: "moyen", orientation: "portrait", intensite: 3 },
    { id: "antibes-05", src: antibes05, alt: "Vélo et homme penché sur le garde-corps du port sous un ciel couvert.", registre: "rue", echelle: "large", orientation: "paysage", intensite: 2 },
  ],
  diptychs: [{ left: "antibes-03", right: "antibes-04", anchor: "antibes-03" }],
};

// Ordre réordonnançable (structure modulaire).
export const destinations: Destination[] = [maroc, espagne, antibes];

// Hero — image d'ouverture, gérée à part (ne se répète pas dans le récit).
export const hero = {
  src: maroc01,
  alt: "Coucher de soleil sur une plage marocaine, silhouettes jouant au football, un ballon au premier plan.",
};
