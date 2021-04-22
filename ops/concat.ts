import { COMPLETED, Operator, Stream, StreamResult } from "..";
import { CancelSignal } from "../cancel";

export default function concat<T>(): Operator<Stream<T>, T> {
  return function (input$: Stream<Stream<T>>): Stream<T> {
    let current$: undefined | Stream<T>;

    return async function loop(cs: CancelSignal): Promise<StreamResult<T>> {
      while (true) {
        if (!current$) {
          const inputResult = await input$(cs);
          if (inputResult === COMPLETED) return COMPLETED;
          input$ = inputResult[0];
          current$ = inputResult[1];
        }

        const currentResult = await current$(cs);
        if (currentResult === COMPLETED) {
          current$ = undefined;
        } else {
          current$ = currentResult[0];
          return [loop, currentResult[1]];
        }
      }
    };
  };
}
