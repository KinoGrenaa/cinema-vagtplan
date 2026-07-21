import { BadRequestException } from '@nestjs/common';
import { StaffingAiService } from './staffing-ai.service';

describe('StaffingAiService', () => {
  let availabilityEngine: {
    getAvailabilityScore: jest.Mock;
  };
  let fatigueEngine: {
    calculateFatigueScore: jest.Mock;
  };
  let staffingRanking: {
    rankEmployeesForEmergency: jest.Mock;
  };
  let service: StaffingAiService;

  const start = new Date('2026-07-21T08:00:00Z');
  const end = new Date('2026-07-21T16:00:00Z');

  beforeEach(() => {
    availabilityEngine = {
      getAvailabilityScore: jest.fn(),
    };
    fatigueEngine = {
      calculateFatigueScore: jest.fn(),
    };
    staffingRanking = {
      rankEmployeesForEmergency: jest.fn(),
    };

    service = new StaffingAiService(
      availabilityEngine as never,
      fatigueEngine as never,
      staffingRanking as never,
    );
  });

  it('ranks a valid employee with validated inputs', async () => {
    staffingRanking.rankEmployeesForEmergency.mockResolvedValue([
      {
        userId: 7,
        acceptanceScore: 0.5,
        emergencyScore: 0.4,
        reasoning: ['Historik'],
      },
    ]);
    availabilityEngine.getAvailabilityScore.mockResolvedValue({
      score: 80,
      reasoning: ['Tilgængelighed'],
    });
    fatigueEngine.calculateFatigueScore.mockResolvedValue({
      fatigueScore: 1,
      overtimeScore: 0,
      reasoning: ['Træthed'],
    });

    await expect(
      service.rankEmployeesForShift(
        3,
        start,
        end,
      ),
    ).resolves.toEqual([
      {
        userId: 7,
        totalScore: 90,
        fatigueScore: 1,
        overtimeScore: 0,
        availabilityScore: 80,
        acceptanceScore: 0.5,
        emergencyScore: 0.4,
        reasoning: [
          'Historik',
          'Tilgængelighed',
          'Træthed',
        ],
      },
    ]);

    expect(
      staffingRanking.rankEmployeesForEmergency,
    ).toHaveBeenCalledWith(3);
    expect(
      availabilityEngine.getAvailabilityScore,
    ).toHaveBeenCalledWith(
      3,
      7,
      start,
      end,
    );
  });

  it.each([
    '1e2',
    '1.5',
    0,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid cinema ID %p', async (cinemaId) => {
    await expect(
      service.rankEmployeesForShift(
        cinemaId as number,
        start,
        end,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      staffingRanking.rankEmployeesForEmergency,
    ).not.toHaveBeenCalled();
  });

  it('rejects local or reversed date ranges', async () => {
    await expect(
      service.rankEmployeesForShift(
        3,
        '2026-07-21T08:00:00' as unknown as Date,
        end,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.rankEmployeesForShift(
        3,
        end,
        start,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      staffingRanking.rankEmployeesForEmergency,
    ).not.toHaveBeenCalled();
  });

  it('rejects an invalid ranked employee ID', async () => {
    staffingRanking.rankEmployeesForEmergency.mockResolvedValue([
      {
        userId: '1e2',
        acceptanceScore: 0,
        emergencyScore: 0,
        reasoning: [],
      },
    ]);

    await expect(
      service.rankEmployeesForShift(
        3,
        start,
        end,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      availabilityEngine.getAvailabilityScore,
    ).not.toHaveBeenCalled();
  });

  it('rejects an invalid candidate limit before ranking', async () => {
    await expect(
      service.getTopEmergencyCandidates(
        3,
        start,
        end,
        '1e2' as unknown as number,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      staffingRanking.rankEmployeesForEmergency,
    ).not.toHaveBeenCalled();
  });
});
