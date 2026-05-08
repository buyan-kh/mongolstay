import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function Page() {
  const user = await requireUser("/login");
  const supabase = await getServerSupabase();
  const t = await getTranslations("profilePage");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <div className="dash-head">
        <h1 className="flow-title">{t("title")}</h1>
        <p className="flow-sub">{t("sub")}</p>
      </div>
      <ProfileForm initialName={profile?.full_name ?? ""} email={user.email ?? ""} />
    </>
  );
}
