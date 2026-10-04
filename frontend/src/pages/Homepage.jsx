import Card from "../components/Card";
import Hero from "../components/Hero";
import Footer from "../components/Footer";

const Homepage = () => {
  return (
    <main className="p-5">
      <Hero />
      <Card title="Now Playing" category="now_playing" />
      <Card title="Top Rated" category="top_rated" />
      <Card title="Popular" category="popular" />
      <Card title="Upcoming" category="upcoming" />
      <Footer />
    </main>
  );
};

export default Homepage;
