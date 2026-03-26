import VisaMap from "./components/VisaMap";
import TravelCollections from "./components/TravelCollections";
import ArticleSection from "./components/ArticleSection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main className="w-full">
      <section className="w-full" style={{ height: "85vh" }}>
        <VisaMap />
      </section>

      <TravelCollections />
      <ArticleSection />
      <Footer />
    </main>
  );
}
