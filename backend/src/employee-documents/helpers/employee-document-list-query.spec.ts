import {
  EMPLOYEE_DOCUMENT_PAGE_SIZE,
  findEmployeeDocumentsPage,
} from './employee-document-list-query';

describe('employee document paginated read', () => {
  function createPrismaMock() {
    return {
      employeeDocument: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 51,
            title: 'Ansættelseskontrakt',
            fileUrl: '/uploads/employee-documents/51.pdf',
            fileName: 'kontrakt.pdf',
            fileType: 'application/pdf',
            createdAt: new Date('2026-07-20T10:00:00.000Z'),
          },
        ]),
        count: jest
          .fn()
          .mockResolvedValueOnce(73)
          .mockResolvedValueOnce(80),
        groupBy: jest.fn().mockResolvedValue([
          {
            fileType: 'application/pdf',
            _count: {
              _all: 60,
            },
          },
          {
            fileType: 'image/png',
            _count: {
              _all: 15,
            },
          },
          {
            fileType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            _count: {
              _all: 5,
            },
          },
        ]),
        findFirst: jest.fn().mockResolvedValue({
          createdAt: new Date('2026-07-20T10:00:00.000Z'),
        }),
      },
    };
  }

  it('afgrænser, filtrerer, sorterer og paginerer server-side', async () => {
    const prisma = createPrismaMock();

    const result = await findEmployeeDocumentsPage(
      prisma as never,
      {
        sub: 7,
        role: 'ADMIN',
        cinemaId: 3,
      },
      12,
      {
        page: 2,
        search: 'kontrakt',
        type: 'PDF',
        sort: 'OLDEST',
      },
    );

    const query =
      prisma.employeeDocument.findMany.mock.calls[0]?.[0];

    expect(query.where).toEqual({
      AND: [
        {
          cinemaId: 3,
          userId: 12,
        },
        {
          OR: [
            {
              title: {
                contains: 'kontrakt',
                mode: 'insensitive',
              },
            },
            {
              fileName: {
                contains: 'kontrakt',
                mode: 'insensitive',
              },
            },
          ],
        },
        {
          fileType: 'application/pdf',
        },
      ],
    });
    expect(query.orderBy).toEqual([
      {
        createdAt: 'asc',
      },
      {
        id: 'asc',
      },
    ]);
    expect(query.skip).toBe(EMPLOYEE_DOCUMENT_PAGE_SIZE);
    expect(query.take).toBe(EMPLOYEE_DOCUMENT_PAGE_SIZE);
    expect(result).toEqual(
      expect.objectContaining({
        page: 2,
        pageSize: EMPLOYEE_DOCUMENT_PAGE_SIZE,
        total: 80,
        filteredTotal: 73,
        hasMore: true,
        summary: {
          total: 80,
          pdf: 60,
          images: 15,
          office: 5,
          latestCreatedAt: new Date(
            '2026-07-20T10:00:00.000Z',
          ),
        },
      }),
    );
  });

  it('tvinger medarbejdere til deres eget arkiv', async () => {
    const prisma = createPrismaMock();

    await findEmployeeDocumentsPage(
      prisma as never,
      {
        sub: 7,
        role: 'EMPLOYEE',
        cinemaId: 3,
      },
      12,
      {
        page: 1,
        search: '',
        type: 'ALL',
        sort: 'NEWEST',
      },
    );

    expect(
      prisma.employeeDocument.findMany.mock.calls[0]?.[0]?.where,
    ).toEqual({
      cinemaId: 3,
      userId: 7,
    });
  });
});
