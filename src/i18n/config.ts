export const locales = ["en", "de"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";

export const hasLocale = (value: string): value is Locale =>
  locales.includes(value as Locale);

