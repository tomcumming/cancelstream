import { Stream, Operator, StreamResult, COMPLETED, finish } from "..";
import { cancelSignal, CancelSignal, CANCELLED } from "../cancel";

async function finishStreamTask(
  task: Promise<StreamResult<unknown>>
): Promise<void> {
  const res = await task;
  if (res !== COMPLETED) await finish(res[0]);
}

/** Like `concat` but eagerly subscribe to the next stream */
export default function switchTo<T>(): Operator<Stream<T>, T> {
  return function (input$: Stream<Stream<T>>): Stream<T> {
    let inputTask: undefined | Promise<StreamResult<Stream<T>>>;
    let current$: undefined | Stream<T>;

    const [inputCs, inputTrigger] = cancelSignal();

    return async function loop(cs: CancelSignal): Promise<StreamResult<T>> {
      while (true) {
        if (inputTask === undefined) inputTask = input$(inputCs);

        if (current$ === undefined) {
          const inputResult = await inputTask;
          if (inputResult === COMPLETED) return COMPLETED;
          current$ = inputResult[1];
          inputTask = inputResult[0](cs);
        }

        const [curCs, curTrigger] = cancelSignal();
        const curTask = current$(curCs);
        current$ = undefined;
        const raceResult = await Promise.race([
          cs,
          inputTask.then<{ input: StreamResult<Stream<T>> }>((res) => ({
            input: res,
          })),
          curTask.then<{ current: StreamResult<T> }>((res) => ({
            current: res,
          })),
        ]);

        if (raceResult === CANCELLED) {
          curTrigger();
          inputTrigger();
          await finishStreamTask(curTask);
          await finishStreamTask(inputTask);
          return COMPLETED;
        } else if ("input" in raceResult) {
          curTrigger();
          await finishStreamTask(curTask);
          if (raceResult.input === COMPLETED) return COMPLETED;
          inputTask = undefined;
          input$ = raceResult.input[0];
        } else {
          if (raceResult.current !== COMPLETED) {
            current$ = raceResult.current[0];
            return [loop, raceResult.current[1]];
          }
        }
      }
    };
  };
}
