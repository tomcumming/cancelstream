import { COMPLETED, finish, Stream, StreamResult } from ".";
import { CANCELLED, cancelSignal, CancelSignal } from "./cancel";

/** Holds identity for each child */
class Child<T> {
  constructor(public readonly childId: number) {}

  item$(broker: Broker<T>): Stream<T> {
    const loop = async (cs: CancelSignal): Promise<StreamResult<T>> => {
      const result = await Promise.race([cs, broker.next(this)]);
      if (result === CANCELLED) {
        await broker.cancel(this);
        return COMPLETED;
      } else if (result === COMPLETED) {
        return COMPLETED;
      } else {
        return [loop, result[0]];
      }
    };
    return loop;
  }
}

class Broker<T> {
  constructor(input$: Stream<T>, children: Iterable<Child<T>>) {
    this.next$ = input$;
    this.active = new Set(children);
  }

  private next$?: Stream<T>;

  private readonly cs = cancelSignal();

  private readonly active: Set<Child<T>>;
  private readonly pending: Map<
    Child<T>,
    Promise<typeof COMPLETED | [T]>
  > = new Map();
  private readonly ahead: Map<
    Child<T>,
    (res: typeof COMPLETED | [T]) => void
  > = new Map();

  cancel(child: Child<T>): Promise<unknown> {
    if (!this.active.delete(child)) throw new Error("Cancel inactive child");
    this.pending.delete(child);
    this.ahead.delete(child);

    if (this.active.size === 0) {
      if (this.next$) return finish(this.next$);
      else this.cs[1]();
    }

    return Promise.resolve();
  }

  next(child: Child<T>): Promise<typeof COMPLETED | [T]> {
    if (!this.active.has(child) || this.ahead.has(child))
      throw new Error("Child not ready");

    const pending = this.pending.get(child);
    if (pending) {
      this.pending.delete(child);
      this.checkSource();
      return pending;
    }

    const ret = new Promise<typeof COMPLETED | [T]>((res) =>
      this.ahead.set(child, res)
    );
    this.checkSource();
    return ret;
  }

  private async checkSource(): Promise<void> {
    if (this.pending.size === 0 && this.ahead.size > 0 && this.next$) {
      const nextTask = this.next$(this.cs[0]);
      this.next$ = undefined;

      const result = nextTask.then<typeof COMPLETED | [T]>((r) =>
        r === COMPLETED ? COMPLETED : [r[1]]
      );

      for (const child of this.active) {
        if (!this.ahead.has(child)) this.pending.set(child, result);
      }

      const nextResult = await nextTask;
      this.next$ = nextResult === COMPLETED ? undefined : nextResult[0];
      const item: typeof COMPLETED | [T] =
        nextResult === COMPLETED ? COMPLETED : [nextResult[1]];

      for (const ahead of this.ahead.values()) ahead(item);

      this.ahead.clear();
    }
  }
}

/** Split a stream into many children, each is blocked by the slowest */
export function split<T>(input$: Stream<T>, count: number): Stream<T>[] {
  const children: Child<T>[] = [];
  while (count > 0) {
    children.push(new Child(count));
    count -= 1;
  }
  const broker = new Broker(input$, children);
  return children.map((c) => c.item$(broker));
}
