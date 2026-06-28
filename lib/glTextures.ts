import * as THREE from "three";

/**
 * Cache de textures WebGL partagé (module-level). Évite de redécoder une image
 * 3000px à chaque usage : l'image n'est décodée qu'une fois, puis réutilisée
 * (chaque contexte WebGL ré-upload depuis l'image déjà décodée, ce qui est
 * rapide). Utilisé pour précharger les couvertures et déclencher le shatter
 * instantanément.
 */
const cache = new Map<string, THREE.Texture>();

export function getGlTexture(src: string): THREE.Texture {
  let tex = cache.get(src);
  if (!tex) {
    tex = new THREE.TextureLoader().load(src);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    cache.set(src, tex);
  }
  return tex;
}

/** Précharge (décode) des textures à l'avance. */
export function warmGlTextures(srcs: string[]) {
  for (const s of srcs) getGlTexture(s);
}
