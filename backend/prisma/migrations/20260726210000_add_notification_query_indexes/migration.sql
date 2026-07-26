-- CreateIndex
CREATE INDEX "Notification_userId_cinemaId_id_idx"
ON "Notification"("userId", "cinemaId", "id");

-- CreateIndex
CREATE INDEX "Notification_userId_cinemaId_isRead_id_idx"
ON "Notification"("userId", "cinemaId", "isRead", "id");
