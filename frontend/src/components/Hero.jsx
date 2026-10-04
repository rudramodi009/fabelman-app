import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";

import { TMDB_BASE_URL, options, IMAGE_BASE_URL } from "../api/tmdb";

const SLIDE_DURATION = 6000;
const MAX_HERO_MOVIES = 6;
const HERO_PAGE = 3;
const HERO_IMAGE_BASE_URL = IMAGE_BASE_URL.replace("/original", "/w1280");

const Hero = () => {
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchMovies = async () => {
      try {
        setIsLoading(true);
        setError(false);

        const params = new URLSearchParams({
          language: "en-US",
          page: String(HERO_PAGE),
        });

        const response = await fetch(
          `${TMDB_BASE_URL}/movie/popular?${params.toString()}`,
          {
            ...options,
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Movie request failed: ${response.status}`);
        }

        const result = await response.json();

        if (!Array.isArray(result?.results)) {
          throw new Error("Invalid movie data received.");
        }

        const validMovies = result.results.filter(
          (movie) =>
            movie &&
            Number.isInteger(movie.id) &&
            movie.backdrop_path &&
            typeof movie.title === "string" &&
            movie.title.trim().length > 0,
        );

        if (validMovies.length === 0) {
          throw new Error("No valid featured movies found.");
        }

        if (controller.signal.aborted) return;

        // Shuffle safely
        const shuffled = [...validMovies];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        setMovies(shuffled.slice(0, MAX_HERO_MOVIES));
        setCurrentIndex(0);
      } catch (err) {
        if (err.name === "AbortError" || err.name === "CanceledError") return;

        if (import.meta.env.DEV) {
          console.error("TMDB Hero error:", err.message);
        }

        if (!controller.signal.aborted) {
          setMovies([]);
          setCurrentIndex(0);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchMovies();

    return () => {
      controller.abort();
    };
  }, []);

  const goToNext = useCallback(() => {
    setMovies((prev) => {
      if (prev.length <= 1) return prev;
      setCurrentIndex((curr) => (curr + 1) % prev.length);
      return prev;
    });
  }, []);

  const goToPrevious = useCallback(() => {
    setMovies((prev) => {
      if (prev.length <= 1) return prev;
      setCurrentIndex((curr) => (curr === 0 ? prev.length - 1 : curr - 1));
      return prev;
    });
  }, []);

  // Slide rotation with tab visibility protection
  useEffect(() => {
    if (movies.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        goToNext();
      }
    }, SLIDE_DURATION);

    return () => clearInterval(interval);
  }, [movies.length, isPaused, goToNext]);

  if (isLoading) {
    return (
      <section className="relative h-[360px] overflow-hidden rounded-2xl bg-[#252525] sm:h-[420px] md:h-[480px] lg:h-[520px]">
        <div className="absolute inset-0 animate-pulse bg-white/5" />
        <div className="absolute bottom-6 left-5 right-5 sm:bottom-8 sm:left-8 md:left-10">
          <div className="h-8 w-2/3 max-w-md animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-4 w-1/2 max-w-sm animate-pulse rounded bg-white/10" />
          <div className="mt-5 h-11 w-32 animate-pulse rounded-full bg-white/10" />
        </div>
      </section>
    );
  }

  if (error || movies.length === 0) {
    return (
      <section className="flex h-[360px] items-center justify-center rounded-2xl bg-[#252525] text-center sm:h-[420px] md:h-[480px]">
        <p className="text-sm text-gray-400">Unable to load featured movies.</p>
      </section>
    );
  }

  const movie = movies[currentIndex];
  if (!movie) return null;

  const imageUrl = movie.backdrop_path
    ? `${HERO_IMAGE_BASE_URL}${movie.backdrop_path}`
    : null;

  return (
    <section
      className="group relative overflow-hidden rounded-2xl text-white"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative h-[360px] w-full sm:h-[420px] md:h-[480px] lg:h-[520px]">
        {imageUrl && (
          <img
            key={movie.id}
            src={imageUrl}
            alt={movie.title || "Featured movie"}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center animate-[heroFade_0.8s_ease-in-out]"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      <div
        key={`content-${movie.id}`}
        className="absolute inset-x-0 bottom-0 p-5 animate-[heroContentFade_0.8s_ease-in-out] sm:p-7 md:p-10"
      >
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-4xl lg:text-5xl">
            {movie.title}
          </h1>

          <div className="mt-2 flex items-center gap-3 text-xs text-gray-300 sm:text-sm">
            {movie.release_date && (
              <span>{movie.release_date.slice(0, 4)}</span>
            )}
            {Number(movie.vote_average) > 0 && (
              <span className="flex items-center gap-1">
                <Star size={14} className="fill-current text-yellow-400" />
                {Number(movie.vote_average).toFixed(1)}
              </span>
            )}
          </div>

          {movie.overview && (
            <p className="mt-3 line-clamp-2 max-w-lg text-xs leading-relaxed text-gray-300 sm:text-sm md:line-clamp-3">
              {movie.overview}
            </p>
          )}

          <Link
            to={`/movie/${movie.id}`}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#e50914] px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-white hover:text-[#e50914] sm:mt-6 sm:px-6"
          >
            <Play size={17} className="fill-current" />
            Watch Now
          </Link>
        </div>
      </div>

      {movies.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            aria-label="Previous featured movie"
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/70 sm:block md:left-5"
          >
            <ChevronLeft size={22} />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Next featured movie"
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/70 sm:block md:right-5"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {movies.length > 1 && (
        <div className="absolute bottom-5 right-5 flex items-center gap-1.5 sm:bottom-6 sm:right-7 md:right-10">
          {movies.map((movieItem, index) => (
            <button
              key={movieItem.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              aria-label={`Show ${movieItem.title}`}
              aria-current={index === currentIndex ? "true" : undefined}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-7 bg-white"
                  : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Hero;
