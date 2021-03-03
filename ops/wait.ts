import { CANCELLED, CancelSignal, COMPLETED, Operator, Stream } from "..";

/** Delay completion and wait for cancellation */
export default function wait<T>(): Operator<T, T> {
  return (input$: Stream<T>) => {
    return async function* (cs: CancelSignal) {
      const iter = input$(cs);
      while (true) {
        const res = await iter.next();
        if (res.done) {
          break;
        } else {
          yield res.value;
        }
      }
      await cs[0];
      return COMPLETED;
    };
  };
}
