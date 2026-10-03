import type { Theme } from "@mui/material/styles";
import { createTheme } from "@mui/material/styles";

/* Apple brand spec (owner-selected 2026-10-03) mapped onto MUI. Single
   source of truth with styles/tokens.css: change both together. Domain
   state colors (ITO cyan / perovskite violet / success green / amber) are
   a functional semantic layer — they never become interactive colors. */
export const appTheme: Theme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: "#0071e3", dark: "#0060c9", contrastText: "#ffffff" },
    success: { main: "#1e7a4d" },
    warning: { main: "#b66a00" },
    error: { main: "#b3261e" },
    info: { main: "#168a9d" },
    secondary: { main: "#6852b8" },
    background: { default: "#f5f5f7", paper: "#ffffff" },
    text: {
      primary: "#1d1d1f",
      secondary: "rgba(0, 0, 0, 0.8)",
      disabled: "rgba(0, 0, 0, 0.48)",
    },
    divider: "rgba(0, 0, 0, 0.08)",
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, "PingFang SC", "Microsoft YaHei UI", sans-serif',
    h1: { fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.28px", lineHeight: 1.14 },
    h2: { fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.28px", lineHeight: 1.19 },
    h3: { fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.224px" },
    body1: { fontSize: "0.875rem", letterSpacing: "-0.224px", lineHeight: 1.47 },
    body2: { fontSize: "0.8125rem", letterSpacing: "-0.12px", lineHeight: 1.47 },
    button: { textTransform: "none", fontWeight: 400, letterSpacing: "-0.12px" },
    caption: { fontSize: "0.75rem", letterSpacing: "-0.12px" },
  },
  shape: { borderRadius: 8 },
  components: {
    /* Apple: focus rings are blue outlines; ripples are Material and stay out. */
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 15, boxShadow: "none" },
        contained: {
          "&:hover": { backgroundColor: "#0077ed", boxShadow: "none" },
        },
        outlined: { borderColor: "rgba(0,0,0,.16)", color: "#1d1d1f" },
        text: { color: "#0066cc" },
      },
    },
    /* Panels: #f5f5f7 surfaces on white — never borders, never shadows. */
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { border: 0 },
      },
      defaultProps: { elevation: 0 },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#fafafc",
          boxShadow: "0 0 0 3px rgba(0,0,0,.04)",
          borderRadius: 11,
          "& fieldset": { border: "none" },
          "&:hover fieldset": { border: "none" },
          "&.Mui-focused fieldset": { border: "none" },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(0,0,0,.05)",
          padding: "10px 12px",
          fontSize: "0.8125rem",
          letterSpacing: "-0.12px",
        },
        head: {
          fontSize: "0.71875rem",
          fontWeight: 600,
          color: "rgba(0,0,0,.48)",
          letterSpacing: "-0.12px",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, letterSpacing: "-0.12px" },
      },
    },
    MuiDrawer: { styleOverrides: { paper: { backgroundColor: "#ffffff" } } },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: "rgba(0,0,0,.22) 3px 5px 30px 0px",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 6, borderRadius: 999, backgroundColor: "rgba(0,0,0,.08)" },
        bar: { borderRadius: 999, backgroundColor: "#0071e3" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: "#1d1d1f", fontSize: "0.75rem" },
      },
    },
  },
});
