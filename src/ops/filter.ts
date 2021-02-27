import { CancelSignal, Operator, Stream } from "..";

export default function filter<T>(
  condition: (t: T) => boolean
): Operator<T, T> {
  return (input$: Stream<T>) => {
    return async function* (cs: CancelSignal) {
      const x = input$(cs);
      while (true) {
        const res = await x.next();
        if (res.done) return;
        else if (condition(res.value)) yield res.value;
      }
    };
  };
}
