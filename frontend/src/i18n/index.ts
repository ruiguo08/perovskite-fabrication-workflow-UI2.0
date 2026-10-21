import { useMemo, useSyncExternalStore, type DependencyList } from "react";
import { messages, type MessageKey } from "./messages";
import { inventoryMessages } from "./inventoryMessages";

export type Language = "zh" | "en";
export const LANGUAGE_STORAGE_KEY = "perovskite.ui.language";
export const DEFAULT_LANGUAGE: Language = "zh";

export function readLanguagePreference(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === "en" || stored === "zh" ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

let language = readLanguagePreference();
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return language;
}

export function localeFor(value: Language): string {
  return value === "zh" ? "zh-CN" : "en-US";
}

export function translate(
  key: MessageKey,
  params: Record<string, unknown> = {},
  value: Language = getLanguage(),
): string {
  const text = messages[key][value === "zh" ? 1 : 0];
  // A single pass keeps braces in a user-supplied name literal.
  return text.replace(/\{(\w+)\}/g, (token, name: string) => {
    if (!Object.hasOwn(params, name)) return token;
    const literal = String(params[name]);
    return ["status", "role", "direction", "plan_type", "scope"].includes(name)
      ? enumLabel(literal, "workflow", value)
      : literal;
  });
}

export function syncDocumentLanguage(): void {
  document.documentElement.lang = localeFor(language);
  document.title = translate("app.title");
}

export function setLanguage(value: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  } catch {
    // Preferences still work for this session when storage is unavailable.
  }
  if (language !== value) {
    language = value;
    syncDocumentLanguage();
    listeners.forEach((listener) => listener());
  }
}

function onStorage(event: StorageEvent): void {
  if (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null) return;
  language = readLanguagePreference();
  syncDocumentLanguage();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useLanguage() {
  const current = useSyncExternalStore(subscribe, getLanguage, () => DEFAULT_LANGUAGE);
  return {
    language: current,
    setLanguage,
    t: (key: MessageKey, params?: Record<string, unknown>) => translate(key, params, current),
  };
}

/** Recompute derived UI labels when the language changes, without refetching data. */
export function useLocalizedMemo<T>(factory: () => T, dependencies: DependencyList): T {
  const current = useSyncExternalStore(subscribe, getLanguage, () => DEFAULT_LANGUAGE);
  // Callers supply ordinary useMemo dependencies; locale is an additional input
  // to translated helper functions even when it is not read in the callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, [current, ...dependencies]);
}

/** Translate only known application messages, never arbitrary user content. */
export function localizeKnownError(message: string): string {
  return localizeAppText(message);
}

export type StatusContext = "workflow" | "account" | "catalog" | "booking";

/** Only schema-owned enums go here. Never call this on material or record names. */
export function enumLabel(value: string, context?: StatusContext, language?: Language): string;
export function enumLabel(value: string | null | undefined, context?: StatusContext, language?: Language): string | undefined;
export function enumLabel(value: string | null | undefined, context: StatusContext = "workflow", language: Language = getLanguage()): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (language === "en") return value.replace(/_/g, " ");
  const normalized = value.toLowerCase().replace(/ /g, "_");
  if (normalized === "active" && context === "account") return translate("status.accountActive", {}, language);
  if (normalized === "active" && context === "catalog") return translate("status.available", {}, language);
  if (normalized === "pending" && context === "catalog") return translate("status.reviewPending", {}, language);
  if (normalized === "planned" && context === "booking") return translate("status.booked", {}, language);
  const statusKey = `status.${normalized}` as MessageKey;
  if (Object.hasOwn(messages, statusKey)) return translate(statusKey, {}, language);
  const labels: Record<string, string> = {
    student: "学生", instructor: "导师", administrator: "管理员",
    control: "对照", target: "目标", standalone: "独立", comparative: "对比",
    shared: "共享", personal: "个人", forward: "正向", reverse: "反向",
    substrate: "基底", chemical: "化学品", solvent: "溶剂", gas: "气体", other: "其他材料",
    spin_coating: "旋涂", sputtering: "磁控溅射", thermal_evaporation: "热蒸发",
    ald: "ALD", general: "一般", fabrication_shortfall: "制备不足", measurement_shortfall: "测量不足",
    solution: "溶液", process: "工艺", fabrication: "制备", characterization: "表征",
    info: "提示", warning: "警告", recorded: "已记录", not_yet: "未记录",
    single_junction: "单结", tandem: "叠层", normal_bandgap: "常规带隙", wide_bandgap: "宽带隙", narrow_bandgap: "窄带隙",
    nip: "正式结构", pin: "反式结构", "n-i-p": "正式结构", "p-i-n": "反式结构",
    diluted_dispersion: "稀释分散液", weighed_solids: "称量固体", spin_coating_vcd: "旋涂 + VCD",
    perovskite: "钙钛矿", electrode: "电极", contact: "接触层", absorber: "吸收层", buffer: "缓冲层",
  };
  return labels[normalized] ?? value.replace(/_/g, " ");
}

type MessagePair = readonly [string, string];
const applicationPairs = (Object.values(inventoryMessages) as readonly MessagePair[])
  .concat(Object.values(messages) as readonly MessagePair[]);
const sourceIndexes = [new Map<string, readonly [string, string]>(), new Map<string, readonly [string, string]>()];
const templateIndexes: { pattern: RegExp; names: string[]; target: string }[][] = [[], []];
for (const pair of applicationPairs) {
  for (const source of [0, 1] as const) {
    const text = pair[source];
    sourceIndexes[source].set(text.trim(), pair);
    const names = [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
    // No catch-all patterns such as "{name}": only recognizable application copy.
    if (!names.length || text.replace(/\{\w+\}/g, "").replace(/[^A-Za-z\u4e00-\u9fff]/g, "").length < 5) continue;
    const parts = text.split(/\{\w+\}/g).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    templateIndexes[source].push({ pattern: new RegExp(`^${parts.join("([\\s\\S]*?)")}$`), names, target: pair[source === 0 ? 1 : 0] });
  }
}

/** Localize known application-owned labels/messages, retaining inserted data literally.
 * Call only at explicit UI-copy boundaries, never on names, notes or numeric values.
 */
export function localizeAppText(value: string): string {
  const source = getLanguage() === "zh" ? 0 : 1;
  const target = source === 0 ? 1 : 0;
  const exact = sourceIndexes[source].get(value.trim());
  if (exact) return (value.match(/^\s*/)?.[0] ?? "") + exact[target].trim() + (value.match(/\s*$/)?.[0] ?? "");
  for (const entry of templateIndexes[source]) {
    const match = entry.pattern.exec(value);
    if (!match) continue;
    const args = Object.fromEntries(entry.names.map((name, index) => [name, match[index + 1]]));
    return entry.target.replace(/\{(\w+)\}/g, (token, name: string) => {
      if (!Object.hasOwn(args, name)) return token;
      return ["status", "role", "direction", "plan_type"].includes(name) ? enumLabel(args[name]) : args[name];
    });
  }
  return value;
}
