import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a debounced version of `fn` that runs `delay` ms after the last call.
 * Cancels pending invocations on unmount.
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void | Promise<void>,
  delay: number,
): (...args: TArgs) => void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  useEffect((): (() => void) => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: TArgs) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = undefined;
        void fnRef.current(...args);
      }, delay);
    },
    [delay],
  );
}
