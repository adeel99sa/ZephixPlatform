import { createPortal } from "react-dom";
import { useCallback, useRef, useState } from "react";

type PortalTooltipProps = {
  label: string;
  children: (handlers: {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave: () => void;
  }) => React.ReactNode;
};

export function PortalTooltip({ label, children }: PortalTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const onMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>) => {
    clearTimeout(hideTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      top: rect.top - 6,
      left: rect.left + rect.width / 2,
    });
    setVisible(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setVisible(false), 100);
  }, []);

  return (
    <>
      {children({ onMouseEnter, onMouseLeave })}
      {visible
        ? createPortal(
            <div
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                transform: "translate(-50%, -100%)",
                zIndex: 99999,
                pointerEvents: "none",
              }}
              className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white shadow-lg whitespace-nowrap"
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
