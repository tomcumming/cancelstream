import { ASAP, CANCELLED, CancelSignal, NEVER } from "./cancel";

export { CANCELLED, CancelSignal } from "./cancel";
export { apply } from "./apply";

export const COMPLETED = Symbol("Stream Completed");

export type StreamResult<T> = typeof COMPLETED | [Stream<T>, T];

export type Stream<T> = (cs: CancelSignal) => Promise<StreamResult<T>>;

export type Operator<T, U> = (input$: Stream<T>) => Stream<U>;

export async function subscribe<T>(
  input$: Stream<T>,
  cs: CancelSignal,
  forEach: (item: T) => Promise<unknown>
): Promise<typeof COMPLETED> {
  while (true) {
    const result = await input$(cs);
    if (result === COMPLETED) return COMPLETED;
    input$ = result[0];
    await forEach(result[1]);
  }
}

export function fromIterable<T>(items: Iterable<T>): Stream<T> {
  const iter = items[Symbol.iterator]();
  const next = (cs: CancelSignal): Promise<StreamResult<T>> =>
    Promise.race([cs, Promise.resolve(iter.next())]).then((taskResult) =>
      taskResult === CANCELLED || taskResult.done
        ? COMPLETED
        : [next, taskResult.value]
    );
  return next;
}

export function fromAsyncIterable<T>(items: AsyncIterable<T>): Stream<T> {
  const iter = items[Symbol.asyncIterator]();
  const next = (cs: CancelSignal): Promise<StreamResult<T>> =>
    Promise.race([cs, iter.next()]).then((taskResult) =>
      taskResult === CANCELLED || taskResult.done
        ? COMPLETED
        : [next, taskResult.value]
    );
  return next;
}

export function from<T>(items: Iterable<T> | AsyncIterable<T>): Stream<T> {
  if (Symbol.iterator in items) {
    return fromIterable(items as Iterable<T>);
  } else if (Symbol.asyncIterator in items) {
    return fromAsyncIterable(items as AsyncIterable<T>);
  } else {
    throw new Error(`source items were not (async)iterable`);
  }
}

export function of<T>(...xs: T[]): Stream<T> {
  return fromIterable(xs);
}

export async function* into<T>(input$: Stream<T>) {
  while (true) {
    const result = await input$(NEVER);
    if (result === COMPLETED) return;
    input$ = result[0];
    yield result[1];
  }
}

export async function intoArray<T>(
  input$: Stream<T>,
  cs = NEVER
): Promise<T[]> {
  const items: T[] = [];
  await subscribe(input$, cs, async (item) => items.push(item));
  return items;
}

export function finish<T>(input$: Stream<T>): Promise<T[]> {
  return intoArray(input$, ASAP);
}
