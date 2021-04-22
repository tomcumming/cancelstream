import { Operator } from "..";
import flatMap from "./flatMap";

export default function filter<T>(
  predicate: (item: T) => boolean
): Operator<T, T> {
  return flatMap((item) => (predicate(item) ? [item] : []));
}
