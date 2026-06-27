CREATE TABLE "SystemErrorLog" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" TEXT NOT NULL DEFAULT 'ERROR',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'backend',
    "method" TEXT,
    "path" TEXT,
    "action" TEXT,
    "message" TEXT NOT NULL,
    "technicalMessage" TEXT,
    "stack" TEXT,
    "correlationId" TEXT,
    "statusCode" INTEGER,
    "userId" INTEGER,
    "userRole" TEXT,
    "cinemaId" INTEGER,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" INTEGER,
    "resolutionNote" TEXT,

    CONSTRAINT "SystemErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SystemErrorLog_createdAt_idx" ON "SystemErrorLog"("createdAt");
CREATE INDEX "SystemErrorLog_severity_idx" ON "SystemErrorLog"("severity");
CREATE INDEX "SystemErrorLog_status_idx" ON "SystemErrorLog"("status");
CREATE INDEX "SystemErrorLog_cinemaId_idx" ON "SystemErrorLog"("cinemaId");
CREATE INDEX "SystemErrorLog_userId_idx" ON "SystemErrorLog"("userId");
CREATE INDEX "SystemErrorLog_correlationId_idx" ON "SystemErrorLog"("correlationId");
