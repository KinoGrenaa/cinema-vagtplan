-- Support schedule-day overlap reads where shifts end after the day starts.
CREATE INDEX "Shift_cinemaId_endTime_startTime_id_idx"
ON "Shift"("cinemaId", "endTime", "startTime", "id");

-- Support cinema/day movie-showing overlap reads and stable ordering.
CREATE INDEX "MovieShowing_cinemaId_startTime_id_idx"
ON "MovieShowing"("cinemaId", "startTime", "id");

CREATE INDEX "MovieShowing_cinemaId_endTime_startTime_id_idx"
ON "MovieShowing"("cinemaId", "endTime", "startTime", "id");
