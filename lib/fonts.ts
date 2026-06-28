import { Fraunces, Inter } from "next/font/google";
// Slot prêt pour les fontes licenciées (voir note en bas de fichier).
// import localFont from "next/font/local";

/**
 * DA arrêtée : serif display fort (registre « Canela ») + grotesque lisible
 * (registre « Söhne »).
 *
 * Canela et Söhne sont des fontes payantes (Commercial Type / Klim) : on ship
 * des équivalents libres auto-hébergés par défaut, et on garde un slot
 * `localFont` prêt pour basculer vers les vraies fontes quand les .woff2 sont
 * déposés dans `public/fonts/`. Le reste du code ne référence que les variables
 * CSS `--font-display` / `--font-body`, donc le swap se fait ici uniquement.
 */

// Serif display — substitut « Canela » : fort contraste, terminaisons souples.
export const display = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  display: "swap",
  variable: "--font-display",
});

// Grotesque lisible — substitut « Söhne » pour corps, nav, légendes, formulaire.
export const body = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

/*
 * --- Pour basculer vers les fontes licenciées ---
 * 1. Déposer Canela-*.woff2 et Soehne-*.woff2 dans public/fonts/.
 * 2. Remplacer les deux exports ci-dessus par :
 *
 * export const display = localFont({
 *   src: [
 *     { path: "../public/fonts/Canela-Light.woff2", weight: "300", style: "normal" },
 *     { path: "../public/fonts/Canela-Regular.woff2", weight: "400", style: "normal" },
 *   ],
 *   display: "swap",
 *   variable: "--font-display",
 * });
 *
 * export const body = localFont({
 *   src: [
 *     { path: "../public/fonts/Soehne-Buch.woff2", weight: "400", style: "normal" },
 *     { path: "../public/fonts/Soehne-Kraftig.woff2", weight: "500", style: "normal" },
 *   ],
 *   display: "swap",
 *   variable: "--font-body",
 * });
 */
