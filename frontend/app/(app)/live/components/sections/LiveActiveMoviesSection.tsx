import type { MovieShowing } from "../../helpers/core/liveTypes";

type LiveActiveMoviesSectionProps = {
  activeMovies: MovieShowing[];
};

export function LiveActiveMoviesSection({
  activeMovies,
}: LiveActiveMoviesSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
          Film lige nu
        </h2>

        <span className="rounded-full bg-red-700 px-3 py-1 text-sm font-semibold text-white dark:bg-red-600">
          {activeMovies.length}
        </span>
      </div>

      <div className="space-y-3">
        {activeMovies.map((movie) => (
          <article
            key={movie.id}
            className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-900 transition-colors dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-100"
          >
            <div className="font-bold">
              {movie.title}
            </div>

            <div className="mt-1 text-sm text-gray-700 dark:text-gray-200">
              {movie.hall}
            </div>

            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {movie.soldSeats} solgt ·{" "}
              {movie.freeSeats} ledige
            </div>
          </article>
        ))}

        {activeMovies.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-300">
            Ingen film kører lige nu.
          </div>
        )}
      </div>
    </section>
  );
}
