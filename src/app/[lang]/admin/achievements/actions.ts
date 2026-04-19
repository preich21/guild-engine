"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import { achievements } from "@/db/schema";
import {
  parseAchievementCriteriaInput,
  validateAchievementInput,
  type AchievementInput,
  type AchievementCriteria,
} from "@/lib/achievements";
import { hasLocale } from "@/i18n/config";
import { db } from "@/lib/db";

export type AchievementEntry = {
  id: string;
  title: string;
  description: string | null;
  image: string;
  criteria: AchievementCriteria;
};

export type CreateAchievementActionState = {
  status: "idle" | "success" | "error";
};

const initialState: CreateAchievementActionState = { status: "idle" };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getStringEntry = (
  formData: FormData,
  key: Exclude<keyof AchievementInput, "criteria"> | "lang",
) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
};

export const getAchievements = async (): Promise<AchievementEntry[]> => {
  await requireAdminAccess();

  return db
    .select({
      id: achievements.id,
      title: achievements.title,
      description: achievements.description,
      image: achievements.image,
      criteria: achievements.criteria,
    })
    .from(achievements)
    .orderBy(achievements.title, achievements.id);
};

export const createAchievement = async (
  previousState: CreateAchievementActionState = initialState,
  formData: FormData,
): Promise<CreateAchievementActionState> => {
  await requireAdminAccess();
  void previousState;

  const lang = getStringEntry(formData, "lang");
  const title = getStringEntry(formData, "title");
  const description = getStringEntry(formData, "description");
  const image = getStringEntry(formData, "image");
  const criteriaEntry = formData.get("criteria");
  const criteria =
    typeof criteriaEntry === "string" ? parseAchievementCriteriaInput(criteriaEntry) : null;

  if (
    !lang ||
    !hasLocale(lang) ||
    title === null ||
    description === null ||
    image === null ||
    criteria === null
  ) {
    return { status: "error" };
  }

  const validation = validateAchievementInput({
    title,
    description,
    image,
    criteria,
  });

  if (!validation.isValid) {
    return { status: "error" };
  }

  await db.insert(achievements).values({
    title: validation.normalized.title,
    description: validation.normalized.description === "" ? null : validation.normalized.description,
    image: validation.normalized.image,
    criteria: validation.normalized.criteria,
  });

  revalidatePath(`/${lang}/admin/achievements`);

  return { status: "success" };
};

export const updateAchievement = async (
  lang: unknown,
  id: unknown,
  input: AchievementInput,
): Promise<boolean> => {
  await requireAdminAccess();

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof id !== "string" ||
    !uuidPattern.test(id)
  ) {
    return false;
  }

  const validation = validateAchievementInput(input);

  if (!validation.isValid) {
    return false;
  }

  await db
    .update(achievements)
    .set({
      title: validation.normalized.title,
      description: validation.normalized.description === "" ? null : validation.normalized.description,
      image: validation.normalized.image,
      criteria: validation.normalized.criteria,
    })
    .where(eq(achievements.id, id));

  revalidatePath(`/${lang}/admin/achievements`);

  return true;
};

export const deleteAchievement = async (lang: unknown, id: unknown): Promise<boolean> => {
  await requireAdminAccess();

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof id !== "string" ||
    !uuidPattern.test(id)
  ) {
    return false;
  }

  await db.delete(achievements).where(eq(achievements.id, id));

  revalidatePath(`/${lang}/admin/achievements`);

  return true;
};
