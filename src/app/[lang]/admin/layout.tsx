import { notFound } from "next/navigation";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import { hasLocale } from "@/i18n/config";

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[lang]/admin">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  await requireAdminAccess();

  return children;
}

