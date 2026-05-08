import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getUser } from "@/lib/auth";
import { /* Attorneys, */ CTABand, Footer, Hero, HowItWorks, LetterWall, Nav, Strip } from "@/components/landing";

export default async function Page() {
  // Signed-in users skip the marketing page and go straight to their work.
  const user = await getUser();
  if (user) {
    const locale = await getLocale();
    redirect({ href: "/dashboard", locale });
  }

  return (
    <div className="app">
      <Nav />
      <Hero />
      <Strip />
      <HowItWorks />
      <LetterWall />
      {/* <Attorneys /> — hidden until we have real attorneys + bar numbers + photos */}
      <CTABand />
      <Footer />
    </div>
  );
}
