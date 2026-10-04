import { useEffect, useRef, useState, useMemo } from "react";
import {
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
  Star,
  LoaderCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Logo from "../assets/logo.png";
import { useAuthStore } from "../store/authStore";
import { TMDB_BASE_URL, options, IMAGE_BASE_URL } from "../api/tmdb";

const POSTER_BASE_URL = IMAGE_BASE_URL.replace("/original", "/w185");

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "TV Shows", path: "/" },
  { label: "Movies", path: "/" },
  { label: "Games", path: "/" },
  { label: "New & Popular", path: "/" },
];

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const searchAbortRef = useRef(null);

  const avatarURL = useMemo(() => {
    return user
      ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          user.username,
        )}`
      : "";
  }, [user]);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowMenu(false);
      }

      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search debounce with complete abort handling
  useEffect(() => {
    const query = search.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      setIsSearching(false);
      searchAbortRef.current?.abort();
      return;
    }

    const timeout = setTimeout(async () => {
      searchAbortRef.current?.abort();

      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        setIsSearching(true);
        setShowSuggestions(true);

        const response = await fetch(
          `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(
            query,
          )}&include_adult=false&language=en-US&page=1`,
          {
            ...options,
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`TMDB search failed: ${response.status}`);
        }

        const data = await response.json();

        setSearchResults(
          (data.results || []).filter((movie) => movie.poster_path).slice(0, 6),
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Movie search error:", err);
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      searchAbortRef.current?.abort();
    };
  }, [search]);

  const handleMovieSelect = (movie) => {
    navigate(`/movie/${movie.id}`);
    setSearch("");
    setSearchResults([]);
    setShowSuggestions(false);
    setShowMobileSearch(false);
  };

  const handleSearch = async () => {
    const query = search.trim();
    if (!query || isSearching) return;

    if (searchResults.length > 0) {
      handleMovieSelect(searchResults[0]);
      return;
    }

    try {
      setIsSearching(true);

      const response = await fetch(
        `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(
          query,
        )}&include_adult=false&language=en-US&page=1`,
        options,
      );

      if (!response.ok) {
        throw new Error(`TMDB search failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.results?.length > 0) {
        handleMovieSelect(result.results[0]);
      } else {
        toast.error("Movie not found");
      }
    } catch (err) {
      console.error("Movie search error:", err);
      toast.error("Unable to search movies");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { message } = await logout();
      toast.success(message);
      setShowMenu(false);
      setShowMobileMenu(false);
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Unable to log out");
    }
  };

  const handleNavigation = () => {
    setShowMobileMenu(false);
    setShowMobileSearch(false);
    setShowSuggestions(false);
  };

  const renderSearchInput = ({ mobile = false } = {}) => (
    <div ref={searchRef} className="relative w-full">
      <input
        type="text"
        autoFocus={mobile}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          if (event.target.value.trim().length >= 2) {
            setShowSuggestions(true);
          }
        }}
        onFocus={() => {
          if (searchResults.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleSearch();
          if (event.key === "Escape") setShowSuggestions(false);
        }}
        placeholder="Search movies..."
        aria-label="Search movies"
        autoComplete="off"
        className={`w-full rounded-full border border-white/10 bg-[#242424] text-sm text-white outline-none transition-all placeholder:text-gray-500 focus:border-white/20 focus:bg-[#292929] ${
          mobile ? "py-3 pl-4 pr-12" : "py-2.5 pl-4 pr-11"
        }`}
      />

      <button
        type="button"
        onClick={handleSearch}
        disabled={isSearching}
        aria-label="Search"
        className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1.5 text-gray-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSearching ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <Search size={18} />
        )}
      </button>

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[70] overflow-hidden rounded-2xl border border-white/10 bg-[#151515]/98 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {isSearching && searchResults.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-5 py-6 text-sm text-white/40">
              <LoaderCircle size={16} className="animate-spin" />
              Searching...
            </div>
          )}

          {!isSearching &&
            search.trim().length >= 2 &&
            searchResults.length === 0 && (
              <div className="px-5 py-6 text-center text-sm text-white/40">
                No movies found for{" "}
                <span className="text-white/70">"{search.trim()}"</span>
              </div>
            )}

          {searchResults.length > 0 && (
            <div className="py-2">
              {searchResults.map((movie) => {
                const poster = movie.poster_path
                  ? `${POSTER_BASE_URL}${movie.poster_path}`
                  : null;

                const year = movie.release_date
                  ? movie.release_date.slice(0, 4)
                  : "—";

                return (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => handleMovieSelect(movie)}
                    className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07]"
                  >
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-white/5">
                      {poster ? (
                        <img
                          src={poster}
                          alt={movie.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] text-white/20">
                          N/A
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white group-hover:text-red-400">
                        {movie.title}
                      </p>

                      <div className="mt-1 flex items-center gap-2 text-xs text-white/35">
                        <span>{year}</span>
                        {movie.vote_average > 0 && (
                          <>
                            <span className="text-white/15">•</span>
                            <span className="flex items-center gap-1">
                              <Star
                                size={11}
                                className="fill-yellow-400 text-yellow-400"
                              />
                              {movie.vote_average.toFixed(1)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <span className="pr-1 text-white/20 transition-all group-hover:translate-x-1 group-hover:text-red-400">
                      →
                    </span>
                  </button>
                );
              })}

              <div className="border-t border-white/5 px-4 py-2.5">
                <p className="text-center text-[10px] uppercase tracking-wider text-white/25">
                  Select a movie to view details
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/95 text-gray-200 backdrop-blur-md">
      <nav className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <Link to="/" onClick={handleNavigation} className="shrink-0">
          <img
            src={Logo}
            alt="FABELMAN"
            className="h-24 w-24 object-contain sm:h-14 sm:w-28"
          />
        </Link>

        <ul className="hidden items-center gap-5 text-sm font-medium xl:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.label}>
              <Link
                to={item.path}
                onClick={handleNavigation}
                className="transition-colors duration-200 hover:text-[#e50914]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden flex-1 justify-end md:flex">
          <div className="w-full max-w-xs lg:max-w-sm">
            {renderSearchInput()}
          </div>
        </div>

        <div className="relative flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              setShowMobileSearch((prev) => !prev);
              setShowMobileMenu(false);
            }}
            aria-label="Toggle search"
            className="rounded-full p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            {showMobileSearch ? <X size={20} /> : <Search size={20} />}
          </button>

          <Link
            to={user ? "/recommendation" : "/signin"}
            onClick={handleNavigation}
            className="rounded-full bg-[#e50914] px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:bg-white hover:text-[#e50914] sm:px-4 sm:text-sm"
          >
            <span className="hidden xs:inline sm:inline">
              AI Recommendation
            </span>
            <span className="sm:hidden">AI</span>
          </Link>

          {!user ? (
            <Link
              to="/signin"
              onClick={handleNavigation}
              className="rounded-full border border-white/15 px-3 py-2 text-xs font-medium text-gray-200 transition-colors hover:border-white/30 hover:text-white sm:px-4 sm:text-sm"
            >
              Sign In
            </Link>
          ) : (
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setShowMenu((prev) => !prev)}
                aria-label="Open profile menu"
                aria-expanded={showMenu}
                className="block rounded-full focus:outline-none focus:ring-2 focus:ring-[#e50914]/60"
              >
                <img
                  src={avatarURL}
                  alt={`${user.username}'s profile`}
                  className="h-9 w-9 rounded-full border-2 border-[#e50914] object-cover transition-transform duration-200 hover:scale-105 sm:h-10 sm:w-10"
                />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#202020] shadow-2xl shadow-black/50">
                  <div className="border-b border-white/10 px-4 py-4">
                    <p className="truncate font-semibold text-white">
                      {user.username}
                    </p>
                    <p className="mt-1 truncate text-sm text-gray-400">
                      {user.email}
                    </p>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <HelpCircle size={18} />
                      Help Center
                    </button>

                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Settings size={18} />
                      Settings
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                    >
                      <LogOut size={18} />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setShowMobileMenu((prev) => !prev);
              setShowMobileSearch(false);
              setShowSuggestions(false);
            }}
            aria-label="Toggle navigation menu"
            aria-expanded={showMobileMenu}
            className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white xl:hidden"
          >
            {showMobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {showMobileSearch && (
        <div className="border-t border-white/5 px-4 py-3 md:hidden">
          {renderSearchInput({ mobile: true })}
        </div>
      )}

      {showMobileMenu && (
        <div className="border-t border-white/5 bg-[#0d0d0d] px-4 py-4 xl:hidden">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.path}
                  onClick={handleNavigation}
                  className="block rounded-lg px-3 py-3 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;
