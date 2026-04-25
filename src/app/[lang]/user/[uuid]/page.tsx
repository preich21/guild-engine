import { notFound } from "next/navigation";

import { UserProfileCard } from "@/components/user-profile-card";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { getUserProfileData } from "@/lib/user-profile";
import { getProfileEditTeams, saveProfile } from "./actions";

export default async function UserProfilePage({
  params,
}: PageProps<"/[lang]/user/[uuid]">) {
  const { lang, uuid } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, profile, currentUser] = await Promise.all([
    getDictionary(lang),
    getUserProfileData(uuid),
    getCurrentUserRecord(),
  ]);

  if (!profile) {
    notFound();
  }

  const canEditProfile = currentUser?.id === profile.userId;
  const editTeams = canEditProfile ? await getProfileEditTeams() : null;

  return (
    <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 sm:py-12">
      <div className="w-full max-w-6xl">
        <UserProfileCard
          lang={lang}
          profile={profile}
          dictionary={dictionary.profile}
          edit={editTeams ? { teams: editTeams, action: saveProfile } : undefined}
        />
      </div>
    </main>
  );
}
