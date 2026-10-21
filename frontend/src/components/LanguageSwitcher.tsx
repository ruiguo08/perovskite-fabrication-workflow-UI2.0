import { useLanguage } from "../i18n";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="language-switcher" role="group" aria-label={t("language.label")}>
      <button type="button" lang="zh-CN" aria-pressed={language === "zh"} onClick={() => setLanguage("zh")}>
        中文
      </button>
      <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>
        English
      </button>
    </div>
  );
}
