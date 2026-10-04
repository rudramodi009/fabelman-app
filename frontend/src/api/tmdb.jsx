import { API_BASE_URL } from "./axios";

export const TMDB_BASE_URL = `${API_BASE_URL}/api/tmdb`;

// Standard fetch options for backend proxy calls
export const options = Object.freeze({
  method: "GET",
  headers: {
    Accept: "application/json",
  },
  credentials: "include",
});

// TMDB CDN configurations
export const TMDB_IMAGE_SIZES = {
  POSTER_SMALL: "w185",
  POSTER_MEDIUM: "w342",
  POSTER_LARGE: "w500",
  BACKDROP_MEDIUM: "w780",
  BACKDROP_LARGE: "w1280",
  ORIGINAL: "original",
};

export const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

/**
 * Returns a CDN image URL with fallback safety
 * @param {string|null} path - TMDB path (e.g. movie.poster_path)
 * @param {string} size - TMDB image size (e.g. 'w500', 'w780', 'original')
 */
export const getTMDBImageUrl = (path, size = TMDB_IMAGE_SIZES.ORIGINAL) => {
  if (!path || typeof path !== "string") return null;
  return `https://image.tmdb.org/t/p/${size}${path.startsWith("/") ? path : `/${path}`}`;
};
