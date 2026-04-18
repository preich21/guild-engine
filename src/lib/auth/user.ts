import "server-only";

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { users } from "@/db/schema";
import { db } from "@/lib/db";

const isValidUserName = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && value.length <= 255;

export const getCurrentUserRecord = async () => {
  const session = await auth();
  const userName = session?.user?.name;

  if (!isValidUserName(userName)) {
    return null;
  }

  const userRows = await db
    .select({
      id: users.id,
      username: users.username,
      profilePicture: users.profilePicture,
      admin: users.admin,
    })
    .from(users)
    .where(eq(users.username, userName))
    .limit(1);

  return userRows[0] ?? null;
};

export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const userRecord = await getCurrentUserRecord();
  return Boolean(userRecord?.admin);
};

export const requireCurrentUserAdmin = async () => {
  if (!(await isCurrentUserAdmin())) {
    notFound();
  }
};

