import { notFound } from "next/navigation";

import { ProtocolRaffle } from "@/components/protocol-raffle";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";
import { getProtocolRaffleUsers } from "@/lib/protocol-raffle";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/protocol-raffle">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.protocolRaffle.heading);
}

export default async function ProtocolRafflePage({
  params,
}: PageProps<"/[lang]/protocol-raffle">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, users] = await Promise.all([
    getDictionary(lang),
    getProtocolRaffleUsers(),
  ]);

  return <ProtocolRaffle users={users} dictionary={dictionary.protocolRaffle} />;
}
