import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { useLanguage } from "../i18n";

interface NotReadyProps {
  section: string;
}

/**
 * Fallback for routes that no longer match any application section. Every
 * former legacy section has a React equivalent since the Phase 4 cutover
 * (docs/react-migration.md), so this only renders for unknown paths.
 */
export function NotReady({ section }: NotReadyProps) {
  const { t } = useLanguage();
  return (
    <EmptyState
      title={t("route.missingTitle", { section })}
      description={t("route.missing")}
      action={
        <Link className="button button--secondary" to="/">
          {t("route.back")}
        </Link>
      }
    />
  );
}
