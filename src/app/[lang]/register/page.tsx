import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getProfileEditTeams } from "@/app/[lang]/user/[uuid]/actions";
import { UserProfileForm } from "@/components/user-profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getHomePageHref } from "@/lib/feature-flags";
import { getPageMetadata } from "@/lib/page-metadata";

import { registerUser } from "./actions";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/register">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.register.heading);
}

export default async function RegisterPage({
  params,
}: PageProps<"/[lang]/register">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect(`/${lang}/login`);
  }

  const currentUser = await getCurrentUserRecord();

  if (currentUser) {
    const featureConfig = await getCurrentFeatureConfig();
    const redirectLocale =
      currentUser.preferredLang && hasLocale(currentUser.preferredLang)
        ? currentUser.preferredLang
        : lang;
    const homePath = getHomePageHref(
      redirectLocale,
      featureConfig.homePagePath,
      currentUser.id,
    );
    const redirectPath =
      homePath === `/${redirectLocale}/login` ? `/${redirectLocale}/rules` : homePath;

    redirect(redirectPath);
  }

  const dictionary = await getDictionary(lang);
  const teams = await getProfileEditTeams();

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black sm:px-6">
      <Card className="w-full max-w-2xl border-border/70 bg-card shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle>{dictionary.register.heading}</CardTitle>
          <CardDescription>{dictionary.register.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <UserProfileForm
            lang={lang}
            initialValues={{
              username: "",
              profilePicture: null,
              description: "",
              teamId: teams[0]?.id ?? "",
            }}
            teams={teams}
            dictionary={{
              ...dictionary.profile.edit,
              saveButton: dictionary.register.submitButton,
              saveError: dictionary.register.saveError,
            }}
            action={registerUser}
          />
        </CardContent>
      </Card>
    </main>
  );
}

