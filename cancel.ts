export const CANCELLED = Symbol("Cancelled");

export type CancelSignal = Promise<typeof CANCELLED>;
export type CancelTrigger = () => void;

export const NEVER: CancelSignal = new Promise(() => {});
export const ASAP: CancelSignal = Promise.resolve(CANCELLED);

export function cancelSignal(): [CancelSignal, CancelTrigger] {
  let trigger!: CancelTrigger;
  const signal: CancelSignal = new Promise(
    (res) => (trigger = () => res(CANCELLED))
  );
  return [signal, trigger];
}
