import { CANCELLED, CancelSignal, COMPLETED, Operator, Stream } from "..";

/** Ignore completion and wait for cancellation */
export default function wait<T>(): Operator<T, T> {
  return (input$: Stream<T>) => {
    return async function* (cs: CancelSignal) {
      const iter = input$(cs);
      while (true) {
        const res = await iter.next();
        if (res.done) {
          if (res.value === COMPLETED) break;
          else return CANCELLED;
        } else {
          yield res.value;
        }
      }
      await cs[0];
      return CANCELLED;
    };
  };
}
