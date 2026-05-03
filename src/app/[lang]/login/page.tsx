import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { hasLocale } from "@/i18n/config";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { getDictionary } from "@/i18n/get-dictionary";
import { getSafePostLoginPath } from "@/lib/auth/redirect";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getHomePageHref } from "@/lib/feature-flags";
import { getPageMetadata } from "@/lib/page-metadata";
import { isEntraConfigured } from "@/lib/auth/entra";

import { loginWithCredentials, loginWithEntra } from "./actions";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/login">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.login.heading);
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[lang]/login">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);
  const resolvedSearchParams = await searchParams;
  const nextPath =
    typeof resolvedSearchParams.next === "string"
      ? resolvedSearchParams.next
      : Array.isArray(resolvedSearchParams.next)
        ? resolvedSearchParams.next[0] ?? null
        : null;
  const session = await auth();

  if (session) {
    const currentUser = await getCurrentUserRecord();

    if (!currentUser) {
      redirect(`/${lang}/register`);
    }

    const redirectLocale =
      currentUser?.preferredLang && hasLocale(currentUser.preferredLang)
        ? currentUser.preferredLang
        : lang;
    const featureConfig = await getCurrentFeatureConfig();
    const homePath = getHomePageHref(redirectLocale, featureConfig.homePagePath, currentUser?.id);
    const defaultRedirectPath =
      homePath === `/${redirectLocale}/login` ? `/${redirectLocale}/rules` : homePath;

    redirect(getSafePostLoginPath(redirectLocale, nextPath, defaultRedirectPath));
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black sm:px-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <LoginForm
          action={loginWithCredentials.bind(null, lang, nextPath)}
          entraAction={loginWithEntra.bind(null, lang, nextPath)}
          entraEnabled={isEntraConfigured()}
          dictionary={dictionary.login}
        />
      </div>
    </main>
  );
}
