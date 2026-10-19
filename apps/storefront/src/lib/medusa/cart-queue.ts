// Runs cart changes one at a time, in click order, and says which cart to show.
// While later changes are still waiting, `show` is null (keep the optimistic
// view). Once the queue is empty, `show` is Medusa's newest confirmed cart, also
// after a failed last change, so the view never falls back to a snapshot taken
// before earlier changes went through. `show` is null only if nothing was ever
// confirmed; then the caller restores its own snapshot.
export function cartQueue<C>() {
  let tail: Promise<unknown> = Promise.resolve();
  let waiting = 0;
  let confirmed: C | null = null;
  return {
    // Records a cart Medusa returned outside the queue (load, promotions).
    confirm(cart: C) {
      confirmed = cart;
    },
    async run(task: () => Promise<C>): Promise<{ show: C | null; latest: boolean; error?: unknown }> {
      waiting++;
      const settled = tail.then(task).then(
        (cart) => { confirmed = cart; return {}; },
        (error: unknown) => ({ error }),
      );
      tail = settled;
      const outcome = await settled;
      const latest = --waiting === 0;
      return { ...outcome, latest, show: latest ? confirmed : null };
    },
  };
}
