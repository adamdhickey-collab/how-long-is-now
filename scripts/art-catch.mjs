/**
 * Catch the art a browser draws (18z).
 *
 * The images used to come from the API, which costs money per picture.
 * They can as well be drawn in a browser, in whatever chat the model is
 * already paid for — the pipeline only ever wanted a PNG at a known
 * path. `generate.mjs --queue` writes the jobs out; this holds them,
 * hands them over one at a time, and takes the finished pictures back.
 *
 *   node scripts/generate.mjs --notice --queue   write the jobs
 *   node scripts/art-catch.mjs serve             hold them, and catch
 *   node scripts/art-catch.mjs next              print the next job
 *   node scripts/art-catch.mjs clip 0            file whatever is on the clipboard
 *   node scripts/art-catch.mjs land 0            file the newest download
 *   node scripts/art-catch.mjs status            what is still to draw
 *
 * `clip` is the seamless one, and the reason it exists: chatgpt.com will
 * not let its page talk to localhost — neither fetch nor a form post
 * reaches it — so the picture comes back by way of the clipboard, which
 * every browser will hand over. Copy the image in the page, run `clip`,
 * and it lands in the right folder under the right name. `land` does the
 * same for a picture saved to Downloads instead.
 *
 * While `serve` is running, a page that *is* allowed to reach localhost
 * can post a picture straight back:
 *
 *   fetch('http://localhost:5188/put/0', { method: 'POST', body: dataUrl })
 *
 * which writes the job's own file — the right folder, the right id, the
 * next version — and marks it done. Nothing passes through Downloads and
 * nothing has to be renamed. `land` is the fallback for when the page
 * will not give its picture up to script: save it by hand, then file it.
 */

import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE = resolve(root, 'assets/raw/QUEUE.json');
const PORT = 5188;
const DOWNLOADS = join(homedir(), 'Downloads');

const readQueue = () => {
  if (!existsSync(QUEUE)) {
    console.error(`No queue at ${QUEUE}. Run: node scripts/generate.mjs <selector> --queue`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(QUEUE, 'utf8'));
};
const writeQueue = (jobs) => writeFileSync(QUEUE, `${JSON.stringify(jobs, null, 2)}\n`);
const short = (p) => p.replace(`${root}/`, '');

/** The picture, whatever the page handed over, as a PNG on disk. */
async function write(job, buf) {
  const { default: sharp } = await import('sharp');
  mkdirSync(dirname(job.out), { recursive: true });
  const meta = await sharp(buf).metadata();
  await sharp(buf).png().toFile(job.out);
  return `${meta.width} × ${meta.height} ${meta.format}`;
}

function newestDownload() {
  const files = readdirSync(DOWNLOADS)
    .filter((f) => /\.(png|webp|jpe?g)$/i.test(f))
    .map((f) => ({ f, t: statSync(join(DOWNLOADS, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!files.length) throw new Error(`nothing drawn in ${DOWNLOADS}`);
  return join(DOWNLOADS, files[0].f);
}

const jobLine = (job, i) => `${i}  ${job.id}  ${job.aspect}  ${job.done ? '✓' : '·'}  → ${short(job.out)}`;

const cmd = process.argv[2] ?? 'status';

if (cmd === 'status') {
  const jobs = readQueue();
  for (const [i, j] of jobs.entries()) console.log(jobLine(j, i));
  const left = jobs.filter((j) => !j.done).length;
  console.log(`\n${left} of ${jobs.length} still to draw`);
} else if (cmd === 'next') {
  const jobs = readQueue();
  const i = jobs.findIndex((j) => !j.done);
  if (i < 0) {
    console.log('all drawn');
  } else {
    const j = jobs[i];
    console.log(`# job ${i}: ${j.id} (${j.aspect}, ${j.size}) → ${short(j.out)}`);
    console.log(`# attach: ${j.attach.map(short).join(', ')}`);
    console.log(`\n${j.prompt}\n`);
  }
} else if (cmd === 'clip') {
  const jobs = readQueue();
  const i = Number(process.argv[3]);
  const job = jobs[i];
  if (!job) throw new Error(`no job ${i}`);
  const { execFileSync } = await import('node:child_process');
  const tmp = resolve(root, 'assets/raw/.clipboard.png');
  // AppleScript is the only thing on this machine that will hand over
  // the clipboard's picture as bytes.
  execFileSync('osascript', [
    '-e', `set f to open for access POSIX file "${tmp}" with write permission`,
    '-e', 'set eof f to 0',
    '-e', 'write (the clipboard as «class PNGf») to f',
    '-e', 'close access f',
  ]);
  const what = await write(job, readFileSync(tmp));
  jobs[i].done = true;
  writeQueue(jobs);
  console.log(`✓ clipboard → ${short(job.out)}  (${what})`);
} else if (cmd === 'land') {
  const jobs = readQueue();
  const i = Number(process.argv[3]);
  const job = jobs[i];
  if (!job) throw new Error(`no job ${i}`);
  const src = process.argv[4] ? resolve(process.argv[4]) : newestDownload();
  const what = await write(job, readFileSync(src));
  jobs[i].done = true;
  writeQueue(jobs);
  console.log(`✓ ${short(src)} → ${short(job.out)}  (${what})`);
} else if (cmd === 'serve') {
  http
    .createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      if (req.method === 'OPTIONS') return res.end();
      const url = new URL(req.url, 'http://localhost');
      const [, verb, which] = url.pathname.split('/');
      const jobs = readQueue();
      if (verb === 'status') {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(jobs.map(({ id, aspect, done }) => ({ id, aspect, done }))));
      }
      if (verb === 'job') {
        const j = jobs[Number(which)];
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(j ?? null));
      }
      if (verb !== 'put') {
        res.statusCode = 404;
        return res.end('put | job | status');
      }
      const i = Number(which);
      const job = jobs[i];
      if (!job) {
        res.statusCode = 404;
        return res.end(`no job ${i}`);
      }
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          const b64 = body.replace(/^data:image\/[a-z+]+;base64,/, '');
          const what = await write(job, Buffer.from(b64, 'base64'));
          jobs[i].done = true;
          writeQueue(jobs);
          console.log(`✓ ${job.id} → ${short(job.out)}  (${what})`);
          res.end('ok');
        } catch (err) {
          console.error(`✗ ${job.id}: ${err.message}`);
          res.statusCode = 500;
          res.end(err.message);
        }
      });
    })
    .listen(PORT, () => {
      const jobs = readQueue();
      console.log(`catching on ${PORT}, ${jobs.filter((j) => !j.done).length} to draw`);
      for (const [i, j] of jobs.entries()) console.log(`  ${jobLine(j, i)}`);
    });
} else {
  console.error('serve | next | clip <i> | land <i> [file] | status');
  process.exit(1);
}
