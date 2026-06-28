"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  ChromaticAberrationEffect,
  NoiseEffect,
  ToneMappingEffect,
  ToneMappingMode,
  BlendFunction,
} from "postprocessing";
import { gsap } from "gsap";
import { useView, type Transition } from "./ViewProvider";
import { getGlTexture } from "@/lib/glTextures";
import { glLoop } from "@/lib/glLoop";

// L'environnement (objets, pas de GPU) est réutilisable d'un rendu à l'autre.
let roomScene: RoomEnvironment | null = null;
function getRoom() {
  if (!roomScene) roomScene = new RoomEnvironment();
  return roomScene;
}

type Vec2 = [number, number];

type Shard = {
  mesh: THREE.Mesh;
  home: THREE.Vector3; // position de repos (centroïde)
  vel: THREE.Vector3; // vitesse d'éjection (direction × magnitude)
  axis: THREE.Vector3; // axe de culbute
  spin: number; // vitesse de rotation
  delay: number;
  q0: THREE.Quaternion;
};

/** Construit les géométries des éclats : prismes triangulaires extrudés. */
function buildShardGeometries(cols: number, rows: number, w: number, h: number) {
  const out: { geo: THREE.BufferGeometry; centroid: Vec2; rand: number }[] = [];
  const cw = w / cols;
  const ch = h / rows;
  const toUv = (x: number, y: number): Vec2 => [(x + w / 2) / w, (y + h / 2) / h];

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x0 = -w / 2 + i * cw;
      const x1 = x0 + cw;
      const y0 = -h / 2 + j * ch;
      const y1 = y0 + ch;
      const M: Vec2 = [
        (x0 + x1) / 2 + (Math.random() - 0.5) * cw * 0.55,
        (y0 + y1) / 2 + (Math.random() - 0.5) * ch * 0.55,
      ];
      const tris: [Vec2, Vec2, Vec2][] = [
        [[x0, y0], [x1, y0], M],
        [[x1, y0], [x1, y1], M],
        [[x1, y1], [x0, y1], M],
        [[x0, y1], [x0, y0], M],
      ];
      for (const [a, b, c] of tris) {
        const cx = (a[0] + b[0] + c[0]) / 3;
        const cy = (a[1] + b[1] + c[1]) / 3;
        const r = Math.random();
        const T = 0.07 + r * 0.13;
        const pos: number[] = [];
        const uv: number[] = [];
        // Sommets relatifs au centroïde (le mesh tournera autour de son centre).
        const P = (p: Vec2, z: number) => {
          pos.push(p[0] - cx, p[1] - cy, z);
          const [u, v] = toUv(p[0], p[1]);
          uv.push(u, v);
        };
        const tri = [a, b, c];
        for (const p of tri) P(p, T / 2); // avant
        for (const p of [a, c, b]) P(p, -T / 2); // dos
        const edges: [Vec2, Vec2][] = [
          [a, b],
          [b, c],
          [c, a],
        ];
        for (const [p, q] of edges) {
          P(p, T / 2);
          P(q, T / 2);
          P(q, -T / 2);
          P(p, T / 2);
          P(q, -T / 2);
          P(p, -T / 2);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        geo.computeVertexNormals(); // non indexé → normales par face (facettes)
        out.push({ geo, centroid: [cx, cy], rand: r });
      }
    }
  }
  return out;
}

export default function ShatterTransition({ t }: { t: Transition }) {
  const { reveal } = useView();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const W = window.innerWidth;
    const H = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);
    // Tone mapping est appliqué dans le pipeline de post-process (après le bloom),
    // pas par le renderer : le bloom lit ainsi les vraies valeurs HDR.

    const scene = new THREE.Scene();

    // Environnement réel (IBL) : c'est lui qui rend les reflets crédibles.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(getRoom(), 0.04).texture;
    scene.environment = envTex;

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2, 3, 4);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const D = 10;
    const fov = 45;
    const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 100);
    camera.position.set(0, 0, D);
    camera.lookAt(0, 0, 0);

    const upp = (2 * D * Math.tan((fov * Math.PI) / 360)) / H;
    const worldW = t.rect.w * upp;
    const worldH = t.rect.h * upp;

    const group = new THREE.Group();
    const cx = t.rect.x + t.rect.w / 2;
    const cy = t.rect.y + t.rect.h / 2;
    group.position.set((cx - W / 2) * upp, -(cy - H / 2) * upp, 0);
    scene.add(group);

    const shards: Shard[] = [];
    let killed = false;
    let revealed = false;

    // Texture déjà décodée (préchargée à l'accueil) → déclenchement instantané.
    const tex = getGlTexture(t.src);

    // Vrai matériau verre : reflets (clearcoat + env), réfraction (transmission).
    const material = new THREE.MeshPhysicalMaterial({
      map: tex,
      metalness: 0.0,
      roughness: 0.16,
      transmission: 0.32,
      thickness: 0.5,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.0,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const defs = buildShardGeometries(4, 3, worldW, worldH);
    for (const { geo, centroid, rand } of defs) {
      const mesh = new THREE.Mesh(geo, material);
      const [hx, hy] = centroid;
      mesh.position.set(hx, hy, 0);
      const dir = new THREE.Vector3(
        (hx / (Math.hypot(hx, hy) || 1)) * 1.1 + (Math.random() - 0.5) * 0.95,
        (hy / (Math.hypot(hx, hy) || 1)) * 1.1 + (Math.random() - 0.5) * 0.95,
        Math.random() * 0.9 - 0.25,
      );
      const mag = 3.0 + rand * 5.5;
      shards.push({
        mesh,
        home: new THREE.Vector3(hx, hy, 0),
        vel: dir.multiplyScalar(mag),
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.2,
        ).normalize(),
        spin: 5 + rand * 11,
        // Rupture quasi simultanée (micro-jitter seulement) : tout casse d'un coup.
        delay: Math.random() * 0.04,
        q0: new THREE.Quaternion(),
      });
      group.add(mesh);
    }
    // Pipeline de post-process : bloom HDR (halos sur les reflets du verre),
    // aberration chromatique subtile, tone mapping ACES puis grain fin.
    const composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
    });
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new BloomEffect({
      mipmapBlur: true,
      intensity: 0.5,
      luminanceThreshold: 0.92,
      luminanceSmoothing: 0.25,
      radius: 0.75,
    });
    const chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.0009, 0.0009),
      radialModulation: true,
      modulationOffset: 0.3,
    });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY });
    grain.blendMode.opacity.value = 0.06;
    composer.addPass(new EffectPass(camera, bloom, chroma, tone, grain));

    // Pré-rendu : force la compilation des shaders maintenant.
    composer.render();

    // La glare suit (plus ou moins) le curseur : on déplace la lumière clé selon
    // la position du pointeur → le point chaud spéculaire se promène sur les
    // éclats. Le canvas étant en pointer-events:none, on écoute la fenêtre.
    const pointer = new THREE.Vector2(0, 0.35);
    let restDirty = false; // un rendu de repos est dû (le pointeur a bougé)
    const placeLight = () => key.position.set(pointer.x * 6, pointer.y * 6 + 2, 5);
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / W) * 2 - 1;
      pointer.y = -((e.clientY / H) * 2 - 1);
      restDirty = true;
      glLoop.wake();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const DUR = 1700; // ms
    const tmpQ = new THREE.Quaternion();
    let start = 0;
    let raf = 0;

    // Phase de repos (après le burst) : les éclats figent dans leur dispersion
    // et suivent le scroll de la page — ils « remontent » avec le reste du
    // contenu. Rendu à la demande via glLoop : on ne redessine que pendant le
    // scroll, puis la boucle se rendort. L'overlay reste monté jusqu'au retour
    // à l'accueil (back()).
    let restUnregister: (() => void) | null = null;
    let onRestScroll: (() => void) | null = null;

    const enterRest = () => {
      if (killed) return;
      const baseY = group.position.y;
      const scroll0 = window.scrollY;
      const restFrame = (): boolean => {
        if (killed) return false;
        // Scroll vers le bas → la page monte → les éclats montent (+y monde).
        const targetY = baseY + (window.scrollY - scroll0) * upp;
        const moved = Math.abs(targetY - group.position.y) > 1e-4;
        if (moved || restDirty) {
          group.position.y = targetY;
          placeLight(); // la glare suit le curseur même au repos
          composer.render();
          restDirty = false;
          return moved; // continue tant que le scroll bouge encore
        }
        return false;
      };
      restUnregister = glLoop.add(restFrame);
      onRestScroll = () => glLoop.wake();
      window.addEventListener("scroll", onRestScroll, { passive: true });
    };

    const frame = () => {
      if (killed) return;
      if (start === 0) {
        // 1re frame : encore un rendu (compile transmission/env), PUIS on cale le
        // chrono — l'animation ne perd plus le temps de compilation.
        composer.render();
        start = performance.now();
        raf = requestAnimationFrame(frame);
        return;
      }
      const tp = Math.min(1, (performance.now() - start) / DUR);
      const p = 1 - Math.pow(1 - tp, 2); // burst ease-out
      if (!revealed && p >= 0.32) {
        revealed = true;
        reveal();
      }
      for (const sh of shards) {
        const span = Math.max(0.001, 0.92 - sh.delay);
        const lp = Math.min(1, Math.max(0, (p - sh.delay) / span));
        sh.mesh.position.set(
          sh.home.x + sh.vel.x * lp,
          sh.home.y + sh.vel.y * lp - lp * lp * 0.5,
          sh.home.z + sh.vel.z * lp,
        );
        tmpQ.setFromAxisAngle(sh.axis, lp * sh.spin);
        sh.mesh.quaternion.copy(tmpQ);
      }
      placeLight(); // la glare suit le curseur pendant le burst aussi
      composer.render();
      if (tp < 1) raf = requestAnimationFrame(frame);
      else enterRest(); // plus de fondu : les éclats restent et suivront le scroll
    };
    raf = requestAnimationFrame(frame);

    return () => {
      killed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      restUnregister?.();
      if (onRestScroll) window.removeEventListener("scroll", onRestScroll);
      shards.forEach((s) => s.mesh.geometry.dispose());
      material.dispose(); // la texture reste en cache (non disposée)
      envTex.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
