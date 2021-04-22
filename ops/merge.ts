import { COMPLETED, Operator, Stream } from "..";
import { CANCELLED, cancelSignal } from "../cancel";
import queue from "../queue";

export default function merge<T>(): Operator<Stream<T>, T> {
  return function (input$: Stream<Stream<T>>): Stream<T> {
    let [sender, recv$] = queue<T>();

    let outerClosed = false;
    let innerStreams = 0;

    const [cs, trigger] = cancelSignal();

    function checkFinished() {
      if (outerClosed && innerStreams === 0) sender.complete();
    }

    async function innerHandler(item$: Stream<T>) {
      innerStreams += 1;
      while (true) {
        const itemResult = await item$(cs);
        if (itemResult === COMPLETED) break;
        item$ = itemResult[0];
        const sendResult = await sender.send(itemResult[1]);
        if (sendResult === CANCELLED) {
          trigger();
          break;
        }
      }
      innerStreams -= 1;
      checkFinished();
    }

    async function outerHandler() {
      while (true) {
        const inputResult = await input$(cs);
        if (inputResult === COMPLETED) break;
        input$ = inputResult[0];
        innerHandler(inputResult[1]);
      }
      outerClosed = true;
      checkFinished();
    }

    outerHandler();

    return recv$;
  };
}
