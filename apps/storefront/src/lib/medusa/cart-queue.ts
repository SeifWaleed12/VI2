// Runs cart changes one at a time, in click order, and says which cart to show.
// While later changes are still waiting, `show` is null (keep the optimistic
// view). Once the queue is empty, `show` is Medusa's newest confirmed cart, also
// after a failed last change, so the view never falls back to a snapshot taken
// before earlier changes went through. `show` is null only if nothing was ever
// confirmed; then the caller restores its own snapshot.
export function cartQueue<C>() {
  const fresh = () => ({ tail: Promise.resolve() as Promise<unknown>, waiting: 0, confirmed: null as C | null });
  let state = fresh();
  let version = 0;
  return {
    get version() { return version; },
    getConfirmed() { return state.confirmed; },
    canAccept() { return state.waiting < 20; },
    reset() { version++; state = fresh(); },
    // Records a cart Medusa returned outside the queue (load, promotions).
    confirm(cart: C) {
      state.confirmed = cart;
    },
    async run(task: () => Promise<C>): Promise<{ show: C | null; latest: boolean; error?: unknown; stale?: boolean; rejected?: boolean }> {
      const current = state;
      if (current.waiting >= 20) return { show: null, latest: false, rejected: true, error: new Error("Cart is busy. Wait for the current changes to finish.") };
      current.waiting++;
      const settled = current.tail.then(() => {
        if (current !== state) throw new Error("Cart session changed");
        return task();
      }).then(
        (cart) => { current.confirmed = cart; return {}; },
        (error: unknown) => ({ error }),
      );
      current.tail = settled;
      const outcome = await settled;
      const latest = --current.waiting === 0;
      if (current !== state) return { show: null, latest: false, stale: true };
      return { ...outcome, latest, show: latest ? current.confirmed : null };
    },
  };
}
