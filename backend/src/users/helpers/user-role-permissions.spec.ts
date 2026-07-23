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

describe('rolebaserede brugerrettigheder', () => {
  it('tvinger alle rettigheder til aktiv for ADMIN ved oprettelse', () => {
    expect(
      getCreatePermissionData('ADMIN', allPermissionsDisabled),
    ).toEqual(allPermissionsEnabled);
  });

  it('bevarer valgfrie ekstra rettigheder for EMPLOYEE', () => {
    expect(
      getCreatePermissionData('EMPLOYEE', {
        ...allPermissionsDisabled,
        canSendBroadcastMessages: true,
      }),
    ).toEqual({
      ...allPermissionsDisabled,
      canSendBroadcastMessages: true,
    });
  });

  it('tvinger alle rettigheder til aktiv ved ændring til ADMIN', () => {
    expect(
      buildUserUpdateData(
        {
          role: 'ADMIN',
          ...allPermissionsDisabled,
        },
        'ADMIN',
        1,
      ),
    ).toMatchObject({
      role: 'ADMIN',
      cinemaId: 1,
      ...allPermissionsEnabled,
    });
  });

  it('fjerner tidligere rollekrav ved ændring til EMPLOYEE, men accepterer ekstra tilvalg', () => {
    expect(
      buildUserUpdateData(
        {
          role: 'EMPLOYEE',
          canSendBroadcastMessages: true,
        },
        'EMPLOYEE',
        1,
      ),
    ).toMatchObject({
      role: 'EMPLOYEE',
      cinemaId: 1,
      canManageSchedule: false,
      canManageUsers: false,
      canManagePayroll: false,
      canManageLeaveRequests: false,
      canManageCinemaSettings: false,
      canSendBroadcastMessages: true,
    });
  });
});
