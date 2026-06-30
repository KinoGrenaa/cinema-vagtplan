import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class ShiftPlanningDraftPublicationService {
  constructor(
    private prisma: PrismaService,
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
}
