import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "./ErrorState";
import { useLanguage } from "../i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Root render-crash guard. Without it a thrown rendering error unmounts the
 * whole React tree and the user is left on a blank page.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled React render error", error, info.componentStack);
  }

  private readonly handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error !== null) {
      return <CrashFallback onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}

function CrashFallback({ onReload }: { onReload: () => void }) {
  const { t } = useLanguage();
  return (
    <main className="app-loading">
      <LanguageSwitcher />
      <ErrorState
        title={t("error.crashTitle")}
        message={t("error.crash")}
        action={<button type="button" className="button button--secondary" onClick={onReload}>{t("common.reload")}</button>}
      />
    </main>
  );
}
