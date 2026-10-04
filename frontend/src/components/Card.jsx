import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { ChevronRight, Star } from "lucide-react";

import "swiper/css";
import { TMDB_BASE_URL, options, IMAGE_BASE_URL } from "../api/tmdb";

const ALLOWED_CATEGORIES = new Set([
  "popular",
  "now_playing",
  "top_rated",
  "upcoming",
]);

const CARD_IMAGE_BASE_URL = IMAGE_BASE_URL.replace("/original", "/w780");

const SWIPER_BREAKPOINTS = {
  640: { spaceBetween: 14 },
  1024: { spaceBetween: 18 },
};

const Card = ({ title, category }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchMovies = async () => {
      try {
        setIsLoading(true);
        setError(false);

        if (!ALLOWED_CATEGORIES.has(category)) {
          throw new Error("Invalid movie category.");
        }

        const params = new URLSearchParams({
          language: "en-US",
          page: "1",
        });

        const response = await fetch(
          `${TMDB_BASE_URL}/movie/${category}?${params.toString()}`,
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

        if (!controller.signal.aborted) {
          setData(result.results);
        }
      } catch (err) {
        if (err.name !== "AbortError" && err.name !== "CanceledError") {
          if (import.meta.env.DEV) {
            console.error(`TMDB ${category} error:`, err.message);
          }

          if (!controller.signal.aborted) {
            setError(true);
            setData([]);
          }
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
  }, [category]);

  return (
    <section className="mt-2 overflow-hidden text-white md:px-4">
      <div className="flex items-center justify-between pt-8 pb-4 sm:pt-10 sm:pb-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h2>
          <div className="mt-1 h-0.5 w-8 rounded-full bg-[#e50914]" />
        </div>

        <button
          type="button"
          className="group flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-white sm:text-sm"
        >
          See All
          <ChevronRight
            size={16}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </button>
      </div>

      {isLoading && (
        <Swiper
          slidesPerView="auto"
          spaceBetween={10}
          className="!overflow-visible"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <SwiperSlide
              key={index}
              className="!w-[150px] sm:!w-[190px] md:!w-[230px] lg:!w-[260px]"
            >
              <div className="aspect-video animate-pulse rounded-xl bg-white/10" />
              <div className="mx-auto mt-3 h-3 w-3/4 animate-pulse rounded bg-white/10" />
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center">
          <p className="text-sm text-gray-400">
            Unable to load {title?.toLowerCase() || "movies"}.
          </p>
        </div>
      )}

      {!isLoading && !error && data.length > 0 && (
        <Swiper
          slidesPerView="auto"
          spaceBetween={10}
          grabCursor
          className="!overflow-visible"
          breakpoints={SWIPER_BREAKPOINTS}
        >
          {data.map((item) => {
            if (!item?.id) return null;

            const imageUrl = item.backdrop_path
              ? `${CARD_IMAGE_BASE_URL}${item.backdrop_path}`
              : null;

            const movieTitle = item.title || item.original_title || "Movie";

            return (
              <SwiperSlide
                key={item.id}
                className="!w-[150px] sm:!w-[190px] md:!w-[230px] lg:!w-[260px]"
              >
                <Link to={`/movie/${item.id}`} className="group block">
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-[#252525]">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={movieTitle}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-500">
                        No Image
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    {Number(item.vote_average) > 0 && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs font-medium opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                        <Star
                          size={12}
                          className="fill-current text-yellow-400"
                        />
                        {Number(item.vote_average).toFixed(1)}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <p className="truncate text-sm font-medium text-gray-200 transition-colors group-hover:text-white sm:text-base">
                      {movieTitle}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.release_date
                        ? item.release_date.slice(0, 4)
                        : "Unknown"}
                    </p>
                  </div>
                </Link>
              </SwiperSlide>
            );
          })}
        </Swiper>
      )}

      {!isLoading && !error && data.length === 0 && (
        <p className="py-8 text-sm text-gray-500">No movies found.</p>
      )}
    </section>
  );
};

export default Card;
