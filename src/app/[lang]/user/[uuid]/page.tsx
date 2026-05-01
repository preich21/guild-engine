import { notFound } from "next/navigation";

import { UserProfileCard } from "@/components/user-profile-card";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getEnabledPowerupIds, isFeatureEnabled } from "@/lib/feature-flags";
import { getUserProfileData } from "@/lib/user-profile";
import { getProfileEditTeams, openLootbox, saveProfile } from "./actions";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/user/[uuid]">) {
  const { lang, uuid } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, profile] = await Promise.all([
    getDictionary(lang),
    getUserProfileData(uuid),
  ]);

  if (!profile) {
    notFound();
  }

  return {
    title: dictionary.profile.heading.replace("{username}", profile.username),
  };
}

export default async function UserProfilePage({
  params,
}: PageProps<"/[lang]/user/[uuid]">) {
  const { lang, uuid } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, currentUser, featureConfig] = await Promise.all([
    getDictionary(lang),
    getCurrentUserRecord(),
    getCurrentFeatureConfig(),
  ]);
  const arePowerupsEnabled = isFeatureEnabled(featureConfig.state, "powerups");
  const enabledPowerupIds = getEnabledPowerupIds(featureConfig.state);
  const profile = await getUserProfileData(uuid, {
    includeLevelProgress: isFeatureEnabled(featureConfig.state, "level-system"),
    includePowerups: arePowerupsEnabled,
  });

  if (!profile) {
    notFound();
  }

  const canEditProfile = currentUser?.id === profile.userId;
  const canUsePowerups = canEditProfile;
  const editTeams = canEditProfile ? await getProfileEditTeams() : null;

  return (
    <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 sm:py-12">
      <div className="w-full max-w-6xl">
        <UserProfileCard
          lang={lang}
          profile={profile}
          dictionary={dictionary.profile}
          showLeaderboardPlacement={isFeatureEnabled(featureConfig.state, "individual-leaderboard")}
          showStreak={isFeatureEnabled(featureConfig.state, "streaks")}
          showAchievements={isFeatureEnabled(featureConfig.state, "badges")}
          showPowerups={arePowerupsEnabled}
          enabledPowerupIds={enabledPowerupIds}
          edit={editTeams ? { teams: editTeams, action: saveProfile } : undefined}
          powerups={{
            canUsePowerups,
            openLootboxAction: openLootbox,
          }}
        />
      </div>
    </main>
  );
}
