---
name: draw-in-the-browser
description: Draw the park's layers in ChatGPT through the user's own Chrome instead of the paid image API, and land each picture at the exact path the plate cutter expects. Use whenever new artwork is needed for HOW LONG IS NOW? — new layers, repaints, extra seasons, anything that would otherwise be `node scripts/generate.mjs`.
---

# Drawing in the browser

The API costs money per picture. The pipeline never wanted the API — it
wanted a PNG at `assets/raw/<dir>/<id>-v<n>.png`. This draws them in
whatever chat the user already pays for, and files them there.

## The loop

**1. Write the jobs out.** Same selectors as the generator; `--queue`
resolves the prompt, the size, the reference images and the version the
result should land as, into `assets/raw/QUEUE.json`:

```bash
node scripts/generate.mjs --notice --queue
node scripts/generate.mjs --only lawn,trees --queue
node scripts/art-catch.mjs status     # what is still to draw
node scripts/art-catch.mjs next       # the next job's prompt, to paste
```

**2. Open one chat for the batch.** `chatgpt.com`, a fresh tab. Attach
the style reference **once**, to the first message only:

- `find` the file input ("file input for attaching images")
- `file_upload` it with the job's `attach` paths

**3. Put the prompt in and send.** The composer is a contenteditable;
type into it through the page, not with keystrokes:

```js
const ed = document.querySelector('div[contenteditable="true"]');
ed.focus();
document.execCommand('selectAll', false, null);
document.execCommand('insertText', false, prompt);
```

Then **press Return** — `computer{action:'key', text:'Return'}` after
focusing the composer. Do not click the send button by coordinate: it
moves as the composer grows, and a miss lands in the text.

Add the aspect to the end of the prompt, since the web UI takes no size
argument: `Draw this as a landscape image, 1536 by 1024.` (or square, or
portrait). Square comes back 1254 × 1254 rather than 1024; that is fine,
the cutter resizes.

For the second and later pictures in the same chat, drop the style
preamble and open with: *Another layer in the same hand, from the same
style reference above — same palette, same light, same dot size.*

**4. Wait.** A minute is normal. Poll for the picture rather than
guessing:

```js
[...document.querySelectorAll('img')].map(i => [i.naturalWidth, i.naturalHeight]).filter(d => d[0] > 1000)
```

**5. Bring it back through the clipboard.** chatgpt.com cannot talk to
localhost — neither `fetch` nor a form post reaches a local server, so
there is no posting it back. The clipboard is the way out, and nothing
has to go through Downloads:

```js
// click the page first: clipboard.write needs the document focused
const big = [...document.querySelectorAll('img')].filter(i => i.naturalWidth > 1000);
const last = big[big.length - 1];
const blob = await (await fetch(last.src)).blob();   // same origin: allowed
await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
```

Then file it:

```bash
node scripts/art-catch.mjs clip 0     # the clipboard → the job's own path
```

`clip` marks the job done. `land 0` does the same from the newest file
in ~/Downloads, for a page that will not give its picture up to script.

**6. Cut the plates as always.**

```bash
node scripts/plates.mjs scene-10
```

## Gotchas, all of them learned the hard way

- `navigator.clipboard.write` throws *Document is not focused* unless the
  page has been clicked. Click anywhere harmless first.
- The generated image is served from `chatgpt.com` itself, so `fetch` on
  its `src` is same-origin and returns a real PNG blob. Do not bother
  with canvas.
- The extension can drop mid-batch ("Chrome extension disconnected").
  Retry the same call; it comes back.
- Attach the reference to the *first* message of a chat only. Re-sending
  4 MB per picture is slow and the thread already holds the style.
- The API is still there for when it is wanted: drop `--queue`.
