import * as Process from "process";

import { simpleConcatTest } from "./ops/concat.test";
import { simpleMergeTest } from "./ops/merge.test";
import { simpleSwitchToTest } from "./ops/switchTo.test";
import * as Mpsc from "./mpsc.test";
import { simpleSyncShareTest } from "./share.test";

async function runTest(
  name: string,
  test: () => Promise<unknown>
): Promise<boolean> {
  Process.stdout.write(`${name}... `);

  try {
    await test();
  } catch (e) {
    Process.stdout.write(`FAIL\n`);
    console.error(e);

    return false;
  }

  Process.stdout.write(`OK\n`);
  return true;
}

export async function runAll() {
  const results = Promise.all([
    await runTest(`Simple merge example`, simpleMergeTest),
    await runTest(`Simple concat example`, simpleConcatTest),
    await runTest(`Simple switchTo example`, simpleSwitchToTest),
    await runTest(`Simple MPSC cancel example`, Mpsc.testCancel),
    await runTest(`Simple MPSC complete example`, Mpsc.testComplete),
    await runTest(`Simple share sync example`, simpleSyncShareTest),
  ]);

  const success = (await results).every((result) => result);
  Process.exit(success ? 0 : 1);
}

runAll();
