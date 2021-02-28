import { Stream } from ".";

export function apply<T1, T2>(
  input$: Stream<T1>,
  f1: (t1: Stream<T1>) => Stream<T2>
): Stream<T2>;
export function apply<T1, T2, T3>(
  input$: Stream<T1>,
  f1: (t1: Stream<T1>) => Stream<T2>,
  f2: (t2: Stream<T2>) => Stream<T3>
): Stream<T3>;
export function apply<T1, T2, T3, T4>(
  input$: Stream<T1>,
  f1: (t1: Stream<T1>) => Stream<T2>,
  f2: (t2: Stream<T2>) => Stream<T3>,
  f3: (t3: Stream<T3>) => Stream<T4>
): Stream<T4>;
export function apply<T1, T2, T3, T4, T5>(
  input$: Stream<T1>,
  f1: (t1: Stream<T1>) => Stream<T2>,
  f2: (t2: Stream<T2>) => Stream<T3>,
  f3: (t3: Stream<T3>) => Stream<T4>,
  f5: (t4: Stream<T4>) => Stream<T5>
): Stream<T5>;

export function apply(
  input$: Stream<any>,
  ...fs: ((s: Stream<any>) => Stream<any>)[]
): any {
  return fs.reduce((p, c) => c(p), input$);
}

export default apply;
