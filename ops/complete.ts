import { COMPLETED, Operator, Stream } from "..";
import { CancelSignal } from "../cancel";

/** Return COMPLETED when cancelled */
export default function complete<T>(): Operator<T, T> {
  return (input$: Stream<T>) => {
    return async function* (cs: CancelSignal) {
      const iter = input$(cs);
      while (true) {
        const res = await iter.next();
        if (res.done) return COMPLETED;
        else yield res.value;
      }
    };
  };
}
