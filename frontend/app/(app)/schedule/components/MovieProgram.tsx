type MovieShowing = {
  id: number;
  title?: string;
  movieTitle?: string;
  auditorium?: string;
  hall?: string;
  screen?: string;
  startTime: string;
  endTime: string;
  ticketsSold?: number;
};

type MovieProgramProps = {
  movieShowings: MovieShowing[];
};

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }).map(
  (_, index) => DAY_START_HOUR + index,
);

function getMinutesFromStart(value: string) {
  const date = new Date(value);

  return date.getHours() * 60 + date.getMinutes();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoom(movie: MovieShowing) {
  return movie.auditorium || movie.hall || movie.screen || "Ukendt sal";
}

function getTitle(movie: MovieShowing) {
  return movie.title || movie.movieTitle || "Ukendt film";
}

export default function MovieProgram({ movieShowings }: MovieProgramProps) {
  const totalMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60;

  const rooms = Array.from(new Set(movieShowings.map(getRoom))).sort();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Dagens filmprogram</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Film vist efter sal, starttid og sluttid
        </p>
      </div>

      {movieShowings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Ingen filmvisninger denne dag.
        </div>
      ) : (
        <div className="w-full">
          <div className="mb-2 grid grid-cols-[110px_1fr] text-xs text-gray-500 dark:text-gray-400">
            <div />

            <div className="relative h-6">
              {HOURS.map((hour) => {
                const leftPercent =
                  ((hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) *
                  100;

                const isFirst = hour === DAY_START_HOUR;
                const isLast = hour === DAY_END_HOUR;

                return (
                  <div
                    key={hour}
                    className="absolute top-0 whitespace-nowrap text-center"
                    style={{
                      left: isFirst
                        ? "8px"
                        : isLast
                          ? "calc(100% - 8px)"
                          : `${leftPercent}%`,
                      transform: isFirst
                        ? "translateX(0)"
                        : isLast
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                    }}
                  >
                    {String(hour).padStart(2, "0")}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {rooms.map((room) => {
              const roomMovies = movieShowings.filter(
                (movie) => getRoom(movie) === room,
              );

              return (
                <div
                  key={room}
                  className="grid min-h-20 grid-cols-[110px_1fr] gap-3"
                >
                  <div className="flex items-center rounded-xl bg-gray-100 px-3 text-sm font-bold dark:bg-gray-800">
                    {room}
                  </div>

                  <div className="relative min-h-20 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
                    <div className="absolute inset-0">
                      {HOURS.map((hour) => {
                        const leftPercent =
                          ((hour - DAY_START_HOUR) /
                            (DAY_END_HOUR - DAY_START_HOUR)) *
                          100;

                        return (
                          <div
                            key={hour}
                            className="absolute top-0 h-full border-l border-gray-200 dark:border-gray-800"
                            style={{
                              left: `${leftPercent}%`,
                            }}
                          />
                        );
                      })}
                    </div>

                    {roomMovies.map((movie) => {
                      const startMinutes = getMinutesFromStart(movie.startTime);
                      const endMinutes = getMinutesFromStart(movie.endTime);
                      const durationMinutes = Math.max(
                        endMinutes - startMinutes,
                        1,
                      );

                      const leftPercent = (startMinutes / totalMinutes) * 100;
                      const widthPercent =
                        (durationMinutes / totalMinutes) * 100;

                      return (
                        <div
                          key={movie.id}
                          className="absolute top-3 z-10 h-14 overflow-hidden rounded-xl border border-blue-300 bg-blue-100 px-2 py-2 text-xs text-blue-950 shadow-sm dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-100 md:px-3 md:text-sm"
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          title={`${getTitle(movie)} - ${formatTime(
                            movie.startTime,
                          )} til ${formatTime(movie.endTime)}`}
                        >
                          <div className="truncate font-bold">
                            {getTitle(movie)}
                          </div>

                          <div className="truncate text-xs">
                            {formatTime(movie.startTime)} -{" "}
                            {formatTime(movie.endTime)}
                            {typeof movie.ticketsSold === "number"
                              ? ` · ${movie.ticketsSold} billetter`
                              : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
