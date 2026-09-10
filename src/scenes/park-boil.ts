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
  /**
   * The grain (session 18o): one dot screen over every plate, in screen
   * space, at the painting's own dot scale — so the people drawn at four
   * times the painting's resolution and the backdrop drawn at one share
   * a surface, matte edges soften into dots, and the softness of a
   * painting shown larger than it was made is hidden. Each dot sits on
   * a lattice jittered anew on the boil's clock, so the screen itself
   * boils; still when the boil is.
   */
  uGrainPx: { value: 6 },
  uGrainAmp: { value: 0 },
  uGrainTint: { value: 0 },
  /**
   * Old film (18p): the dot screen re-thrown every rendered frame rather
   * than on the paint's clock, a fine grain over every pixel like
   * emulsion, and the exposure flickering by a hair. `uFrame` counts
   * rendered frames; `uFilmNoise` and `uFilmFlicker` are the amounts;
   * `uFilmGain` is this frame's exposure, set each frame.
   */
  uFrame: { value: 0 },
  uFilmNoise: { value: 0 },
  uFilmGain: { value: 1 },
  /**
   * The light of the day (18r): a tint mixed into every plate by
   * `uLightMix`, `uLightGround` for what lies and stands on the ground,
   * and for the sky plate a gradient from `uLightZenith` at the top to
   * `uLightHorizon` at the treeline; the water takes the horizon's colour
   * at `uLightWater`. Set each frame from the real sun's altitude.
   */
  uLightMix: { value: 0 },
  uLightWater: { value: 0 },
  uLightGround: { value: new THREE.Vector3(1, 1, 1) },
  uLightZenith: { value: new THREE.Vector3(1, 1, 1) },
  uLightHorizon: { value: new THREE.Vector3(1, 1, 1) },
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
  // No breath and no sway (18p): a figure that rises and falls read as
  // unnatural. The forms hold; the paint and the grain are what lives,
  // the way old film is alive while its subject sits still.
  figure: { wander: 1.0, flicker: 0.08, breath: 0, sway: 0 },
  boat: { wander: 0.8, flicker: 0.07, breath: 0, sway: 0 },
  trees: { wander: 0.6, flicker: 0.05, breath: 0, sway: 0, canopy: true },
  water: { wander: 1.4, flicker: 0.08, breath: 0, sway: 0 },
  ground: { wander: 0.6, flicker: 0.05, breath: 0, sway: 0 },
  shore: { wander: 0.5, flicker: 0.04, breath: 0, sway: 0 },
  sky: { wander: 0.4, flicker: 0.03, breath: 0, sway: 0 },
  /** A plate that does not boil but still takes the grain (the bicycle). */
  still: { wander: 0, flicker: 0, breath: 0, sway: 0 },
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
  vec3 boilHash3(vec2 p) {
    return vec3(boilHash(p), boilHash(p + 31.7), boilHash(p + 63.1));
  }
  /**
   * The dot screen: for a fragment, how far inside the nearest dot it is
   * (0 outside, 1 at a dot's heart) and that dot's own random, over a
   * lattice of period px whose points are thrown within their cells,
   * thrown again at each tick of t.
   */
  vec4 grainDot(vec2 frag, float px, float t) {
    vec2 cell = floor(frag / px);
    float best = 1e9;
    vec2 bestCell = cell;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 c = cell + vec2(float(i), float(j));
        vec2 jitter = vec2(boilHash(c + t * 0.37), boilHash(c + 11.3 - t * 0.53)) - 0.5;
        vec2 pt = (c + 0.5 + jitter * 0.7) * px;
        float d = distance(frag, pt);
        if (d < best) { best = d; bestCell = c; }
      }
    }
    // Each dot its own size, so the screen is a hand's dots, not a press's.
    vec3 own = boilHash3(bestCell);
    float r = px * (0.34 + 0.2 * own.z);
    float inside = 1.0 - smoothstep(r - px * 0.22, r + px * 0.1, best);
    return vec4(inside, own);
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
  surface: 'sky' | 'water' | 'ground' = 'ground',
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
    uSurface: { value: surface === 'sky' ? 0 : surface === 'water' ? 1 : 2 },
    // The next painted stage of this plate, and how far into it we are
    // (18v). A plate whose picture changes through the year — the elms,
    // the boughs — carries both stages in one material and mixes them
    // where the map is read, colour and alpha together. Two draws cannot
    // do it: cross-faded by opacity, two cut-outs go transparent where
    // both are opaque, and the dot lottery that covered for that read as
    // noise. One draw of a true mix is a dissolve and nothing else.
    uMapB: { value: null as THREE.Texture | null },
    uMix: { value: 0 },
  };
  mat.userData.mix = { map: uniforms.uMapB, k: uniforms.uMix };
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer);
    Object.assign(shader.uniforms, uniforms, boilClock);
    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        `uniform float uBoilTc, uBoilOn, uBoilBreath, uBoilSway, uBoilPhase, uBoilCanopy;
        attribute vec3 uvq;
        varying vec2 vBoilUv;
        varying vec3 vUvq;
        void main() {`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vBoilUv = uv;
        vUvq = uvq;
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
        uniform sampler2D uMapB;
        uniform float uMix;
        uniform float uGrainPx, uGrainAmp, uGrainTint, uFrame, uFilmNoise, uFilmGain;
        uniform float uLightMix, uLightWater, uSurface;
        uniform vec3 uLightGround, uLightZenith, uLightHorizon;
        uniform vec2 uBoilTexel;
        varying vec2 vBoilUv;
        varying vec3 vUvq;
        ${NOISE_GLSL}
        void main() {`,
      )
      .replace(
        '#include <map_fragment>',
        `vec2 boilOff = vec2(0.0);
        float boilDots = 0.0;
        // The exact pixel of the painting for this fragment: the projective
        // coordinates divided here, not interpolated flat (18s).
        vec2 projUv = vUvq.z > 0.0 ? vUvq.xy / vUvq.z : vMapUv;
        if (uBoilOn > 0.0) {
          // The field is read in texels, so a stroke's wander is a stroke's
          // wander whatever the plate's size on screen.
          vec2 texelUv = projUv / uBoilTexel;
          boilOff = boilField(texelUv * 0.045 + uBoilPhase, uBoilT) * uBoilWander * uBoilTexel * uBoilOn;
          boilDots = boilNoise(texelUv * 0.5 + uBoilT * 7.0 + uBoilPhase) - 0.5;
        }
        vec2 boiledUv = projUv + boilOff;
        #define vMapUv boiledUv
        #include <map_fragment>
        #undef vMapUv
        #ifdef USE_MAP
        // The stage we are going to, mixed in here: alpha with alpha and
        // colour with colour, so the leaves thin as they turn and the
        // frame is whole the whole way through (18v).
        if (uMix > 0.0) {
          vec4 stageB = sRGBTransferEOTF(texture2D(uMapB, boiledUv));
          diffuseColor = mix(diffuseColor, vec4(diffuse, opacity) * stageB, uMix);
        }
        #endif
        diffuseColor.rgb *= 1.0 + boilDots * uBoilFlicker * 2.0 * uBoilOn;
        if (uGrainAmp > 0.0) {
          // The dot screen: a dot's heart a shade brighter, the ground
          // between dots a shade darker, and each dot its own faint cast —
          // the neighbouring colours of a pointillist's touch.
          // The screen is thrown again every frame the piece draws — film's
          // grain, never the same twice — and held still when the boil is.
          vec4 g = grainDot(gl_FragCoord.xy, uGrainPx, uFrame * uBoilOn);
          float lumMod = 1.0 + uGrainAmp * (g.x * 0.9 - 0.5);
          vec3 dotCast = (g.yzw - 0.5) * uGrainTint * g.x;
          diffuseColor.rgb = clamp(diffuseColor.rgb * lumMod + dotCast, 0.0, 1.0);
          // The day's light. The sky takes its gradient — zenith above,
          // horizon at the treeline, which the sky plate has near v 0.66 —
          // the water the horizon's colour, the ground its own tint.
          if (uLightMix > 0.0) {
            vec3 lightCol = uLightGround;
            float mixAmt = uLightMix;
            if (uSurface < 0.5) {
              float toward = smoothstep(1.0, 0.62, vBoilUv.y);
              lightCol = mix(uLightZenith, uLightHorizon, toward);
              mixAmt = uLightMix * 0.95;
            } else if (uSurface < 1.5) {
              lightCol = mix(uLightGround, uLightHorizon, 0.6);
              mixAmt = max(uLightMix, uLightWater);
            }
            // a tint keeps the plate's own light and dark: multiply toward
            // the colour, then lean the mean toward it
            float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            vec3 tinted = mix(diffuseColor.rgb * (lightCol / max(0.05, dot(lightCol, vec3(0.299, 0.587, 0.114)))), lightCol, 0.35);
            diffuseColor.rgb = mix(diffuseColor.rgb, tinted, mixAmt);
          }
          // Emulsion: a fine grain per pixel, and the frame's own exposure.
          float film = boilHash(gl_FragCoord.xy * 0.731 + uFrame * 1.13 * uBoilOn) - 0.5;
          diffuseColor.rgb = clamp(diffuseColor.rgb * (uFilmGain + film * uFilmNoise * uBoilOn), 0.0, 1.0);
        }`,
      );
  };
  mat.needsUpdate = true;
}
