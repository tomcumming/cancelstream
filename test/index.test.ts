import * as Process from "process";

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
  let success = await runTest(`Simple merge example`, simpleMergeTest);

  Process.exit(success ? 0 : 1);
}

runAll();
