import { notFound } from "next/navigation";

import {
  createGuildMeeting,
  deleteGuildMeeting,
  getGuildMeetingEntries,
} from "@/app/[lang]/admin/meetings/actions";
import { GuildMeetingsTable } from "@/components/guild-meetings-table";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/admin/meetings">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.admin.guildMeetings.heading);
}

export default async function AdminGuildMeetingsPage({
  params,
}: PageProps<"/[lang]/admin/meetings">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, entries] = await Promise.all([getDictionary(lang), getGuildMeetingEntries()]);

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <GuildMeetingsTable
          lang={lang}
          rows={entries}
          createAction={createGuildMeeting}
          deleteAction={deleteGuildMeeting}
          dictionary={dictionary.admin.guildMeetings}
        />
      </div>
    </main>
  );
}
