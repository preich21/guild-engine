import "server-only";

import { asc } from "drizzle-orm";

import { users } from "@/db/schema";
import { db } from "@/lib/db";

export type ProtocolRaffleUser = {
  id: string;
  username: string;
};

export const getProtocolRaffleUsers = async (): Promise<ProtocolRaffleUser[]> =>
  db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .orderBy(asc(users.username), asc(users.id));
