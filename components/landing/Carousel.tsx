"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import type { Rect } from "@/components/ViewProvider";

export type CarouselItem = {
  slug: string;
  name: string;
  src: string;
  aspect: number; // w/h
};

const VERT = /* glsl */ `
  varying vec2 vUv;
  uniform float uHover;
  uniform vec2 uMouse;
  uniform float uTime;
  uniform float uCurve;
  void main() {
    vUv = uv;
    vec3 p = position;
    // Courbure cylindrique : les bords reculent -> panneau bombé (pas plat).
    float dx = uv.x - 0.5;
    p.z -= dx * dx * uCurve;
    // Ondulation liquide locale au survol.
    float d = distance(uv, uMouse);
    p.z += sin(d * 16.0 - uTime * 3.0) * 0.045 * uHover * smoothstep(0.55, 0.0, d);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uImgAspect;
  uniform float uPlaneAspect;
  uniform float uHover;
  uniform float uVelocity;
  uniform float uReflect;   // 1 = reflet
  uniform float uFocus;     // 1 = carte centrée
  uniform float uOpacity;   // fondu de wrap + intro
  uniform float uTime;
  void main() {
    vec2 uv = vUv - 0.5;
    float r = uPlaneAspect / uImgAspect;
    vec2 sc = (uPlaneAspect > uImgAspect) ? vec2(1.0, 1.0 / r) : vec2(r, 1.0);
    uv *= sc;

    // Reflet : ondulation aquatique douce.
    if (uReflect > 0.5) {
      uv.x += sin(uv.y * 9.0 + uTime * 1.1) * 0.006;
      uv.y += sin(uv.x * 13.0 + uTime * 0.7) * 0.004;
    }
    uv += 0.5;

    // Aberration chromatique douce, uniquement liée à la vitesse de rotation.
    float amt = clamp(uVelocity, -3.0, 3.0) * 0.0015;
    float cr = texture2D(uTexture, uv + vec2(amt, 0.0)).r;
    float cg = texture2D(uTexture, uv).g;
    float cb = texture2D(uTexture, uv - vec2(amt, 0.0)).b;
    vec3 col = vec3(cr, cg, cb);

    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    // Éclaircissement de base de tous les panneaux (gain multiplicatif, garde le
    // contraste) + un surplus au survol.
    col *= 1.08 + uHover * 0.10;
    // Légère désaturation (mélange vers la luminance).
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(luma), 0.12);

    float a = inside * uOpacity;
    if (uReflect > 0.5) {
      // Reflet court : visible uniquement juste sous l'image, puis disparaît vite.
      a *= smoothstep(0.55, 1.0, 1.0 - vUv.y) * 0.4;
      col *= 0.92;
    }
    if (a <= 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`;

export type CarouselApi = { rotate: (dir: number) => void };

type Props = {
  items: CarouselItem[];
  onCenter?: (index: number) => void;
  onSelect?: (slug: string, rect: Rect) => void;
  onReady?: (api: CarouselApi | null) => void;
};

// Ramène x dans (-N/2, N/2].
function wrap(x: number, n: number) {
  let m = ((x % n) + n) % n;
  if (m > n / 2) m -= n;
  return m;
}

export default function Carousel({ items, onCenter, onSelect, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0.1, 6.9);
    camera.lookAt(0, 0, 0);

    const N = items.length; // 3
    const SPREAD = 0.66; // angle entre cartes (rad)
    const R = 4.6;
    const PW = 3.0;
    const PH = 1.85;
    const PLANE_ASPECT = PW / PH;

    const ring = new THREE.Group();
    scene.add(ring);

    const loader = new THREE.TextureLoader();
    const meshes: THREE.Mesh[] = [];
    type U = Record<string, { value: unknown }>;
    const mainU: U[] = [];
    const reflU: U[] = [];

    const makeUniforms = (item: CarouselItem, reflect: number): U => ({
      uTexture: { value: null },
      uImgAspect: { value: item.aspect },
      uPlaneAspect: { value: PLANE_ASPECT },
      uHover: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uReflect: { value: reflect },
      uFocus: { value: 0 },
      uOpacity: { value: 0 },
      uCurve: { value: 1.7 },
    });

    items.forEach((item) => {
      const geo = new THREE.PlaneGeometry(PW, PH, 40, 28);
      const u = makeUniforms(item, 0);
      const ru = makeUniforms(item, 1);
      mainU.push(u);
      reflU.push(ru);

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: u,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const reflMat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: ru,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      loader.load(item.src, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        u.uTexture.value = tex;
        ru.uTexture.value = tex;
      });

      const mesh = new THREE.Mesh(geo, mat);
      const refl = new THREE.Mesh(geo, reflMat);
      refl.position.y = -PH - 0.02; // sous l'image
      refl.scale.y = -1; // miroir
      mesh.add(refl);
      ring.add(mesh);
      meshes.push(mesh);
    });

    // --- Coverflow : position continue ---
    let pos = 0;
    let target = 0;
    let lastPos = 0;
    let lastCenter = -1;
    const introObj = { v: 0 };

    const layout = () => {
      meshes.forEach((mesh, i) => {
        const rr = wrap(i - pos, N);
        const a = rr * SPREAD;
        mesh.position.set(Math.sin(a) * R, 0, Math.cos(a) * R - R);
        mesh.rotation.y = a;
        // 1 au centre (|rr|=0), 0 sur les côtés (|rr|≥0.7).
        const focus = 1 - THREE.MathUtils.smoothstep(Math.abs(rr), 0.0, 0.7);
        const scl = THREE.MathUtils.lerp(0.86, 1.0, focus);
        mesh.scale.set(scl, scl, scl);
        // Plein quand |rr|≤1.04, s'efface vers le point de wrap (|rr|≥1.5).
        const op = (1 - THREE.MathUtils.smoothstep(Math.abs(rr), 1.04, 1.5)) * introObj.v;
        (mainU[i].uFocus as { value: number }).value = focus;
        (mainU[i].uOpacity as { value: number }).value = op;
        (reflU[i].uFocus as { value: number }).value = focus;
        (reflU[i].uOpacity as { value: number }).value = op;
      });
    };

    const centeredIndex = () => ((Math.round(pos) % N) + N) % N;

    // Rect écran (px viewport) de la carte : 4 coins du plan projetés.
    const screenRect = (mesh: THREE.Mesh): Rect => {
      mesh.updateWorldMatrix(true, false);
      const r = canvas.getBoundingClientRect();
      const corners: [number, number][] = [
        [-PW / 2, -PH / 2],
        [PW / 2, -PH / 2],
        [PW / 2, PH / 2],
        [-PW / 2, PH / 2],
      ];
      const pts = corners.map(([x, y]) => {
        const v = new THREE.Vector3(x, y, 0).applyMatrix4(mesh.matrixWorld).project(camera);
        return { sx: (v.x * 0.5 + 0.5) * r.width + r.left, sy: (-v.y * 0.5 + 0.5) * r.height + r.top };
      });
      const xs = pts.map((p) => p.sx);
      const ys = pts.map((p) => p.sy);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
    };

    // --- Interaction ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let moved = 0;
    let startX = 0;
    let startPos = 0;
    let hovered: number | null = null;
    const rect = () => canvas.getBoundingClientRect();
    const setPointer = (e: PointerEvent) => {
      const r = rect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      startX = e.clientX;
      startPos = target;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      setPointer(e);
      if (dragging) {
        const dx = e.clientX - startX;
        moved += Math.abs(e.movementX);
        target = startPos - dx * 0.0045;
      }
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(meshes, false);
      const hitIndex = hits.length ? meshes.indexOf(hits[0].object as THREE.Mesh) : null;
      if (hitIndex !== hovered) {
        if (hovered !== null) gsap.to(mainU[hovered].uHover as object, { value: 0, duration: 0.5 });
        hovered = hitIndex;
        if (hovered !== null) gsap.to(mainU[hovered].uHover as object, { value: 1, duration: 0.5 });
      }
      if (hits.length && hits[0].uv) {
        const idx = meshes.indexOf(hits[0].object as THREE.Mesh);
        (mainU[idx].uMouse as { value: THREE.Vector2 }).value.set(hits[0].uv.x, hits[0].uv.y);
      }
      canvas.style.cursor = hits.length ? "pointer" : "grab";
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      target = Math.round(target);
      if (moved < 6) {
        setPointer(e);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length) {
          const idx = meshes.indexOf(hits[0].object as THREE.Mesh);
          if (Math.abs(wrap(idx - pos, N)) < 0.25) {
            // Rect calculé AVANT de masquer la carte ; on la cache pour que seul
            // l'éclatement (overlay) soit visible (pas de double image).
            const rect = screenRect(meshes[idx]);
            meshes[idx].visible = false; // masque la carte + son reflet
            onSelect?.(items[idx].slug, rect);
          } else {
            target = pos + wrap(idx - pos, N);
          }
        }
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    onReady?.({ rotate: (dir: number) => (target += dir) });

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // --- Intro : montée + apparition des cartes ---
    gsap.to(introObj, { v: 1, duration: 1.4, ease: "power3.out", delay: 0.15 });
    gsap.fromTo(
      ring.position,
      { y: -2.4 },
      { y: -0.5, duration: 1.5, ease: "power3.out", delay: 0.15 },
    );

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      pos += (target - pos) * 0.085;
      const vel = (pos - lastPos) * 60;
      lastPos = pos;
      [...mainU, ...reflU].forEach((u) => {
        (u.uTime as { value: number }).value = t;
        (u.uVelocity as { value: number }).value = vel;
      });
      layout();
      const ci = centeredIndex();
      if (ci !== lastCenter) {
        lastCenter = ci;
        onCenter?.(ci);
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onReady?.(null);
      meshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
        m.children.forEach((c) => ((c as THREE.Mesh).material as THREE.Material)?.dispose?.());
      });
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
    />
  );
}
