import { CANCELLED, Stream, subscribe } from "..";
import { cancelSignal } from "../cancel";
import mpsc from "../mpsc";

/** Split a stream in two, syncronised by blocking */
export default function share<T>(
  input$: Stream<T>
): [Stream<T>, Stream<T>, Promise<unknown>] {
  const cs = cancelSignal();
  const [leftSender, left$] = mpsc<T>();
  const [rightSender, right$] = mpsc<T>();
  let cancelled = false;

  const task = subscribe(input$, cs.cs, async (item) => {
    const [leftResult, rightResult] = await Promise.all([
      leftSender.send(item),
      rightSender.send(item),
    ]);
    if ((leftResult === CANCELLED || rightResult === CANCELLED) && !cancelled) {
      cancelled = true;
      cs.cancel();
    }
  }).then(() => Promise.all([leftSender.complete(), rightSender.complete()]));

  return [left$, right$, task];
}
