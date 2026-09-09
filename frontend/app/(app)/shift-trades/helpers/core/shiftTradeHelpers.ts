import type { ShiftTrade } from "./shiftTradeTypes";

export function formatShiftDate(value: string) {
  return new Date(value).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatShiftTime(startTime: string, endTime: string) {
  const start = new Date(startTime).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const end = new Date(endTime).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${start} - ${end}`;
}


export function getTradeStartTime(trade: ShiftTrade) {
  return trade.status === "OPEN"
    ? trade.shift?.startTime ?? trade.shiftStartTimeSnapshot
    : trade.shiftStartTimeSnapshot;
}

export function getTradeEndTime(trade: ShiftTrade) {
  return trade.status === "OPEN"
    ? trade.shift?.endTime ?? trade.shiftEndTimeSnapshot
    : trade.shiftEndTimeSnapshot;
}
export function getTradeJobFunctionName(trade: ShiftTrade) {
  return trade.status === "OPEN"
    ? trade.shift?.jobFunction?.name ?? trade.jobFunctionNameSnapshot ?? "Vagt"
    : trade.jobFunctionNameSnapshot ?? "Vagt";
}
