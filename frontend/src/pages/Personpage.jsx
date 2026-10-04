import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";

import { TMDB_BASE_URL, options, IMAGE_BASE_URL } from "../api/tmdb";

const PersonMovieCard = ({ movie }) => {
  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group block w-[145px] shrink-0 sm:w-[170px] md:w-[190px] lg:w-[205px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#242424] shadow-lg shadow-black/20">
        {movie.poster_path ? (
          <img
            src={`${IMAGE_BASE_URL}${movie.poster_path}`}
            alt={movie.title || "Movie"}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-500">
            No Poster
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {movie.vote_average > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
            <Star size={11} className="fill-current text-yellow-400" />
            {movie.vote_average.toFixed(1)}
          </div>
        )}
      </div>

      <h3 className="mt-3 truncate text-sm font-medium text-gray-300 transition-colors group-hover:text-white">
        {movie.title}
      </h3>

      <p className="mt-1 text-xs text-gray-500">
        {movie.release_date ? movie.release_date.slice(0, 4) : "N/A"}
      </p>
    </Link>
  );
};

const PersonSection = ({ title, movies }) => {
  if (!movies.length) return null;

  return (
    <section className="mx-auto max-w-[1500px] px-5 pb-14 sm:px-8 md:px-10 lg:px-12">
      {/* Fabelman-style section pill */}
      <div className="mb-6">
        <span className="inline-flex rounded-full border border-white/10 bg-[#242424] px-5 py-2 text-sm font-semibold text-white shadow-sm">
          {title}
        </span>
      </div>

      {/* Movies */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none sm:gap-5">
        {movies.map((movie) => (
          <PersonMovieCard
            key={`${movie.id}-${movie.creditKey || ""}`}
            movie={movie}
          />
        ))}
      </div>
    </section>
  );
};

const Personpage = () => {
  const { id } = useParams();

  const [person, setPerson] = useState(null);
  const [credits, setCredits] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFullBiography, setShowFullBiography] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchPerson = async () => {
      try {
        setIsLoading(true);
        setError(false);

        setPerson(null);
        setCredits([]);

        window.scrollTo({
          top: 0,
          behavior: "instant",
        });

        const response = await fetch(
          `${TMDB_BASE_URL}/person/${id}?language=en-US&append_to_response=combined_credits`,
          {
            ...options,
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Person request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data?.id) {
          throw new Error("Person not found");
        }

        setPerson(data);
        setCredits(data.combined_credits?.cast || []);
        setCredits((current) => [
          ...current,
          ...(data.combined_credits?.crew || []),
        ]);
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Person page error:", error);
        setError(true);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchPerson();

    return () => controller.abort();
  }, [id]);

  const filmography = useMemo(() => {
    const actingMovies = [];
    const directedMovies = [];
    const writingMovies = [];

    const actingIds = new Set();
    const directedIds = new Set();
    const writingIds = new Set();

    credits.forEach((credit) => {
      if (credit.media_type !== "movie" || !credit.id || !credit.poster_path) {
        return;
      }

      const movie = {
        ...credit,
        title: credit.title || credit.original_title,
        creditKey: credit.character || "",
      };

      // Acting
      if (credit.character && !actingIds.has(credit.id)) {
        actingIds.add(credit.id);
        actingMovies.push(movie);
      }

      // Direction
      if (credit.job === "Director" && !directedIds.has(credit.id)) {
        directedIds.add(credit.id);

        directedMovies.push({
          ...movie,
          creditKey: "director",
        });
      }

      // Writing
      if (credit.department === "Writing" && !writingIds.has(credit.id)) {
        writingIds.add(credit.id);

        writingMovies.push({
          ...movie,
          creditKey: "writer",
        });
      }
    });

    const sortMovies = (movies) =>
      movies.sort((a, b) => {
        const dateA = a.release_date || "";
        const dateB = b.release_date || "";

        return dateB.localeCompare(dateA);
      });

    return {
      movies: sortMovies(actingMovies),
      direction: sortMovies(directedMovies),
      writing: sortMovies(writingMovies),
    };
  }, [credits]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#181818] text-white">
        <div className="mx-auto max-w-[1500px] px-5 py-12 sm:px-8 md:px-10 lg:px-12">
          <div className="h-5 w-24 animate-pulse rounded bg-white/10" />

          <div className="mt-10 grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="mx-auto h-[280px] w-[210px] animate-pulse rounded-2xl bg-white/5 md:mx-0 lg:h-[360px] lg:w-[270px]" />

            <div>
              <div className="h-12 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="mt-5 h-10 w-1/2 animate-pulse rounded bg-white/5" />
              <div className="mt-8 h-32 w-full animate-pulse rounded bg-white/5" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !person) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center bg-[#181818] px-5 text-center text-white">
        <div>
          <h1 className="text-2xl font-semibold">Person unavailable</h1>

          <p className="mt-2 text-sm text-gray-400">
            We couldn't load this person's information.
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

  const profileUrl = person.profile_path
    ? `${IMAGE_BASE_URL}${person.profile_path}`
    : null;

  const biography = person.biography?.trim();

  const displayedBiography =
    biography && !showFullBiography ? biography.slice(0, 700) : biography;

  return (
    <main className="min-h-screen bg-[#181818] text-white">
      {/* =========================================
          PERSON HEADER
      ========================================= */}

      <section className="mx-auto max-w-[1500px] px-5 pb-14 pt-10 sm:px-8 md:px-10 lg:px-12 lg:pt-14">
        {/* Back */}
        <Link
          to={-1}
          onClick={(event) => {
            event.preventDefault();
            window.history.back();
          }}
          className="mb-10 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={17} />
          Back
        </Link>

        <div className="grid items-start gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] lg:gap-12">
          {/* Profile */}
          <div className="w-fit mx-auto md:mx-0">
            <div className="overflow-hidden rounded-2xl bg-[#242424] shadow-2xl shadow-black/30 ring-1 ring-white/10">
              {profileUrl ? (
                <img
                  src={profileUrl}
                  alt={person.name}
                  className="block aspect-[3/4] w-[210px] object-cover object-top sm:w-[230px] lg:w-[270px]"
                />
              ) : (
                <div className="flex aspect-[3/4] w-[210px] items-center justify-center text-sm text-gray-500 sm:w-[230px] lg:w-[270px]">
                  No Photo
                </div>
              )}
            </div>
          </div>

          {/* Information */}
          <div className="pt-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#e50914]">
              Fabelman Profile
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {person.name}
            </h1>

            {person.known_for_department && (
              <p className="mt-4 text-base text-gray-400">
                {person.known_for_department}
              </p>
            )}

            {/* Personal information */}
            <div className="mt-6 flex flex-wrap gap-2">
              {person.birthday && (
                <span className="rounded-full border border-white/10 bg-[#242424] px-4 py-2 text-sm text-gray-300">
                  Born {person.birthday}
                </span>
              )}

              {person.place_of_birth && (
                <span className="rounded-full border border-white/10 bg-[#242424] px-4 py-2 text-sm text-gray-300">
                  {person.place_of_birth}
                </span>
              )}
            </div>

            {/* Biography */}
            {biography && (
              <div className="mt-8 max-w-4xl">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e50914]">
                  Biography
                </p>

                <p className="mt-3 text-sm leading-7 text-gray-300 sm:text-base">
                  {displayedBiography}
                  {!showFullBiography && biography.length > 700 && "..."}
                </p>

                {biography.length > 700 && (
                  <button
                    type="button"
                    onClick={() => setShowFullBiography((value) => !value)}
                    className="mt-3 text-sm font-medium text-white transition-colors hover:text-[#e50914]"
                  >
                    {showFullBiography ? "Read Less" : "Read More"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================
          FILMOGRAPHY
      ========================================= */}

      <section className="mx-auto max-w-[1500px] px-5 pb-8 sm:px-8 md:px-10 lg:px-12">
        <div className="border-t border-white/10 pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e50914]">
            Career
          </p>

          <h2 className="mt-2 text-3xl font-semibold">Filmography</h2>
        </div>
      </section>

      {/* Movies */}
      <PersonSection title="Movies" movies={filmography.movies} />

      {/* Direction */}
      <PersonSection title="Direction" movies={filmography.direction} />

      {/* Writing */}
      <PersonSection title="Writing" movies={filmography.writing} />

      {/* Empty state */}
      {filmography.movies.length === 0 &&
        filmography.direction.length === 0 &&
        filmography.writing.length === 0 && (
          <section className="mx-auto max-w-[1500px] px-5 pb-20 text-center sm:px-8 md:px-10 lg:px-12">
            <p className="text-sm text-gray-500">No filmography available.</p>
          </section>
        )}
    </main>
  );
};

export default Personpage;
