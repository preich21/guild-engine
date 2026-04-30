import { notFound } from "next/navigation";

import { RoleRaffle } from "@/components/role-raffle";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";
import { getRoleRaffleUsers } from "@/lib/role-raffle";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/role-raffle">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.roleRaffle.heading);
}

export default async function RoleRafflePage({
  params,
}: PageProps<"/[lang]/role-raffle">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, users] = await Promise.all([
    getDictionary(lang),
    getRoleRaffleUsers(),
  ]);

  return <RoleRaffle users={users} dictionary={dictionary.roleRaffle} />;
}
