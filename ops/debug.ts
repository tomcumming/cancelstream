import { COMPLETED, Operator, Stream } from "..";
import { CancelSignal } from "../cancel";

export default function debug<T>(
  onitem: (item: T) => void,
  onComplete?: () => void
): Operator<T, T> {
  return function (input$: Stream<T>) {
    return async function loop(cs: CancelSignal) {
      const res = await input$(cs);
      if (res === COMPLETED) {
        onComplete?.();
        return COMPLETED;
      } else {
        onitem(res[1]);
        input$ = res[0];
        return [loop, res[1]];
      }
    };
  };
}
