import "server-only";

import { asc } from "drizzle-orm";

import { users } from "@/db/schema";
import { db } from "@/lib/db";

export type RoleRaffleUser = {
  id: string;
  username: string;
};

export const getRoleRaffleUsers = async (): Promise<RoleRaffleUser[]> =>
  db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .orderBy(asc(users.username), asc(users.id));
