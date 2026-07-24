import {
  buildUserUpdateData,
  getCreatePermissionData,
} from './user-service-data-helpers';

const allPermissionsDisabled = {
  canManageSchedule: false,
  canManageUsers: false,
  canManagePayroll: false,
  canManageLeaveRequests: false,
  canManageCinemaSettings: false,
  canSendBroadcastMessages: false,
};

const allPermissionsEnabled = {
  canManageSchedule: true,
  canManageUsers: true,
  canManagePayroll: true,
  canManageLeaveRequests: true,
  canManageCinemaSettings: true,
  canSendBroadcastMessages: true,
};

describe(
  'rolebaserede brugerrettigheder',
  () => {
    it('tvinger alle rettigheder til aktiv for ADMIN-medlemskab ved oprettelse', () => {
      expect(
        getCreatePermissionData(
          'ADMIN',
          allPermissionsDisabled,
        ),
      ).toEqual(
        allPermissionsEnabled,
      );
    });

    it('bevarer valgfrie ekstra rettigheder for EMPLOYEE-medlemskab', () => {
      expect(
        getCreatePermissionData(
          'EMPLOYEE',
          {
            ...allPermissionsDisabled,
            canSendBroadcastMessages:
              true,
          },
        ),
      ).toEqual({
        ...allPermissionsDisabled,
        canSendBroadcastMessages:
          true,
      });
    });

    it('skriver ikke gamle biograf- eller rettighedsfelter ved global MASTER-opdatering', () => {
      expect(
        buildUserUpdateData({
          email:
            'master@example.com',
          firstName: 'System',
          lastName: 'Master',
          role: 'MASTER',
          ...({
            cinemaId: 1,
            employmentType:
              'SALARIED',
            hireDate:
              '2026-01-01',
            employeeNumber:
              'MASTER-1',
            payrollEmployeeId:
              'PAYROLL-1',
            ...allPermissionsEnabled,
          } as any),
        }),
      ).toEqual({
        email:
          'master@example.com',
        firstName: 'System',
        lastName: 'Master',
        role: 'MASTER',
      });
    });
  },
);
