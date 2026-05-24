export type StaffingHeatmapItem = {
  id: number;
  employee: string;
  workType?: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  hours: string;
};

export function useStaffingHeatmap(shifts: any[]): StaffingHeatmapItem[] {
  return shifts.map((shift) => {
    const start = new Date(shift.startTime);

    const end = new Date(shift.endTime);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    let risk: "LOW" | "MEDIUM" | "HIGH" = "LOW";

    if (hours >= 6) {
      risk = "MEDIUM";
    }

    if (hours >= 9) {
      risk = "HIGH";
    }

    return {
      id: shift.id,
      employee: shift.user
        ? `${shift.user.firstName} ${shift.user.lastName}`
        : "Ukendt medarbejder",
      workType: shift.workType?.name,
      risk,
      hours: hours.toFixed(1),
    };
  });
}
