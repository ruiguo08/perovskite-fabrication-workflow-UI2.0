import { useEffect, useId, useRef, type ReactNode } from "react";
import { useLanguage } from "../../i18n";
import { trapModalFocus } from "../../lib/modalFocus";

export function BookingDialog({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null),
    id = useId();
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => before?.focus();
  }, []);
  return (
    <div className="dialog-backdrop">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="dialog booking-dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) onClose();
          trapModalFocus(ref.current, event);
        }}
      >
        <div className="booking-dialog__header">
          <h2 id={id}>{title}</h2>
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={onClose}
          >
            {t("common.close")}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
