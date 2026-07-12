import type { MovieShowing } from "../../helpers/liveTypes";

type LiveActiveMoviesSectionProps = {
  activeMovies: MovieShowing[];
};

export function LiveActiveMoviesSection({
  activeMovies,
}: LiveActiveMoviesSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Film lige nu</h2>
        <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">
          {activeMovies.length}
        </span>
      </div>

      <div className="space-y-3">
        {activeMovies.map((movie) => (
          <div
            key={movie.id}
            className="rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-colors dark:border-gray-800 dark:bg-gray-950"
          >
            <div className="font-bold">{movie.title}</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {movie.hall}
            </div>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {movie.soldSeats} solgt · {movie.freeSeats} ledige
            </div>
          </div>
        ))}

        {activeMovies.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
            Ingen film kører lige nu.
          </div>
        )}
      </div>
    </section>
  );
}
