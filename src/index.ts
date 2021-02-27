// This can't be a promise because typescript will flatten it
export type CancelSignal = { signal: Promise<void> };

export type StreamBody<T> = AsyncIterator<T, void, unknown>;
export type Stream<T> = (cs: CancelSignal) => StreamBody<T>;

export type Operator<T, U> = (input$: Stream<T>) => Stream<U>;

export const NEVER_CANCEL: CancelSignal = { signal: new Promise(() => void 0) };

export function of<T>(...xs: T[]): Stream<T> {
  return fromIterable(xs);
}

export function fromIterable<T>(xs: Iterable<T>): Stream<T> {
  return async function* (_cs: CancelSignal) {
    for (const x of xs) yield x;
  };
}

export async function* intoAsyncIteratable<T>(x$: Stream<T>) {
  const iter = x$(NEVER_CANCEL);
  while (true) {
    const res = await iter.next();
    if (res.done) return;
    yield res.value;
  }
}

export { apply } from "./apply";
