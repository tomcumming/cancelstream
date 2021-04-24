# CancelStream - AsyncIterable with cancellation

## Instructions

1. Use every `Stream` exactly once, either:
   - Pull the next item (and get the next stream)
   - `finish` to cancel and force completion ASAP
   - `intoArray` to wait for natural completion

## Example

```javascript
import { apply, from, into } from ".";
import filter from "./ops/filter";
import map from "./ops/map";

const numberAsyncGenerator = async function* () {
  for (const n of [1, 2, 3, 4, 5]) yield n;
};

// Convert Iterable and AsyncIterable into Stream
const number$ = from(numberAsyncGenerator());

// Nice operator composition like RxJs
const oddSquare$ = apply(
  number$,
  map((x) => x * x),
  filter((x) => x % 2 === 1)
);

// Easy escapes when you do not care about cancellation
for await (const n of into(oddSquare$)) {
  console.log(n);
}
```

## Operators

- `map`
- `filter`
- `flatMap`
- `concat`
- `merge`

## Functions

- `queue` - A multiple producer single consumer channel.
- `split` - Split a source `Stream` into *n* children, each blocked by the slowest.
