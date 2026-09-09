/**
 * The opening frame's imagery, as a signal the other scenes wait on.
 *
 * The piece opens on the park, and the park is made of the year's plates.
 * Every other scene's imagery is minutes of scroll away, so it is fetched
 * only once the opening has its own — the first real frame is never made
 * to share the wire with a corridor. The year resolves it, whether or not
 * its imagery arrived; nothing waits forever.
 */
let open: () => void = () => {};
export const opening = new Promise<void>((resolve) => {
  open = resolve;
});
export function opened(): void {
  open();
}

/**
 * The URL a plate is fetched from. It carries the build's id, and in
 * development the moment, so a plate recut under the same name is never
 * read from the browser's cache as the one before it.
 */
export function plateUrl(path: string): string {
  const v = import.meta.env.DEV ? Date.now().toString(36) : __BUILD__;
  return `${import.meta.env.BASE_URL}${path}?v=${v}`;
}
