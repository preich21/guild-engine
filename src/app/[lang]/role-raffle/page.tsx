import { notFound } from "next/navigation";

import { RoleRaffle } from "@/components/role-raffle";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";
import { getRoleRaffleRolePresents, getRoleRaffleUsers } from "@/lib/role-raffle";

const formatMeetingTimestamp = (lang: string, timestamp: string) => {
  const parsed = new Date(timestamp);

  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(lang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(parsed);
};

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

  const [dictionary, users, rolePresents] = await Promise.all([
    getDictionary(lang),
    getRoleRaffleUsers(),
    getRoleRaffleRolePresents(),
  ]);
  const displayRolePresents = {
    latestPastMeeting: rolePresents.latestPastMeeting
      ? {
          ...rolePresents.latestPastMeeting,
          displayTimestamp: formatMeetingTimestamp(lang, rolePresents.latestPastMeeting.timestamp),
        }
      : null,
    nextFutureMeeting: rolePresents.nextFutureMeeting
      ? {
          ...rolePresents.nextFutureMeeting,
          displayTimestamp: formatMeetingTimestamp(lang, rolePresents.nextFutureMeeting.timestamp),
        }
      : null,
  };

  return (
    <RoleRaffle
      users={users}
      rolePresents={displayRolePresents}
      dictionary={dictionary.roleRaffle}
    />
  );
}
