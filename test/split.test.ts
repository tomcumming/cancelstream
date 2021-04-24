import * as Assert from "assert";

import { COMPLETED, finish, from, intoArray } from "..";
import apply from "../apply";
import { NEVER, CANCELLED } from "../cancel";
import merge from "../ops/merge";
import queue, { BUSY } from "../queue";
import { split } from "../split";

const NO_COMPLETED_MSG = "Did not expect completed";

export async function testCancel() {
  const [sender, input$] = queue();
  let [split1$, split2$, split3$] = split(input$, 3);

  // Must not eagerly pull
  Assert.strictEqual(sender.trySend(1), BUSY);
  sender.send(2);
  sender.send(3);

  const res1 = await split1$(NEVER);
  if (res1 === COMPLETED) throw new Error(NO_COMPLETED_MSG);
  Assert.strictEqual(res1[1], 2);
  split1$ = res1[0];

  let x = false;
  const task2 = split1$(NEVER).then((res) => {
    x = true;
    return res;
  });
  const task3 = split2$(NEVER);
  Assert(!x, "Must not read ahead (of split3$)");

  const [res2, res3, res4] = await Promise.all([task2, task3, split3$(NEVER)]);
  Assert(x, "Reading from split3$ should have unblocked split1$");

  if (res2 === COMPLETED || res3 === COMPLETED || res4 === COMPLETED)
    throw new Error(NO_COMPLETED_MSG);

  split1$ = res2[0];
  split2$ = res3[0];
  split3$ = res4[0];
  Assert.strictEqual(res2[1], 3);
  Assert.strictEqual(res3[1], 2);
  Assert.strictEqual(res4[1], 2);

  await finish(split1$);
  await finish(split3$);

  const res5 = await split2$(NEVER);
  if (res5 === COMPLETED) throw new Error(NO_COMPLETED_MSG);
  split2$ = res5[0];
  Assert.strictEqual(res5[1], 3);

  // Notice when all children have finished
  await finish(split2$);
  Assert.strictEqual(sender.trySend(4), CANCELLED);
}

export async function testCompleted() {
  const inputs = [1, 2, 3, 4, 5];
  const expected = inputs.flatMap(() => inputs).sort();

  const split$s = split(from(inputs), 5);
  const results = await intoArray(apply(from(split$s), merge()));

  Assert.deepStrictEqual(results.sort(), expected);
}
