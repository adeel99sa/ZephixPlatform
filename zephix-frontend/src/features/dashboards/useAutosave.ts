import { useCallback, useRef, useState } from "react";
import { patchDashboard } from "./api";

export function useAutosave(id: string) {
  const timer = useRef<number | undefined>(undefined);
  const [status, setStatus] = useState<"idle"|"saving"|"saved"|"conflict"|"error">("idle");
  const etagRef = useRef<string | undefined>();

  const setEtag = (etag?: string) => { etagRef.current = etag; };

  const save = useCallback((payload: any) => {
    window.clearTimeout(timer.current);
    setStatus("saving");
    timer.current = window.setTimeout(async () => {
      try {
        await patchDashboard(id, payload, etagRef.current);
        setStatus("saved");
      } catch (e: any) {
        if (e?.response?.status === 412) {
          // Precondition Failed – ETag mismatch
          setStatus("conflict");
        } else {
          setStatus("error");
        }
      }
    }, 500); // debounce
  }, [id]);

  return { save, status, setEtag };
}
