import * as Assert from "assert";

import { intoArray, of, apply } from "../..";
import merge from "../../ops/merge";

export default async function simpleMergeTest() {
  const first3 = [1, 2, 3];
  const second3 = [4, 5, 6];
  const third3 = [7, 8, 9];

  const allSource$ = of(of(...first3), of(...second3), of(...third3));
  const allItems = await intoArray(apply(allSource$, merge()));

  allItems.sort();
  Assert.deepStrictEqual(allItems, [...first3, ...second3, ...third3]);
}
