import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { RouteSection } from "@/components/route-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <RouteSection />
      <Footer />
    </>
  );
}
