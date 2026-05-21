type MovieProgramProps = {
  movieShowings: any[];
};

export default function MovieProgram({ movieShowings }: MovieProgramProps) {
  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-3xl font-bold">Dagens program</h2>

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="hidden grid-cols-5 bg-gray-50 text-sm font-semibold text-gray-600 dark:bg-gray-950 dark:text-gray-400 md:grid">
          <div className="border-r border-gray-200 p-3 dark:border-gray-800">
            Film
          </div>
          <div className="border-r border-gray-200 p-3 dark:border-gray-800">
            Sal
          </div>
          <div className="border-r border-gray-200 p-3 dark:border-gray-800">
            Start
          </div>
          <div className="border-r border-gray-200 p-3 dark:border-gray-800">
            Slut
          </div>
          <div className="p-3">Billetter</div>
        </div>

        {movieShowings.map((movie) => (
          <div
            key={movie.id}
            className="grid gap-2 border-t border-gray-200 p-4 text-sm transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50 md:grid-cols-5 md:gap-0 md:p-0"
          >
            <div className="font-medium md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
              {movie.title}
            </div>

            <div className="md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400 md:hidden">
                Sal:{" "}
              </span>
              {movie.hall}
            </div>

            <div className="md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400 md:hidden">
                Start:{" "}
              </span>
              {new Date(movie.startTime).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="md:border-r md:border-gray-200 md:p-3 md:dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400 md:hidden">
                Slut:{" "}
              </span>
              {new Date(movie.endTime).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="md:p-3">
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-200">
                {movie.soldSeats} solgt
              </span>{" "}
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {movie.freeSeats} ledige
              </span>
            </div>
          </div>
        ))}

        {movieShowings.length === 0 && (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Ingen film denne dag.
          </div>
        )}
      </div>
    </div>
  );
}