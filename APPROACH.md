# Approach

How this gets made: the stack, the workflow, and the order of work. The
concept lives in `CONCEPT.md`; this file is about not drowning while
building it.

## The governing principle: cheat like crazy

Do not build a photorealistic universe in live 3-D. Award-quality immersive
sites mix WebGL scenes, shaders, video, typography, ordinary DOM and scroll
choreography — the sophistication comes from **choreography, not polygon
count**.

The opening park is a moderately dimensional Three.js environment — ground,
water, atmospheric particles, a few hero objects — in front of very
high-quality generated or captured footage. Depth maps give imagery
parallax. Generated video supplies clouds, seasons, light changes, human
movement. The viewer should be unable to tell where video stops and 3-D
begins. That is the goal, not a compromise.

## The stack

| Part | Tool | Why |
| --- | --- | --- |
| Narrative / concepts | Claude (+ other LLMs) | Scientific story, scenes, copy, visual metaphors |
| Motion studies | Fable | Prototype type, transitions, timelines, 2-D motion before coding |
| AI cinematic assets | Image gen + video models | Seasonal variants, environmental plates, transitional imagery |
| 3-D asset work | Blender | Hero geometry, baking, camera tests, optimization |
| Browser 3-D | Three.js | The interactive spatial world |
| Animation | GSAP + ScrollTrigger | Precise scroll-controlled choreography |
| Scroll feel | Lenis | Inertial, smooth scroll control |
| Build | Vite + TypeScript | Lightweight; this is not an application framework problem |
| Shaders | GLSL (WebGL/WebGPU where useful) | Time distortion, blurs, particles, dissolves, trails |
| Sound | Web Audio API | Time stretching, filtering, spatial transitions |
| Testing | Playwright + AI coding agent | Screenshot states, mobile regression, performance |

**Division of labor that saves grief:** Three.js/GSAP *own the experience*.
The generative tools *manufacture ingredients*. Neither Fable nor any video
model owns the website.

## The workflow

### 1. Concept film first

The first deliverable is not the website. It's a 45–60 second concept film
showing the whole arc: park → expanding time → lifetime → crash back →
inward time → memory corridor → park. Crude is fine — stills, Fable motion,
generated video, rough typography. That film is the visual screenplay.

### 2. Scene manifest, not hardcoded animation

The coded experience is driven from a **scene manifest**
(`src/scenes/manifest.ts`), never from hundreds of scattered animation
calls. Each scene declares its camera, duration (scroll length), text,
assets, audio state, shader state and transition.

This is what makes the project unusually suitable for AI-assisted
development: an agent can be pointed at one bounded scene without deciding
to "helpfully" rebuild the project.

### 3. Three finished moments before anything else

1. The park → one year transition.
2. The identical ten minutes, lived vs. remembered (two clocks).
3. The thirty-day memory-compression corridor.

Each must be beautiful, responsive, and legible with almost no explanatory
copy. Only then does the connective tissue get built.

### 4. Asset pipeline

- Blender for hero geometry: model → bake lighting → export glTF (Draco).
- Generated plates: image models for stills, video models for motion plates;
  depth maps extracted for parallax.
- Everything optimized for the browser before it enters the repo: textures
  as KTX2/basis or compressed WebP, video as AV1/H.265 with H.264 fallback.

### 5. Performance budget (hard limits, set now)

- 60fps on a mid-range laptop, 30fps floor on a recent phone.
- First meaningful frame under 3s on fast 3G; heavy assets stream in behind
  the opening second (which is, conveniently, a scene where almost nothing
  happens).
- Reduced-motion: the piece must degrade to a legible, still, readable
  essay — not break.

## Running locally

```bash
npm install
npm run dev        # Vite dev server
npm run build      # production build to dist/
npm run preview    # serve the production build
```

## Deploying

`main` deploys to GitHub Pages via `.github/workflows/pages.yml` — it
builds with Vite and publishes `dist/`. Pages must be switched on once in
Settings → Pages with Source set to "GitHub Actions".
