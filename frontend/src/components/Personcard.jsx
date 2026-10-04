import { memo } from "react";
import { Link } from "react-router-dom";
import { IMAGE_BASE_URL } from "../api/tmdb";

const THUMBNAIL_BASE_URL = IMAGE_BASE_URL.replace("/original", "/w185");

const Personcard = memo(({ person, role, character }) => {
  if (!person?.id) return null;

  const profileUrl = person.profile_path
    ? `${THUMBNAIL_BASE_URL}${person.profile_path}`
    : null;

  return (
    <Link
      to={`/person/${person.id}`}
      className="group block w-[104px] shrink-0 text-center sm:w-[115px] md:w-[125px]"
    >
      <div className="mx-auto h-[90px] w-[70px] overflow-hidden rounded-full bg-[#242424] ring-1 ring-white/10 transition-all duration-300 group-hover:ring-[#e50914]/60 sm:h-[100px] sm:w-[78px] md:h-[110px] md:w-[85px]">
        {profileUrl ? (
          <img
            src={profileUrl}
            alt={person.name}
            loading="lazy"
            decoding="async"
            width={85}
            height={110}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
            N/A
          </div>
        )}
      </div>

      <h3 className="mt-3 truncate text-sm font-medium text-gray-300 transition-colors duration-300 group-hover:text-white">
        {person.name}
      </h3>

      <p className="mt-1 truncate text-xs text-gray-500 transition-colors duration-300 group-hover:text-gray-400">
        {character || role || "Crew"}
      </p>
    </Link>
  );
});

Personcard.displayName = "Personcard";

export default Personcard;
