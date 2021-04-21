import * as Assert from "assert";

import { intoArray, of } from "..";
import share from "../share/sync";

export async function simpleSyncShareTest() {
  const input$ = of(1, 2, 3, 4, 5);
  const [fst$, snd$] = share(input$);

  const [fst, snd] = await Promise.all([intoArray(fst$), intoArray(snd$)]);

  Assert.deepStrictEqual(fst, [1, 2, 3, 4, 5]);
  Assert.deepStrictEqual(snd, [1, 2, 3, 4, 5]);
}
