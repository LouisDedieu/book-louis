import type { Destination, Shot } from "./book";

/**
 * Gabarits d'image. « La variation EST le geste » : aucun gabarit ne se répète
 * deux fois de suite (post-pass `enforceNoRepeat`).
 */
export type Treatment =
  | "stage" // plan immersif ratio-safe sur fond sombre (intensité 3)
  | "framed" // image dans une marge crème, entrée latérale
  | "reveal" // reveal par masque / clip-path
  | "breath" // petite image dans beaucoup de vide (intensité 1)
  | "pinned"; // image pinnée, un texte la traverse (parcimonie : 1 max)

export type Block =
  | { kind: "single"; shot: Shot; treatment: Treatment }
  | { kind: "diptych"; left: Shot; right: Shot }
  | { kind: "strip"; shots: Shot[] }; // pellicule horizontale pinnée

const MAX_PINNED = 1;

/** Traitement par défaut d'une image isolée, selon son intensité. */
function defaultTreatment(shot: Shot, toggle: boolean): Treatment {
  if (shot.breath) return "breath";
  if (shot.intensite === 3) return "stage";
  if (shot.intensite === 1) return "breath";
  return toggle ? "reveal" : "framed"; // intensité 2 : on alterne
}

/**
 * Construit la liste ordonnée de blocs d'un chapitre :
 * - extrait la pellicule horizontale (`strip`) à la position de sa 1re image ;
 * - fusionne chaque diptyque à la position de son `anchor` ;
 * - assigne un gabarit à chaque image isolée ;
 * - applique la règle « pas deux fois le même gabarit de suite ».
 */
export function buildBlocks(dest: Destination): Block[] {
  const byId = new Map(dest.shots.map((s) => [s.id, s]));
  const anchorToDip = new Map(dest.diptychs.map((d) => [d.anchor, d]));
  const consumed = new Set(
    dest.diptychs.map((d) => (d.anchor === d.left ? d.right : d.left)),
  );

  // Pellicule horizontale : ancrée à la 1re image, les autres sont consommées.
  const stripIds = dest.strip ?? [];
  const stripAnchor = stripIds[0];
  for (const id of stripIds) if (id !== stripAnchor) consumed.add(id);

  const blocks: Block[] = [];
  let toggle = false;

  for (const shot of dest.shots) {
    if (consumed.has(shot.id)) continue;

    if (shot.id === stripAnchor) {
      blocks.push({ kind: "strip", shots: stripIds.map((id) => byId.get(id)!) });
      continue;
    }

    const dip = anchorToDip.get(shot.id);
    if (dip) {
      blocks.push({ kind: "diptych", left: byId.get(dip.left)!, right: byId.get(dip.right)! });
      continue;
    }

    if (shot.intensite === 2 && !shot.breath) toggle = !toggle;
    blocks.push({ kind: "single", shot, treatment: defaultTreatment(shot, toggle) });
  }

  return enforceNoRepeat(blocks);
}

/** Évite deux gabarits identiques consécutifs ; promeut un plan immersif répété en `pinned` (1 max). */
function enforceNoRepeat(blocks: Block[]): Block[] {
  let pinnedUsed = 0;

  for (let i = 1; i < blocks.length; i++) {
    const prev = blocks[i - 1];
    const cur = blocks[i];
    if (cur.kind !== "single" || prev.kind !== "single") continue;
    if (cur.treatment !== prev.treatment) continue;

    switch (cur.treatment) {
      case "stage":
        cur.treatment =
          pinnedUsed < MAX_PINNED && cur.shot.intensite === 3 ? "pinned" : "framed";
        break;
      case "framed":
        cur.treatment = "reveal";
        break;
      case "reveal":
        cur.treatment = "framed";
        break;
      case "breath":
        cur.treatment = "framed";
        break;
      case "pinned":
        cur.treatment = "stage";
        break;
    }
  }

  // Plafond de pin (au cas où plusieurs collisions en généreraient trop).
  pinnedUsed = blocks.filter(
    (b) => b.kind === "single" && b.treatment === "pinned",
  ).length;
  if (pinnedUsed > MAX_PINNED) {
    let seen = 0;
    for (const b of blocks) {
      if (b.kind === "single" && b.treatment === "pinned") {
        seen++;
        if (seen > MAX_PINNED) b.treatment = "stage";
      }
    }
  }

  return blocks;
}
