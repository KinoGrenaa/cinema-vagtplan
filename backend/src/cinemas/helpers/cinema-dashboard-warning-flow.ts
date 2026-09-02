import { BadRequestException } from '@nestjs/common';
import type {
  DashboardWarningDecisionAction,
  DashboardWarningType,
} from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { DashboardWarningDecisionInput } from './cinema-dashboard-warning-input';
import {
  findCinemaForWrite,
  withCinemaWriteLock,
} from './cinema-write-access';

const copenhagenDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Copenhagen',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getCopenhagenDateKey(value: Date) {
  return copenhagenDateFormatter.format(value);
}

function getShiftId(warningKey: string) {
  const match = /^UNASSIGNED_SHIFT:([1-9]\d*):\d{4}-\d{2}-\d{2}$/.exec(
    warningKey,
  );
  return match ? Number(match[1]) : null;
}

function getLoadWarningVersion(warningKey: string) {
  const match = /^STAFFING_LOAD:\d{4}-\d{2}-\d{2}:v([1-9]\d*)$/.exec(
    warningKey,
  );
  return match ? Number(match[1]) : null;
}

const decisionUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

export async function findDashboardWarningDecisions(
  prisma: PrismaService,
  cinemaId: number,
  startDate: string,
  endDate: string,
) {
  return prisma.dashboardWarningDecision.findMany({
    where: {
      cinemaId,
      localDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: [
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
    include: {
      user: {
        select: decisionUserSelect,
      },
    },
  });
}

async function resolveWarningSnapshot(
  transaction: any,
  cinema: any,
  data: DashboardWarningDecisionInput,
) {
  if (data.warningType === 'UNASSIGNED_SHIFT') {
    const shiftId = getShiftId(data.warningKey);

    if (!shiftId) {
      throw new BadRequestException('Advarselsnøglen er ugyldig');
    }

    const shift = await transaction.shift.findFirst({
      where: {
        id: shiftId,
        cinemaId: cinema.id,
        userId: null,
      },
      select: {
        id: true,
        startTime: true,
        jobFunctionNameSnapshot: true,
      },
    });

    if (!shift || getCopenhagenDateKey(shift.startTime) !== data.localDate) {
      throw new BadRequestException(
        'Den ubemandede vagt er ikke længere en aktuel advarsel',
      );
    }

    return {
      label: `${shift.jobFunctionNameSnapshot} er ubemandet`,
      details: 'Vagten er ikke tildelt en medarbejder.',
    };
  }

  const version = getLoadWarningVersion(data.warningKey);

  if (
    !cinema.staffingLoadWarningEnabled ||
    version !== cinema.staffingLoadWarningVersion ||
    data.warningKey !==
      `STAFFING_LOAD:${data.localDate}:v${cinema.staffingLoadWarningVersion}`
  ) {
    throw new BadRequestException(
      'Belastningsadvarslen er ikke længere baseret på den aktive regel',
    );
  }

  return {
    label: 'Høj forventet belastning',
    details:
      `Biografens regel: mindst ${cinema.staffingLoadWarningMinSoldSeats} solgte billetter og mere end ${cinema.staffingLoadWarningMaxTicketsPerEmployee} billetter pr. planlagt medarbejder.`,
  };
}

export async function recordDashboardWarningDecision(
  prisma: PrismaService,
  cinemaId: number,
  userId: number,
  data: DashboardWarningDecisionInput,
) {
  return withCinemaWriteLock(prisma, async (transaction) => {
    const cinema = await findCinemaForWrite(transaction, cinemaId);
    const latest = await transaction.dashboardWarningDecision.findFirst({
      where: {
        cinemaId,
        warningKey: data.warningKey,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      include: {
        user: {
          select: decisionUserSelect,
        },
      },
    });

    if (data.action === 'REOPENED') {
      if (!latest || latest.action !== 'IGNORED') {
        throw new BadRequestException(
          'Advarslen er ikke ignoreret og kan derfor ikke genåbnes',
        );
      }

      return transaction.dashboardWarningDecision.create({
        data: {
          cinemaId,
          warningKey: latest.warningKey,
          warningType: latest.warningType as DashboardWarningType,
          localDate: latest.localDate,
          action: 'REOPENED' as DashboardWarningDecisionAction,
          note: data.note,
          warningLabel: latest.warningLabel,
          warningDetails: latest.warningDetails,
          userId,
        },
        include: {
          user: {
            select: decisionUserSelect,
          },
        },
      });
    }

    if (latest?.action === 'IGNORED') {
      return latest;
    }

    const snapshot = await resolveWarningSnapshot(
      transaction,
      cinema,
      data,
    );

    return transaction.dashboardWarningDecision.create({
      data: {
        cinemaId,
        warningKey: data.warningKey,
        warningType: data.warningType as DashboardWarningType,
        localDate: data.localDate,
        action: 'IGNORED' as DashboardWarningDecisionAction,
        note: data.note,
        warningLabel: snapshot.label,
        warningDetails: snapshot.details,
        userId,
      },
      include: {
        user: {
          select: decisionUserSelect,
        },
      },
    });
  });
}
