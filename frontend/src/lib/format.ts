/** Formatting helpers shared across the application. */
import { getLanguage, localeFor, translate } from "../i18n";

function dateTimeFormat() {
  return new Intl.DateTimeFormat(localeFor(getLanguage()), {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateFormat() {
  return new Intl.DateTimeFormat(localeFor(getLanguage()), {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dateTimeFormat().format(date);
}

/**
 * Compact relative time for list rows ("2 h ago"); falls back to a short
 * absolute date once a record is older than a week. Precision-critical
 * surfaces (provenance, audit history, page-header metadata) keep
 * {@link formatDateTime}.
 */
export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) {
    return translate("time.now");
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return translate("time.minutes", { n: minutes });
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return translate("time.hours", { n: hours });
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return translate("time.days", { n: days });
  }
  return dateFormat().format(date);
}

export function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Format a number with fixed digits, or an em dash for null/NaN/Infinity. */
export function formatNumber(value: number | null | undefined, digits: number): string {
  return Number.isFinite(value) ? (value as number).toFixed(digits) : "—";
}

/**
 * Scale a server-provided metric for display. FF is stored as a 0–1 fraction
 * and shown as a percent; other metrics pass through. Null/non-finite values
 * stay null so {@link formatNumber} renders an em dash.
 */
export function scaleMetric(name: string, value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return name === "ff" ? value * 100 : value;
}
