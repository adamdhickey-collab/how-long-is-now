/**
 * The living painting (session 18n).
 *
 * A painting's people should not be still and should not walk. What
 * reads as alive in paint is the boil: the strokes shift a little from
 * frame to frame while the form holds, at a hand-drawn rate rather than
 * the screen's. Here every plate of the park takes it in its own
 * measure. The dots wander by a texel or two under animated noise,
 * stepped to the manifest's frames per second; the dots' brightness
 * flickers with it; the figures breathe and sway from the feet, slow
 * and smooth; the elms sway at the top; the water and the lawn shimmer
 * faintly. One clock drives all of it, so the whole picture shares one
 * pulse. Under reduced motion the amount is zero and nothing moves.
 *
 * Installed on a MeshBasicMaterial's own shader, so the plate's map,
 * alpha, tint and thermal pass are untouched: the boil only moves the
 * lookup and scales the colour after it.
 */
import * as THREE from 'three';

/** The one clock: `t` stepped to the paint's rate, `tc` continuous. */
export const boilClock = {
  uBoilT: { value: 0 },
  uBoilTc: { value: 0 },
  /** 0–1, the manifest's amount; 0 under reduced motion. */
  uBoilOn: { value: 0 },
};

export interface BoilSetting {
  /** Texels of wander in the map lookup. */
  wander: number;
  /** Brightness flicker of the dots, 0–1. */
  flicker: number;
  /** Breath: vertical stretch from the feet, as a fraction of height. */
  breath: number;
  /** Sway: lean from the feet, as a fraction of height. */
  sway: number;
  /** Whether the sway grows with height squared (a canopy) or linearly. */
  canopy?: boolean;
}

/** How each kind of plate lives. */
export const BOIL: Record<string, BoilSetting> = {
  figure: { wander: 1.6, flicker: 0.12, breath: 0.012, sway: 0.008 },
  boat: { wander: 1.2, flicker: 0.1, breath: 0.004, sway: 0.02 },
  // Gentle: the elms' plate carries a ring of the sky behind the leaves,
  // and a strong sway would drag a ghost of sky with it.
  trees: { wander: 0.6, flicker: 0.05, breath: 0, sway: 0.006, canopy: true },
  water: { wander: 1.4, flicker: 0.08, breath: 0, sway: 0 },
  ground: { wander: 0.6, flicker: 0.05, breath: 0, sway: 0 },
  shore: { wander: 0.5, flicker: 0.04, breath: 0, sway: 0 },
  sky: { wander: 0.4, flicker: 0.03, breath: 0, sway: 0 },
};

const NOISE_GLSL = /* glsl */ `
  float boilHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float boilNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = boilHash(i);
    float b = boilHash(i + vec2(1.0, 0.0));
    float c = boilHash(i + vec2(0.0, 1.0));
    float d = boilHash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  /** Two octaves, centred on zero, as a 2-vector. */
  vec2 boilField(vec2 p, float t) {
    vec2 q = vec2(boilNoise(p + t * 3.1), boilNoise(p + 17.3 - t * 2.7));
    q += 0.5 * vec2(boilNoise(p * 2.3 + 5.1 + t), boilNoise(p * 2.3 - 9.7 + t * 1.3));
    return (q / 1.5) - 0.5;
  }
`;

/**
 * Install the boil on a material. `texel` is 1 / the map's size, `height`
 * the plate's world height (for breath and sway), `phase` its own offset
 * so no two plates pulse together.
 */
export function installBoil(
  mat: THREE.MeshBasicMaterial,
  setting: BoilSetting,
  texel: [number, number],
  height: number,
  phase: number,
): void {
  const prev = mat.onBeforeCompile;
  const uniforms = {
    uBoilWander: { value: setting.wander },
    uBoilFlicker: { value: setting.flicker },
    uBoilBreath: { value: setting.breath * height },
    uBoilSway: { value: setting.sway * height },
    uBoilTexel: { value: new THREE.Vector2(texel[0], texel[1]) },
    uBoilPhase: { value: phase },
    uBoilCanopy: { value: setting.canopy ? 1 : 0 },
  };
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer);
    Object.assign(shader.uniforms, uniforms, boilClock);
    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        `uniform float uBoilTc, uBoilOn, uBoilBreath, uBoilSway, uBoilPhase, uBoilCanopy;
        varying vec2 vBoilUv;
        void main() {`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vBoilUv = uv;
        {
          // From the feet up: the top breathes and leans, the foot stays.
          float up = uBoilCanopy > 0.5 ? uv.y * uv.y : uv.y;
          float breath = sin(uBoilTc * 1.5 + uBoilPhase) * uBoilBreath * uBoilOn;
          float sway = sin(uBoilTc * 0.45 + uBoilPhase * 1.7) * uBoilSway * uBoilOn;
          transformed.y += up * breath;
          transformed.x += up * sway;
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `uniform float uBoilT, uBoilOn, uBoilWander, uBoilFlicker, uBoilPhase;
        uniform vec2 uBoilTexel;
        varying vec2 vBoilUv;
        ${NOISE_GLSL}
        void main() {`,
      )
      .replace(
        '#include <map_fragment>',
        `vec2 boilOff = vec2(0.0);
        float boilDots = 0.0;
        if (uBoilOn > 0.0) {
          // The field is read in texels, so a stroke's wander is a stroke's
          // wander whatever the plate's size on screen.
          vec2 texelUv = vBoilUv / uBoilTexel;
          boilOff = boilField(texelUv * 0.045 + uBoilPhase, uBoilT) * uBoilWander * uBoilTexel * uBoilOn;
          boilDots = boilNoise(texelUv * 0.5 + uBoilT * 7.0 + uBoilPhase) - 0.5;
        }
        vec2 boiledUv = vMapUv + boilOff;
        #define vMapUv boiledUv
        #include <map_fragment>
        #undef vMapUv
        diffuseColor.rgb *= 1.0 + boilDots * uBoilFlicker * 2.0 * uBoilOn;`,
      );
  };
  mat.needsUpdate = true;
}
