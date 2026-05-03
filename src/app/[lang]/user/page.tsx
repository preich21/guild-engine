import { notFound, redirect } from "next/navigation";

import { hasLocale } from "@/i18n/config";
import { getCurrentUserRecord } from "@/lib/auth/user";

export default async function CurrentUserProfilePage({
  params,
}: PageProps<"/[lang]/user">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const currentUser = await getCurrentUserRecord();

  if (!currentUser) {
    redirect(`/${lang}/login`);
  }

  redirect(`/${lang}/user/${currentUser.id}`);
}
