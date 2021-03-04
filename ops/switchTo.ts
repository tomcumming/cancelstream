import {
  CancelSignal,
  COMPLETED,
  exhaustStreamBody,
  Operator,
  Stream,
  StreamBody,
  StreamResult,
} from "..";
import { cancelSignal } from "../cancel";

/** Like concat but unsub from inner stream as soon as next outer arrives */
export default function switchTo<T>(): Operator<Stream<T>, T> {
  return (input$: Stream<Stream<T>>) => {
    return async function* (cs: CancelSignal) {
      const outerIter = input$(cs);
      let outerResult = await outerIter.next();

      while (true) {
        if (outerResult.done) return COMPLETED;

        const innerCs = cancelSignal(cs);
        const innerIter = outerResult.value(innerCs.cs);
        const outerNext = outerIter.next();

        while (true) {
          const innerNext = innerIter.next();

          const tasks = [
            outerNext.then((res) => ({ outer: res })),
            innerNext.then((res) => ({ inner: res })),
          ];

          const firstTask = await Promise.race(tasks);
          if ("outer" in firstTask) {
            if (firstTask.outer.done) {
              return yield* finishInner(await innerNext, innerIter);
            } else {
              innerCs.cancel();
              await exhaustStreamBody(innerIter);
              outerResult = firstTask.outer;
              break;
            }
          } else {
            if (firstTask.inner.done) {
              outerResult = await outerNext;
              break;
            } else {
              yield firstTask.inner.value;
            }
          }
        }
      }
    };
  };
}

async function* finishInner<T>(
  next: IteratorResult<T, StreamResult>,
  rest: StreamBody<T>
): AsyncGenerator<T, StreamResult, unknown> {
  while (!next.done) {
    yield next.value;
    next = await rest.next();
  }
  return COMPLETED;
}
