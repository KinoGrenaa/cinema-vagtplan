import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { CreateStaffingRequestInput } from './staffing-request-helpers';
import { StaffingRequestShift } from './staffing-request-create-lookups';
import { StaffingRequestSchedule } from './staffing-request-create-schedule';

type JobFunctionSummary = { id: number; name: string; color: string };

export async function createUnassignedStaffingShiftIfNeeded({
  prisma,
  realtimeGateway,
  cinemaId,
  dto,
  shift,
  jobFunction,
  schedule,
}: {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  cinemaId: number;
  dto: CreateStaffingRequestInput;
  shift: StaffingRequestShift | null;
  jobFunction: JobFunctionSummary;
  schedule: StaffingRequestSchedule;
}): Promise<StaffingRequestShift> {
  if (shift) return shift;

  const createdShift = await prisma.shift.create({
    data: {
      cinemaId,
      userId: null,
      jobFunctionId: jobFunction.id,
      jobFunctionNameSnapshot: jobFunction.name,
      jobFunctionColorSnapshot: jobFunction.color,
      timingSource: 'MANUAL',
      workTypeId: null,
      startTime: schedule.requestStartTime,
      endTime: schedule.requestEndTime,
      note:
        dto.message?.trim() ||
        'Ikke tildelt vagt oprettet fra bemandingsforespørgsel',
    },
    include: { user: true, jobFunction: true },
  });

  realtimeGateway.notifyCinema(cinemaId, 'shiftsUpdated', createdShift);
  return createdShift;
}
