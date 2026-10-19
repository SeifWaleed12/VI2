// Runs cart changes one at a time, in click order. `latest` is true only when
// no later change is waiting, so the cart is shown from the newest answer and
// never jumps back to an older one while fast clicks are still being sent.
export function cartQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  let waiting = 0;
  return function run<T>(task: () => Promise<T>): Promise<{ result: T; latest: boolean }> {
    waiting++;
    const done = tail.then(task).finally(() => { waiting--; });
    tail = done.catch(() => {});
    return done.then((result) => ({ result, latest: waiting === 0 }));
  };
}
