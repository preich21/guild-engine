import { NextRequest, NextResponse } from "next/server";

import { defaultLocale, hasLocale, locales, type Locale } from "@/i18n/config";

const getPreferredLocale = (request: NextRequest): Locale => {
  const acceptedLanguages = request.headers
    .get("accept-language")
    ?.split(",")
    .map((value) => value.split(";")[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const language of acceptedLanguages ?? []) {
    const baseLanguage = language.split("-")[0];

    if (baseLanguage && hasLocale(baseLanguage)) {
      return baseLanguage;
    }
  }

  return defaultLocale;
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (pathnameHasLocale) {
    return;
  }

  const locale = getPreferredLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;

  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};

