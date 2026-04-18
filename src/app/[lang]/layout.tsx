import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { defaultLocale, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Topbar } from "@/components/topbar";
import { getCurrentUserRecord } from "@/lib/auth/user";

export const generateStaticParams = async () =>
  locales.map((lang) => ({ lang }));

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const dictionary = await getDictionary(locale);

  return {
    title: dictionary.metadata.title,
    description: dictionary.metadata.description,
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, currentUser] = await Promise.all([
    getDictionary(lang),
    getCurrentUserRecord(),
  ]);

  return (
    <>
      <Topbar
        lang={lang}
        dictionary={dictionary.topbar}
        showAdminLink={Boolean(currentUser?.admin)}
        currentUser={
          currentUser
            ? {
                id: currentUser.id,
                username: currentUser.username,
                profilePicture: currentUser.profilePicture,
              }
            : undefined
        }
      />
      {children}
    </>
  );
}
