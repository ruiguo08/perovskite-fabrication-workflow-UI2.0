import { localizeKnownError, useLanguage } from "../i18n";

interface InlineFormErrorProps {
  message: string | null;
}

export function InlineFormError({ message }: InlineFormErrorProps) {
  useLanguage();
  return message ? (
    <p className="inline-form-error" role="alert">
      {localizeKnownError(message)}
    </p>
  ) : null;
}
