# CancelStream - AsyncIterable with cancellation

```javascript
import { apply, intoAsyncIteratable, Stream } from "cancelstream";
import filter from "cancelstream/ops/filter";
import map from "cancelstream/ops/map";

// Standard `AsyncIterable`s are also valid `Stream`s
const number$ = async function* () {
  for (const n of [1, 2, 3, 4, 5]) yield n;
};

// This is unnecessary, types are inferred
const numberWithType$: Stream<number> = number$;

// Nice operator composition like RxJs
const oddSquare$ = apply(
  number$,
  map((x) => x * x),
  filter((x) => x % 2 === 1)
);

// Easy escapes when you do not care about cancellation
for await (const n of intoAsyncIteratable(oddSquare$)) {
  console.log(n);
}
```
