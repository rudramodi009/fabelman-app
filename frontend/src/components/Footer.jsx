import { memo } from "react";
import { Link } from "react-router-dom";

const CURRENT_YEAR = new Date().getFullYear();

const FOOTER_SECTIONS = [
  {
    title: "Browse",
    links: [
      { label: "Trending", path: "/" },
      { label: "Movies", path: "/" },
      { label: "TV Shows", path: "/" },
      { label: "Top Rated", path: "/" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Discover Your Taste", path: "/recommendation" },
      { label: "Genres", path: "/" },
      { label: "Top Rated", path: "/" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign In", path: "/signin" },
      { label: "Sign Up", path: "/signup" },
      { label: "Watchlist", path: "/" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "About", path: "/" },
      { label: "Contact", path: "/" },
      { label: "Privacy Policy", path: "/" },
    ],
  },
];

const Footer = memo(() => {
  return (
    <footer className="mt-16 border-t border-white/10 px-5 py-10 text-[#737373] sm:px-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Brand / Description */}
        <div className="max-w-2xl">
          <Link
            to="/"
            className="text-xl font-bold tracking-wide text-white transition-colors hover:text-[#e50914]"
          >
            FABELMAN
          </Link>

          <p className="mt-4 max-w-xl text-sm leading-6 text-[#737373]">
            FABELMAN is a modern cinema platform built for movie lovers to
            discover, explore, and experience stories from around the world.
          </p>
        </div>

        {/* Footer Links */}
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 md:mt-12">
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-white">
                {section.title}
              </h3>

              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      className="text-sm transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <p>© {CURRENT_YEAR} FABELMAN. All rights reserved.</p>
          <p className="text-[#555]">Made for movie lovers.</p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
