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
