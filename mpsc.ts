import { CANCELLED, CancelSignal, COMPLETED, Stream } from ".";

export const SENT = Symbol("Mpsc sent");
export const BUSY = Symbol("Mpsc busy");

export type SendResult = typeof SENT | typeof CANCELLED;

type State<T> = {
  completed: boolean;
  cancelled: boolean;
  sendQueue: [T, (res: SendResult) => void][];
  recvQueue?: (item: typeof COMPLETED | [T]) => void;
  completeSignal?: () => void;
};

export interface Sender<T> {
  trySend(item: T): typeof BUSY | SendResult;
  send(item: T): Promise<SendResult>;
  complete(): Promise<void>;
}

class SenderImpl<T> implements Sender<T> {
  constructor(private readonly state: State<T>) {}

  trySend(item: T): typeof BUSY | SendResult {
    if (this.state.completed) throw new Error(`Send after complete`);
    if (this.state.cancelled) return CANCELLED;
    if (this.state.sendQueue.length === 0 && this.state.recvQueue) {
      const recvQueue = this.state.recvQueue;
      this.state.recvQueue = undefined;
      recvQueue([item]);
      return SENT;
    }

    return BUSY;
  }

  send(item: T): Promise<SendResult> {
    const tryResult = this.trySend(item);
    if (tryResult === SENT || tryResult === CANCELLED)
      return Promise.resolve(tryResult);
    return new Promise((res) => this.state.sendQueue.push([item, res]));
  }

  complete(): Promise<void> {
    if (this.state.completed) throw new Error(`Double completion`);

    this.state.completed = true;

    if (this.state.sendQueue.length === 0) {
      const recvQueue = this.state.recvQueue;
      this.state.recvQueue = undefined;
      recvQueue?.(COMPLETED);
      return Promise.resolve();
    }

    return new Promise((res) => (this.state.completeSignal = res));
  }
}

function receiver<T>(state: State<T>): Stream<T> {
  return async function* (cs: CancelSignal) {
    while (true) {
      while (true) {
        const firstSend = state.sendQueue.shift();
        if (firstSend === undefined) break;
        const [item, notify] = firstSend;
        notify(SENT);
        yield item;
      }

      if (state.completed) {
        state.completeSignal?.();
        return COMPLETED;
      }

      const firstTask = await Promise.race([
        cs[0],
        new Promise<typeof COMPLETED | [T]>((res) => (state.recvQueue = res)),
      ]);

      if (firstTask === CANCELLED || firstTask === COMPLETED) {
        state.cancelled = firstTask === CANCELLED;
        for (const [item, notify] of state.sendQueue) {
          notify(SENT);
          yield item;
        }
        state.completeSignal?.();
        return COMPLETED;
      } else {
        const [item] = firstTask;
        yield item;
      }
    }
  };
}

/** Multiple producer single consumer queue */
export default function mpsc<T>(): [Sender<T>, Stream<T>] {
  const state: State<T> = {
    completed: false,
    cancelled: false,
    sendQueue: [],
  };

  return [new SenderImpl(state), receiver(state)];
}
