import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { CreateStaffingRequestInput } from './staffing-request-helpers';
import { StaffingRequestShift } from './staffing-request-create-lookups';
import { StaffingRequestSchedule } from './staffing-request-create-schedule';

type CreateUnassignedStaffingShiftIfNeededParams = {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  cinemaId: number;
  dto: CreateStaffingRequestInput;
  shift: StaffingRequestShift | null;
  requestedWorkTypeId: number;
  schedule: StaffingRequestSchedule;
};

export async function createUnassignedStaffingShiftIfNeeded({
  prisma,
  realtimeGateway,
  cinemaId,
  dto,
  shift,
  requestedWorkTypeId,
  schedule,
}: CreateUnassignedStaffingShiftIfNeededParams): Promise<StaffingRequestShift> {
  if (shift) return shift;

  const createdShift = await prisma.shift.create({
    data: {
      cinemaId,
      userId: null,
      workTypeId: requestedWorkTypeId,
      startTime: schedule.requestStartTime,
      endTime: schedule.requestEndTime,
      note:
        dto.message?.trim() ||
        'Ikke tildelt vagt oprettet fra bemandingsforespørgsel',
    },
    include: {
      user: true,
      workType: true,
    },
  });

  realtimeGateway.notifyCinema(cinemaId, 'shiftsUpdated', createdShift);

  return createdShift;
}
