import {
  BadRequestException,
} from '@nestjs/common';
import { AiLearningService } from './ai-learning.service';

describe('AiLearningService', () => {
  let prisma: {
    cinema: {
      findUnique: jest.Mock;
    };
    aiLearningEvent: {
      create: jest.Mock;
      count: jest.Mock;
    };
  };
  let service: AiLearningService;

  beforeEach(() => {
    prisma = {
      cinema: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 7,
          }),
      },
      aiLearningEvent: {
        create: jest
          .fn()
          .mockResolvedValue({
            id: 1,
          }),
        count: jest.fn(),
      },
    };

    service = new AiLearningService(
      prisma as never,
    );
  });

  it('creates a normalized event for an existing cinema', async () => {
    await expect(
      service.createEvent({
        cinemaId: '7',
        type: ' emergency_staffing ',
        severity: ' warning ',
        metadata: {
          requestId: 12,
        },
      }),
    ).resolves.toEqual({
      id: 1,
    });

    expect(
      prisma.cinema.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 7,
      },
      select: {
        id: true,
      },
    });
    expect(
      prisma.aiLearningEvent.create,
    ).toHaveBeenCalledWith({
      data: {
        cinemaId: 7,
        type: 'EMERGENCY_STAFFING',
        severity: 'WARNING',
        metadata: {
          requestId: 12,
        },
      },
    });
  });

  it('rejects an event for a missing cinema', async () => {
    prisma.cinema.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.createEvent({
        cinemaId: 7,
        type: 'TEST_EVENT',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(
      prisma.aiLearningEvent.create,
    ).not.toHaveBeenCalled();
  });

  it('rejects invalid input before database access', async () => {
    await expect(
      service.createEvent({
        cinemaId: '1e2',
        type: 'TEST_EVENT',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(
      prisma.cinema.findUnique,
    ).not.toHaveBeenCalled();
    expect(
      prisma.aiLearningEvent.create,
    ).not.toHaveBeenCalled();
  });

  it('counts complete statistics without a 500-event cap', async () => {
    prisma.aiLearningEvent.count
      .mockResolvedValueOnce(1_200)
      .mockResolvedValueOnce(400)
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(80);

    await expect(
      service.getStatistics('7'),
    ).resolves.toEqual({
      totalEvents: 1_200,
      emergencyEvents: 400,
      overtimeEvents: 120,
      fatigueEvents: 80,
    });

    expect(
      prisma.aiLearningEvent.count,
    ).toHaveBeenNthCalledWith(1, {
      where: {
        cinemaId: 7,
      },
    });
    expect(
      prisma.aiLearningEvent.count,
    ).toHaveBeenNthCalledWith(2, {
      where: {
        cinemaId: 7,
        type: 'EMERGENCY_STAFFING',
      },
    });
  });
});
