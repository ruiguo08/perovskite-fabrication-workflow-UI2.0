import type { ReactNode } from "react";
import { useLanguage, localizeKnownError } from "../i18n";

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
}

export function ErrorState({
  title,
  message,
  action,
}: ErrorStateProps) {
  const { t } = useLanguage();
  return (
    <div className="error-state" role="alert">
      <p className="error-state__title">{title ? localizeKnownError(title) : t("error.title")}</p>
      <p className="error-state__message">{localizeKnownError(message)}</p>
      {action ? <div className="error-state__action">{action}</div> : null}
    </div>
  );
}
