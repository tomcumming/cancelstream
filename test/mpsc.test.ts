import * as Assert from "assert";
import { COMPLETED, exhaustStreamBody, CANCELLED } from "..";

import { cancelSignal } from "../cancel";
import mpsc, { BUSY } from "../mpsc";

export async function simpleMpscTest() {
  const [sender, recv] = mpsc<number>();

  const cs = cancelSignal();
  const recvBody = recv(cs.cs);

  // Not subscribed yet, should be busy
  Assert.strictEqual(sender.trySend(1), BUSY);

  // Recv is waiting, allow direct send
  const firstTask = recvBody.next();
  Assert.strictEqual(sender.trySend(2), COMPLETED);
  Assert.deepStrictEqual(await firstTask, { value: 2, done: false });

  // Should be busy again
  Assert.strictEqual(sender.trySend(3), BUSY);

  let flagDone = false;

  Promise.all([4, 5, 6].map((n) => sender.send(n))).then(
    () => (flagDone = true)
  );

  Assert.deepStrictEqual(await recvBody.next(), { value: 4, done: false });
  Assert.deepStrictEqual(await recvBody.next(), { value: 5, done: false });
  Assert(!flagDone, `Sends should not be completed yet`);
  Assert.deepStrictEqual(await recvBody.next(), { value: 6, done: false });
  Assert(flagDone, `Sends should have completed`);

  cs.cancel();
  await exhaustStreamBody(recvBody);

  // Report to sender that recv closed
  Assert.deepStrictEqual(await sender.send(7), CANCELLED);
}
