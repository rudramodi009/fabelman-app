import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Film,
  Globe2,
  Play,
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-react";

import { getAIRecommendation } from "../lib/ai";
import { TMDB_BASE_URL, options, IMAGE_BASE_URL } from "../api/tmdb";

const FILTERS = {
  genres: [
    "Action",
    "Comedy",
    "Drama",
    "Horror",
    "Romance",
    "Sci-Fi",
    "Thriller",
    "Fantasy",
    "Animation",
    "Documentary",
  ],

  moods: [
    {
      id: "Happy",
      label: "Happy",
      description: "Light, uplifting and fun",
    },
    {
      id: "Sad",
      label: "Sad",
      description: "Emotional and moving",
    },
    {
      id: "Excited",
      label: "Excited",
      description: "Fast-paced and energetic",
    },
    {
      id: "Relaxed",
      label: "Relaxed",
      description: "Easy-going and comforting",
    },
    {
      id: "Adventurous",
      label: "Adventurous",
      description: "Big worlds and discoveries",
    },
    {
      id: "Romantic",
      label: "Romantic",
      description: "Love, chemistry and emotion",
    },
    {
      id: "Scary",
      label: "Scary",
      description: "Dark, tense and frightening",
    },
    {
      id: "Thoughtful",
      label: "Thoughtful",
      description: "Deep and thought-provoking",
    },
    {
      id: "Mind-Bending",
      label: "Mind-Bending",
      description: "Twists, mysteries and ideas",
    },
  ],

  lengths: [
    {
      id: "Short",
      label: "Short",
      description: "Under 90 min",
    },
    {
      id: "Medium",
      label: "Medium",
      description: "90–120 min",
    },
    {
      id: "Long",
      label: "Long",
      description: "Over 120 min",
    },
  ],

  languages: [
    "Any Language",
    "English",
    "Hindi",
    "Spanish",
    "French",
    "German",
    "Italian",
    "Japanese",
    "Korean",
    "Mandarin",
  ],

  eras: [
    "All Eras",
    "Classic (1950s-1980s)",
    "Modern (1990s-2010s)",
    "Contemporary (2010s-Present)",
  ],
};

const INITIAL_FILTERS = {
  genres: [],
  mood: "",
  length: "",
  language: "Any Language",
  era: "All Eras",
  customPrompt: "",
};

const POSTER_BASE_URL = IMAGE_BASE_URL.replace("/original", "/w500");

/* -------------------------------------------------------
   TMDB SEARCH
------------------------------------------------------- */

const searchTMDBMovie = async (movie) => {
  try {
    const year =
      movie.year && /^\d{4}$/.test(String(movie.year))
        ? `&year=${movie.year}`
        : "";

    const searchUrl =
      `${TMDB_BASE_URL}/search/movie` +
      `?query=${encodeURIComponent(movie.title)}` +
      `&include_adult=false` +
      `&language=en-US` +
      `&page=1` +
      year;

    let response = await fetch(searchUrl, options);

    if (!response.ok) {
      throw new Error("TMDB search failed");
    }

    let data = await response.json();

    /*
      Sometimes Gemini gives a slightly different year.
      If searching with the year gives nothing, search again
      using only the movie title.
    */
    if (!data.results?.length && year) {
      const fallbackUrl =
        `${TMDB_BASE_URL}/search/movie` +
        `?query=${encodeURIComponent(movie.title)}` +
        `&include_adult=false` +
        `&language=en-US` +
        `&page=1`;

      response = await fetch(fallbackUrl, options);

      if (!response.ok) {
        throw new Error("TMDB fallback search failed");
      }

      data = await response.json();
    }

    if (!data.results?.length) {
      return null;
    }

    /*
      Prefer a result that has a poster.
      Otherwise use the first TMDB result.
    */
    const bestMatch =
      data.results.find((item) => item.poster_path) || data.results[0];

    return {
      id: bestMatch.id,
      poster_path: bestMatch.poster_path,
      backdrop_path: bestMatch.backdrop_path,
      rating: bestMatch.vote_average,
      vote_count: bestMatch.vote_count,
      release_date: bestMatch.release_date,
      tmdb_title: bestMatch.title,
      overview: bestMatch.overview,
    };
  } catch (error) {
    console.error(`TMDB search failed for "${movie.title}":`, error);
    return null;
  }
};

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */

const AIRecommendation = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [step, setStep] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  const steps = useMemo(
    () => [
      {
        key: "genre",
        title: "Choose your genres",
        subtitle: "Pick one or more genres you're in the mood for.",
        icon: Film,
      },
      {
        key: "mood",
        title: "What's your mood?",
        subtitle: "Tell Fabelman what kind of experience you want.",
        icon: Sparkles,
      },
      {
        key: "length",
        title: "How much time do you have?",
        subtitle: "Choose a runtime that fits your evening.",
        icon: Clock3,
      },
      {
        key: "language",
        title: "Choose a language",
        subtitle: "Explore movies from around the world.",
        icon: Globe2,
      },
      {
        key: "era",
        title: "Pick an era",
        subtitle: "Choose the period of cinema you want.",
        icon: CalendarDays,
      },
    ],
    [],
  );

  const currentStep = steps[step];

  const updateFilters = useCallback((changes) => {
    setFilters((previous) => ({
      ...previous,
      ...changes,
    }));

    setActivePreset(null);
  }, []);

  const toggleGenre = (genre) => {
    setFilters((previous) => {
      const exists = previous.genres.includes(genre);

      return {
        ...previous,
        genres: exists
          ? previous.genres.filter((item) => item !== genre)
          : [...previous.genres, genre],
      };
    });

    setActivePreset(null);
  };

  const getCurrentValue = () => {
    switch (currentStep.key) {
      case "genre":
        return filters.genres.length > 0;

      case "mood":
        return Boolean(filters.mood);

      case "length":
        return Boolean(filters.length);

      case "language":
        return Boolean(filters.language);

      case "era":
        return Boolean(filters.era);

      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!getCurrentValue()) {
      toast.error(
        currentStep.key === "genre"
          ? "Please select at least one genre."
          : "Please select an option first.",
      );

      return;
    }

    if (step < steps.length - 1) {
      setStep((previous) => previous + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((previous) => previous - 1);
    }
  };

  /* -------------------------------------------------------
     RESET
  ------------------------------------------------------- */

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setStep(0);
    setRecommendations([]);
    setActivePreset(null);
  };

  /* -------------------------------------------------------
     GENERATE RECOMMENDATIONS
  ------------------------------------------------------- */

  const generateRecommendation = async () => {
    if (
      filters.genres.length === 0 ||
      !filters.mood ||
      !filters.length ||
      !filters.language ||
      !filters.era
    ) {
      toast.error("Please complete all preferences first.");
      return;
    }

    setIsLoading(true);
    setRecommendations([]);

    const prompt = `
You are Fabelman's movie recommendation AI.

Recommend exactly 6 movies based on these preferences:

Genres: ${filters.genres.join(", ")}
Mood: ${filters.mood}
Length: ${filters.length}
Language: ${filters.language}
Era: ${filters.era}
Custom preference: ${filters.customPrompt || "None"}

Choose real movies that genuinely match the user's preferences.

For every movie return:
- title
- year
- genre
- description
- whyItFits

Keep description and whyItFits SHORT.

Return ONLY valid JSON.

The response must be exactly:

[
  {
    "title": "Movie Title",
    "year": 2020,
    "genre": "Genre",
    "description": "Short movie description",
    "whyItFits": "Short explanation"
  }
]

Do not include markdown.
Do not include code fences.
Do not include any text outside the JSON array.
`;

    try {
      const result = await getAIRecommendation(prompt);

      if (!result) {
        throw new Error("No recommendation response received.");
      }

      const cleanedResult = result
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const parsedResult = JSON.parse(cleanedResult);

      if (!Array.isArray(parsedResult) || parsedResult.length === 0) {
        throw new Error("Invalid recommendation format.");
      }

      /*
        Search TMDB for all six AI recommendations.
        Promise.all lets the searches happen together
        instead of waiting for each movie one by one.
      */
      const enrichedRecommendations = await Promise.all(
        parsedResult.slice(0, 6).map(async (movie) => {
          const tmdbMovie = await searchTMDBMovie(movie);

          return {
            ...movie,
            tmdbId: tmdbMovie?.id || null,
            posterPath: tmdbMovie?.poster_path || null,
            backdropPath: tmdbMovie?.backdrop_path || null,
            rating: tmdbMovie?.rating || 0,
            tmdbTitle: tmdbMovie?.tmdb_title || movie.title,
          };
        }),
      );

      setRecommendations(enrichedRecommendations);

      toast.success("Your movie picks are ready!");

      /*
        Smoothly move the user to the recommendations.
      */
      setTimeout(() => {
        document.getElementById("movie-recommendations")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (error) {
      console.error("Recommendation error:", error);

      toast.error(
        error.message === "No recommendation response received."
          ? "No recommendations were returned."
          : "We couldn't generate recommendations. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const progress = ((step + 1) / steps.length) * 100;
  const StepIcon = currentStep.icon;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#101010] px-4 py-8 text-white sm:px-6 lg:px-8">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/bg.png')",
        }}
      />

      <div className="fixed inset-0 bg-black/75" />

      <div className="fixed inset-0 bg-gradient-to-b from-black/30 via-[#101010]/70 to-[#101010]" />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed -left-40 top-1/4 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />

      <div className="pointer-events-none fixed -right-40 bottom-1/4 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        {/* Header */}
        <section className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400">
            <Sparkles className="h-4 w-4" />
            AI Movie Discovery
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Find your next movie
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
            Tell Fabelman what you're looking for and let AI find movies
            tailored to your taste.
          </p>
        </section>

        {/* Main recommendation builder */}
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-xl">
          {/* Progress */}
          <div className="border-b border-white/10 px-5 py-5 sm:px-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-white/45">
                Step {step + 1} of {steps.length}
              </span>

              <span className="text-xs font-semibold text-red-400">
                {Math.round(progress)}%
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#e50914] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
                <StepIcon className="h-5 w-5" />
              </div>

              <h2 className="text-xl font-semibold sm:text-2xl">
                {currentStep.title}
              </h2>

              <p className="mt-2 text-sm text-white/40">
                {currentStep.subtitle}
              </p>
            </div>

            {/* Genres */}
            {currentStep.key === "genre" && (
              <div className="mx-auto grid max-w-4xl grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
                {FILTERS.genres.map((genre) => {
                  const selected = filters.genres.includes(genre);

                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      aria-pressed={selected}
                      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                        selected
                          ? "border-red-500 bg-[#e50914] text-white shadow-lg shadow-red-950/20"
                          : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      {selected && <Check className="h-4 w-4" />}
                      {genre}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mood */}
            {currentStep.key === "mood" && (
              <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FILTERS.moods.map((mood) => {
                  const selected = filters.mood === mood.id;

                  return (
                    <button
                      key={mood.id}
                      type="button"
                      onClick={() => updateFilters({ mood: mood.id })}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? "border-red-500/60 bg-red-500/10 shadow-lg shadow-red-950/10"
                          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`text-sm font-semibold ${
                            selected ? "text-red-400" : "text-white"
                          }`}
                        >
                          {mood.label}
                        </span>

                        {selected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e50914]">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-white/35">
                        {mood.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Length */}
            {currentStep.key === "length" && (
              <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3">
                {FILTERS.lengths.map((length) => {
                  const selected = filters.length === length.id;

                  return (
                    <button
                      key={length.id}
                      type="button"
                      onClick={() => updateFilters({ length: length.id })}
                      className={`rounded-2xl border p-5 text-left transition-all ${
                        selected
                          ? "border-red-500 bg-[#e50914] text-white shadow-lg shadow-red-950/20"
                          : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      <p className="font-semibold">{length.label}</p>

                      <p
                        className={`mt-1 text-xs ${
                          selected ? "text-white/70" : "text-white/30"
                        }`}
                      >
                        {length.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Language */}
            {currentStep.key === "language" && (
              <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
                {FILTERS.languages.map((language) => {
                  const selected = filters.language === language;

                  return (
                    <button
                      key={language}
                      type="button"
                      onClick={() => updateFilters({ language })}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                        selected
                          ? "border-red-500 bg-[#e50914] text-white"
                          : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      {language}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Era */}
            {currentStep.key === "era" && (
              <div className="mx-auto grid max-w-4xl gap-3 md:grid-cols-3">
                {FILTERS.eras.map((era) => {
                  const selected = filters.era === era;

                  return (
                    <button
                      key={era}
                      type="button"
                      onClick={() => updateFilters({ era })}
                      className={`min-h-20 rounded-2xl border p-4 text-sm font-medium transition-all ${
                        selected
                          ? "border-red-500 bg-[#e50914] text-white shadow-lg shadow-red-950/20"
                          : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      {era}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom preference */}
            {currentStep.key === "era" && (
              <div className="mx-auto mt-7 max-w-4xl">
                <label
                  htmlFor="customPrompt"
                  className="mb-2 block text-sm font-medium text-white/70"
                >
                  Anything else you're craving?
                  <span className="ml-2 text-xs font-normal text-white/30">
                    Optional
                  </span>
                </label>

                <textarea
                  id="customPrompt"
                  value={filters.customPrompt}
                  onChange={(e) =>
                    updateFilters({
                      customPrompt: e.target.value,
                    })
                  }
                  placeholder="e.g. A slow-burn mystery with beautiful cinematography..."
                  rows={3}
                  disabled={isLoading}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10 disabled:opacity-50"
                />
              </div>
            )}

            {/* Navigation */}
            <div className="mx-auto mt-9 flex max-w-4xl items-center justify-between gap-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0 || isLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/60 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              {step === steps.length - 1 ? (
                <button
                  type="button"
                  onClick={generateRecommendation}
                  disabled={!getCurrentValue() || isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#e50914] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:bg-[#f20d19] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Sparkles className="h-4 w-4" />

                  {isLoading ? "Finding movies..." : "Find My Movies"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!getCurrentValue() || isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            RECOMMENDATIONS
        ================================================= */}

        {recommendations.length > 0 && (
          <section
            id="movie-recommendations"
            className="mt-14 scroll-mt-8 pb-12"
          >
            {/* Section heading */}
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-red-400" />

                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                    AI Selected
                  </p>
                </div>

                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Your Movie Picks
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  6 films selected for your preferences.
                </p>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                disabled={isLoading}
                className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/50 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white sm:flex"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Start Over
              </button>
            </div>

            {/* Movie cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {recommendations.map((movie, index) => {
                const hasMoviePage = Boolean(movie.tmdbId);

                const posterUrl = movie.posterPath
                  ? `${POSTER_BASE_URL}${movie.posterPath}`
                  : null;

                const rating =
                  typeof movie.rating === "number" && movie.rating > 0
                    ? movie.rating.toFixed(1)
                    : null;

                const CardContent = (
                  <article
                    className={`group relative flex min-h-[205px] overflow-hidden rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl transition-all duration-300 ${
                      hasMoviePage
                        ? "hover:-translate-y-1 hover:border-red-500/40 hover:bg-black/80 hover:shadow-2xl hover:shadow-black/40"
                        : ""
                    }`}
                  >
                    {/* Poster */}
                    <div className="relative w-[125px] shrink-0 overflow-hidden bg-white/[0.04] sm:w-[145px]">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={movie.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full min-h-[205px] w-full flex-col items-center justify-center bg-gradient-to-br from-red-950/40 to-black px-3 text-center">
                          <Film className="mb-2 h-7 w-7 text-white/20" />

                          <span className="text-[10px] uppercase tracking-wider text-white/25">
                            No Poster
                          </span>
                        </div>
                      )}

                      {/* Poster overlay */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/30" />

                      {/* Number */}
                      <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white backdrop-blur-md">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                    </div>

                    {/* Information */}
                    <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
                      {/* Title */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-white sm:text-lg">
                            {movie.tmdbTitle || movie.title}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/40">
                            {movie.year && <span>{movie.year}</span>}

                            {movie.year && movie.genre && (
                              <span className="text-white/20">•</span>
                            )}

                            {movie.genre && (
                              <span className="truncate">{movie.genre}</span>
                            )}
                          </div>
                        </div>

                        {/* Rating */}
                        {rating && (
                          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-yellow-400/10 bg-yellow-400/5 px-2 py-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />

                            <span className="text-xs font-semibold text-yellow-300">
                              {rating}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="mt-3 line-clamp-3 text-xs leading-5 text-white/50 sm:text-sm">
                        {movie.description}
                      </p>

                      {/* Why it fits */}
                      {movie.whyItFits && (
                        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-white/30">
                          {movie.whyItFits}
                        </p>
                      )}

                      {/* CTA */}
                      <div className="mt-auto pt-4">
                        {hasMoviePage ? (
                          <div className="inline-flex items-center gap-2 text-xs font-semibold text-red-400 transition group-hover:text-red-300">
                            <span>View Movie</span>

                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                          </div>
                        ) : (
                          <span className="text-[11px] text-white/25">
                            Movie details unavailable
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hover glow */}
                    {hasMoviePage && (
                      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />
                      </div>
                    )}
                  </article>
                );

                /*
                  Only make the card clickable if TMDB
                  successfully found the movie.
                */
                return hasMoviePage ? (
                  <Link
                    key={`${movie.title}-${index}`}
                    to={`/movie/${movie.tmdbId}`}
                    className="block"
                  >
                    {CardContent}
                  </Link>
                ) : (
                  <div key={`${movie.title}-${index}`}>{CardContent}</div>
                );
              })}
            </div>

            {/* Mobile reset */}
            <button
              type="button"
              onClick={resetFilters}
              disabled={isLoading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-medium text-white/50 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white sm:hidden"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Start Over
            </button>
          </section>
        )}
      </div>
    </main>
  );
};

export default AIRecommendation;
