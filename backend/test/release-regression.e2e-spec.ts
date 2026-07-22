import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  Test,
  TestingModule,
} from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtGuard } from '../src/auth/jwt/jwt.guard';
import { RolesGuard as RootRolesGuard } from '../src/auth/roles.guard';
import { RolesGuard as NestedRolesGuard } from '../src/auth/roles/roles.guard';
import { EmployeeDocumentsController } from '../src/employee-documents/employee-documents.controller';
import { EmployeeDocumentsService } from '../src/employee-documents/employee-documents.service';
import { LeaveRequestsController } from '../src/leave-requests/leave-requests.controller';
import { LeaveRequestsService } from '../src/leave-requests/leave-requests.service';
import { MessagesController } from '../src/messages/messages.controller';
import { MessagesService } from '../src/messages/messages.service';
import { NotificationsController } from '../src/notifications/notifications.controller';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PayrollController } from '../src/payroll/payroll.controller';
import { PayrollService } from '../src/payroll/payroll.service';
import { ShiftsController } from '../src/shifts/shifts.controller';
import { ShiftsService } from '../src/shifts/shifts.service';
import { TimeEntriesController } from '../src/time-entries/time-entries.controller';
import { TimeEntriesService } from '../src/time-entries/time-entries.service';

type RegressionRole =
  | 'MASTER'
  | 'ADMIN'
  | 'EMPLOYEE';

const regressionToken =
  'Bearer release-regression';

function createAuthenticatedUser(
  role: RegressionRole,
) {
  return {
    sub: 7,
    id: 7,
    email: 'regression@example.com',
    role,
    cinemaId:
      role === 'MASTER' ? null : 2,
  };
}

describe('Release regression routes (e2e)', () => {
  let app: INestApplication;

  const authService = {
    login: jest.fn().mockResolvedValue({
      access_token: 'token',
      user: createAuthenticatedUser(
        'ADMIN',
      ),
    }),
    switchCinema:
      jest.fn().mockResolvedValue({
        selectedCinema: {
          id: 3,
          name: 'Kino Nord',
        },
      }),
    getDefaultCinemaOptions:
      jest.fn().mockResolvedValue({
        defaultCinemaId: 2,
        cinemas: [],
      }),
    updateDefaultCinema:
      jest.fn().mockResolvedValue({
        defaultCinemaId: 3,
        cinemas: [],
      }),
  };

  const shiftsService = {
    findAll: jest
      .fn()
      .mockResolvedValue([]),
    createShift: jest
      .fn()
      .mockImplementation(
        async (
          _user: unknown,
          body: unknown,
        ) => ({
          id: 101,
          ...(body as object),
        }),
      ),
    updateShift: jest
      .fn()
      .mockResolvedValue({
        id: 101,
      }),
    deleteShift: jest
      .fn()
      .mockResolvedValue({
        success: true,
      }),
  };

  const leaveRequestsService = {
    findAll: jest
      .fn()
      .mockResolvedValue([]),
    create: jest
      .fn()
      .mockResolvedValue({
        id: 201,
        status: 'PENDING',
      }),
    updateStatus: jest
      .fn()
      .mockResolvedValue({
        id: 201,
        status: 'APPROVED',
      }),
  };

  const timeEntriesService = {
    findForUser: jest
      .fn()
      .mockResolvedValue([]),
    findAll: jest
      .fn()
      .mockResolvedValue([]),
    findOpenEntry: jest
      .fn()
      .mockResolvedValue(null),
    submitManualEntry: jest
      .fn()
      .mockResolvedValue({
        id: 301,
      }),
    clockIn: jest
      .fn()
      .mockResolvedValue({
        id: 302,
        clockOut: null,
      }),
    clockOut: jest
      .fn()
      .mockResolvedValue({
        id: 302,
      }),
    approveEntry: jest
      .fn()
      .mockResolvedValue({
        id: 302,
        status: 'APPROVED',
      }),
    unapproveEntry: jest
      .fn()
      .mockResolvedValue({
        id: 302,
        status: 'PENDING',
      }),
    rejectEntry: jest
      .fn()
      .mockResolvedValue({
        id: 302,
        status: 'NEEDS_CHANGES',
      }),
    voidEntry: jest
      .fn()
      .mockResolvedValue({
        id: 302,
        status: 'VOIDED',
      }),
    updateOwnEntry: jest
      .fn()
      .mockResolvedValue({
        id: 302,
      }),
    findRevisionsForEntry:
      jest.fn().mockResolvedValue([]),
    updateEntry: jest
      .fn()
      .mockResolvedValue({
        id: 302,
      }),
  };

  const payrollService = {
    getPayrollReport: jest
      .fn()
      .mockResolvedValue({
        employees: [],
        pendingCount: 0,
      }),
    getPeriod: jest
      .fn()
      .mockResolvedValue(null),
    getPayrollPeriodForDate:
      jest.fn().mockResolvedValue({
        startDate: '2026-07-21',
        endDate: '2026-08-20',
      }),
    getPayrollAuditHistory:
      jest.fn().mockResolvedValue([]),
    lockPeriod: jest
      .fn()
      .mockResolvedValue({
        id: 401,
        status: 'LOCKED',
      }),
    unlockPeriod: jest
      .fn()
      .mockResolvedValue({
        id: 401,
        status: 'OPEN',
      }),
    unlockTimeEntry: jest
      .fn()
      .mockResolvedValue({
        id: 302,
      }),
    exportPayrollCsv: jest
      .fn()
      .mockResolvedValue('csv'),
    exportPayrollXlsx: jest
      .fn()
      .mockResolvedValue(
        Buffer.from('xlsx'),
      ),
    exportPayrollPdf: jest
      .fn()
      .mockResolvedValue(
        Buffer.from('pdf'),
      ),
    exportUnicontaCsv: jest
      .fn()
      .mockResolvedValue('uniconta'),
  };

  const messagesService = {
    getUnreadCount: jest
      .fn()
      .mockResolvedValue(2),
    findArchivedForUser:
      jest.fn().mockResolvedValue([]),
    findSentForUser:
      jest.fn().mockResolvedValue([]),
    findAllForUser:
      jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockResolvedValue({
        id: 501,
      }),
    markAsRead: jest
      .fn()
      .mockResolvedValue({
        id: 501,
        read: true,
      }),
    archiveMessage: jest
      .fn()
      .mockResolvedValue({
        id: 501,
      }),
    unarchiveMessage: jest
      .fn()
      .mockResolvedValue({
        id: 501,
      }),
    recallMessage: jest
      .fn()
      .mockResolvedValue({
        id: 501,
      }),
  };

  const notificationsService = {
    findForUser: jest
      .fn()
      .mockResolvedValue([]),
    unreadCount: jest
      .fn()
      .mockResolvedValue(3),
    markAllAsRead: jest
      .fn()
      .mockResolvedValue({
        count: 3,
      }),
    markAsRead: jest
      .fn()
      .mockResolvedValue({
        id: 601,
        read: true,
      }),
  };

  const employeeDocumentsService = {
    findForUser: jest
      .fn()
      .mockResolvedValue([]),
    delete: jest
      .fn()
      .mockResolvedValue({
        success: true,
      }),
    getDownload: jest.fn(),
    create: jest.fn(),
  };

  const jwtGuard = {
    canActivate(
      context: ExecutionContext,
    ) {
      const request = context
        .switchToHttp()
        .getRequest();
      const authorization =
        request.headers.authorization;

      if (
        authorization !==
        regressionToken
      ) {
        throw new UnauthorizedException(
          'Manglende regression-token',
        );
      }

      const requestedRole =
        request.headers[
          'x-regression-role'
        ];
      const role: RegressionRole =
        requestedRole === 'MASTER' ||
        requestedRole === 'EMPLOYEE'
          ? requestedRole
          : 'ADMIN';

      request.user =
        createAuthenticatedUser(role);

      return true;
    },
  };

  const reflector = new Reflector();

  const rolesGuard = {
    canActivate(
      context: ExecutionContext,
    ) {
      const requiredRoles =
        reflector.getAllAndOverride<
          string[]
        >('roles', [
          context.getHandler(),
          context.getClass(),
        ]);

      if (
        !requiredRoles ||
        requiredRoles.length === 0
      ) {
        return true;
      }

      const request = context
        .switchToHttp()
        .getRequest();

      return requiredRoles.includes(
        request.user?.role,
      );
    },
  };

  function authenticated(
    testRequest: request.Test,
    role: RegressionRole = 'ADMIN',
  ) {
    return testRequest
      .set(
        'Authorization',
        regressionToken,
      )
      .set(
        'x-regression-role',
        role,
      );
  }

  beforeAll(async () => {
    const moduleBuilder =
      Test.createTestingModule({
        controllers: [
          AuthController,
          ShiftsController,
          LeaveRequestsController,
          TimeEntriesController,
          PayrollController,
          MessagesController,
          NotificationsController,
          EmployeeDocumentsController,
        ],
        providers: [
          {
            provide: AuthService,
            useValue: authService,
          },
          {
            provide: ShiftsService,
            useValue: shiftsService,
          },
          {
            provide:
              LeaveRequestsService,
            useValue:
              leaveRequestsService,
          },
          {
            provide:
              TimeEntriesService,
            useValue:
              timeEntriesService,
          },
          {
            provide: PayrollService,
            useValue: payrollService,
          },
          {
            provide: MessagesService,
            useValue: messagesService,
          },
          {
            provide:
              NotificationsService,
            useValue:
              notificationsService,
          },
          {
            provide:
              EmployeeDocumentsService,
            useValue:
              employeeDocumentsService,
          },
        ],
      });

    const moduleFixture: TestingModule =
      await moduleBuilder
        .overrideGuard(JwtGuard)
        .useValue(jwtGuard)
        .overrideGuard(RootRolesGuard)
        .useValue(rolesGuard)
        .overrideGuard(NestedRolesGuard)
        .useValue(rolesGuard)
        .compile();

    app =
      moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('authentication and cinema context', () => {
    it('validates login bodies through the real HTTP pipe', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email:
            'regression@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect(({ body }) => {
          expect(
            body.access_token,
          ).toBe('token');
        });

      expect(
        authService.login,
      ).toHaveBeenCalledWith(
        'regression@example.com',
        'password123',
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'ikke-en-email',
          password: 'kort',
        })
        .expect(400);
    });

    it('switches and updates cinema context with normalized IDs', async () => {
      await authenticated(
        request(app.getHttpServer())
          .post(
            '/auth/switch-cinema',
          )
          .send({
            cinemaId: 3,
          }),
      ).expect(201);

      expect(
        authService.switchCinema,
      ).toHaveBeenCalledWith(7, 3);

      await authenticated(
        request(app.getHttpServer())
          .patch(
            '/auth/default-cinema',
          )
          .send({
            cinemaId: 3,
          }),
      ).expect(200);

      expect(
        authService.updateDefaultCinema,
      ).toHaveBeenCalledWith(7, 3);
    });

    it('rejects protected routes without the regression token', async () => {
      await request(app.getHttpServer())
        .get('/shifts')
        .expect(401);

      expect(
        shiftsService.findAll,
      ).not.toHaveBeenCalled();
    });
  });

  describe('shift planning', () => {
    const shiftBody = {
      userId: null,
      workTypeId: 4,
      cinemaId: 2,
      startTime:
        '2026-08-10T15:15:00.000Z',
      endTime:
        '2026-08-10T23:15:00.000Z',
      note: 'Regressionstest',
    };

    it('passes active cinema and date to the shift read flow', async () => {
      await authenticated(
        request(app.getHttpServer())
          .get('/shifts')
          .query({
            date: '2026-08-10',
            cinemaId: '2',
          }),
        'MASTER',
      ).expect(200);

      expect(
        shiftsService.findAll,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'MASTER',
          cinemaId: null,
        }),
        '2026-08-10',
        2,
      );
    });

    it('allows administrators to create unassigned shifts', async () => {
      await authenticated(
        request(app.getHttpServer())
          .post('/shifts')
          .send(shiftBody),
      )
        .expect(201)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            id: 101,
            userId: null,
            workTypeId: 4,
          });
        });

      expect(
        shiftsService.createShift,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ADMIN',
        }),
        shiftBody,
      );
    });

    it('blocks employees from shift write routes', async () => {
      await authenticated(
        request(app.getHttpServer())
          .post('/shifts')
          .send(shiftBody),
        'EMPLOYEE',
      ).expect(403);

      expect(
        shiftsService.createShift,
      ).not.toHaveBeenCalled();
    });

    it('rejects malformed route IDs before calling the shift service', async () => {
      await authenticated(
        request(app.getHttpServer())
          .patch('/shifts/1e2')
          .send({
            startTime:
              shiftBody.startTime,
            endTime:
              shiftBody.endTime,
            workTypeId: 4,
          }),
      ).expect(400);

      expect(
        shiftsService.updateShift,
      ).not.toHaveBeenCalled();
    });
  });

  describe('leave requests', () => {
    it('creates leave and updates status through the routed DTOs', async () => {
      await authenticated(
        request(app.getHttpServer())
          .post('/leave-requests')
          .send({
            startDate:
              '2026-08-11T00:00:00.000Z',
            endDate:
              '2026-08-12T23:59:59.999Z',
            reason:
              'Planlagt fravær',
            cinemaId: 2,
          }),
        'EMPLOYEE',
      ).expect(201);

      expect(
        leaveRequestsService.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'EMPLOYEE',
        }),
        expect.objectContaining({
          cinemaId: 2,
          reason:
            'Planlagt fravær',
        }),
      );

      await authenticated(
        request(app.getHttpServer())
          .patch(
            '/leave-requests/201/status',
          )
          .query({
            cinemaId: '2',
          })
          .send({
            status: 'APPROVED',
          }),
      ).expect(200);

      expect(
        leaveRequestsService.updateStatus,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ADMIN',
        }),
        201,
        'APPROVED',
        2,
      );
    });

    it('rejects unsupported includeAll values', async () => {
      await authenticated(
        request(app.getHttpServer())
          .get('/leave-requests')
          .query({
            includeAll: '1',
          }),
      ).expect(400);

      expect(
        leaveRequestsService.findAll,
      ).not.toHaveBeenCalled();
    });
  });

  describe('time entries and payroll', () => {
    it('clocks in and approves with payroll confirmation', async () => {
      await authenticated(
        request(app.getHttpServer())
          .post(
            '/time-entries/clock-in',
          )
          .send({
            userId: 7,
            cinemaId: 2,
            shiftId: 101,
            clockIn:
              '2026-08-10T15:15:00.000Z',
          }),
        'EMPLOYEE',
      ).expect(201);

      expect(
        timeEntriesService.clockIn,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'EMPLOYEE',
        }),
        expect.objectContaining({
          userId: 7,
          cinemaId: 2,
          shiftId: 101,
        }),
      );

      await authenticated(
        request(app.getHttpServer())
          .patch(
            '/time-entries/302/approve',
          )
          .query({
            cinemaId: '2',
          })
          .send({
            confirmPayrollAdjustment:
              true,
          }),
      ).expect(200);

      expect(
        timeEntriesService.approveEntry,
      ).toHaveBeenCalledWith(
        302,
        expect.objectContaining({
          role: 'ADMIN',
        }),
        2,
        true,
      );
    });

    it('rejects string payroll confirmation before the service call', async () => {
      await authenticated(
        request(app.getHttpServer())
          .patch(
            '/time-entries/302/approve',
          )
          .send({
            confirmPayrollAdjustment:
              'true',
          }),
      ).expect(400);

      expect(
        timeEntriesService.approveEntry,
      ).not.toHaveBeenCalled();
    });

    it('allows employee period lookup but protects payroll reports', async () => {
      await authenticated(
        request(app.getHttpServer())
          .get(
            '/payroll/period-for-date',
          )
          .query({
            date: '2026-08-10',
            cinemaId: '2',
          }),
        'EMPLOYEE',
      ).expect(200);

      expect(
        payrollService.getPayrollPeriodForDate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'EMPLOYEE',
        }),
        '2026-08-10',
        2,
      );

      await authenticated(
        request(app.getHttpServer())
          .get('/payroll')
          .query({
            startDate:
              '2026-07-21',
            endDate:
              '2026-08-20',
            cinemaId: '2',
          }),
        'EMPLOYEE',
      ).expect(403);

      expect(
        payrollService.getPayrollReport,
      ).not.toHaveBeenCalled();
    });

    it('routes payroll report and lock operations for administrators', async () => {
      await authenticated(
        request(app.getHttpServer())
          .get('/payroll')
          .query({
            startDate:
              '2026-07-21',
            endDate:
              '2026-08-20',
            cinemaId: '2',
          }),
      ).expect(200);

      expect(
        payrollService.getPayrollReport,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ADMIN',
        }),
        '2026-07-21',
        '2026-08-20',
        undefined,
        2,
      );

      await authenticated(
        request(app.getHttpServer())
          .post(
            '/payroll/period/lock',
          )
          .send({
            startDate:
              '2026-07-21',
            endDate:
              '2026-08-20',
            cinemaId: 2,
          }),
      ).expect(201);

      expect(
        payrollService.lockPeriod,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ADMIN',
        }),
        '2026-07-21',
        '2026-08-20',
        2,
      );
    });
  });

  describe('communications and documents', () => {
    it('creates and reads messages in the active cinema', async () => {
      await authenticated(
        request(app.getHttpServer())
          .post('/messages')
          .query({
            cinemaId: '2',
          })
          .send({
            subject:
              'Regressionstest',
            body:
              'Besked fra release-testen',
            receiverId: 8,
            isBroadcast: false,
          }),
      ).expect(201);

      expect(
        messagesService.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ADMIN',
        }),
        expect.objectContaining({
          receiverId: 8,
          isBroadcast: false,
        }),
        2,
      );

      await authenticated(
        request(app.getHttpServer())
          .patch(
            '/messages/501/read',
          )
          .query({
            cinemaId: '2',
          }),
      ).expect(200);

      expect(
        messagesService.markAsRead,
      ).toHaveBeenCalledWith(
        501,
        expect.objectContaining({
          sub: 7,
        }),
        2,
      );
    });

    it('reads and marks notifications with the same cinema context', async () => {
      await authenticated(
        request(app.getHttpServer())
          .get(
            '/notifications/unread-count',
          )
          .query({
            cinemaId: '2',
          }),
      )
        .expect(200)
        .expect({
          count: 3,
        });

      await authenticated(
        request(app.getHttpServer())
          .patch(
            '/notifications/601/read',
          )
          .query({
            cinemaId: '2',
          }),
      ).expect(200);

      expect(
        notificationsService.markAsRead,
      ).toHaveBeenCalledWith(
        601,
        expect.objectContaining({
          sub: 7,
        }),
        2,
      );
    });

    it('routes employee document reads and deletes without touching the filesystem', async () => {
      await authenticated(
        request(app.getHttpServer())
          .get(
            '/employee-documents/user/7',
          )
          .query({
            cinemaId: '2',
          }),
        'EMPLOYEE',
      ).expect(200);

      expect(
        employeeDocumentsService.findForUser,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'EMPLOYEE',
        }),
        7,
        2,
      );

      await authenticated(
        request(app.getHttpServer())
          .delete(
            '/employee-documents/701',
          )
          .query({
            cinemaId: '2',
          }),
      ).expect(200);

      expect(
        employeeDocumentsService.delete,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ADMIN',
        }),
        701,
        2,
      );
    });

    it('rejects malformed document IDs before service access', async () => {
      await authenticated(
        request(app.getHttpServer())
          .delete(
            '/employee-documents/1e2',
          ),
      ).expect(400);

      expect(
        employeeDocumentsService.delete,
      ).not.toHaveBeenCalled();
    });
  });
});
