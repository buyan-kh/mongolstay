import { redirect } from "@/i18n/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; kind: string }>;
}) {
  const { locale, kind } = await params;
  redirect({ href: `/file/${kind}/eligibility`, locale });
}
