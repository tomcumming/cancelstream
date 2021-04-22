import * as Process from "process";

import simpleMapTest from "./ops/map.test";
import simpleConcatTest from "./ops/concat.test";
import * as Queue from "./queue.test";

async function runTest(
  name: string,
  test: () => Promise<unknown>,
  timeOut = 1_000
): Promise<boolean> {
  Process.stdout.write(`${name}... `);

  try {
    await Promise.race([
      test(),
      new Promise((_res, rej) => setTimeout(() => rej("Timed out"), timeOut)),
    ]);
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
    await runTest(`Simple map test`, simpleMapTest),
    await runTest(`Simple concat test`, simpleConcatTest),
    await runTest(`Simple queue cancel test`, Queue.testCancel),
    await runTest(`Simple queue complete test`, Queue.testComplete),
  ]);

  const success = (await results).every((result) => result);
  Process.exit(success ? 0 : 1);
}

runAll();
