import * as Assert from "assert";
import { Stream, CancelSignal, COMPLETED, from, NEVER_CANCEL, of } from "../..";
import apply from "../../apply";
import switchTo from "../../ops/switchTo";

export async function simpleSwitchToTest() {
  let nextOuter = (undefined as any) as () => void;
  let firstCancelled = false;

  const firstInner$: Stream<number> = async function* (cs: CancelSignal) {
    yield 1;
    yield 2;
    await cs[0];
    firstCancelled = true;
    return COMPLETED;
  };

  const outer$ = async function* () {
    yield firstInner$;
    await new Promise<void>((res) => {
      nextOuter = res;
    });
    yield of(4, 5);
  };

  const iter = apply(from(outer$()), switchTo())(NEVER_CANCEL);

  const firstResult = await iter.next();
  Assert.deepStrictEqual(firstResult, { done: false, value: 1 });
  const secondResult = await iter.next();
  Assert.deepStrictEqual(secondResult, { done: false, value: 2 });

  nextOuter();

  const thirdResult = await iter.next();
  Assert.deepStrictEqual(thirdResult, { done: false, value: 4 });
  const fourthResult = await iter.next();
  Assert.deepStrictEqual(fourthResult, { done: false, value: 5 });
  const fifthResult = await iter.next();
  Assert.deepStrictEqual(fifthResult.done, true);

  Assert(firstCancelled, `The first inner stream was not cancelled`);
}
