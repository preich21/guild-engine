"use server";

import { requireCurrentUserAdmin } from "@/lib/auth/user";

export const requireAdminAccess = async () => {
  await requireCurrentUserAdmin();
};
