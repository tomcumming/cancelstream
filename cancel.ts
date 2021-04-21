export const CANCELLED = Symbol("Cancelled");

// This can't be a promise because typescript will flatten it
export type CancelSignal = [Promise<typeof CANCELLED>];

export type CancelTrigger = () => void;

export function cancelSignal(
  parent?: CancelSignal
): { cs: CancelSignal; cancel: CancelTrigger } {
  let cancel: CancelTrigger = undefined as any;
  const cp: CancelSignal[0] = new Promise((res) => {
    cancel = () => res(CANCELLED);
  });
  parent?.[0].then(cancel);
  return { cs: [cp], cancel };
}
