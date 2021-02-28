import { CancelSignal, Operator, Stream } from "..";

export default function map<T, U>(f: (t: T) => U): Operator<T, U> {
  return (input$: Stream<T>) => {
    return async function* (cs: CancelSignal) {
      const x = input$(cs);
      while (true) {
        const res = await x.next();
        if (res.done) return res.value;
        yield f(res.value);
      }
    };
  };
}
