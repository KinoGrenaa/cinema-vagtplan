import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ShiftPlanningDraftsService } from './shift-planning-drafts.service';

type AuthUser = {
  sub?: number;
  id?: number;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId?: number | null;
};

type PublicationPreviewItemRow = {
  id: number | bigint;
  cinemaId: number | bigint;
  draftId: number | bigint;
  date: Date | string;
  status: string;
  scheduleTemplateId: number | bigint | null;
  scheduleTemplateDayId: number | bigint | null;
  templateJobFunctionId: number | bigint | null;
  jobFunctionId: number | bigint | null;
  userId: number | bigint | null;
  requiredIndex: number | bigint;
  plannedStartMinute: number | bigint | null;
  plannedEndMinute: number | bigint | null;
  warningCode: string | null;
  warningMessage: string | null;
  jobFunctionName: string | null;
  jobFunctionColor: string | null;
  scheduleTemplateName: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
};

type PublicationPublishBody = {
  confirmationText?: unknown;
  confirmText?: unknown;
  confirm?: unknown;
  workTypeId?: unknown;
  note?: unknown;
};

type WorkTypeRow = {
  id: number | bigint;
  name: string;
  isActive: boolean;
  archivedAt: Date | string | null;
};

type InsertedShiftRow = {
  id: number | bigint;
};

type ExistingPublishedDraftShiftRow = {
  id: number | bigint;
};

const PUBLISH_CONFIRMATION_TEXT = 'PUBLICER_KLADDE';

function ensureAdminAccess(user: AuthUser) {
  if (user.role === 'MASTER' || user.role === 'ADMIN') {
    return;
  }

  throw new ForbiddenException('Ingen adgang.');
}

function resolveCinemaId(
  user: AuthUser,
  selectedCinemaId?: number | string | null,
) {
  ensureAdminAccess(user);

  if (user.role === 'MASTER') {
    const cinemaId = Number(selectedCinemaId);

    if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
      throw new BadRequestException(
        'Vælg en biograf, før du arbejder med planlægningskladder.',
      );
    }

    return cinemaId;
  }

  const cinemaId = Number(user.cinemaId);

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    throw new ForbiddenException('Ingen biograf er knyttet til din bruger.');
  }

  return cinemaId;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toRequiredNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function toIsoDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDateTimeFromMinute(date: Date, minute: number) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      minute,
      0,
      0,
    ),
  );
}

function buildShiftTimes(
  dateValue: Date | string,
  plannedStartMinute: number | null,
  plannedEndMinute: number | null,
) {
  if (plannedStartMinute === null || plannedEndMinute === null) {
    return { startTime: null, endTime: null };
  }

  const date = toDate(dateValue);
  const normalizedEndMinute =
    plannedEndMinute <= plannedStartMinute
      ? plannedEndMinute + 24 * 60
      : plannedEndMinute;

  return {
    startTime: buildDateTimeFromMinute(date, plannedStartMinute),
    endTime: buildDateTimeFromMinute(date, normalizedEndMinute),
  };
}

function getUserName(row: PublicationPreviewItemRow) {
  const fullName = `${row.userFirstName ?? ''} ${row.userLastName ?? ''}`.trim();
  return fullName || row.userEmail || null;
}

function buildBlockReasons(row: PublicationPreviewItemRow) {
  const reasons: string[] = [];
  const plannedStartMinute = toNullableNumber(row.plannedStartMinute);
  const plannedEndMinute = toNullableNumber(row.plannedEndMinute);

  if (!row.scheduleTemplateId || !row.scheduleTemplateDayId) {
    reasons.push('Mangler vagtsskabelon eller ugedag.');
  }

  if (!row.jobFunctionId) {
    reasons.push('Mangler jobfunktion.');
  }

  if (plannedStartMinute === null || plannedEndMinute === null) {
    reasons.push('Mangler mødetid eller fyraften.');
  }

  if (row.warningCode) {
    reasons.push(row.warningMessage ?? 'Kladdeposten har en advarsel.');
  }

  return reasons;
}

function normalizePreviewItem(row: PublicationPreviewItemRow) {
  const date = toDate(row.date);
  const plannedStartMinute = toNullableNumber(row.plannedStartMinute);
  const plannedEndMinute = toNullableNumber(row.plannedEndMinute);
  const { startTime, endTime } = buildShiftTimes(
    date,
    plannedStartMinute,
    plannedEndMinute,
  );
  const blockReasons = buildBlockReasons(row);

  return {
    draftItemId: toRequiredNumber(row.id),
    dateKey: toIsoDateOnly(date),
    status: row.status,
    requiredIndex: toRequiredNumber(row.requiredIndex),
    scheduleTemplateId: toNullableNumber(row.scheduleTemplateId),
    scheduleTemplateName: row.scheduleTemplateName,
    jobFunctionId: toNullableNumber(row.jobFunctionId),
    jobFunctionName: row.jobFunctionName,
    jobFunctionColor: row.jobFunctionColor,
    userId: toNullableNumber(row.userId),
    userName: getUserName(row),
    plannedStartMinute,
    plannedEndMinute,
    startTime,
    endTime,
    canBecomeShift: blockReasons.length === 0,
    blockReasons,
    warningCode: row.warningCode,
    warningMessage: row.warningMessage,
  };
}

function toBodyObject(body: unknown): PublicationPublishBody {
  if (!body || typeof body !== 'object') {
    return {};
  }

  return body as PublicationPublishBody;
}

function getConfirmationText(body: PublicationPublishBody) {
  return String(
    body.confirmationText ?? body.confirmText ?? body.confirm ?? '',
  ).trim();
}

function parsePublishBody(body: unknown) {
  const bodyObject = toBodyObject(body);
  const confirmationText = getConfirmationText(bodyObject);

  if (confirmationText !== PUBLISH_CONFIRMATION_TEXT) {
    throw new BadRequestException(
      `Skriv ${PUBLISH_CONFIRMATION_TEXT} for at bekræfte publicering af kladden.`,
    );
  }

  const workTypeId = Number(bodyObject.workTypeId);

  if (!Number.isInteger(workTypeId) || workTypeId <= 0) {
    throw new BadRequestException(
      'Vælg en aktiv arbejdstype, før kladden publiceres.',
    );
  }

  const note =
    typeof bodyObject.note === 'string' && bodyObject.note.trim().length > 0
      ? bodyObject.note.trim()
      : null;

  return { workTypeId, note };
}

function getActorUserId(user: AuthUser) {
  const userId = Number(user.sub ?? user.id);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function buildDraftSourceMarker(draftId: number) {
  return `Oprettet fra planlægningskladde #${draftId}`;
}

function buildShiftNote(
  draftId: number,
  dateKey: string,
  jobFunctionName: string | null,
  extraNote: string | null,
) {
  const parts = [
    buildDraftSourceMarker(draftId),
    dateKey,
    jobFunctionName ? `Jobfunktion: ${jobFunctionName}` : null,
    extraNote,
  ].filter(Boolean);

  return parts.join(' · ');
}

function buildPublishAuditDescription(
  draftId: number,
  insertedShiftIds: number[],
  affectedDateKeys: string[],
  workTypeName: string,
) {
  const parts = [
    `Publicerede planlægningskladde #${draftId} til ${insertedShiftIds.length} vagt(er).`,
    affectedDateKeys.length > 0
      ? `Datoer: ${affectedDateKeys.join(', ')}`
      : null,
    `Arbejdstype: ${workTypeName}`,
    insertedShiftIds.length > 0
      ? `Shift-id'er: ${insertedShiftIds.join(', ')}`
      : null,
  ].filter(Boolean);

  return parts.join(' ');
}

function getUniqueDateKeysFromPublicationItems(
  items: ReturnType<typeof normalizePreviewItem>[],
) {
  return Array.from(
    new Set(
      items
        .map((item) => item.dateKey)
        .filter((dateKey): dateKey is string => /^\d{4}-\d{2}-\d{2}$/.test(dateKey)),
    ),
  );
}

function getDateRangeForDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new BadRequestException('Kladdeposten har en ugyldig dato.');
  }

  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

  return { start, end };
}

async function assertNoExistingPublishedDraftShifts(
  tx: Prisma.TransactionClient,
  cinemaId: number,
  draftId: number,
) {
  const sourceMarker = buildDraftSourceMarker(draftId);
  const existingRows = await tx.$queryRaw<ExistingPublishedDraftShiftRow[]>(Prisma.sql`
    SELECT s.id
    FROM "Shift" s
    WHERE s."cinemaId" = ${cinemaId}
      AND s."note" IS NOT NULL
      AND s."note" LIKE ${`${sourceMarker}%`}
    ORDER BY s.id ASC
    LIMIT 25
  `);

  if (existingRows.length === 0) {
    return;
  }

  const existingShiftIds = existingRows.map((row) => toRequiredNumber(row.id));
  throw new BadRequestException(
    `Planlægningskladden ser allerede ud til at være publiceret. Fundne vagter: ${existingShiftIds.join(', ')}.`,
  );
}

async function refreshMonthPlanCountsForDateKeys(
  tx: Prisma.TransactionClient,
  cinemaId: number,
  dateKeys: string[],
) {
  for (const dateKey of dateKeys) {
    const { start, end } = getDateRangeForDateKey(dateKey);

    await tx.$executeRaw(Prisma.sql`
      UPDATE "MonthPlanDay"
      SET "plannedShiftCount" = (
            SELECT CAST(COUNT(*) AS INTEGER)
            FROM "Shift" s
            WHERE s."cinemaId" = ${cinemaId}
              AND s."startTime" >= ${start}
              AND s."startTime" < ${end}
          ),
          "unassignedShiftCount" = (
            SELECT CAST(COUNT(*) AS INTEGER)
            FROM "Shift" s
            WHERE s."cinemaId" = ${cinemaId}
              AND s."startTime" >= ${start}
              AND s."startTime" < ${end}
              AND s."userId" IS NULL
          ),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "cinemaId" = ${cinemaId}
        AND "date" >= ${start}
        AND "date" < ${end}
    `);
  }
}

@Injectable()
export class ShiftPlanningDraftPublicationService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private shiftPlanningDraftsService: ShiftPlanningDraftsService,
  ) {}

  async getPublicationPreview(
    user: AuthUser,
    draftId: number,
    cinemaIdValue?: string,
  ) {
    const selectedCinemaId = user.role === 'MASTER' ? cinemaIdValue : user.cinemaId;
    const cinemaId = resolveCinemaId(user, selectedCinemaId);

    const draftRows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT d.*
      FROM "ShiftPlanningDraft" d
      WHERE d.id = ${draftId}
        AND d."cinemaId" = ${cinemaId}
      LIMIT 1
    `);

    if (draftRows.length === 0) {
      throw new NotFoundException('Planlægningskladden findes ikke.');
    }

    const validation = await this.shiftPlanningDraftsService.validateDraft(
      user,
      draftId,
      String(cinemaId),
    );

    const itemRows = await this.prisma.$queryRaw<PublicationPreviewItemRow[]>(
      Prisma.sql`
        SELECT
          i.id,
          i."cinemaId",
          i."draftId",
          i.date,
          i.status,
          i."scheduleTemplateId",
          i."scheduleTemplateDayId",
          i."templateJobFunctionId",
          i."jobFunctionId",
          i."userId",
          i."requiredIndex",
          i."plannedStartMinute",
          i."plannedEndMinute",
          i."warningCode",
          i."warningMessage",
          jf.name AS "jobFunctionName",
          jf.color AS "jobFunctionColor",
          st.name AS "scheduleTemplateName",
          u."firstName" AS "userFirstName",
          u."lastName" AS "userLastName",
          u.email AS "userEmail"
        FROM "ShiftPlanningDraftItem" i
        LEFT JOIN "JobFunction" jf ON jf.id = i."jobFunctionId"
        LEFT JOIN "ScheduleTemplate" st ON st.id = i."scheduleTemplateId"
        LEFT JOIN "User" u ON u.id = i."userId"
        WHERE i."draftId" = ${draftId}
          AND i."cinemaId" = ${cinemaId}
        ORDER BY i.date ASC, i."plannedStartMinute" ASC NULLS LAST, i.id ASC
      `,
    );

    const previewItems = itemRows.map((row) => normalizePreviewItem(row));
    const publishableItems = previewItems.filter((item) => item.canBecomeShift);
    const blockedItems = previewItems.filter((item) => !item.canBecomeShift);
    const hasValidationProblems =
      validation.summary.errorCount > 0 || validation.summary.warningCount > 0;
    const hasDraftItems = previewItems.length > 0;
    const isDraftStatus = draftRows[0].status === 'DRAFT';
    const canPublishLater =
      isDraftStatus &&
      hasDraftItems &&
      !hasValidationProblems &&
      blockedItems.length === 0;

    const blockingReasons: string[] = [];

    if (!isDraftStatus) {
      blockingReasons.push('Kun kladder med status DRAFT kan senere publiceres.');
    }

    if (!hasDraftItems) {
      blockingReasons.push('Kladden indeholder ingen kladdeposter.');
    }

    if (validation.summary.errorCount > 0) {
      blockingReasons.push('Backend-valideringen har fundet fejl.');
    }

    if (validation.summary.warningCount > 0) {
      blockingReasons.push('Backend-valideringen har fundet advarsler.');
    }

    if (blockedItems.length > 0) {
      blockingReasons.push('En eller flere kladdeposter mangler nødvendige data.');
    }

    return {
      draftId: toRequiredNumber(draftRows[0].id),
      cinemaId,
      year: toRequiredNumber(draftRows[0].year),
      month: toRequiredNumber(draftRows[0].month),
      status: draftRows[0].status,
      checkedAt: new Date(),
      mode: 'PREVIEW_ONLY',
      createsShifts: false,
      summary: {
        canPublishLater,
        itemCount: previewItems.length,
        publishableItemCount: publishableItems.length,
        blockedItemCount: blockedItems.length,
        validationErrorCount: validation.summary.errorCount,
        validationWarningCount: validation.summary.warningCount,
        validationIssueCount: validation.summary.issueCount,
      },
      blockingReasons,
      validationSummary: validation.summary,
      validationIssues: validation.issues,
      previewItems,
    };
  }

  async publishDraft(
    user: AuthUser,
    draftId: number,
    cinemaIdValue?: string,
    body?: unknown,
  ) {
    const selectedCinemaId = user.role === 'MASTER' ? cinemaIdValue : user.cinemaId;
    const cinemaId = resolveCinemaId(user, selectedCinemaId);
    const { workTypeId, note } = parsePublishBody(body);
    const actorUserId = getActorUserId(user);

    const workTypeRows = await this.prisma.$queryRaw<WorkTypeRow[]>(Prisma.sql`
      SELECT wt.id, wt.name, wt."isActive", wt."archivedAt"
      FROM "WorkType" wt
      WHERE wt.id = ${workTypeId}
        AND wt."cinemaId" = ${cinemaId}
      LIMIT 1
    `);

    if (workTypeRows.length === 0) {
      throw new BadRequestException('Den valgte arbejdstype findes ikke i biografen.');
    }

    const workType = workTypeRows[0];

    if (!workType.isActive || workType.archivedAt) {
      throw new BadRequestException('Den valgte arbejdstype er ikke aktiv.');
    }

    const preview = await this.getPublicationPreview(
      user,
      draftId,
      String(cinemaId),
    );

    if (!preview.summary.canPublishLater) {
      throw new BadRequestException({
        message: 'Planlægningskladden er ikke klar til publicering.',
        blockingReasons: preview.blockingReasons,
        validationSummary: preview.validationSummary,
        validationIssues: preview.validationIssues,
      });
    }

    const publishableItems = preview.previewItems.filter(
      (item) => item.canBecomeShift,
    );

    if (publishableItems.length === 0) {
      throw new BadRequestException('Kladden indeholder ingen poster, der kan publiceres.');
    }

    const affectedDateKeys = getUniqueDateKeysFromPublicationItems(publishableItems);

    const createdShiftIds = await this.prisma.$transaction(async (tx) => {
      const lockedDraftRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT d.id, d.status
        FROM "ShiftPlanningDraft" d
        WHERE d.id = ${draftId}
          AND d."cinemaId" = ${cinemaId}
        FOR UPDATE
      `);

      if (lockedDraftRows.length === 0) {
        throw new NotFoundException('Planlægningskladden findes ikke.');
      }

      if (lockedDraftRows[0].status !== 'DRAFT') {
        throw new BadRequestException('Planlægningskladden er allerede behandlet.');
      }

      await assertNoExistingPublishedDraftShifts(tx, cinemaId, draftId);

      const insertedShiftIds: number[] = [];

      for (const item of publishableItems) {
        if (!item.startTime || !item.endTime) {
          throw new BadRequestException('En kladdepost mangler mødetid eller fyraften.');
        }

        const shiftNote = buildShiftNote(
          draftId,
          item.dateKey,
          item.jobFunctionName,
          note,
        );

        const insertedRows = await tx.$queryRaw<InsertedShiftRow[]>(Prisma.sql`
          INSERT INTO "Shift" (
            "startTime",
            "endTime",
            "note",
            "createdAt",
            "cinemaId",
            "userId",
            "workTypeId"
          )
          VALUES (
            ${item.startTime},
            ${item.endTime},
            ${shiftNote},
            CURRENT_TIMESTAMP,
            ${cinemaId},
            ${item.userId},
            ${workTypeId}
          )
          RETURNING id
        `);

        insertedShiftIds.push(toRequiredNumber(insertedRows[0]?.id));
      }

      const draftItemIds = Prisma.join(
        publishableItems.map((item) => item.draftItemId),
      );

      await refreshMonthPlanCountsForDateKeys(tx, cinemaId, affectedDateKeys);

      await tx.$executeRaw(Prisma.sql`
        UPDATE "ShiftPlanningDraftItem"
        SET status = 'PUBLISHED',
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE id IN (${draftItemIds})
          AND "draftId" = ${draftId}
          AND "cinemaId" = ${cinemaId}
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE "ShiftPlanningDraft"
        SET status = 'PUBLISHED',
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${draftId}
          AND "cinemaId" = ${cinemaId}
      `);

      if (actorUserId) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "AuditLog" (
            action,
            "entityType",
            "entityId",
            description,
            "createdAt",
            "userId",
            "cinemaId"
          )
          VALUES (
            'SHIFT_PLANNING_DRAFT_PUBLISHED',
            'ShiftPlanningDraft',
            ${draftId},
            ${buildPublishAuditDescription(
              draftId,
              insertedShiftIds,
              affectedDateKeys,
              workType.name,
            )},
            CURRENT_TIMESTAMP,
            ${actorUserId},
            ${cinemaId}
          )
        `);
      }

      return insertedShiftIds;
    });

    const publishedAt = new Date();

    this.realtimeGateway.notifyCinema(cinemaId, 'shiftsUpdated', {
      cinemaId,
      source: 'SHIFT_PLANNING_DRAFT_PUBLISH',
      draftId,
      createdShiftCount: createdShiftIds.length,
      createdShiftIds,
      affectedDateKeys,
    });

    this.realtimeGateway.notifyCinema(cinemaId, 'shiftPlanningDraftPublished', {
      cinemaId,
      draftId,
      year: preview.year,
      month: preview.month,
      createdShiftCount: createdShiftIds.length,
      createdShiftIds,
      affectedDateKeys,
      publishedAt,
    });

    return {
      draftId,
      cinemaId,
      year: preview.year,
      month: preview.month,
      status: 'PUBLISHED',
      mode: 'PUBLISHED',
      createsShifts: true,
      createdShiftCount: createdShiftIds.length,
      createdShiftIds,
      affectedDateKeys,
      workTypeId,
      workTypeName: workType.name,
      publishedAt,
      message: 'Planlægningskladden er publiceret som rigtige vagter.',
    };
  }
}
