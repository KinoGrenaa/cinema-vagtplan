import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { checkShiftConflicts } from '../shifts/helpers/shift-conflict-checks';
import { ensureShiftUserHasCinemaAccess } from '../shifts/helpers/shift-user-access';

import { ShiftPlanningDraftsService } from './shift-planning-drafts.service';

type AuthUser = {
  sub?: number;
  id?: number;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId?: number | null;
};

type PublicationDraftRow = {
  id: number | bigint;
  cinemaId: number | bigint;
  year: number | bigint;
  month: number | bigint;
  status: string;
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
  jobFunctionWorkTypeId: number | bigint | null;
  workTypeName: string | null;
  workTypeIsActive: boolean | null;
  workTypeArchivedAt: Date | string | null;
  scheduleTemplateName: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
};

type PublicationPublishBody = {
  confirmationText?: unknown;
  confirmText?: unknown;
  confirm?: unknown;
  note?: unknown;
};

type InsertedShiftRow = {
  id: number | bigint;
};

type LockedDraftRow = {
  id: number | bigint;
  status: string;
};

const PUBLISH_CONFIRMATION_TEXT = 'OPRET VAGTER';

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
  const fullName =
    `${row.userFirstName ?? ''} ${row.userLastName ?? ''}`.trim();
  return fullName || row.userEmail || null;
}

function getJobFunctionWorkTypeBlockReason(row: PublicationPreviewItemRow) {
  const jobFunctionName = row.jobFunctionName || 'Jobfunktionen';

  if (!row.jobFunctionId) {
    return 'Jobfunktion mangler.';
  }

  if (!row.jobFunctionWorkTypeId) {
    return `${jobFunctionName} mangler feltet “Oprettes som”. Ret jobfunktionen først.`;
  }

  if (row.workTypeIsActive === false || row.workTypeArchivedAt) {
    return `${jobFunctionName} er koblet til en inaktiv arbejdstype. Ret “Oprettes som” på jobfunktionen først.`;
  }

  return null;
}

function getUniqueMessages(messages: string[]) {
  return Array.from(new Set(messages.filter(Boolean)));
}

function buildBlockReasons(
  row: PublicationPreviewItemRow,
  validationErrors: string[] = [],
) {
  const reasons: string[] = [];
  const plannedStartMinute = toNullableNumber(row.plannedStartMinute);
  const plannedEndMinute = toNullableNumber(row.plannedEndMinute);

  if (!row.scheduleTemplateId || !row.scheduleTemplateDayId) {
    reasons.push('Mangler vagtsskabelon eller ugedag.');
  }

  const workTypeBlockReason = getJobFunctionWorkTypeBlockReason(row);
  if (workTypeBlockReason) {
    reasons.push(workTypeBlockReason);
  }

  if (plannedStartMinute === null || plannedEndMinute === null) {
    reasons.push('Mangler mødetid eller fyraften.');
  }

  reasons.push(...validationErrors);

  return getUniqueMessages(reasons);
}

function normalizePreviewItem(
  row: PublicationPreviewItemRow,
  validationErrors: string[] = [],
) {
  const date = toDate(row.date);
  const plannedStartMinute = toNullableNumber(row.plannedStartMinute);
  const plannedEndMinute = toNullableNumber(row.plannedEndMinute);
  const { startTime, endTime } = buildShiftTimes(
    date,
    plannedStartMinute,
    plannedEndMinute,
  );
  const blockReasons = buildBlockReasons(row, validationErrors);

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
    workTypeId: toNullableNumber(row.jobFunctionWorkTypeId),
    workTypeName: row.workTypeName,
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
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
      'Bekræft oprettelsen, før vagterne oprettes.',
    );
  }

  const note =
    typeof bodyObject.note === 'string' && bodyObject.note.trim().length > 0
      ? bodyObject.note.trim()
      : null;

  return { note };
}

function getActorUserId(user: AuthUser) {
  const userId = Number(user.sub ?? user.id);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function buildPublishAuditDescription(
  draftId: number,
  insertedShiftIds: number[],
  affectedDateKeys: string[],
  workTypeNames: string[],
) {
  const parts = [
    `Publicerede planlægningskladde #${draftId} til ${insertedShiftIds.length} vagt(er).`,
    affectedDateKeys.length > 0
      ? `Datoer: ${affectedDateKeys.join(', ')}`
      : null,
    workTypeNames.length > 0
      ? `Arbejdstyper: ${workTypeNames.join(', ')}`
      : null,
    insertedShiftIds.length > 0
      ? `Shift-id'er: ${insertedShiftIds.join(', ')}`
      : null,
  ].filter(Boolean);

  return parts.join(' ');
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
    const selectedCinemaId =
      user.role === 'MASTER' ? cinemaIdValue : user.cinemaId;
    const cinemaId = resolveCinemaId(user, selectedCinemaId);

    const draftRows = await this.prisma.$queryRaw<PublicationDraftRow[]>(
      Prisma.sql`
        SELECT d.*
        FROM "ShiftPlanningDraft" d
        WHERE d.id = ${draftId}
          AND d."cinemaId" = ${cinemaId}
        LIMIT 1
      `,
    );

    if (draftRows.length === 0) {
      throw new NotFoundException('Planlægningskladden findes ikke.');
    }

    const validation = await this.shiftPlanningDraftsService.validateDraft(
      user,
      draftId,
      String(cinemaId),
    );
    const validationIssues = validation.issues ?? [];
    const validationErrorsByItemId = new Map<number, string[]>();

    validationIssues
      .filter((issue) => issue.severity === 'ERROR' && issue.itemId)
      .forEach((issue) => {
        const itemId = Number(issue.itemId);
        const messages = validationErrorsByItemId.get(itemId) ?? [];
        messages.push(issue.message);
        validationErrorsByItemId.set(itemId, messages);
      });

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
          jf."workTypeId" AS "jobFunctionWorkTypeId",
          wt.name AS "workTypeName",
          wt."isActive" AS "workTypeIsActive",
          wt."archivedAt" AS "workTypeArchivedAt",
          st.name AS "scheduleTemplateName",
          u."firstName" AS "userFirstName",
          u."lastName" AS "userLastName",
          u.email AS "userEmail"
        FROM "ShiftPlanningDraftItem" i
        LEFT JOIN "JobFunction" jf ON jf.id = i."jobFunctionId"
        LEFT JOIN "WorkType" wt
          ON wt.id = jf."workTypeId"
          AND wt."cinemaId" = i."cinemaId"
        LEFT JOIN "ScheduleTemplate" st ON st.id = i."scheduleTemplateId"
        LEFT JOIN "User" u ON u.id = i."userId"
        WHERE i."draftId" = ${draftId}
          AND i."cinemaId" = ${cinemaId}
        ORDER BY
          i.date ASC,
          i."plannedStartMinute" ASC NULLS LAST,
          i.id ASC
      `,
    );

    const isDraftStatus =
      String(draftRows[0].status ?? '').toUpperCase() === 'DRAFT';
    const previewItems = itemRows.map((row) => {
      const validationErrors =
        validationErrorsByItemId.get(Number(row.id)) ?? [];
      const item = normalizePreviewItem(row, validationErrors);

      if (!isDraftStatus) {
        item.blockReasons = getUniqueMessages([
          ...item.blockReasons,
          'Forslaget er ikke åbent længere.',
        ]);
        item.canBecomeShift = false;
      }

      return item;
    });

    for (const item of previewItems) {
      if (
        !item.canBecomeShift ||
        item.userId === null ||
        !item.startTime ||
        !item.endTime
      ) {
        continue;
      }

      try {
        await ensureShiftUserHasCinemaAccess(
          this.prisma,
          item.userId,
          cinemaId,
        );
        await checkShiftConflicts(this.prisma, {
          startTime: item.startTime,
          endTime: item.endTime,
          userId: item.userId,
          cinemaId,
        });
      } catch (error) {
        item.blockReasons = getUniqueMessages([
          ...item.blockReasons,
          getErrorMessage(error, 'Medarbejderen kan ikke tildeles denne vagt.'),
        ]);
        item.canBecomeShift = false;
      }
    }

    const blockedItems = previewItems.filter((item) => !item.canBecomeShift);
    const hasDraftItems = previewItems.length > 0;
    const canPublishLater =
      isDraftStatus && hasDraftItems && blockedItems.length === 0;
    const blockingReasons = getUniqueMessages([
      ...(!isDraftStatus ? ['Forslaget er ikke åbent længere.'] : []),
      ...(!hasDraftItems ? ['Kladden indeholder ingen kladdeposter.'] : []),
      ...blockedItems.flatMap((item) => item.blockReasons),
    ]);

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
        publishableItemCount: previewItems.length - blockedItems.length,
        blockedItemCount: blockedItems.length,
        validationErrorCount: validation.summary.errorCount,
        validationWarningCount: validation.summary.warningCount,
        validationIssueCount: validation.summary.issueCount,
      },
      blockingReasons,
      validationSummary: validation.summary,
      validationIssues,
      previewItems,
    };
  }

  async publishDraft(
    user: AuthUser,
    draftId: number,
    cinemaIdValue?: string,
    body?: unknown,
  ) {
    const selectedCinemaId =
      user.role === 'MASTER' ? cinemaIdValue : user.cinemaId;
    const cinemaId = resolveCinemaId(user, selectedCinemaId);
    const { note } = parsePublishBody(body);
    const actorUserId = getActorUserId(user);

    const preview = await this.getPublicationPreview(
      user,
      draftId,
      String(cinemaId),
    );

    if (!preview.summary.canPublishLater) {
      throw new BadRequestException(
        preview.blockingReasons[0] ??
          'Ret de markerede punkter, før vagterne oprettes.',
      );
    }

    const publicationResult = await this.prisma.$transaction(async (tx) => {
      const lockedDraftRows = await tx.$queryRaw<LockedDraftRow[]>(Prisma.sql`
        SELECT d.id, d.status
        FROM "ShiftPlanningDraft" d
        WHERE d.id = ${draftId}
          AND d."cinemaId" = ${cinemaId}
        FOR UPDATE
      `);

      if (lockedDraftRows.length === 0) {
        throw new NotFoundException('Planlægningskladden findes ikke.');
      }

      if (String(lockedDraftRows[0].status).toUpperCase() !== 'DRAFT') {
        throw new BadRequestException(
          'Planlægningskladden er allerede behandlet.',
        );
      }

      const itemRows = await tx.$queryRaw<PublicationPreviewItemRow[]>(
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
            jf."workTypeId" AS "jobFunctionWorkTypeId",
            wt.name AS "workTypeName",
            wt."isActive" AS "workTypeIsActive",
            wt."archivedAt" AS "workTypeArchivedAt",
            st.name AS "scheduleTemplateName",
            u."firstName" AS "userFirstName",
            u."lastName" AS "userLastName",
            u.email AS "userEmail"
          FROM "ShiftPlanningDraftItem" i
          LEFT JOIN "JobFunction" jf ON jf.id = i."jobFunctionId"
          LEFT JOIN "WorkType" wt
            ON wt.id = jf."workTypeId"
            AND wt."cinemaId" = i."cinemaId"
          LEFT JOIN "ScheduleTemplate" st ON st.id = i."scheduleTemplateId"
          LEFT JOIN "User" u ON u.id = i."userId"
          WHERE i."draftId" = ${draftId}
            AND i."cinemaId" = ${cinemaId}
          ORDER BY
            i.date ASC,
            i."plannedStartMinute" ASC NULLS LAST,
            i.id ASC
        `,
      );

      if (itemRows.length === 0) {
        throw new BadRequestException(
          'Kladden indeholder ingen poster, der kan oprettes som vagter.',
        );
      }

      const insertedShiftIds: number[] = [];
      const affectedDateKeys = new Set<string>();
      const workTypeNames = new Set<string>();

      for (const row of itemRows) {
        const item = normalizePreviewItem(row);

        if (!item.canBecomeShift || !item.startTime || !item.endTime) {
          throw new BadRequestException(
            item.blockReasons[0] ??
              'Ret jobfunktionens “Oprettes som” og tider, før vagterne oprettes.',
          );
        }

        if (item.workTypeId === null) {
          throw new BadRequestException(
            'Ret jobfunktionens “Oprettes som”, før vagterne oprettes.',
          );
        }

        if (item.userId !== null) {
          await ensureShiftUserHasCinemaAccess(tx, item.userId, cinemaId);
          await checkShiftConflicts(tx, {
            startTime: item.startTime,
            endTime: item.endTime,
            userId: item.userId,
            cinemaId,
          });
        }

        const insertedRows = await tx.$queryRaw<InsertedShiftRow[]>(Prisma.sql`
          INSERT INTO "Shift" (
            "cinemaId",
            "userId",
            "workTypeId",
            "startTime",
            "endTime",
            note
          )
          VALUES (
            ${cinemaId},
            ${item.userId},
            ${item.workTypeId},
            ${item.startTime},
            ${item.endTime},
            ${note}
          )
          RETURNING id
        `);

        insertedShiftIds.push(toRequiredNumber(insertedRows[0]?.id));
        affectedDateKeys.add(item.dateKey);

        if (item.workTypeName) {
          workTypeNames.add(item.workTypeName);
        }

        await tx.$executeRaw(Prisma.sql`
          UPDATE "ShiftPlanningDraftItem"
          SET status = 'PUBLISHED',
            "startTime" = ${item.startTime},
            "endTime" = ${item.endTime},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = ${item.draftItemId}
            AND "draftId" = ${draftId}
            AND "cinemaId" = ${cinemaId}
        `);
      }

      const sortedDateKeys = Array.from(affectedDateKeys).sort();
      const sortedWorkTypeNames = Array.from(workTypeNames).sort();

      await refreshMonthPlanCountsForDateKeys(tx, cinemaId, sortedDateKeys);

      await tx.$executeRaw(Prisma.sql`
        UPDATE "ShiftPlanningDraft"
        SET status = 'PUBLISHED',
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${draftId}
          AND "cinemaId" = ${cinemaId}
          AND status = 'DRAFT'
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
              sortedDateKeys,
              sortedWorkTypeNames,
            )},
            CURRENT_TIMESTAMP,
            ${actorUserId},
            ${cinemaId}
          )
        `);
      }

      return {
        createdShiftIds: insertedShiftIds,
        affectedDateKeys: sortedDateKeys,
        workTypeNames: sortedWorkTypeNames,
      };
    });

    const publishedAt = new Date();

    this.realtimeGateway.notifyCinema(cinemaId, 'shiftsUpdated', {
      cinemaId,
      source: 'SHIFT_PLANNING_DRAFT_PUBLISH',
      draftId,
      createdShiftCount: publicationResult.createdShiftIds.length,
      createdShiftIds: publicationResult.createdShiftIds,
      affectedDateKeys: publicationResult.affectedDateKeys,
    });

    this.realtimeGateway.notifyCinema(cinemaId, 'shiftPlanningDraftPublished', {
      cinemaId,
      draftId,
      year: preview.year,
      month: preview.month,
      createdShiftCount: publicationResult.createdShiftIds.length,
      createdShiftIds: publicationResult.createdShiftIds,
      affectedDateKeys: publicationResult.affectedDateKeys,
      publishedAt,
    });

    return {
      draftId,
      cinemaId,
      year: preview.year,
      month: preview.month,
      status: 'PUBLISHED',
      mode: 'CREATE_SHIFTS',
      createsShifts: true,
      createdShiftCount: publicationResult.createdShiftIds.length,
      createdShiftIds: publicationResult.createdShiftIds,
      affectedDateKeys: publicationResult.affectedDateKeys,
      workTypeId: null,
      workTypeName: publicationResult.workTypeNames.join(', ') || null,
      workTypeNames: publicationResult.workTypeNames,
      publishedAt,
      message: `${publicationResult.createdShiftIds.length} vagter er oprettet i vagtplanen.`,
    };
  }
}
