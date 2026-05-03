"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth, updateSession } from "@/auth";
import { teams, users } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { getExternalIdFromAuthValue } from "@/lib/auth/external-id";
import { db } from "@/lib/db";
import { loadCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getHomePageHref } from "@/lib/feature-flags";
import type { UserProfileFormState } from "@/lib/user-profile-form";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getStringEntry = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
};

const getHomeRedirectPath = async (lang: string, userId: string, preferredLang?: string | null) => {
  const featureConfig = await loadCurrentFeatureConfig();
  const redirectLocale = preferredLang && hasLocale(preferredLang) ? preferredLang : lang;
  const homePath = getHomePageHref(redirectLocale, featureConfig.homePagePath, userId);

  return homePath === `/${redirectLocale}/login` ? `/${redirectLocale}/rules` : homePath;
};

export const registerUser = async (
  previousState: UserProfileFormState,
  formData: FormData,
): Promise<UserProfileFormState> => {
  void previousState;

  const session = await auth();
  const externalId = getExternalIdFromAuthValue(session);
  const lang = getStringEntry(formData, "lang");
  const username = getStringEntry(formData, "username");
  const profilePicture = getStringEntry(formData, "profilePicture");
  const description = getStringEntry(formData, "description");
  const teamId = getStringEntry(formData, "teamId");

  if (
    !session ||
    !externalId ||
    !lang ||
    !hasLocale(lang) ||
    username === null ||
    profilePicture === null ||
    description === null ||
    teamId === null ||
    !uuidPattern.test(teamId)
  ) {
    return { status: "error" };
  }

  const normalizedUsername = username.trim();
  const normalizedDescription = description.trim();
  const normalizedProfilePicture = profilePicture.trim();

  if (
    normalizedUsername === "" ||
    normalizedUsername.length > 255 ||
    normalizedDescription.length > 1023 ||
    normalizedProfilePicture.length > 65535
  ) {
    return { status: "error" };
  }

  const teamRows = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, teamId)).limit(1);

  if (!teamRows[0]) {
    return { status: "error" };
  }

  const existingRows = await db
    .select({ id: users.id, preferredLang: users.preferredLang })
    .from(users)
    .where(eq(users.externalId, externalId))
    .limit(1);
  const existingUser = existingRows[0];

  if (existingUser) {
    redirect(await getHomeRedirectPath(lang, existingUser.id, existingUser.preferredLang));
  }

  const insertedRows = await db
    .insert(users)
    .values({
      username: normalizedUsername,
      externalId,
      profilePicture: normalizedProfilePicture === "" ? null : normalizedProfilePicture,
      description: normalizedDescription === "" ? null : normalizedDescription,
      teamId,
      preferredLang: lang,
    })
    .returning({ id: users.id });

  const insertedUser = insertedRows[0];

  if (!insertedUser) {
    return { status: "error" };
  }

  await updateSession({ user: { name: normalizedUsername } });

  redirect(await getHomeRedirectPath(lang, insertedUser.id, lang));
};

