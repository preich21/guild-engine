import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { users } from "@/db/schema";
import { defaultLocale, hasLocale, locales, type Locale } from "@/i18n/config";
import { getSafePostLoginPath } from "@/lib/auth/redirect";
import { db } from "@/lib/db";
import { loadCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getHomePageHref, isRouteEnabled } from "@/lib/feature-flags";

const getLocaleFromPathname = (pathname: string): Locale | null => {
  const [, maybeLocale] = pathname.split("/");
  return maybeLocale && hasLocale(maybeLocale) ? maybeLocale : null;
};

const getAuthenticatedUsername = (authValue: unknown) => {
  const userName = (authValue as { user?: { name?: unknown } } | null)?.user?.name;

  return typeof userName === "string" && userName.trim() !== "" ? userName : null;
};

const getAuthenticatedUserRecord = async (authValue: unknown) => {
  const username = getAuthenticatedUsername(authValue);

  if (!username) {
    return null;
  }

  const userRows = await db
    .select({ id: users.id, preferredLang: users.preferredLang })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return userRows[0] ?? null;
};

const getAuthenticatedHomePath = async (
  locale: Locale,
  homePagePath: string | null,
  authValue: unknown,
) => {
  const user = await getAuthenticatedUserRecord(authValue);
  const preferredLocale =
    user?.preferredLang && hasLocale(user.preferredLang) ? user.preferredLang : locale;
  const homePath = getHomePageHref(preferredLocale, homePagePath, user?.id);

  return homePath === `/${preferredLocale}/login` ? `/${preferredLocale}/rules` : homePath;
};

const getAuthenticatedRedirectContext = async (
  locale: Locale,
  homePagePath: string | null,
  authValue: unknown,
) => {
  const user = await getAuthenticatedUserRecord(authValue);
  const redirectLocale =
    user?.preferredLang && hasLocale(user.preferredLang) ? user.preferredLang : locale;
  const homePath = getHomePageHref(redirectLocale, homePagePath, user?.id);

  return {
    locale: redirectLocale,
    homePath: homePath === `/${redirectLocale}/login` ? `/${redirectLocale}/rules` : homePath,
  };
};

export const proxy = auth(async (request: NextRequest & { auth: unknown }) => {
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!pathnameHasLocale) {
    request.nextUrl.pathname = `/${defaultLocale}${pathname}`;

    return NextResponse.redirect(request.nextUrl);
  }

  const locale = getLocaleFromPathname(pathname);

  if (!locale) {
    return NextResponse.next();
  }

  const isLoginPath = pathname === `/${locale}/login`;
  const isAuthenticated = Boolean(request.auth);

  if (pathname === `/${locale}/protocol-raffle`) {
    const roleRaffleUrl = request.nextUrl.clone();
    roleRaffleUrl.pathname = `/${locale}/role-raffle`;

    return NextResponse.redirect(roleRaffleUrl);
  }

  if (!isAuthenticated && !isLoginPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  const featureConfig = await loadCurrentFeatureConfig();

  if (isAuthenticated && isLoginPath) {
    const nextPath = request.nextUrl.searchParams.get("next");
    const redirectContext = await getAuthenticatedRedirectContext(
      locale,
      featureConfig.homePagePath,
      request.auth,
    );
    const redirectPath = getSafePostLoginPath(
      redirectContext.locale,
      nextPath,
      redirectContext.homePath,
    );

    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (isAuthenticated && pathname === `/${locale}`) {
    const homePath = await getAuthenticatedHomePath(locale, featureConfig.homePagePath, request.auth);

    return NextResponse.redirect(new URL(homePath, request.url));
  }

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
