/**
 * HOW LONG IS NOW? — starter world.
 *
 * This is not the park. It is the skeleton the park will hang on:
 * a fixed Three.js world, a Lenis-smoothed scroll that acts as a time
 * input, and a scene manifest that owns all choreography.
 *
 * The placeholder world is a field of particles whose motion rate is the
 * active scene's timeRate — so scrolling already *feels* like moving
 * through time scales, before a single real asset exists.
 */

/// <reference types="vite/client" />

import * as THREE from 'three';
import gsap from 'gsap';
import Lenis from 'lenis';
import { scenes, sceneAt, totalLengthVh } from './scenes/manifest';
import { createYearScene } from './scenes/scene-04-year';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- scroll

const runway = document.getElementById('runway')!;
runway.style.height = `${totalLengthVh}vh`;

const lenis = new Lenis({
  lerp: reducedMotion ? 1 : 0.08,
  smoothWheel: !reducedMotion,
});

let progress = 0; // 0–1 through the whole piece
lenis.on('scroll', () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress = max > 0 ? window.scrollY / max : 0;
});

// ---------------------------------------------------------------- world

const canvas = document.getElementById('world') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060708, 0.045);

// Far enough to hold scene 04's sky plate, which sits 170 units back and
// is wider than it is distant. Fog, not the far plane, dissolves distance.
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
camera.position.set(0, 1.6, 14);

// A field of drifting points: stand-ins for leaves, people, days, years.
const COUNT = 4000;
const positions = new Float32Array(COUNT * 3);
const speeds = new Float32Array(COUNT);
for (let i = 0; i < COUNT; i++) {
  positions[i * 3 + 0] = THREE.MathUtils.randFloatSpread(60);
  positions[i * 3 + 1] = THREE.MathUtils.randFloat(0, 24);
  positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(60);
  speeds[i] = THREE.MathUtils.randFloat(0.2, 1);
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.PointsMaterial({
  color: 0xe8e6e1,
  size: 0.06,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
});
const field = new THREE.Points(geometry, material);
scene.add(field);

// Scene 04 builds its own world from its manifest declaration. Any scene
// that does so stands the placeholder field down while it runs.
const yearDef = scenes.find((s) => s.id === 'scene-04-year')!;
const year = createYearScene(scene, yearDef, reducedMotion);

function resize() {
  const { innerWidth: w, innerHeight: h } = window;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- hud

const scaleLabel = document.getElementById('scale-label')!;
const scrollHint = document.getElementById('scroll-hint')!;
const clock = document.getElementById('clock')!;
const caption = document.getElementById('caption')!;

let activeIndex = -1;

function enterScene(index: number) {
  const s = scenes[index];
  activeIndex = index;

  // The label change is the only announcement a scene gets.
  gsap.fromTo(
    scaleLabel,
    { opacity: 0, y: 8 },
    { opacity: s.label ? 1 : 0, y: 0, duration: reducedMotion ? 0 : 0.8, ease: 'power2.out' },
  );
  scaleLabel.textContent = s.label;

  if (s.caption) {
    caption.textContent = s.caption;
    gsap.to(caption, { opacity: 1, duration: reducedMotion ? 0 : 1.4, ease: 'power2.out' });
  } else {
    gsap.to(caption, { opacity: 0, duration: reducedMotion ? 0 : 0.6 });
  }
}

// ---------------------------------------------------------------- loop

// The world clock: 4:17 on an August afternoon, in simulated seconds.
const START = (16 * 60 + 17) * 60;
let worldTime = 0;
let last = performance.now();

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  lenis.raf(now);

  const { scene: active, local, index } = sceneAt(progress);
  if (index !== activeIndex) enterScene(index);

  // Scroll depth drives the simulated clock through the active scene.
  // timeRate is the span the whole scene covers, so local reads it out.
  worldTime = active.timeRate * local;

  // The fixed clock stays ruthlessly regular: minutes only.
  const minutes = Math.floor((START + worldTime) / 60) % (24 * 60);
  const hh = Math.floor(minutes / 60) % 12 || 12;
  const mm = String(minutes % 60).padStart(2, '0');
  clock.textContent = `${hh}:${mm}`;

  // A scene that declares plates owns the world; the placeholder stands down.
  const ownsWorld = !!active.plates;
  field.visible = !ownsWorld;
  year.setActive(active.id === 'scene-04-year');
  year.update(local, dt);

  // The field turns faster as the time scale grows — log-scaled so a
  // lifetime doesn't reduce the world to noise (unless we want it to).
  const rate = active.timeRate > 0 ? Math.log10(1 + active.timeRate) : 0;
  field.rotation.y += (reducedMotion || ownsWorld ? 0 : dt * 0.004 * rate);
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  if (!reducedMotion && !ownsWorld) {
    for (let i = 0; i < COUNT; i++) {
      let y = pos.getY(i) - dt * speeds[i] * (0.02 + rate * 0.05);
      if (y < 0) y += 24;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }

  // The camera follows the manifest wherever a scene declares a move, and
  // otherwise keeps the placeholder's rise-and-fall across the whole piece.
  // Scenes 03 and 05 will each get their own declaration when they are
  // built; until then there is a step at scene 04's edges.
  if (active.camera) {
    const { from, to } = active.camera;
    camera.position.y = from.y + (to.y - from.y) * local;
    camera.position.z = from.z + (to.z - from.z) * local;
    camera.lookAt(0, from.lookY + (to.lookY - from.lookY) * local, 0);
  } else {
    const outward = Math.min(progress / 0.55, 1); // scenes 01–05
    const inward = Math.max((progress - 0.55) / 0.45, 0); // 06–10
    camera.position.y = 1.6 + outward * 20 - inward * 20;
    camera.position.z = 14;
    camera.lookAt(0, Math.max(1.6, camera.position.y * 0.4), 0);
  }

  // The hint dissolves the moment the visitor commits to leaving now.
  scrollHint.style.opacity = progress > 0.005 ? '0' : '1';

  renderer.render(scene, camera);
  if (stepping) return;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// A dev-only handle: park the piece at an exact point and render one frame,
// so screenshot tooling can look at a scene without waiting on the
// animation loop. Stripped from production builds.
let stepping = false;
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__hlin = {
    scene,
    camera,
    step(at: number, seconds = 0) {
      stepping = true;
      progress = at;
      last = performance.now() - seconds * 1000;
      frame(performance.now());
      stepping = false;
    },
  };
}
