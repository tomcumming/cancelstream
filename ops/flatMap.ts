import { from, Operator, Stream } from "..";
import apply from "../apply";
import concat from "./concat";
import map from "./map";

export type FlatMapFnResult<T> = Iterable<T> | AsyncIterable<T> | Stream<T>;

export default function flatMap<T, U>(
  mapFn: (item: T) => FlatMapFnResult<U>
): Operator<T, U> {
  return function (input$: Stream<T>) {
    return apply(
      input$,
      map((item) => {
        const mapResult = mapFn(item);
        return Symbol.iterator in mapResult || Symbol.asyncIterator in mapResult
          ? from<U>(mapResult as any)
          : (mapResult as Stream<U>);
      }),
      concat()
    );
  };
}
