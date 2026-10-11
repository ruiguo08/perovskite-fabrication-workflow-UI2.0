import type { ReactNode } from "react";

/**
 * Presentation primitives for the Materials / Layer presets card library.
 * Pure layout components over the .lib- styles in library.css — no data
 * access, no permissions, so both pages stay consistent without sharing
 * selectors with other catalog pages.
 */

export function LibTags({ children }: { children: ReactNode }) {
  return <div className="lib-tags">{children}</div>;
}

export function LibTag({
  tone,
  children,
}: {
  tone?: "ok" | "warn" | "info" | "scope";
  children: ReactNode;
}) {
  return (
    <span className={`lib-tag${tone ? ` lib-tag--${tone}` : ""}`}>{children}</span>
  );
}

export function LibFacts({
  facts,
  singleColumn = false,
}: {
  facts: { label: string; value: ReactNode }[];
  singleColumn?: boolean;
}) {
  if (facts.length === 0) {
    return null;
  }
  return (
    <dl className={`lib-facts${singleColumn ? " lib-facts--single" : ""}`}>
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LibCardNote({
  tone = "warn",
  children,
}: {
  tone?: "warn" | "info";
  children: ReactNode;
}) {
  return (
    <p className={`lib-card-note${tone === "info" ? " lib-card-note--info" : ""}`} role={tone === "warn" ? "note" : undefined}>
      {children}
    </p>
  );
}

export function LibRecord({
  labelledBy,
  children,
}: {
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <article className="lib-record" aria-labelledby={labelledBy}>
      {children}
    </article>
  );
}

export function LibSection({
  title,
  hint,
  labelledBy,
  children,
}: {
  title: string;
  hint?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <section className="lib-section" aria-labelledby={labelledBy}>
      <h3 id={labelledBy}>{title}</h3>
      {hint ? <p className="lib-section-hint">{hint}</p> : null}
      {children}
    </section>
  );
}

export function LibSteps({ steps }: { steps: { title: string; detail: ReactNode }[] }) {
  if (steps.length === 0) {
    return null;
  }
  return (
    <ol className="lib-steps">
      {steps.map((step, index) => (
        <li key={`${step.title}-${index}`}>
          <span className="lib-steps__num">{index + 1}.</span>
          <span className="lib-steps__body">
            <strong>{step.title}</strong>
            {step.detail ? <> — {step.detail}</> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
