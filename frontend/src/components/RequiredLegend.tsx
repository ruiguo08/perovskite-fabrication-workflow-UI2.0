import { useLanguage } from "../i18n";

/** Explains the required/optional markers used across the builder forms so
 * students can tell which fields block saving and which can keep defaults. */
export function RequiredLegend() {
  const { t } = useLanguage();
  return (
    <p className="builder-legend">
      {t("common.requiredBefore")} <span aria-hidden="true">*</span> {t("common.requiredOr")}{" "}
      <span className="field-marker field-marker--required">{t("common.required")}</span> {t("common.requiredAfter")}{" "}
      <span className="field-marker">{t("common.optional")}</span> {t("common.optionalAfter")}
    </p>
  );
}
