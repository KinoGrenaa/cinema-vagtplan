"use client";

export type MovieShowing = {
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

export type TimelineRange = {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
};

type MovieProgramProps = {
  movieShowings: MovieShowing[];
  selectedDate: string;
  range: TimelineRange;
  top: number;
  leftLabelWidth: number;
  rowHeight: number;
};

export const MOVIE_ROW_HEIGHT = 68;

function selectedDateStart(
  selectedDate: string,
) {
  return new Date(
    `${selectedDate}T00:00:00`,
  );
}

function selectedDateEnd(
  selectedDate: string,
) {
  const end =
    selectedDateStart(
      selectedDate,
    );

  end.setDate(
    end.getDate() + 1,
  );

  return end;
}

export function getMovieRoom(
  movie: MovieShowing,
) {
  return (
    movie.auditorium ||
    movie.hall ||
    movie.screen ||
    "Ukendt sal"
  );
}

export function getMovieRooms(
  movieShowings: MovieShowing[],
) {
  return Array.from(
    new Set(
      movieShowings.map(
        getMovieRoom,
      ),
    ),
  ).sort();
}

function getMovieTitle(
  movie: MovieShowing,
) {
  return (
    movie.title ||
    movie.movieTitle ||
    "Ukendt film"
  );
}

function formatTime(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleTimeString(
    "da-DK",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

export function getVisibleMovieMinutes(
  movie: MovieShowing,
  selectedDate: string,
) {
  const dayStart =
    selectedDateStart(
      selectedDate,
    );

  const dayEnd =
    selectedDateEnd(
      selectedDate,
    );

  const movieStart =
    new Date(
      movie.startTime,
    );

  const movieEnd =
    new Date(
      movie.endTime,
    );

  if (
    movieEnd <= dayStart ||
    movieStart >= dayEnd
  ) {
    return null;
  }

  const visibleStart =
    Math.max(
      movieStart.getTime(),
      dayStart.getTime(),
    );

  const visibleEnd =
    Math.min(
      movieEnd.getTime(),
      dayEnd.getTime(),
    );

  const startMinutes =
    Math.max(
      0,
      Math.round(
        (
          visibleStart -
          dayStart.getTime()
        ) /
          60000,
      ),
    );

  const endMinutes =
    Math.min(
      24 * 60,
      Math.round(
        (
          visibleEnd -
          dayStart.getTime()
        ) /
          60000,
      ),
    );

  return {
    startMinutes,
    endMinutes:
      Math.max(
        startMinutes + 1,
        endMinutes,
      ),
  };
}

export default function MovieProgram({
  movieShowings,
  selectedDate,
  range,
  top,
  leftLabelWidth,
  rowHeight,
}: MovieProgramProps) {
  const rooms =
    getMovieRooms(
      movieShowings,
    );

  if (
    rooms.length === 0
  ) {
    return null;
  }

  return (
    <div
      className="absolute inset-x-0"
      style={{
        top,
        height:
          rooms.length *
          rowHeight,
      }}
    >
      {rooms.map(
        (
          room,
          roomIndex,
        ) => {
          const roomMovies =
            movieShowings.filter(
              (movie) =>
                getMovieRoom(
                  movie,
                ) === room,
            );

          return (
            <div
              key={room}
              className="absolute inset-x-0 border-t border-gray-300 dark:border-gray-700"
              style={{
                top:
                  roomIndex *
                  rowHeight,
                height:
                  rowHeight,
              }}
            >
              <div
                className="absolute inset-y-0 left-0 flex items-center px-2 text-xs font-bold text-gray-700 dark:text-gray-200"
                style={{
                  width:
                    leftLabelWidth,
                }}
              >
                {room}
              </div>

              <div
                className="absolute inset-y-0 right-0"
                style={{
                  left:
                    leftLabelWidth,
                }}
              >
                {roomMovies.map(
                  (movie) => {
                    const visible =
                      getVisibleMovieMinutes(
                        movie,
                        selectedDate,
                      );

                    if (
                      !visible
                    ) {
                      return null;
                    }

                    const startMinutes =
                      Math.max(
                        range.startMinutes,
                        visible.startMinutes,
                      );

                    const endMinutes =
                      Math.min(
                        range.endMinutes,
                        visible.endMinutes,
                      );

                    if (
                      endMinutes <=
                      startMinutes
                    ) {
                      return null;
                    }

                    const leftPercent =
                      (
                        (
                          startMinutes -
                          range.startMinutes
                        ) /
                        range.durationMinutes
                      ) *
                      100;

                    const widthPercent =
                      (
                        (
                          endMinutes -
                          startMinutes
                        ) /
                        range.durationMinutes
                      ) *
                      100;

                    const title =
                      getMovieTitle(
                        movie,
                      );

                    const timeLabel =
                      `${formatTime(
                        movie.startTime,
                      )} - ${formatTime(
                        movie.endTime,
                      )}`;

                    return (
                      <div
                        key={
                          movie.id
                        }
                        className="absolute bottom-2 top-2 z-10 min-w-10 overflow-hidden rounded-lg border border-blue-400/70 bg-blue-950/80 px-2 py-1.5 text-blue-50 shadow-sm"
                        style={{
                          left:
                            `${leftPercent}%`,
                          width:
                            `${widthPercent}%`,
                        }}
                        title={
                          `${title} - ${timeLabel}`
                        }
                      >
                        <div className="truncate text-xs font-bold">
                          {title}
                        </div>

                        <div className="truncate text-[10px] font-semibold text-blue-200">
                          {timeLabel}
                          {typeof movie.ticketsSold ===
                          "number"
                            ? ` ? ${movie.ticketsSold} billetter`
                            : ""}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}
