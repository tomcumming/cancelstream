import { CancelSignal, Operator, Stream } from "..";

export function flatten<T>(): Operator<Stream<T>, T> {
  return (input$: Stream<Stream<T>>) => {
    return async function* (cs: CancelSignal) {
      const outers = input$(cs);
      while (true) {
        const res = await outers.next();
        if (res.done) return;

        const inners = res.value(cs);
        while (true) {
          const res = await inners.next();
          if (res.done) break;
          yield res.value;
        }
      }
    };
  };
}
