import { CANCELLED, CancelSignal, COMPLETED, Stream } from ".";

export const BUSY = Symbol("Mpsc busy");

export type SendResult = typeof COMPLETED | typeof CANCELLED;

const enum RecvState {
  pre,
  connected,
  disconnected,
}

class State<T> {
  recv = RecvState.pre;
  queuedSenders: [T, (res: SendResult) => void][] = [];
  queuedReceiver: undefined | ((item: T) => void);
}

class SenderImpl<T> implements Sender<T> {
  constructor(private readonly state: State<T>) {}

  trySend(item: T): typeof BUSY | SendResult {
    if (this.state.recv === RecvState.disconnected) return CANCELLED;
    else if (
      this.state.queuedSenders.length === 0 &&
      this.state.queuedReceiver
    ) {
      const queuedReceiver = this.state.queuedReceiver;
      this.state.queuedReceiver = undefined;
      queuedReceiver(item);
      return COMPLETED;
    } else {
      return BUSY;
    }
  }

  send(item: T): Promise<SendResult> {
    const tryResult = this.trySend(item);
    if (tryResult === COMPLETED || tryResult === CANCELLED)
      return Promise.resolve(tryResult);

    return new Promise((res) => this.state.queuedSenders.push([item, res]));
  }
}

function receiver<T>(state: State<T>): Stream<T> {
  return async function* (cs: CancelSignal) {
    state.recv = RecvState.connected;

    while (true) {
      while (true) {
        const shifted = state.queuedSenders.shift();
        if (shifted === undefined) break;
        const [item, notify] = shifted;
        notify(COMPLETED);
        yield item;
      }

      const firstResult = await Promise.race([
        cs[0],
        new Promise<[T]>((res) => {
          if (state.queuedReceiver || state.recv === RecvState.disconnected)
            throw new Error(`Receiver used multiple times?`);
          state.queuedReceiver = (item) => res([item]);
        }),
      ]);

      if (firstResult === CANCELLED) {
        state.recv = RecvState.disconnected;
        for (const [_item, notify] of state.queuedSenders) notify(CANCELLED);
        return COMPLETED;
      } else {
        const [item] = firstResult;
        yield item;
      }
    }
  };
}

export interface Sender<T> {
  trySend(item: T): typeof BUSY | SendResult;
  send(item: T): Promise<SendResult>;
}

/** Multiple producer single consumer queue */
export default function mpsc<T>(): [Sender<T>, Stream<T>] {
  const state = new State<T>();
  return [new SenderImpl(state), receiver(state)];
}
