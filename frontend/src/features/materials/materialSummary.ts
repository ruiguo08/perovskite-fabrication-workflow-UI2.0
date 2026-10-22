import { titleCase } from "../../lib/format";
import { localizeAppText } from "../../i18n";
import type { Material, MaterialProduct } from "../../types/api";

/**
 * Category-aware summary helpers for material browse cards. Summaries only
 * show values that actually exist in the record — nothing is inferred, no
 * units or grades are invented, and missing optional identity values are
 * stated explicitly.
 */

const CATEGORY_LABELS: Record<string, string> = {
  substrate: "Substrate",
  chemical: "Chemical",
  solvent: "Solvent",
  gas: "Gas",
  other: "Other material",
};

/** Specification keys most useful on a card, per material category. */
const CATEGORY_SPEC_PRIORITY: Record<string, string[]> = {
  substrate: ["dimensions", "size", "sheet_resistance", "thickness", "thickness_mm", "resistance", "conductivity", "surface", "coating"],
  chemical: ["purity", "assay", "concentration", "grade", "molecular_weight", "appearance", "form"],
  solvent: ["purity", "grade", "boiling_point", "density", "water_content", "appearance"],
  gas: ["purity", "grade", "composition", "pressure", "cylinder_size"],
  other: [],
};

export function materialCategoryLabel(category: string): string {
  return localizeAppText(CATEGORY_LABELS[category] ?? titleCase(category));
}

/** Readable display of a free-form specification key. */
export function titleMaterialSpec(key: string): string {
  return titleCase(key);
}

export function formatSpecificationValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "Not recorded";
  }
  if (typeof value === "string") {
    return value.trim() === "" ? "Not recorded" : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Up to `max` scalar specification entries for a card, prioritized by
 * category. Complex values are skipped here (they remain in the record and
 * are shown in details).
 */
export function materialSummaryFacts(material: Material, max = 4): { label: string; value: string }[] {
  const priority = CATEGORY_SPEC_PRIORITY[material.category] ?? [];
  const entries = Object.entries(material.specification).filter(([, value]) => {
    return value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "");
  });
  const ordered: [string, unknown][] = [];
  for (const key of priority) {
    const entry = entries.find(([entryKey]) => entryKey === key);
    if (entry && !ordered.some(([existingKey]) => existingKey === key)) {
      ordered.push(entry);
    }
  }
  for (const entry of entries) {
    if (ordered.length >= max) break;
    if (!ordered.some(([existingKey]) => existingKey === entry[0])) {
      ordered.push(entry);
    }
  }
  return ordered.slice(0, max).map(([key, value]) => ({
    label: titleCase(key),
    value: formatSpecificationValue(value),
  }));
}

export function materialIdentityFacts(material: Material): { label: string; value: string }[] {
  return [
    { label: "Formula", value: material.formula.trim() || "Not recorded" },
    { label: "CAS number", value: material.cas_number.trim() || "Not recorded" },
  ];
}

export function productSummary(product: MaterialProduct): { label: string; value: string }[] {
  return Object.entries(product.specification)
    .filter(([, value]) => value !== null && value !== undefined && !(typeof value === "string" && value.trim() === ""))
    .slice(0, 4)
    .map(([key, value]) => ({ label: titleCase(key), value: formatSpecificationValue(value) }));
}
