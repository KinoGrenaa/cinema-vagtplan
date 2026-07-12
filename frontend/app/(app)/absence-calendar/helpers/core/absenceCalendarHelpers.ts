import type { LeaveRequest } from "./absenceCalendarTypes";

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {}

  return fallback;
}

export function requestIsOnDate(request: LeaveRequest, date: string) {
  const current = new Date(`${date}T12:00:00`);
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);

  return current >= start && current <= end;
}

export function getStatusStyle(status: LeaveRequest["status"]) {
  if (status === "APPROVED") {
    return "bg-green-100 text-green-800 border-green-300";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-800 border-red-300";
  }

  return "bg-yellow-100 text-yellow-800 border-yellow-300";
}
