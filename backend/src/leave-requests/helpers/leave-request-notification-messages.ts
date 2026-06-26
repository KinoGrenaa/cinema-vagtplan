import {
  formatLeavePeriod,
  formatUserName,
} from './leave-request-formatting';
import { LeaveRequestWithUser } from './leave-request-service-helpers';

export function buildLeaveRequestCreatedManagerNotification(
  leaveRequest: LeaveRequestWithUser,
) {
  const employeeName = formatUserName(leaveRequest.user);
  const period = formatLeavePeriod(leaveRequest.startDate, leaveRequest.endDate);

  return {
    title: 'Ny fraværsansøgning',
    message: `${period}
${employeeName} har anmodet om fravær.`,
    type: 'LEAVE_REQUEST_CREATED',
  };
}

export function buildLeaveRequestApprovedUserNotification(
  leaveRequest: LeaveRequestWithUser,
  actorName: string,
) {
  const period = formatLeavePeriod(leaveRequest.startDate, leaveRequest.endDate);

  return {
    title: 'Fravær godkendt',
    message: `${period}
${actorName} har godkendt dit fravær.`,
    type: 'LEAVE_REQUEST_APPROVED',
  };
}

export function buildLeaveRequestRejectedUserNotification(
  leaveRequest: LeaveRequestWithUser,
  actorName: string,
) {
  const period = formatLeavePeriod(leaveRequest.startDate, leaveRequest.endDate);

  return {
    title: 'Fravær afvist',
    message: `${period}
${actorName} har afvist dit fravær.`,
    type: 'LEAVE_REQUEST_REJECTED',
  };
}

export function buildLeaveRequestCancelledByEmployeeManagerNotification(
  leaveRequest: LeaveRequestWithUser,
) {
  const employeeName = formatUserName(leaveRequest.user);
  const period = formatLeavePeriod(leaveRequest.startDate, leaveRequest.endDate);

  return {
    title: 'Fravær annulleret',
    message: `${period}
${employeeName} har annulleret sin fraværsansøgning.`,
    type: 'LEAVE_REQUEST_CANCELLED_BY_EMPLOYEE',
  };
}

export function buildLeaveRequestCancelledByAdminUserNotification(
  leaveRequest: LeaveRequestWithUser,
  actorName: string,
) {
  const period = formatLeavePeriod(leaveRequest.startDate, leaveRequest.endDate);

  return {
    title: 'Fravær annulleret',
    message: `${period}
${actorName} har annulleret dit fravær.`,
    type: 'LEAVE_REQUEST_CANCELLED_BY_ADMIN',
  };
}
