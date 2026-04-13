"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import type { Locale } from "@/i18n/config";
import { getSafePostLoginPath } from "@/lib/auth/redirect";

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

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: getSafePostLoginPath(locale, nextPath),
    });
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return { error: "invalidCredentials" };
    }

    throw error;
  }

  return {};
};

