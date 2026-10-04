import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Play, Star, X, ChevronRight } from "lucide-react";
import Personcard from "../components/Personcard";
import ReactPlayer from "react-player";

import imdbLogo from "../assets/imdb.svg";

import { TMDB_BASE_URL, options, IMAGE_BASE_URL } from "../api/tmdb";
import api from "../api/axios";

const Moviepage = () => {
  const { id } = useParams();

  const [movie, setMovie] = useState(null);
  const [cast, setCast] = useState([]);
  const [crew, setCrew] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showPlayer, setShowPlayer] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [ratings, setRatings] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // CinePro Core Stream State
  const [streamData, setStreamData] = useState(null);
  const [isFetchingStream, setIsFetchingStream] = useState(false);

  /* --------------------------------
     Scroll to top
  -------------------------------- */

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [id]);

  /* --------------------------------
     Fetch movie data
  -------------------------------- */

  useEffect(() => {
    const controller = new AbortController();

    const fetchMovieData = async () => {
      try {
        setIsLoading(true);
        setError(false);

        setMovie(null);
        setCast([]);
        setCrew([]);
        setRecommendations([]);
        setTrailerKey(null);
        setRatings(null);
        setShowTrailer(false);

        /* -----------------------------
           Main movie
        ----------------------------- */

        const movieResponse = await fetch(
          `${TMDB_BASE_URL}/movie/${id}?language=en-US`,
          {
            ...options,
            signal: controller.signal,
          },
        );

        if (!movieResponse.ok) {
          throw new Error(`Movie request failed: ${movieResponse.status}`);
        }

        const movieData = await movieResponse.json();

        if (!movieData?.id) {
          throw new Error("Movie not found");
        }

        setMovie(movieData);

        /* -----------------------------
           Additional TMDB requests
        ----------------------------- */

        const [
          recommendationsResponse,
          videosResponse,
          creditsResponse,
          externalIdsResponse,
        ] = await Promise.all([
          fetch(
            `${TMDB_BASE_URL}/movie/${id}/recommendations?language=en-US&page=1`,
            {
              ...options,
              signal: controller.signal,
            },
          ),

          fetch(`${TMDB_BASE_URL}/movie/${id}/videos?language=en-US`, {
            ...options,
            signal: controller.signal,
          }),

          fetch(`${TMDB_BASE_URL}/movie/${id}/credits?language=en-US`, {
            ...options,
            signal: controller.signal,
          }),

          fetch(`${TMDB_BASE_URL}/movie/${id}/external_ids`, {
            ...options,
            signal: controller.signal,
          }),
        ]);

        /* -----------------------------
           Recommendations
        ----------------------------- */

        if (recommendationsResponse.ok) {
          const recommendationsData = await recommendationsResponse.json();
          setRecommendations(recommendationsData.results || []);
        }

        /* -----------------------------
           Cast + Crew
        ----------------------------- */

        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();

          setCast(
            creditsData.cast
              ?.filter((person) => person.profile_path)
              .slice(0, 8) || [],
          );

          setCrew(creditsData.crew || []);
        }

        /* -----------------------------
           Trailer
        ----------------------------- */

        if (videosResponse.ok) {
          const videosData = await videosResponse.json();

          const trailer =
            videosData.results?.find(
              (video) =>
                video.site === "YouTube" &&
                video.type === "Trailer" &&
                video.official === true,
            ) ||
            videosData.results?.find(
              (video) => video.site === "YouTube" && video.type === "Trailer",
            );

          setTrailerKey(trailer?.key || null);
        }

        /* -----------------------------
           IMDb / Rotten Tomatoes
        ----------------------------- */

        if (externalIdsResponse.ok) {
          const externalIds = await externalIdsResponse.json();

          if (externalIds.imdb_id) {
            try {
              const omdbResponse = await api.get(
                `/api/omdb/${externalIds.imdb_id}`,
                {
                  signal: controller.signal,
                },
              );

              if (omdbResponse.data?.Response !== "False") {
                setRatings(omdbResponse.data);
              }
            } catch (omdbError) {
              if (
                omdbError.name !== "AbortError" &&
                omdbError.code !== "ERR_CANCELED"
              ) {
                if (import.meta.env.DEV) {
                  console.error(
                    "OMDb ratings error:",
                    omdbError.response?.data?.message || omdbError.message,
                  );
                }
              }
            }
          }
        }
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        console.error("Movie page error:", error);
        setError(true);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchMovieData();

    return () => {
      controller.abort();
    };
  }, [id]);

  /* --------------------------------
     Trailer modal
  -------------------------------- */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowTrailer(false);
      }
    };

    if (showTrailer) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showTrailer]);

  /* --------------------------------
     CinePro Stream Fetcher
  -------------------------------- */

  useEffect(() => {
    let isMounted = true;

    if (showPlayer && movie?.id) {
      const fetchCineProStream = async () => {
        setIsFetchingStream(true);
        try {
          // 1. Plural endpoint as per the docs
          const response = await fetch(
            `https://core-vf2j.onrender.com/v1/movies/${movie.id}`,
          );

          if (!response.ok) throw new Error("Endpoint not found");
          const data = await response.json();

          if (isMounted) {
            // 2. Use 'type' instead of 'format' based on the API response
            const mainStream = data.sources?.find(
              (src) => src.type === "hls" || src.url.includes(".m3u8"),
            );

            if (mainStream) {
              // 3. Prepend the backend URL to the relative proxy path
              const fullUrl = `https://core-vf2j.onrender.com${mainStream.url}`;
              setStreamData(fullUrl);
            }
          }
        } catch (err) {
          console.error("Failed to fetch CinePro stream:", err);
        } finally {
          if (isMounted) setIsFetchingStream(false);
        }
      };

      fetchCineProStream();
    }

    return () => {
      isMounted = false;
      setStreamData(null);
    };
  }, [showPlayer, movie?.id]);
  /* --------------------------------
     Loading
  -------------------------------- */

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#181818]">
        <div className="min-h-[680px] animate-pulse bg-white/5" />

        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 md:px-10">
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[2/3] animate-pulse rounded-xl bg-white/5"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* --------------------------------
     Error
  -------------------------------- */

  if (error || !movie) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center bg-[#181818] px-5 text-center text-white">
        <div>
          <h1 className="text-2xl font-semibold">Movie unavailable</h1>

          <p className="mt-2 text-sm text-gray-400">
            We couldn't load this movie right now.
          </p>

          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-[#e50914] px-6 py-3 text-sm font-medium transition hover:bg-white hover:text-[#e50914]"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  /* --------------------------------
     Images
  -------------------------------- */

  const backdropUrl = movie.backdrop_path
    ? `${IMAGE_BASE_URL}${movie.backdrop_path}`
    : null;

  const posterUrl = movie.poster_path
    ? `${IMAGE_BASE_URL}${movie.poster_path}`
    : null;

  /* --------------------------------
     Helpers
  -------------------------------- */

  const formatRuntime = (runtime) => {
    if (!runtime) return "N/A";

    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;

    if (hours === 0) {
      return `${minutes} min`;
    }

    return `${hours}h ${minutes}m`;
  };

  const rottenTomatoesRating = ratings?.Ratings?.find(
    (rating) => rating.Source === "Rotten Tomatoes",
  )?.Value;

  /* --------------------------------
     Crew
  -------------------------------- */

  const directors = crew
    .filter((person) => person.job === "Director")
    .slice(0, 2);

  const writers = crew
    .filter(
      (person) =>
        person.department === "Writing" ||
        ["Writer", "Screenplay", "Story"].includes(person.job),
    )
    .slice(0, 3);

  const producers = crew
    .filter(
      (person) =>
        person.job === "Producer" || person.job === "Executive Producer",
    )
    .slice(0, 3);

  /* --------------------------------
     Recommendations
  -------------------------------- */

  const cleanRecommendations = recommendations
    .filter(
      (recommendation) =>
        recommendation.poster_path && recommendation.id !== movie.id,
    )
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-[#181818] text-white">
      {/* ==================================================
          HERO
      ================================================== */}

      <section className="relative isolate min-h-[680px] overflow-hidden sm:min-h-[720px]">
        {/* Backdrop */}

        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-[#252525]" />
        )}

        {/* Cinematic overlays */}

        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-[#181818]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#181818] via-[#181818]/80 to-transparent" />

        {/* Hero content */}

        <div className="relative z-10 mx-auto flex min-h-[680px] w-full max-w-[1500px] items-end px-5 pb-10 sm:min-h-[720px] sm:px-8 sm:pb-12 lg:px-12">
          <div className="flex w-full items-end gap-7 lg:gap-10">
            {/* Poster */}
            {posterUrl && (
              <div className="hidden shrink-0 md:block">
                <img
                  src={posterUrl}
                  alt={movie.title}
                  className="w-[190px] rounded-xl object-cover shadow-2xl shadow-black/80 lg:w-[220px]"
                />
              </div>
            )}

            {/* Content */}
            <div className="max-w-3xl pb-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#e50914]">
                Movie
              </p>
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                {movie.title}
              </h1>

              {/* Ratings / metadata */}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-gray-300 sm:text-base">
                {ratings?.imdbRating && (
                  <div className="flex items-center gap-2">
                    <img
                      src={imdbLogo}
                      alt="IMDb"
                      className="h-5 w-10 object-contain"
                    />
                    <span className="font-medium text-white">
                      {ratings.imdbRating}
                    </span>
                  </div>
                )}
                {movie.vote_average > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Star size={15} className="fill-current text-yellow-400" />
                    {movie.vote_average.toFixed(1)}
                  </span>
                )}
                {rottenTomatoesRating && <span>🍅 {rottenTomatoesRating}</span>}
                {movie.release_date && (
                  <span>{movie.release_date.slice(0, 4)}</span>
                )}
                <span>{formatRuntime(movie.runtime)}</span>
              </div>

              {/* Genres */}
              {movie.genres?.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-gray-200 backdrop-blur-md sm:text-sm"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Overview */}
              {movie.overview && (
                <p className="mt-5 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">
                  {movie.overview}
                </p>
              )}

              {/* Actions */}
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => setShowPlayer(true)}
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:bg-[#e50914] hover:text-white"
                >
                  <Play size={17} className="fill-current" />
                  Watch Now
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (trailerKey) {
                      setShowTrailer(true);
                    }
                  }}
                  disabled={!trailerKey}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-black/30 px-6 py-3.5 text-sm font-medium backdrop-blur-md transition-all duration-200 hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play size={17} />
                  {trailerKey ? "Watch Trailer" : "Trailer Unavailable"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          DETAILS
      ================================================== */}

      <section className="relative z-20 mx-auto -mt-10 max-w-[1500px] px-5 pb-12 pt-6 sm:-mt-14 sm:px-8 sm:pb-14 sm:pt-8 md:-mt-16 md:px-10 md:pb-16 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          {/* Intro */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e50914]">
              Information
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Movie Details
            </h2>
            {movie.tagline && (
              <p className="mt-4 max-w-md text-sm italic leading-6 text-gray-500">
                “{movie.tagline}”
              </p>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-3">
            <div className="border-b border-white/10 py-5 pr-5">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Status
              </p>
              <p className="mt-2 text-sm text-gray-200">
                {movie.status || "N/A"}
              </p>
            </div>
            <div className="border-b border-white/10 px-5 py-5 sm:border-l">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Release
              </p>
              <p className="mt-2 text-sm text-gray-200">
                {movie.release_date || "N/A"}
              </p>
            </div>
            <div className="border-b border-white/10 py-5 pl-5 sm:border-l">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Runtime
              </p>
              <p className="mt-2 text-sm text-gray-200">
                {formatRuntime(movie.runtime)}
              </p>
            </div>
            <div className="border-b border-white/10 py-5 pr-5">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Language
              </p>
              <p className="mt-2 text-sm uppercase text-gray-200">
                {movie.original_language || "N/A"}
              </p>
            </div>
            <div className="border-b border-white/10 px-5 py-5 sm:border-l">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Budget
              </p>
              <p className="mt-2 text-sm text-gray-200">
                {movie.budget ? `$${movie.budget.toLocaleString()}` : "N/A"}
              </p>
            </div>
            <div className="border-b border-white/10 py-5 pl-5 sm:border-l">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Revenue
              </p>
              <p className="mt-2 text-sm text-gray-200">
                {movie.revenue ? `$${movie.revenue.toLocaleString()}` : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          CAST
      ================================================== */}

      {cast.length > 0 && (
        <section className="mx-auto max-w-[1500px] px-5 pb-14 sm:px-8 md:px-10 lg:px-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e50914]">
                Cast
              </p>
              <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">
                Meet the Cast
              </h2>
            </div>
            <div className="hidden items-center gap-1 text-sm text-gray-500 sm:flex">
              Swipe <ChevronRight size={16} />
            </div>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none sm:gap-6">
            {cast.map((person) => (
              <Personcard
                key={person.id}
                person={person}
                role="Actor"
                character={person.character}
              />
            ))}
          </div>
        </section>
      )}

      {/* ==================================================
          CREW
      ================================================== */}

      {(directors.length > 0 || writers.length > 0 || producers.length > 0) && (
        <section className="mx-auto max-w-[1500px] px-5 pb-14 sm:px-8 md:px-10 lg:px-12">
          <div className="border-t border-white/10 pt-10">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e50914]">
                Behind the Scenes
              </p>
              <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">Crew</h2>
            </div>
            <div className="grid gap-10 md:grid-cols-3">
              {directors.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    Director
                  </p>
                  <div className="mt-5 flex flex-wrap gap-6">
                    {directors.map((person) => (
                      <Personcard
                        key={`${person.id}-${person.job}`}
                        person={person}
                        role="Director"
                      />
                    ))}
                  </div>
                </div>
              )}
              {writers.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    Writers
                  </p>
                  <div className="mt-5 flex flex-wrap gap-6">
                    {writers.map((person, index) => (
                      <Personcard
                        key={`${person.id}-${person.job}-${index}`}
                        person={person}
                        role={person.job}
                      />
                    ))}
                  </div>
                </div>
              )}
              {producers.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    Producers
                  </p>
                  <div className="mt-4 space-y-3">
                    {producers.map((person, index) => (
                      <div
                        key={`${person.id}-${person.job}-${index}`}
                        className="flex items-center gap-3"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e50914]" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-200">
                            {person.name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {person.job}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ==================================================
          RECOMMENDATIONS
      ================================================== */}

      {cleanRecommendations.length > 0 && (
        <section className="mx-auto max-w-[1500px] px-5 pb-16 sm:px-8 md:px-10 lg:px-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e50914]">
                More Movies
              </p>
              <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">
                You May Also Like
              </h2>
            </div>
            <div className="hidden items-center gap-1 text-sm text-gray-500 sm:flex">
              Explore <ChevronRight size={16} />
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none sm:gap-5">
            {cleanRecommendations.map((recommendation) => (
              <Link
                key={recommendation.id}
                to={`/movie/${recommendation.id}`}
                className="group w-[145px] shrink-0 sm:w-[175px] md:w-[190px] lg:w-[205px]"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#242424] shadow-lg shadow-black/20">
                  <img
                    src={`${IMAGE_BASE_URL}${recommendation.poster_path}`}
                    alt={recommendation.title || "Movie"}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  {recommendation.vote_average > 0 && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs backdrop-blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <Star
                        size={11}
                        className="fill-current text-yellow-400"
                      />
                      {recommendation.vote_average.toFixed(1)}
                    </div>
                  )}
                </div>
                <h3 className="mt-3 truncate text-sm font-medium text-gray-200 transition-colors group-hover:text-white">
                  {recommendation.title}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {recommendation.release_date
                    ? recommendation.release_date.slice(0, 4)
                    : "N/A"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ==================================================
          TRAILER MODAL
      ================================================== */}

      {showTrailer && trailerKey && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowTrailer(false);
            }
          }}
        >
          <div className="relative w-full max-w-5xl">
            <button
              type="button"
              onClick={() => setShowTrailer(false)}
              aria-label="Close trailer"
              className="absolute -top-12 right-0 rounded-full p-2 text-gray-300 transition-colors hover:text-white"
            >
              <X size={28} />
            </button>
            <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-2xl">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                title={`${movie.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          CINEPRO VIDEO PLAYER
      ================================================== */}

      {showPlayer && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-3 sm:p-6">
          <button
            onClick={() => setShowPlayer(false)}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-red-600"
            aria-label="Close player"
          >
            ✕
          </button>

          <div className="relative aspect-video w-full max-w-7xl overflow-hidden rounded-xl bg-black shadow-2xl flex items-center justify-center">
            {isFetchingStream ? (
              <div className="flex flex-col items-center text-white">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#e50914] mb-4" />
                <p>Scraping sources via CinePro...</p>
              </div>
            ) : streamData ? (
              <ReactPlayer
                url={streamData}
                controls
                width="100%"
                height="100%"
                playing={true}
              />
            ) : (
              <p className="text-white">No streams found for this movie.</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default Moviepage;
