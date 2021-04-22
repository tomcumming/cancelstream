import { COMPLETED, Stream, StreamResult } from ".";
import { CANCELLED, CancelSignal, NEVER } from "./cancel";

export const SENT = Symbol("Queue sent");
export const BUSY = Symbol("Queue busy");

export type SendResult = typeof CANCELLED | typeof SENT;

type State<T> = {
  completed: boolean;
  cancelled: boolean;
  sendQueue: [T, (res: typeof SENT) => void][];
  recvQueue?: (item: typeof COMPLETED | [T]) => void;
  completeQueue?: () => void;
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
    if (tryResult !== BUSY) return Promise.resolve(tryResult);
    return new Promise((res) => this.state.sendQueue.push([item, res]));
  }

  complete(): Promise<void> {
    if (this.state.completed) throw new Error(`Already completed`);
    this.state.completed = true;
    if (this.state.sendQueue.length === 0) {
      this.state.recvQueue?.(COMPLETED);
      return Promise.resolve();
    } else {
      return new Promise((res) => (this.state.completeQueue = res));
    }
  }
}

/** Drain send queue ignoring cancel */
function drain<T>(state: State<T>): Stream<T> {
  function loop(): Promise<StreamResult<T>> {
    const queued = state.sendQueue.shift();
    if (queued) {
      const [item, notify] = queued;
      notify(SENT);
      return Promise.resolve([loop, item]);
    } else {
      state.completeQueue?.();
      return Promise.resolve(COMPLETED);
    }
  }
  return loop;
}

function receiver<T>(state: State<T>): Stream<T> {
  async function recv(cs: CancelSignal): Promise<StreamResult<T>> {
    if (state.cancelled) throw new Error(`Queue stream used after cancel`);

    const queued = state.sendQueue.shift();
    if (queued) {
      const [item, notify] = queued;
      notify(SENT);
      return [recv, item];
    } else if (state.completed) {
      state.completeQueue?.();
      return COMPLETED;
    } else {
      const raceResult = await Promise.race([
        cs,
        new Promise<typeof COMPLETED | [T]>((res) => (state.recvQueue = res)),
      ]);
      if (raceResult === CANCELLED) {
        state.cancelled = true;
        return drain(state)(NEVER);
      } else if (raceResult === COMPLETED) {
        return COMPLETED;
      } else {
        return [recv, raceResult[0]];
      }
    }
  }
  return recv;
}

/** Create a mutliple producer single consumer blocking queue */
export default function queue<T>(): [Sender<T>, Stream<T>] {
  const state: State<T> = {
    completed: false,
    cancelled: false,
    sendQueue: [],
  };
  return [new SenderImpl(state), receiver(state)];
}
