import { notFound, redirect } from "next/navigation";

import { GetPointsForm } from "@/components/get-points-form";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getGetPointsPageData, saveGetPoints } from "@/app/[lang]/get-points/actions";

export default async function GetPointsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/get-points">) {
  const { lang } = await params;
  const resolvedSearchParams = await searchParams;

  const meetingQuery =
    typeof resolvedSearchParams.meeting === "string"
      ? resolvedSearchParams.meeting
      : Array.isArray(resolvedSearchParams.meeting)
        ? resolvedSearchParams.meeting[0] ?? null
        : null;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, pageData] = await Promise.all([
    getDictionary(lang),
    getGetPointsPageData(meetingQuery),
  ]);

  if (!meetingQuery && pageData.selectedMeetingDate) {
    redirect(`/${lang}/get-points?meeting=${pageData.selectedMeetingDate}`);
  }

  const withDate = (template: string, dateLabel: string) => template.replaceAll("{date}", dateLabel);

  const meetingDateLabel = pageData.selectedMeetingDate
    ? new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(
        new Date(`${pageData.selectedMeetingDate}T00:00:00`),
      )
    : dictionary.getPoints.never;

  const formattedLastModified = pageData.lastModifiedAt
    ? new Intl.DateTimeFormat(lang, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(pageData.lastModifiedAt))
    : dictionary.getPoints.never;

  const getPointsDictionary = {
    ...dictionary.getPoints,
    attendanceLabel: withDate(dictionary.getPoints.attendanceLabel, meetingDateLabel),
    protocolLabel: withDate(dictionary.getPoints.protocolLabel, meetingDateLabel),
    moderationLabel: withDate(dictionary.getPoints.moderationLabel, meetingDateLabel),
    participationLabel: withDate(dictionary.getPoints.participationLabel, meetingDateLabel),
    twlPostsLabel: withDate(dictionary.getPoints.twlPostsLabel, meetingDateLabel),
    presentationsLabel: withDate(dictionary.getPoints.presentationsLabel, meetingDateLabel),
  };

  return (
    <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <GetPointsForm
          key={pageData.meetingId ?? "no-meeting"}
          action={saveGetPoints}
          dictionary={getPointsDictionary}
          formDisabled={pageData.formDisabled}
          meetingId={pageData.meetingId}
          initialValues={pageData.initialValues}
          showNoMeetingError={!pageData.hasEligibleMeeting}
          lastModified={formattedLastModified}
          selectedMeetingDate={pageData.selectedMeetingDate}
          selectedMeetingDateLabel={meetingDateLabel}
          availableMeetingDates={pageData.availableMeetingDates}
          previousMeetingDate={pageData.previousMeetingDate}
          nextMeetingDate={pageData.nextMeetingDate}
        />
      </div>
    </main>
  );
}

