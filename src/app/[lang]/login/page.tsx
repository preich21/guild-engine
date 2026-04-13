import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getSafePostLoginPath } from "@/lib/auth/redirect";

import { loginWithCredentials } from "./actions";

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
    redirect(getSafePostLoginPath(lang, nextPath));
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black sm:px-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <LoginForm
          action={loginWithCredentials.bind(null, lang, nextPath)}
          dictionary={dictionary.login}
        />
      </div>
    </main>
  );
}



