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
