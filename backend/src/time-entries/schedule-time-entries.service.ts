import {
  Injectable,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  ensureTimeEntryTargetUserAccess,
  getTimeEntryActorUserId,
  resolveTimeEntryActorCinemaId,
} from './helpers/time-entry-cinema-access';
import {
  findScheduleTimeEntriesForDay,
} from './helpers/schedule-time-entry-read';

@Injectable()
export class ScheduleTimeEntriesService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async findForDay(
    user: any,
    date: string,
    selectedCinemaId?:
      number | null,
  ) {
    const userId =
      getTimeEntryActorUserId(
        user,
      );
    const cinemaId =
      await resolveTimeEntryActorCinemaId(
        this.prisma,
        user,
        selectedCinemaId,
      );

    if (
      user?.role !==
      'MASTER'
    ) {
      await ensureTimeEntryTargetUserAccess(
        this.prisma,
        userId,
        cinemaId,
      );
    }

    return findScheduleTimeEntriesForDay(
      this.prisma,
      {
        userId,
        cinemaId,
        date,
      },
    );
  }
}
