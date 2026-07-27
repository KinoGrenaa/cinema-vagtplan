-- Support administrator pagination, status filters and id cursors.
CREATE INDEX "LeaveRequest_cinemaId_status_id_idx"
ON "LeaveRequest"("cinemaId", "status", "id");

-- Support employee-specific pagination and filtered totals.
CREATE INDEX "LeaveRequest_cinemaId_userId_status_id_idx"
ON "LeaveRequest"("cinemaId", "userId", "status", "id");

-- Support cinema-scoped date filtering and pending-expiry reads.
CREATE INDEX "LeaveRequest_cinemaId_status_startDate_endDate_id_idx"
ON "LeaveRequest"("cinemaId", "status", "startDate", "endDate", "id");

-- Support the global hourly expiry job when no cinema filter is supplied.
CREATE INDEX "LeaveRequest_status_startDate_id_idx"
ON "LeaveRequest"("status", "startDate", "id");
