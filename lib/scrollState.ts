/**
 * État de scroll partagé (singleton module) pour piloter les effets WebGL.
 * `velocity` est mis à jour par SmoothScrollProvider depuis Lenis ; les shaders
 * la lisent chaque frame. Évite de faire passer la vélocité par le state React.
 */
export const scrollState = {
  velocity: 0,
};
