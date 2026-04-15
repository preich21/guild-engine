import type { Locale } from "@/i18n/config";

export const getDefaultPostLoginPath = (locale: Locale) =>
  `/${locale}/leaderboard/individual`;

export const getSafePostLoginPath = (
  locale: Locale,
  requestedPath?: string | null,
): string => {
  if (!requestedPath || !requestedPath.startsWith("/") || requestedPath.startsWith("//")) {
    return getDefaultPostLoginPath(locale);
  }

  const parsed = new URL(requestedPath, "http://localhost");
  const normalizedPath = `${parsed.pathname}${parsed.search}`;
  const localePrefix = `/${locale}`;

  if (
    parsed.pathname !== localePrefix &&
    !parsed.pathname.startsWith(`${localePrefix}/`)
  ) {
    return getDefaultPostLoginPath(locale);
  }

  if (parsed.pathname === `${localePrefix}/login`) {
    return getDefaultPostLoginPath(locale);
  }

  return normalizedPath;
};

