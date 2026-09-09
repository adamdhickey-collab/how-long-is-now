/**
 * Generate the park's layers through the image model's API.
 *
 * Every prompt in park-layers.mjs goes to the edit endpoint with the
 * style reference attached, and the PNG that comes back is written as
 * the next version of that layer under assets/raw/scene-04/park/. The
 * key is read from OPENAI_API_KEY, or from a .env file at the repo root
 * (ignored by git); it is never printed.
 *
 *   node scripts/generate.mjs                 every layer
 *   node scripts/generate.mjs --only lawn,trees
 *   node scripts/generate.mjs --seasons        the other three seasons
 *   node scripts/generate.mjs --crowd          the crowd through the year
 *   node scripts/generate.mjs --corridor       scene 08's corridor and fragments
 *   node scripts/generate.mjs --memory         scene 09's memory sheets
 *   node scripts/generate.mjs --dry           print what would be sent
 *   node scripts/generate.mjs --ref <file>    another reference image
 *   node scripts/generate.mjs --quality medium
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLE, layers, seasonLayers, crowdLayers, corridorLayers, memoryLayers } from './park-layers.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(root, 'assets/raw/scene-04/park');
const REF = resolve(root, 'assets/raw/park/reference.png');
const ENDPOINT = 'https://api.openai.com/v1/images/edits';
const CONCURRENCY = 4;

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dry = args.includes('--dry');
const only = flag('--only')?.split(',').map((s) => s.trim()).filter(Boolean);
const seasons = args.includes('--seasons');
const crowd = args.includes('--crowd');
const corridor = args.includes('--corridor');
const memory = args.includes('--memory');
const ref = flag('--ref') ? resolve(flag('--ref')) : REF;
const quality = flag('--quality') ?? 'high';

// ---------------------------------------------------------------- key
function readKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const env = resolve(root, '.env');
  if (existsSync(env)) {
    for (const line of readFileSync(env, 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*["']?([^"'\s#]+)/);
      if (m) return m[1];
    }
  }
  return null;
}

// ---------------------------------------------------------------- versions
function outDir(layer) {
  return layer.dir ? resolve(root, 'assets/raw', layer.dir) : OUT;
}

function nextVersion(layer) {
  const dir = outDir(layer);
  if (!existsSync(dir)) return 1;
  const re = new RegExp(`^${layer.id}-v(\\d+)\\.png$`);
  let max = 0;
  for (const f of readdirSync(dir)) {
    const m = f.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

// ---------------------------------------------------------------- one layer
async function generate(layer, key) {
  const version = nextVersion(layer);
  const out = resolve(outDir(layer), `${layer.id}-v${version}.png`);
  const prompt = `${layer.preamble ?? STYLE}\n\n${layer.prompt}`;
  if (dry) {
    console.log(`\n— ${layer.id} → ${out}\n  size ${layer.size}, quality ${quality}\n  ${prompt}`);
    return;
  }
  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('prompt', prompt);
  form.append('size', layer.size);
  form.append('quality', quality);
  form.append('n', '1');
  // A layer with its own references sends them first: an edit of a
  // late-summer layer travels with that layer, then the style.
  for (const r of layer.refs ?? []) {
    const file = resolve(root, r);
    form.append('image[]', new Blob([readFileSync(file)], { type: 'image/png' }), file.split('/').pop());
  }
  form.append('image[]', new Blob([readFileSync(ref)], { type: 'image/png' }), 'reference.png');
  const t0 = Date.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${layer.id}: ${res.status} ${text.slice(0, 400)}`);
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(`${layer.id}: no image in the response`);
  mkdirSync(outDir(layer), { recursive: true });
  writeFileSync(out, Buffer.from(b64, 'base64'));
  const usage = json.usage ? ` · ${json.usage.total_tokens} tokens` : '';
  console.log(`✓ ${layer.id} v${version}  ${((Date.now() - t0) / 1000).toFixed(0)}s${usage}`);
}

// ---------------------------------------------------------------- run
async function main() {
  const key = dry ? 'dry' : readKey();
  if (!key) {
    console.error('No OPENAI_API_KEY in the environment or in .env at the repo root.');
    process.exit(1);
  }
  if (!existsSync(ref)) {
    console.error(`No reference image at ${ref}`);
    process.exit(1);
  }
  const pool = memory ? memoryLayers : corridor ? corridorLayers : crowd ? crowdLayers : seasons ? seasonLayers : layers;
  const todo = pool.filter((l) => !only || only.includes(l.id));
  if (!todo.length) {
    console.error(`Nothing matches --only ${only?.join(',')}; layers: ${pool.map((l) => l.id).join(', ')}`);
    process.exit(1);
  }
  console.log(`${todo.length} layer(s), ${CONCURRENCY} at a time, quality ${quality}${dry ? ' (dry run)' : ''}`);
  const queue = [...todo];
  const failures = [];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const layer = queue.shift();
        try {
          await generate(layer, key);
        } catch (err) {
          failures.push(layer.id);
          console.error(`✗ ${err.message}`);
        }
      }
    }),
  );
  if (failures.length) {
    console.error(`\nFailed: ${failures.join(', ')}`);
    process.exit(1);
  }
}

main();
