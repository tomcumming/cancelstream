import { COMPLETED, Operator, Stream, StreamResult } from "..";
import { CancelSignal } from "../cancel";

export default function map<T, U>(mapFn: (item: T) => U): Operator<T, U> {
  const mapInner = (input$: Stream<T>) => (
    cs: CancelSignal
  ): Promise<StreamResult<U>> =>
    input$(cs).then((result) =>
      result === COMPLETED ? COMPLETED : [mapInner(result[0]), mapFn(result[1])]
    );
  return mapInner;
}
