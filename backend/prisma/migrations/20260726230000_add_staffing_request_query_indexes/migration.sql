-- Support pending sorting, emergency counts and completed cursors.
CREATE INDEX "StaffingRequest_cinemaId_status_priority_createdAt_id_idx"
ON "StaffingRequest"("cinemaId", "status", "priority", "createdAt", "id");

CREATE INDEX "StaffingRequest_cinemaId_status_type_id_idx"
ON "StaffingRequest"("cinemaId", "status", "type", "id");

-- Support employee visibility branches in pending/history queries.
CREATE INDEX "StaffingRequest_cinemaId_requestedByUserId_status_id_idx"
ON "StaffingRequest"("cinemaId", "requestedByUserId", "status", "id");

CREATE INDEX "StaffingRequest_cinemaId_targetUserId_status_id_idx"
ON "StaffingRequest"("cinemaId", "targetUserId", "status", "id");

-- Support linked staffing-request lookups for individual shifts.
CREATE INDEX "StaffingRequest_cinemaId_shiftId_status_id_idx"
ON "StaffingRequest"("cinemaId", "shiftId", "status", "id");
