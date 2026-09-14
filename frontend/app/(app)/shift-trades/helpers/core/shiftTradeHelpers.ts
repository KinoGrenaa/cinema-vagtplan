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

export function formatShiftDialogDate(value: string) {
  const date = new Date(value);
  const weekday = date.toLocaleDateString("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "long",
  });
  const numericDate = date.toLocaleDateString("da-DK", {
    timeZone: "Europe/Copenhagen",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${weekday} ${numericDate}`;
}

export function formatShiftDialogTime(startTime: string, endTime: string) {
  return formatShiftTime(startTime, endTime).replace(" - ", "–");
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
