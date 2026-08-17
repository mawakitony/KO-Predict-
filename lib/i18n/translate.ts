import { en } from "@/lib/i18n/en";
import { fr } from "@/lib/i18n/fr";
import type { Locale } from "@/lib/i18n/storage";
import type { MessageTree } from "@/lib/i18n/types";

export type Messages = MessageTree<typeof fr>;

type DotPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? DotPaths<T[K], `${Prefix}${K}.`>
      : never;
}[keyof T & string];

export type MessageKey = DotPaths<Messages>;

export type TranslateParams = Record<string, string | number>;

export function messagesFor(locale: Locale): Messages {
  return locale === "en" ? en : fr;
}

function lookup(messages: Messages, key: MessageKey): string {
  const parts = key.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}

export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] == null ? `{${name}}` : String(params[name]),
  );
}

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: TranslateParams,
): string {
  return interpolate(lookup(messagesFor(locale), key), params);
}

export function collectMessageKeys(
  tree: Record<string, unknown>,
  prefix = "",
): string[] {
  const keys: string[] = [];
  for (const [name, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${name}` : name;
    if (typeof value === "string") {
      keys.push(path);
    } else if (value && typeof value === "object") {
      keys.push(...collectMessageKeys(value as Record<string, unknown>, path));
    }
  }
  return keys;
}
