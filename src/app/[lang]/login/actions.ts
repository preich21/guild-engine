"use server";

import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";

import { signIn } from "@/auth";
import { users } from "@/db/schema";
import { hasLocale, type Locale } from "@/i18n/config";
import { getSafePostLoginPath } from "@/lib/auth/redirect";
import { db } from "@/lib/db";
import { loadCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getHomePageHref } from "@/lib/feature-flags";

export type LoginActionState = {
  error?: string;
};

export const loginWithCredentials = async (
  locale: Locale,
  nextPath: string | null,
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  const username = formData.get("username");
  const password = formData.get("password");

  if (typeof username !== "string" || typeof password !== "string") {
    return { error: "invalidInput" };
  }

  const userRows = await db
    .select({ id: users.id, preferredLang: users.preferredLang })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  const user = userRows[0];
  const preferredLang = user?.preferredLang;
  const redirectLocale = preferredLang && hasLocale(preferredLang) ? preferredLang : locale;
  const featureConfig = await loadCurrentFeatureConfig();
  const homePath = getHomePageHref(redirectLocale, featureConfig.homePagePath, user?.id);
  const defaultRedirectPath =
    homePath === `/${redirectLocale}/login` ? `/${redirectLocale}/rules` : homePath;

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: getSafePostLoginPath(redirectLocale, nextPath, defaultRedirectPath),
    });
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return { error: "invalidCredentials" };
    }

    throw error;
  }

  return {};
};
