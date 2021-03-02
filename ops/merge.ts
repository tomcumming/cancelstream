import { COMPLETED, Operator, Stream, StreamBody, StreamResult } from "..";
import { CANCELLED, CancelSignal } from "../cancel";

export function merge<T>(): Operator<Stream<T>, T> {
  return function (input$: Stream<Stream<T>>): Stream<T> {
    return async function* (cs: CancelSignal) {
      const inputIter = input$(cs);

      let nextInput:
        | typeof COMPLETED
        | Promise<IteratorResult<Stream<T>, StreamResult>> = inputIter.next();
      let running: [
        Promise<IteratorResult<T, StreamResult>>,
        StreamBody<T>
      ][] = [];

      while (nextInput !== COMPLETED || running.length > 0) {
        const tasks: Promise<unknown>[] = running.map(
          ([nextPromise]) => nextPromise
        );
        if (nextInput !== COMPLETED) tasks.push(nextInput);

        const indexedTasks: Promise<
          [number, unknown]
        >[] = tasks.map((task, idx) => task.then((res) => [idx, task]));
        const [firstIdx, firstTask] = await Promise.race(indexedTasks);
        if (firstIdx === running.length) {
          const promiseResult = firstTask as IteratorResult<
            Stream<T>,
            StreamResult
          >;
          if (promiseResult.done) {
            if (promiseResult.value === CANCELLED) {
              // TODO exhaust all running?
              return CANCELLED;
            } else nextInput = COMPLETED;
          } else {
            const nextIter = promiseResult.value(cs);
            running.push([nextIter.next(), nextIter]);
            nextInput = inputIter.next();
          }
        } else {
          const promiseResult = firstTask as IteratorResult<T, StreamResult>;
          if (promiseResult.done) {
            if (promiseResult.value === CANCELLED) {
              // TODO exhaust all others?
              return CANCELLED;
            } else {
              running.splice(firstIdx, 1);
            }
          } else {
            const nextPromise = running[firstIdx][1].next();
            running[firstIdx] = [nextPromise, running[firstIdx][1]];
            yield promiseResult.value;
          }
        }
      }

      return COMPLETED;
    };
  };
}
