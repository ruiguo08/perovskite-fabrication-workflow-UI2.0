import type { ReactNode } from "react";
import { localizeAppText, useLanguage } from "../i18n";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  useLanguage();
  return (
    <div className="empty-state" role="status">
      <p className="empty-state__title">{localizeAppText(title)}</p>
      {description ? (
        <p className="empty-state__description">{localizeAppText(description)}</p>
      ) : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
