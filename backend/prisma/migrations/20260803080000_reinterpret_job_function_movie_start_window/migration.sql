-- The legacy field clamped the final shift to the old day-period boundaries.
-- It now controls only whether movie STARTS are filtered by the configured window.
ALTER TABLE "JobFunctionTimingRule"
  RENAME COLUMN "limitToFilmWindow" TO "restrictMovieStartsToWindow";
