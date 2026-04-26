import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { defaultLocale, hasLocale, locales, type Locale } from "@/i18n/config";
import { getSafePostLoginPath } from "@/lib/auth/redirect";
import { loadCurrentFeatureConfig } from "@/lib/feature-config-server";
import { isRouteEnabled } from "@/lib/feature-flags";

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

const getLocaleFromPathname = (pathname: string): Locale | null => {
  const [, maybeLocale] = pathname.split("/");
  return maybeLocale && hasLocale(maybeLocale) ? maybeLocale : null;
};

export const proxy = auth(async (request: NextRequest & { auth: unknown }) => {
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!pathnameHasLocale) {
    const locale = getPreferredLocale(request);
    request.nextUrl.pathname = `/${locale}${pathname}`;

    return NextResponse.redirect(request.nextUrl);
  }

  const locale = getLocaleFromPathname(pathname);

  if (!locale) {
    return NextResponse.next();
  }

  const isLoginPath = pathname === `/${locale}/login`;
  const isAuthenticated = Boolean(request.auth);

  if (!isAuthenticated && !isLoginPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isLoginPath) {
    const nextPath = request.nextUrl.searchParams.get("next");
    const redirectPath = getSafePostLoginPath(locale, nextPath);

    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  const featureConfig = await loadCurrentFeatureConfig();

  if (!isRouteEnabled(pathname, locale, featureConfig.state)) {
    const notFoundUrl = request.nextUrl.clone();
    notFoundUrl.pathname = `/${locale}/404`;
    notFoundUrl.search = "";

    return NextResponse.rewrite(notFoundUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
