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
import { createTwoClocksScene } from './scenes/scene-08-two-clocks';
import { createMemoryScene } from './scenes/scene-09-memory';

// Reduced motion is the visitor's setting; in development a query flag
// stands in for it, so the still essay can be looked at without changing
// the machine. Stripped from production builds.
const reducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  (import.meta.env.DEV && new URLSearchParams(location.search).has('reduced'));

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
let yearWarm = false;

// Scene 08 does the same, and renders the frame itself: two views of one
// corridor, side by side, each through its own camera.
const twoClocksDef = scenes.find((s) => s.id === 'scene-08-two-clocks')!;
const twoClocks = createTwoClocksScene(scene, twoClocksDef, reducedMotion);

// Scene 09 likewise: the memory corridor, seen through its own eye.
const memoryDef = scenes.find((s) => s.id === 'scene-09-memory-compression')!;
const memory = createMemoryScene(scene, memoryDef, reducedMotion);

function resize() {
  const { innerWidth: w, innerHeight: h } = window;
  // A window passing through zero size — a pane hiding, a tab in the
  // background — would make the aspect NaN and poison the camera for a
  // frame, and the survey lays its callouts out through the camera.
  if (w <= 0 || h <= 0) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // The runway is sized in vh, so a resize moves the piece under the
  // visitor's scroll; read where they are now rather than wait for the
  // next scroll to learn it.
  const max = document.documentElement.scrollHeight - h;
  progress = max > 0 ? window.scrollY / max : 0;
}
resize();
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- hud

const hud = document.querySelector('.hud') as HTMLElement;
const scaleLabel = document.getElementById('scale-label')!;
const scrollHint = document.getElementById('scroll-hint')!;
const clock = document.getElementById('clock')!;
const caption = document.getElementById('caption')!;
const lidUpper = document.querySelector('.lid--upper') as HTMLElement;
const lidLower = document.querySelector('.lid--lower') as HTMLElement;

let activeIndex = -1;
let captionUp = false;
let hudShown = 1;
// The scene's own running time, and whether its blink has happened.
let sceneShown = 0;
let blinked = false;

function showCaption(up: boolean) {
  if (captionUp === up) return;
  captionUp = up;
  // The newest fade owns the line: a raise still running when the lower
  // starts would otherwise outlive it and leave the line up in a scene
  // that has asked for it to go — a fast scroll through a window's edge
  // is enough.
  gsap.to(caption, {
    opacity: up ? 1 : 0,
    duration: reducedMotion ? 0 : up ? 1.4 : 0.6,
    ease: 'power2.out',
    overwrite: true,
  });
}

let scaleShown = '';

/** The scale label, announced the one way a scale ever is: it arrives. */
function setScale(text: string) {
  if (text === scaleShown) return;
  scaleShown = text;
  gsap.fromTo(
    scaleLabel,
    { opacity: 0, y: 8 },
    { opacity: text ? 1 : 0, y: 0, duration: reducedMotion ? 0 : 0.8, ease: 'power2.out', overwrite: true },
  );
  scaleLabel.textContent = text;
}

/** The scale a scene is at, for a scene that changes scale within itself. */
function scaleOf(s: (typeof scenes)[number], local: number): string {
  if (!s.labelAt) return s.label;
  let text = s.label;
  for (const step of s.labelAt) if (local >= step.from) text = step.label;
  return text;
}

/**
 * The viewer's eye, blinking once: the lids close from the frame's edges
 * and open again, on the manifest's timings. Everything the eye sees
 * goes dark with them, the interface included.
 */
function blink(b: NonNullable<(typeof scenes)[number]['blink']>) {
  gsap
    .timeline()
    .fromTo(lidUpper, { yPercent: -100 }, { yPercent: 0, duration: b.close, ease: 'power2.in' })
    .fromTo(lidLower, { yPercent: 100 }, { yPercent: 0, duration: b.close, ease: 'power2.in' }, '<')
    .to(lidUpper, { yPercent: -100, duration: b.open, ease: 'power2.out' })
    .to(lidLower, { yPercent: 100, duration: b.open, ease: 'power2.out' }, '<');
}

function enterScene(index: number) {
  const s = scenes[index];
  activeIndex = index;
  sceneShown = 0;
  blinked = false;
  setScale(s.label);

  // A caption is up for the whole scene unless the scene declares the
  // window it speaks in; then the loop raises it when local gets there.
  // A scene with none clears the last one's text outright, so a jump
  // between scenes never shows another scene's line fading over this.
  caption.textContent = s.caption ?? '';
  showCaption(!!s.caption && !s.captionAt);
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

  // Scene 04's imagery and shaders are readied here, behind the opening
  // second, so its first frame costs nothing when the lake arrives.
  if (!yearWarm) yearWarm = year.warm(renderer, camera);

  const { scene: active, local, index } = sceneAt(progress);
  if (index !== activeIndex) enterScene(index);
  sceneShown += dt;

  // A scene that declares a blink gets one, once, so many seconds into
  // being sat in; under reduced motion the eye stays open.
  if (active.blink && !blinked && !reducedMotion && sceneShown >= active.blink.after) {
    blinked = true;
    blink(active.blink);
  }

  // Scroll depth drives the simulated clock through the active scene.
  // timeRate is the span the whole scene covers, so local reads it out.
  worldTime = active.timeRate * local;

  // The fixed clock stays ruthlessly regular: minutes only.
  const minutes = Math.floor((START + worldTime) / 60) % (24 * 60);
  const hh = Math.floor(minutes / 60) % 12 || 12;
  const mm = String(minutes % 60).padStart(2, '0');
  clock.textContent = `${hh}:${mm}`;

  // A scene that builds its own world owns it; the placeholder stands down.
  const ownsWorld = !!active.plates || !!active.twoClocks || !!active.memory || !!active.hold;
  field.visible = !ownsWorld;
  // A scene may hold the year's world at a point, seen through its own
  // camera and instruments; the world is then shown for it too.
  const holdsYear = active.hold?.of === 'scene-04-year';
  year.setActive(active.id === 'scene-04-year' || holdsYear);
  twoClocks.setActive(active.id === 'scene-08-two-clocks');
  memory.setActive(active.id === 'scene-09-memory-compression');
  if (active.caption && active.captionAt) {
    showCaption(local >= active.captionAt.from && local <= active.captionAt.to);
  }
  // A scene that subdivides its own scale says so as the scroll descends.
  if (active.labelAt) setScale(scaleOf(active, local));

  // The interface leaves where a scene says it does, and comes back if
  // the visitor scrolls away from the ending.
  const out = active.hudOut;
  const gone = out ? (local - out.from) / Math.max(1e-6, out.to - out.from) : 0;
  const hudOpacity = 1 - Math.min(Math.max(gone, 0), 1);
  if (hudOpacity !== hudShown) {
    hudShown = hudOpacity;
    hud.style.opacity = String(hudOpacity);
    clock.style.opacity = String(hudOpacity);
  }

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
    // The move runs over the window the scene declares, or the whole of
    // it; a fall gathers speed and lands gently, where a rise is the
    // scroll's own pace.
    const w = active.cameraAt;
    let k = w ? (local - w.from) / Math.max(1e-6, w.to - w.from) : local;
    k = Math.min(Math.max(k, 0), 1);
    if (active.camera.ease === 'fall') {
      k = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    }
    camera.position.y = from.y + (to.y - from.y) * k;
    camera.position.z = from.z + (to.z - from.z) * k;
    camera.lookAt(0, from.lookY + (to.lookY - from.lookY) * k, 0);
  } else {
    const outward = Math.min(progress / 0.55, 1); // scenes 01–05
    const inward = Math.max((progress - 0.55) / 0.45, 0); // 06–10
    camera.position.y = 1.6 + outward * 20 - inward * 20;
    camera.position.z = 14;
    camera.lookAt(0, Math.max(1.6, camera.position.y * 0.4), 0);
  }

  // The world is read only once the camera stands where this frame puts
  // it: the year's figure is drawn in screen space and must project
  // through the same camera that renders the sun it annotates.
  year.update(
    local,
    dt,
    camera,
    holdsYear && active.hold
      ? {
          at: active.hold.at,
          scene: active,
          local,
          from: active.hold.from,
          seconds: active.hold.seconds,
          churn: active.hold.churn,
          lens: active.hold.lens,
          years: active.hold.years,
          grow: active.hold.grow,
          life: active.hold.life,
          appearances: active.hold.appearances,
        }
      : undefined,
  );
  twoClocks.update(local);
  memory.update(local);

  // The hint dissolves the moment the visitor commits to leaving now.
  scrollHint.style.opacity = progress > 0.005 ? '0' : '1';

  // A scene that splits the frame renders it; otherwise the world is
  // drawn once through the one camera.
  if (!twoClocks.render(renderer) && !memory.render(renderer)) renderer.render(scene, camera);
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
    warmed: () => yearWarm,
    step(at: number, seconds = 0) {
      stepping = true;
      progress = at;
      last = performance.now() - seconds * 1000;
      frame(performance.now());
      stepping = false;
    },
  };
}
