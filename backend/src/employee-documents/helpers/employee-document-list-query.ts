import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  type AuthUser,
  resolveEmployeeDocumentCinemaId,
} from './employee-document-access';

export const EMPLOYEE_DOCUMENT_PAGE_SIZE = 50;

export type EmployeeDocumentListType =
  | 'ALL'
  | 'PDF'
  | 'IMAGE'
  | 'OFFICE'
  | 'OTHER';

export type EmployeeDocumentListSort =
  | 'NEWEST'
  | 'OLDEST'
  | 'TITLE';

export type EmployeeDocumentListOptions = {
  cinemaId?: number | null;
  page: number;
  search: string;
  type: EmployeeDocumentListType;
  sort: EmployeeDocumentListSort;
};

const officeMimeTypes = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

function getEmployeeDocumentTypeWhere(
  type: EmployeeDocumentListType,
): Prisma.EmployeeDocumentWhereInput | null {
  switch (type) {
    case 'ALL':
      return null;
    case 'PDF':
      return {
        fileType: 'application/pdf',
      };
    case 'IMAGE':
      return {
        fileType: {
          startsWith: 'image/',
        },
      };
    case 'OFFICE':
      return {
        fileType: {
          in: [...officeMimeTypes],
        },
      };
    case 'OTHER':
      return {
        OR: [
          {
            fileType: null,
          },
          {
            AND: [
              {
                fileType: {
                  not: 'application/pdf',
                },
              },
              {
                fileType: {
                  not: {
                    startsWith: 'image/',
                  },
                },
              },
              {
                fileType: {
                  notIn: [...officeMimeTypes],
                },
              },
            ],
          },
        ],
      };
  }
}

function getEmployeeDocumentOrderBy(
  sort: EmployeeDocumentListSort,
): Prisma.EmployeeDocumentOrderByWithRelationInput[] {
  switch (sort) {
    case 'OLDEST':
      return [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ];
    case 'TITLE':
      return [
        {
          title: 'asc',
        },
        {
          id: 'asc',
        },
      ];
    case 'NEWEST':
      return [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ];
  }
}

function getDocumentCategory(fileType: string | null) {
  const normalizedFileType = fileType?.toLowerCase() ?? '';

  if (normalizedFileType === 'application/pdf') {
    return 'PDF';
  }
  if (normalizedFileType.startsWith('image/')) {
    return 'IMAGE';
  }
  if (
    officeMimeTypes.includes(
      normalizedFileType as (typeof officeMimeTypes)[number],
    )
  ) {
    return 'OFFICE';
  }

  return 'OTHER';
}

export async function findEmployeeDocumentsPage(
  prisma: PrismaService,
  user: AuthUser,
  userId: number,
  options: EmployeeDocumentListOptions,
) {
  const cinemaId = resolveEmployeeDocumentCinemaId(
    user,
    options.cinemaId,
  );
  const targetUserId =
    user.role === 'EMPLOYEE' ? user.sub : userId;
  const baseWhere: Prisma.EmployeeDocumentWhereInput = {
    cinemaId,
    userId: targetUserId,
  };
  const filterClauses: Prisma.EmployeeDocumentWhereInput[] = [];
  const normalizedSearch = options.search.trim();

  if (normalizedSearch) {
    filterClauses.push({
      OR: [
        {
          title: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          fileName: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
      ],
    });
  }

  const typeWhere = getEmployeeDocumentTypeWhere(options.type);
  if (typeWhere) {
    filterClauses.push(typeWhere);
  }

  const filteredWhere: Prisma.EmployeeDocumentWhereInput =
    filterClauses.length > 0
      ? {
          AND: [baseWhere, ...filterClauses],
        }
      : baseWhere;
  const skip =
    (options.page - 1) * EMPLOYEE_DOCUMENT_PAGE_SIZE;

  const [
    items,
    filteredTotal,
    total,
    typeCounts,
    latestDocument,
  ] = await Promise.all([
    prisma.employeeDocument.findMany({
      where: filteredWhere,
      select: {
        id: true,
        title: true,
        fileUrl: true,
        fileName: true,
        fileType: true,
        createdAt: true,
      },
      orderBy: getEmployeeDocumentOrderBy(options.sort),
      skip,
      take: EMPLOYEE_DOCUMENT_PAGE_SIZE,
    }),
    prisma.employeeDocument.count({
      where: filteredWhere,
    }),
    prisma.employeeDocument.count({
      where: baseWhere,
    }),
    prisma.employeeDocument.groupBy({
      by: ['fileType'],
      where: baseWhere,
      _count: {
        _all: true,
      },
    }),
    prisma.employeeDocument.findFirst({
      where: baseWhere,
      select: {
        createdAt: true,
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    }),
  ]);

  const summary = {
    total,
    pdf: 0,
    images: 0,
    office: 0,
    latestCreatedAt: latestDocument?.createdAt ?? null,
  };

  for (const group of typeCounts) {
    const count = group._count._all;
    switch (getDocumentCategory(group.fileType)) {
      case 'PDF':
        summary.pdf += count;
        break;
      case 'IMAGE':
        summary.images += count;
        break;
      case 'OFFICE':
        summary.office += count;
        break;
      case 'OTHER':
        break;
    }
  }

  return {
    items,
    page: options.page,
    pageSize: EMPLOYEE_DOCUMENT_PAGE_SIZE,
    total,
    filteredTotal,
    hasMore:
      skip + items.length < filteredTotal,
    summary,
  };
}
