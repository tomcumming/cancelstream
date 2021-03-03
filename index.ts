export { apply } from "./apply";
import { CANCELLED, CancelSignal } from "./cancel";

export { CANCELLED, CancelSignal };

export const COMPLETED = Symbol("Completed");

export type StreamResult = typeof COMPLETED;

export type StreamBody<T> = AsyncIterator<T, StreamResult, unknown>;
export type Stream<T> = (cs: CancelSignal) => StreamBody<T>;

export type Operator<T, U> = (input$: Stream<T>) => Stream<U>;

export const NEVER_CANCEL: CancelSignal = [new Promise(() => void 0)];

export function fromAsyncIterable<T>(xs: AsyncIterable<T>): Stream<T> {
  return async function* ([cp]: CancelSignal) {
    for await (const x of xs) {
      const xOrCancelled = await Promise.race([cp, Promise.resolve(x)]);
      if (xOrCancelled === CANCELLED) return COMPLETED;
      else yield xOrCancelled;
    }
    return COMPLETED;
  };
}

export function fromIterable<T>(xs: Iterable<T>): Stream<T> {
  return async function* ([cp]: CancelSignal) {
    for (const x of xs) {
      const xOrCancelled = await Promise.race([cp, Promise.resolve(x)]);
      if (xOrCancelled === CANCELLED) return COMPLETED;
      else yield xOrCancelled;
    }
    return COMPLETED;
  };
}

export function from<T>(source: Iterable<T> | AsyncIterable<T>): Stream<T> {
  if (Symbol.iterator in source) {
    return fromIterable(source as Iterable<T>);
  } else if (Symbol.asyncIterator in source) {
    return fromAsyncIterable(source as AsyncIterable<T>);
  } else {
    throw new Error(`source was not (async)iterable`);
  }
}

export function of<T>(...xs: T[]): Stream<T> {
  return fromIterable(xs);
}

export async function* into<T>(x$: Stream<T>) {
  const iter = x$(NEVER_CANCEL);
  while (true) {
    const res = await iter.next();
    if (res.done) return;
    yield res.value;
  }
}

export async function subscribe<T>(
  stream: Stream<T>,
  cs: CancelSignal,
  forEach: (t: T) => Promise<unknown>
): Promise<StreamResult> {
  const iter = stream(cs);
  while (true) {
    const res = await iter.next();
    if (res.done) return res.value;
    await forEach(res.value);
  }
}

export async function exhaustStreamBody(
  streamBody: StreamBody<unknown>
): Promise<StreamResult> {
  while (true) {
    const result = await streamBody.next();
    if (result.done) return result.value;
  }
}
