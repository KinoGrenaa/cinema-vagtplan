-- Improve future-shift and conflict lookups used by shift-trade pages.
CREATE INDEX "Shift_cinemaId_startTime_id_idx"
ON "Shift"("cinemaId", "startTime", "id");

CREATE INDEX "Shift_cinemaId_userId_startTime_endTime_idx"
ON "Shift"("cinemaId", "userId", "startTime", "endTime");

CREATE INDEX "LeaveRequest_cinemaId_userId_status_startDate_endDate_idx"
ON "LeaveRequest"("cinemaId", "userId", "status", "startDate", "endDate");

-- Support open direct/pool pages, history OR-branches, totals and id cursors.
CREATE INDEX "ShiftTrade_cinemaId_status_type_id_idx"
ON "ShiftTrade"("cinemaId", "status", "type", "id");

CREATE INDEX "ShiftTrade_cinemaId_status_offeredByUserId_id_idx"
ON "ShiftTrade"("cinemaId", "status", "offeredByUserId", "id");

CREATE INDEX "ShiftTrade_cinemaId_status_acceptedByUserId_id_idx"
ON "ShiftTrade"("cinemaId", "status", "acceptedByUserId", "id");

CREATE INDEX "ShiftTrade_cinemaId_status_targetUserId_id_idx"
ON "ShiftTrade"("cinemaId", "status", "targetUserId", "id");
