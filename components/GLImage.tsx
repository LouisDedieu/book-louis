"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import type { StaticImageData } from "next/image";
import { glLoop } from "@/lib/glLoop";

const VERT = /* glsl */ `
  varying vec2 vUv;
  uniform float uVelocity;
  uniform float uProgress;
  void main() {
    vUv = uv;
    vec3 p = position;
    // Léger bombé du plan selon la vélocité : la matière se tend au scroll.
    float bend = clamp(uVelocity * 0.00035, -0.16, 0.16);
    p.y += sin((uv.x) * 3.14159265) * bend;
    // Reveal : très léger sur-cadrage qui se résout.
    float sc = mix(1.06, 1.0, uProgress);
    p.xy *= sc;
    gl_Position = vec4(p.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uImgAspect;
  uniform float uCanvasAspect;
  uniform float uFit;       // 1 = cover, 0 = contain
  uniform float uVelocity;
  uniform float uHover;
  uniform float uProgress;
  uniform vec2  uMouse;

  void main() {
    vec2 uv = vUv - 0.5;
    float ratio = uCanvasAspect / uImgAspect;
    vec2 contain = (uCanvasAspect > uImgAspect) ? vec2(ratio, 1.0) : vec2(1.0, 1.0 / ratio);
    vec2 cover   = (uCanvasAspect > uImgAspect) ? vec2(1.0, 1.0 / ratio) : vec2(ratio, 1.0);
    vec2 sc = mix(contain, cover, uFit);
    uv *= sc;

    // Zoom doux vers le pointeur au survol.
    uv *= mix(1.0, 0.94, uHover);
    uv += (uMouse - 0.5) * uHover * 0.05;
    uv += 0.5;

    // Décalage chromatique (RGB-shift) piloté uniquement par la vélocité de scroll.
    float amt = clamp(uVelocity, -2200.0, 2200.0) * 0.00009;
    vec2 dir = vec2(0.0, 1.0);
    float r = texture2D(uTexture, uv + dir * amt).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - dir * amt).b;
    vec3 col = vec3(r, g, b);

    // Hors-cadre (letterbox du contain) -> transparent.
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);

    // Reveal : balayage du bas vers le haut.
    float wipe = smoothstep(0.0, 0.14, uProgress - (1.0 - vUv.y));
    float a = inside * mix(wipe, 1.0, step(0.999, uProgress));
    if (a <= 0.001) discard;
    gl_FragColor = vec4(col, a);
  }
`;

/**
 * Planifie les initialisations WebGL en série, avec un petit espacement entre
 * chacune. Sans ça, toutes les images d'une vue créent leur contexte dans la
 * même frame (au reveal du shatter) → gros freeze. Ici on laisse une frame se
 * peindre entre deux contextes ; le <img> de repli reste visible en attendant.
 */
let glInitChain: Promise<void> = Promise.resolve();
function scheduleGlInit(fn: () => void) {
  glInitChain = glInitChain.then(
    () =>
      new Promise<void>((resolve) => {
        const run = () => {
          fn();
          // Laisse respirer le thread (≈ une frame) avant le contexte suivant.
          setTimeout(resolve, 24);
        };
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(run, { timeout: 400 });
        } else {
          setTimeout(run, 0);
        }
      }),
  );
}

type Props = {
  image: StaticImageData;
  alt: string;
  fit?: "cover" | "contain";
  className?: string;
  /** Révèle immédiatement (hero) plutôt qu'au scroll. */
  instant?: boolean;
  "data-cursor"?: string;
};

/**
 * Image rendue sur un plan WebGL (Three.js) : déformation + RGB-shift pilotés
 * par la vélocité de scroll, zoom au pointeur, reveal balayé. Canvas local
 * auto-contenu (un contexte par image immersive). Dégradé : si pas de WebGL ou
 * reduced-motion, on retombe sur un <img> simple.
 */
export default function GLImage({
  image,
  alt,
  fit = "cover",
  className,
  instant = false,
  ...rest
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const imgFallback = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = wrap.current!;
    const cv = canvas.current!;

    let disposed = false;
    let teardown: (() => void) | null = null;

    // L'init WebGL (création du contexte + compilation des shaders) est lourde.
    // On la planifie via scheduleGlInit pour l'étaler hors de la frame du reveal
    // → fini le freeze. Le <img> de repli (visible par défaut) couvre l'attente.
    const init = () => {
      if (disposed) return;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
      } catch {
        // Pas de WebGL : le <img> de repli reste visible.
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.Camera();
      const geo = new THREE.PlaneGeometry(2, 2, 40, 40);

      const uniforms = {
        uTexture: { value: null as THREE.Texture | null },
        uImgAspect: { value: image.width / image.height },
        uCanvasAspect: { value: 1 },
        uFit: { value: fit === "cover" ? 1 : 0 },
        uVelocity: { value: 0 },
        uHover: { value: 0 },
        uProgress: { value: instant ? 1 : 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      };

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms,
        transparent: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      // Visibilité (perf) + drapeau « un rendu est dû » (1re frame, texture,
      // resize, mouvement souris) : pilote le rendu à la demande de glLoop.
      let visible = true;
      let dirty = true;

      const loader = new THREE.TextureLoader();
      loader.load(image.src, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        uniforms.uTexture.value = tex;
        dirty = true;
        glLoop.wake();
      });

      const resize = () => {
        const w = el.clientWidth || 1;
        const h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        uniforms.uCanvasAspect.value = w / h;
        dirty = true;
        glLoop.wake();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      // Reveal au scroll (sauf hero instantané).
      if (!instant && !reduce) {
        const io = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              gsap.to(uniforms.uProgress, { value: 1, duration: 1.3, ease: "power3.out" });
              glLoop.wake();
              io.disconnect();
            }
          },
          { threshold: 0.18 },
        );
        io.observe(el);
      } else {
        uniforms.uProgress.value = 1;
      }

      // Pointeur : hover + position.
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        uniforms.uMouse.value.set(
          (e.clientX - r.left) / r.width,
          1 - (e.clientY - r.top) / r.height,
        );
        dirty = true;
        glLoop.wake();
      };
      const onEnter = () => {
        glLoop.wake();
        gsap.to(uniforms.uHover, { value: 1, duration: 0.5 });
      };
      const onLeave = () => {
        glLoop.wake();
        gsap.to(uniforms.uHover, { value: 0, duration: 0.5 });
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointerleave", onLeave);

      // Rendu piloté par la boucle partagée (glLoop) : on ne dessine que si
      // l'image est visible ET qu'il se passe quelque chose (rendu à la demande).
      const visIO = new IntersectionObserver(
        (e) => {
          visible = e[0].isIntersecting;
          if (visible) {
            dirty = true;
            glLoop.wake();
          }
        },
        { rootMargin: "200px" },
      );
      visIO.observe(el);

      const frame = (): boolean => {
        // Pas de rendu tant que la texture n'est pas prête : le <img> de repli
        // reste visible (évite un flash noir au montage).
        if (!visible || !uniforms.uTexture.value) return false;
        uniforms.uVelocity.value = reduce ? 0 : glLoop.velocity;
        const animating =
          Math.abs(glLoop.velocity) > 0.5 ||
          gsap.isTweening(uniforms.uHover) ||
          gsap.isTweening(uniforms.uProgress);
        if (animating || dirty) {
          renderer.render(scene, camera);
          dirty = false;
        }
        return animating;
      };
      const unregister = glLoop.add(frame);

      teardown = () => {
        unregister();
        ro.disconnect();
        visIO.disconnect();
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointerleave", onLeave);
        geo.dispose();
        mat.dispose();
        uniforms.uTexture.value?.dispose();
        renderer.dispose();
      };
    };

    scheduleGlInit(init);

    return () => {
      disposed = true;
      teardown?.();
    };
  }, [image, fit, instant]);

  return (
    <div
      ref={wrap}
      className={className}
      style={{ position: "relative", width: "100%", height: "100%" }}
      data-cursor={rest["data-cursor"]}
    >
      <canvas
        ref={canvas}
        style={{
          display: "block",
          position: "absolute",
          inset: 0,
          zIndex: 1,
          width: "100%",
          height: "100%",
        }}
      />
      {/* Base affichée immédiatement : couvre l'attente de l'init WebGL (différée)
          et sert de repli si WebGL est indisponible. Le canvas se peint par-dessus. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgFallback}
        src={image.src}
        alt={alt}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: fit,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
