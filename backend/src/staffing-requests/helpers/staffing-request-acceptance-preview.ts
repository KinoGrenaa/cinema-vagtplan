import {
  StaffingRequestStatus,
} from '@prisma/client';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  AuthUser,
} from './staffing-request-helpers';

type AcceptancePreviewPrisma =
  Pick<
    PrismaService,
    'shift'
  >;

type AcceptancePreviewRequest = {
  status:
    StaffingRequestStatus;
  targetUserId:
    number | null;
  shiftId:
    number | null;
  requestStartTime:
    Date | null;
  requestEndTime:
    Date | null;
  shift?: {
    startTime:
      Date;
    endTime:
      Date;
  } | null;
};

export async function addStaffingAcceptanceConflicts<
  T extends
    AcceptancePreviewRequest,
>(
  prisma:
    AcceptancePreviewPrisma,
  user:
    AuthUser,
  requests:
    T[],
) {
  if (
    user.role !==
      'EMPLOYEE' &&
    user.role !==
      'ADMIN'
  ) {
    return requests.map(
      (request) => ({
        ...request,
        acceptanceConflictShift:
          null,
      }),
    );
  }

  const eligible =
    requests
      .map(
        (request) => ({
          request,
          startTime:
            request.shift
              ?.startTime ??
            request.requestStartTime,
          endTime:
            request.shift
              ?.endTime ??
            request.requestEndTime,
        }),
      )
      .filter(
        (item) =>
          item.request.status ===
            StaffingRequestStatus.PENDING &&
          (!item.request.targetUserId ||
            item.request.targetUserId ===
              user.sub) &&
          item.startTime &&
          item.endTime,
      ) as Array<{
      request: T;
      startTime: Date;
      endTime: Date;
    }>;

  if (
    eligible.length === 0
  ) {
    return requests.map(
      (request) => ({
        ...request,
        acceptanceConflictShift:
          null,
      }),
    );
  }

  const conflicts =
    await prisma.shift.findMany({
      where: {
        userId:
          user.sub,
        OR: eligible.map(
          (item) => ({
            ...(item.request
              .shiftId
              ? {
                  id: {
                    not:
                      item.request
                        .shiftId,
                  },
                }
              : {}),
            startTime: {
              lt:
                item.endTime,
            },
            endTime: {
              gt:
                item.startTime,
            },
          }),
        ),
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        jobFunctionNameSnapshot:
          true,
        jobFunction: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        startTime:
          'asc',
      },
    });

  return requests.map(
    (request) => {
      const eligibleItem =
        eligible.find(
          (item) =>
            item.request ===
            request,
        );

      if (!eligibleItem) {
        return {
          ...request,
          acceptanceConflictShift:
            null,
        };
      }

      const conflict =
        conflicts.find(
          (shift) =>
            shift.id !==
              request.shiftId &&
            shift.startTime <
              eligibleItem.endTime &&
            shift.endTime >
              eligibleItem.startTime,
        );

      return {
        ...request,
        acceptanceConflictShift:
          conflict
            ? {
                id:
                  conflict.id,
                startTime:
                  conflict.startTime,
                endTime:
                  conflict.endTime,
                title:
                  conflict.jobFunctionNameSnapshot ||
                  conflict.jobFunction
                    ?.name ||
                  'Din vagt',
              }
            : null,
      };
    },
  );
}
