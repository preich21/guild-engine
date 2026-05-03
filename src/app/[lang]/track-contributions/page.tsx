import { notFound, redirect } from "next/navigation";

import {
  getTrackContributionsPageData,
  saveTrackContributions,
} from "@/app/[lang]/track-contributions/actions";
import { TrackContributionsForm } from "@/components/track-contributions-form";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";

type TrackContributionsPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  params,
}: Pick<TrackContributionsPageProps, "params">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.trackContributions.heading);
}

export default async function TrackContributionsPage({
  params,
  searchParams,
}: TrackContributionsPageProps) {
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
    getTrackContributionsPageData(meetingQuery),
  ]);

  if (!meetingQuery && pageData.selectedMeetingDate) {
    redirect(`/${lang}/track-contributions?meeting=${pageData.selectedMeetingDate}`);
  }

  const meetingDateLabel = pageData.selectedMeetingDate
    ? new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(
        new Date(`${pageData.selectedMeetingDate}T00:00:00`),
      )
    : dictionary.trackContributions.never;

  const formattedLastModified = pageData.lastModifiedAt
    ? new Intl.DateTimeFormat(lang, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(pageData.lastModifiedAt))
    : dictionary.trackContributions.never;

  const metricSignature = pageData.metrics
    .map((metric) => `${metric.id}:${pageData.initialValues[metric.id] ?? ""}`)
    .join("|");

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <TrackContributionsForm
          key={`${pageData.meetingId ?? "no-meeting"}:${pageData.lastModifiedAt ?? "never"}:${metricSignature}`}
          action={saveTrackContributions}
          dictionary={dictionary.trackContributions}
          lang={lang}
          formDisabled={pageData.formDisabled}
          meetingId={pageData.meetingId}
          metrics={pageData.metrics}
          initialValues={pageData.initialValues}
          hasExistingContribution={pageData.hasExistingContribution}
          showNoMeetingError={!pageData.hasEligibleMeeting}
          lastModified={formattedLastModified}
          selectedMeetingDate={pageData.selectedMeetingDate}
          fallbackSelectedMeetingDateLabel={meetingDateLabel}
          availableMeetingDates={pageData.availableMeetingDates}
          previousMeetingDate={pageData.previousMeetingDate}
          nextMeetingDate={pageData.nextMeetingDate}
          activatedPointMultiplicator={pageData.activatedPointMultiplicator}
        />
      </div>
    </main>
  );
}
