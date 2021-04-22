import * as Assert from "assert";
import { COMPLETED, finish, CANCELLED, intoArray } from "..";

import { cancelSignal } from "../cancel";
import queue, { BUSY, SENT } from "../queue";

export async function testCancel() {
  const RECV_COMP_ERR = `Receiver completed too eary`;

  let [sender, recv$] = queue<number>();
  const [cs, trigger] = cancelSignal();

  async function pullOne() {
    const result = await recv$(cs);
    if (result === COMPLETED) throw new Error(RECV_COMP_ERR);
    recv$ = result[0];
    return result[1];
  }

  // Not subscribed yet, should be busy
  Assert.strictEqual(sender.trySend(1), BUSY);

  // Recv is waiting, allow direct send
  const firstRecvTask = pullOne();
  Assert.strictEqual(sender.trySend(2), SENT);
  Assert.strictEqual(await firstRecvTask, 2);

  // Should be busy again
  Assert.strictEqual(sender.trySend(3), BUSY);

  let flagDone = false;
  Promise.all([4, 5, 6].map((n) => sender.send(n))).then(
    () => (flagDone = true)
  );

  Assert.strictEqual(await pullOne(), 4);
  Assert.strictEqual(await pullOne(), 5);
  Assert(!flagDone, `Sends should not be completed yet`);
  Assert.strictEqual(await pullOne(), 6);
  Assert(flagDone, `Sends should have completed`);

  trigger();
  Assert.deepStrictEqual(await finish(recv$), []);

  Assert.strictEqual(await sender.send(7), CANCELLED);
}

export async function testComplete() {
  const expected = [1, 2, 3, 4, 5];
  const [sender, recv$] = queue<number>();
  const resultTask = intoArray(recv$);
  for (const n of expected) await sender.send(n);
  await sender.complete();

  const results = await resultTask;
  Assert.deepStrictEqual(results, expected);
}
