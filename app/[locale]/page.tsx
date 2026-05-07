import { /* Attorneys, */ CTABand, Footer, Hero, HowItWorks, LetterWall, Nav, Strip } from "@/components/landing";

export default function Page() {
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
