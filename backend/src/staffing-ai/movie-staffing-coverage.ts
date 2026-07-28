type CinemaTimeInterval = {
  cinemaId: number;
  startTime: Date;
  endTime: Date;
};

type AssignedShiftInterval = CinemaTimeInterval & {
  userId: number | null;
};

export type MovieStaffingIssue = {
  startTime: Date;
  endTime: Date;
  assignedStaff: number;
  requiredStaff: number;
  movieShowings: number;
};

type FindMovieStaffingIssuesInput = {
  cinemaId: number;
  startTime: Date;
  endTime: Date;
  shifts: AssignedShiftInterval[];
  movieShowings: CinemaTimeInterval[];
};

function isValidDate(value: Date) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function isValidInterval(interval: CinemaTimeInterval) {
  return (
    isValidDate(interval.startTime) &&
    isValidDate(interval.endTime) &&
    interval.startTime.getTime() < interval.endTime.getTime()
  );
}

function clampInterval<TInterval extends CinemaTimeInterval>(
  interval: TInterval,
  rangeStartTime: number,
  rangeEndTime: number,
): TInterval | null {
  const startTime = Math.max(
    interval.startTime.getTime(),
    rangeStartTime,
  );
  const endTime = Math.min(interval.endTime.getTime(), rangeEndTime);

  if (startTime >= endTime) {
    return null;
  }

  return {
    ...interval,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
  };
}

function overlaps(
  interval: CinemaTimeInterval,
  startTime: number,
  endTime: number,
) {
  return (
    interval.startTime.getTime() < endTime &&
    interval.endTime.getTime() > startTime
  );
}

function appendIssue(
  issues: MovieStaffingIssue[],
  issue: MovieStaffingIssue,
) {
  const previous = issues[issues.length - 1];

  if (
    previous &&
    previous.endTime.getTime() === issue.startTime.getTime() &&
    previous.assignedStaff === issue.assignedStaff &&
    previous.requiredStaff === issue.requiredStaff &&
    previous.movieShowings === issue.movieShowings
  ) {
    previous.endTime = issue.endTime;
    return;
  }

  issues.push(issue);
}

export function findMovieStaffingIssues(
  input: FindMovieStaffingIssuesInput,
): MovieStaffingIssue[] {
  if (
    !isValidDate(input.startTime) ||
    !isValidDate(input.endTime) ||
    input.startTime.getTime() >= input.endTime.getTime()
  ) {
    return [];
  }

  const rangeStartTime = input.startTime.getTime();
  const rangeEndTime = input.endTime.getTime();

  const movieShowings = input.movieShowings
    .filter(
      (showing) =>
        showing.cinemaId === input.cinemaId && isValidInterval(showing),
    )
    .map((showing) =>
      clampInterval(showing, rangeStartTime, rangeEndTime),
    )
    .filter((showing): showing is CinemaTimeInterval => showing !== null);

  if (movieShowings.length === 0) {
    return [];
  }

  const shifts = input.shifts
    .filter(
      (shift) =>
        shift.cinemaId === input.cinemaId &&
        shift.userId !== null &&
        isValidInterval(shift),
    )
    .map((shift) => clampInterval(shift, rangeStartTime, rangeEndTime))
    .filter((shift): shift is AssignedShiftInterval => shift !== null);

  const boundaries = Array.from(
    new Set(
      [...movieShowings, ...shifts].flatMap((interval) => [
        interval.startTime.getTime(),
        interval.endTime.getTime(),
      ]),
    ),
  ).sort((left, right) => left - right);

  const issues: MovieStaffingIssue[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startTime = boundaries[index];
    const endTime = boundaries[index + 1];

    if (startTime === undefined || endTime === undefined) {
      continue;
    }

    const activeMovies = movieShowings.filter((showing) =>
      overlaps(showing, startTime, endTime),
    );

    if (activeMovies.length === 0) {
      continue;
    }

    const assignedUserIds = new Set(
      shifts
        .filter((shift) => overlaps(shift, startTime, endTime))
        .map((shift) => shift.userId)
        .filter((userId): userId is number => userId !== null),
    );

    const requiredStaff = Math.max(2, activeMovies.length * 2);
    const assignedStaff = assignedUserIds.size;

    if (assignedStaff >= requiredStaff) {
      continue;
    }

    appendIssue(issues, {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      assignedStaff,
      requiredStaff,
      movieShowings: activeMovies.length,
    });
  }

  return issues;
}
