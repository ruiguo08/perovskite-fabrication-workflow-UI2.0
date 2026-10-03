import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { appTheme } from "./theme/theme";
import "./styles.css";

/* The SPA entry route writes a per-request nonce into <meta name="csp-nonce">;
   feeding it to Emotion lets MUI's runtime <style> tags pass the CSP
   style-src nonce check (src/web/middleware.py). Outside /app (Vite dev
   server, tests) there is no nonce and Emotion falls back to 'self' styles
   permitted in development. */
const nonce =
  document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content ??
  undefined;
const insertionPoint =
  document.head.querySelector("meta[name='csp-nonce']") ?? document.head.firstChild;
const emotionCache = createCache({
  key: "mui",
  nonce,
  insertionPoint: insertionPoint as HTMLElement,
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root element in the application shell");
}

createRoot(rootElement).render(
  <StrictMode>
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ThemeProvider>
    </CacheProvider>
  </StrictMode>,
);