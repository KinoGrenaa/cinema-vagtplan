import {
  EMPLOYEE_DOCUMENT_PAGE_SIZE,
} from './employee-document-list-query';
import { findEmployeeDocumentsForUser } from './employee-document-read-flow';

describe('employee document compatibility read', () => {
  it('bevarer array-svaret men begrænser læsningen til 50', async () => {
    const prisma = {
      employeeDocument: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    await findEmployeeDocumentsForUser(
      prisma as never,
      {
        sub: 4,
        role: 'ADMIN',
        cinemaId: 2,
      },
      9,
    );

    expect(
      prisma.employeeDocument.findMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 2,
        userId: 9,
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: EMPLOYEE_DOCUMENT_PAGE_SIZE,
    });
  });
});
