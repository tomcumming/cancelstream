export const CANCELLED = Symbol("Cancelled");

// This can't be a promise because typescript will flatten it
export type CancelSignal = [Promise<typeof CANCELLED>];

export function cancelSignal(
  parent?: CancelSignal
): { cs: CancelSignal; cancel: () => void } {
  let cancel: () => void = undefined as any;
  const cp: CancelSignal[0] = new Promise((res) => {
    console.log("setting");
    cancel = () => res(CANCELLED);
  });
  parent?.[0].then(cancel);
  return { cs: [cp], cancel };
}
