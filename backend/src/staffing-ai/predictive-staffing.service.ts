import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  parseStaffingAiDateRange,
  parseStaffingAiId,
} from './staffing-ai-input';

type StaffingPressureLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

const COPENHAGEN_TIME_ZONE =
  'Europe/Copenhagen';
const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

function getCopenhagenPredictionContext(
  value: Date,
) {
  const parts = new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone: COPENHAGEN_TIME_ZONE,
      weekday: 'short',
      hour: '2-digit',
      hourCycle: 'h23',
    },
  ).formatToParts(value);
  const weekday = parts.find(
    (part) => part.type === 'weekday',
  )?.value;
  const hourValue = parts.find(
    (part) => part.type === 'hour',
  )?.value;
  const hour = Number(hourValue);

  return {
    hour,
    isWeekend:
      weekday === 'Fri' ||
      weekday === 'Sat' ||
      weekday === 'Sun',
  };
}

@Injectable()
export class PredictiveStaffingService {
  constructor(private prisma: PrismaService) {}

  async predictStaffingPressure(params: {
    cinemaId: number;
    startTime: Date;
    endTime: Date;
  }): Promise<{
    level: StaffingPressureLevel;
    score: number;
    reasoning: string[];
  }> {
    const cinemaId = parseStaffingAiId(
      params?.cinemaId,
      'Biograf skal være et gyldigt ID',
    );
    const {
      start,
      end,
    } = parseStaffingAiDateRange(
      params?.startTime,
      params?.endTime,
    );
    const reasoning: string[] = [];
    let score = 0;

    const [
      showingsCount,
      staffingCount,
      recentEmergencyRequests,
    ] = await Promise.all([
      this.prisma.movieShowing.count({
        where: {
          cinemaId,
          startTime: {
            lt: end,
          },
          endTime: {
            gt: start,
          },
        },
      }),
      this.prisma.shift.count({
        where: {
          cinemaId,
          startTime: {
            lt: end,
          },
          endTime: {
            gt: start,
          },
        },
      }),
      this.prisma.staffingRequest.count({
        where: {
          cinemaId,
          type: 'EMERGENCY',
          createdAt: {
            gte: new Date(
              start.getTime() -
                7 * MILLISECONDS_PER_DAY,
            ),
            lt: start,
          },
        },
      }),
    ]);

    score += showingsCount * 15;
    reasoning.push(
      `${showingsCount} filmvisninger i perioden`,
    );
    reasoning.push(
      `${staffingCount} vagter planlagt`,
    );

    const {
      hour,
      isWeekend,
    } = getCopenhagenPredictionContext(
      start,
    );

    if (isWeekend) {
      score += 25;
      reasoning.push(
        'Weekend pressure detected',
      );
    }

    if (hour >= 18 && hour <= 23) {
      score += 30;
      reasoning.push(
        'Evening peak pressure',
      );
    }

    if (showingsCount >= 6) {
      score += 40;
      reasoning.push('High movie activity');
    }

    if (staffingCount < showingsCount) {
      score += 50;
      reasoning.push(
        'Potential understaffing detected',
      );
    }

    if (recentEmergencyRequests >= 5) {
      score += 40;
      reasoning.push(
        'Recent emergency staffing trend detected',
      );
    }

    let level: StaffingPressureLevel =
      'LOW';

    if (score >= 140) {
      level = 'CRITICAL';
    } else if (score >= 90) {
      level = 'HIGH';
    } else if (score >= 50) {
      level = 'MEDIUM';
    }

    reasoning.push(
      `Predicted staffing pressure: ${level}`,
    );

    return {
      level,
      score,
      reasoning,
    };
  }
}
