import { COMPLETED, Operator, Stream } from "..";
import { CancelSignal } from "../cancel";

export default function fold<T, U>(
  initial: U,
  foldFn: (acc: U, item: T) => U
): Operator<T, U> {
  return function (input$: Stream<T>) {
    let last = initial;
    return async function loop(cs: CancelSignal) {
      const item = await input$(cs);
      if (item === COMPLETED) return COMPLETED;

      input$ = item[0];
      last = foldFn(last, item[1]);

      return [loop, last];
    };
  };
}
