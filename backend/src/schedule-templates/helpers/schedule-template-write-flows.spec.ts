import { BadRequestException } from '@nestjs/common';
import { addScheduleTemplateAssignment } from './schedule-template-assignment-flow';
import { createScheduleTemplate } from './schedule-template-create-flow';
import type { AuthUser } from './schedule-template-service-helpers';

const admin: AuthUser = {
  sub: 2,
  email: 'admin@example.com',
  role: 'ADMIN',
  cinemaId: 7,
};

function createTransactionalPrisma(
  transaction: Record<string, unknown>,
) {
  return {
    $transaction: jest.fn(
      async (callback: (value: any) => unknown) =>
        callback(transaction),
    ),
  };
}

describe('schedule template write flows', () => {
  it('creates a template inside the cinema lock transaction', async () => {
    const created = {
      id: 10,
      cinemaId: 7,
      name: 'Sommerplan',
    };
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      scheduleTemplate: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      createScheduleTemplate(
        prisma as never,
        admin,
        {
          name: ' Sommerplan ',
        },
      ),
    ).resolves.toEqual(created);

    expect(
      transaction.scheduleTemplate.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        name: 'Sommerplan',
        isActive: true,
      },
      select: {
        id: true,
      },
    });
    expect(
      transaction.scheduleTemplate.create,
    ).toHaveBeenCalled();
  });

  it('rejects a duplicate active template inside the lock', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      scheduleTemplate: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 10,
          }),
        create: jest.fn(),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      createScheduleTemplate(
        prisma as never,
        admin,
        {
          name: 'Sommerplan',
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      transaction.scheduleTemplate.create,
    ).not.toHaveBeenCalled();
  });

  it('adds a fixed employee using active membership and eligibility', async () => {
    const updatedLine = {
      id: 20,
    };
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      scheduleTemplate: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 10,
            cinemaId: 7,
            isActive: true,
          }),
      },
      scheduleTemplateJobFunction: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 20,
            jobFunctionId: 4,
          }),
        findUnique: jest
          .fn()
          .mockResolvedValue(updatedLine),
      },
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 9,
          }),
      },
      userJobFunction: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 11,
          }),
      },
      scheduleTemplateAssignment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValue({
            id: 30,
          }),
      },
    };
    const prisma =
      createTransactionalPrisma(transaction);

    await expect(
      addScheduleTemplateAssignment(
        prisma as never,
        admin,
        10,
        20,
        {
          userId: 9,
        },
      ),
    ).resolves.toEqual(updatedLine);

    expect(
      transaction.scheduleTemplateAssignment.create,
    ).toHaveBeenCalledWith({
      data: {
        cinemaId: 7,
        templateJobFunctionId: 20,
        userId: 9,
        sortOrder: 0,
      },
    });
  });
});
