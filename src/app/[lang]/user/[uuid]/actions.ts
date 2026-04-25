"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { updateSession } from "@/auth";
import { teams, users } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { db } from "@/lib/db";

export type ProfileEditTeam = {
  id: string;
  name: string;
};

export type SaveProfileActionState = {
  status: "idle" | "success" | "error";
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getStringEntry = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
};

export const getProfileEditTeams = async (): Promise<ProfileEditTeam[]> =>
  db
    .select({
      id: teams.id,
      name: teams.name,
    })
    .from(teams)
    .orderBy(asc(teams.name), asc(teams.id));

export const saveProfile = async (
  previousState: SaveProfileActionState,
  formData: FormData,
): Promise<SaveProfileActionState> => {
  void previousState;

  const currentUser = await getCurrentUserRecord();
  const lang = getStringEntry(formData, "lang");
  const targetUserId = getStringEntry(formData, "userId");
  const username = getStringEntry(formData, "username");
  const profilePicture = getStringEntry(formData, "profilePicture");
  const description = getStringEntry(formData, "description");
  const teamId = getStringEntry(formData, "teamId");

  if (
    !currentUser ||
    !lang ||
    !hasLocale(lang) ||
    !targetUserId ||
    !uuidPattern.test(targetUserId) ||
    currentUser.id !== targetUserId ||
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

  await db
    .update(users)
    .set({
      username: normalizedUsername,
      profilePicture: normalizedProfilePicture === "" ? null : normalizedProfilePicture,
      description: normalizedDescription === "" ? null : normalizedDescription,
      teamId,
    })
    .where(and(eq(users.id, currentUser.id), eq(users.id, targetUserId)));

  await updateSession({ user: { name: normalizedUsername } });

  revalidatePath(`/${lang}/user/${targetUserId}`);
  revalidatePath(`/${lang}/leaderboard`);
  revalidatePath(`/${lang}/leaderboard/individual`);
  revalidatePath(`/${lang}/leaderboard/team`);

  return { status: "success" };
};
