import * as Assert from "assert";

import { from, apply, intoArray } from "../..";
import map from "../../ops/map";

export default async function simpleMapTest() {
  const source = [1, 2, 3, 4, 5];
  const mapFn = (n: number) => n * n;
  const expected = source.map(mapFn);

  const result = await intoArray(apply(from(source), map(mapFn)));
  Assert.deepStrictEqual(result, expected);
}
