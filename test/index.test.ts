import * as Process from "process";

import { simpleConcatTest } from "./ops/concat.test";
import { simpleMergeTest } from "./ops/merge.test";

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
  ]);

  const success = (await results).every((result) => result);
  Process.exit(success ? 0 : 1);
}

runAll();
