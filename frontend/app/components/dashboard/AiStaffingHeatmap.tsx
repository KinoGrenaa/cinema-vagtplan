type StaffingHeatmapItem = {
  id: number;
  employee: string;
  workType?: string;
  risk: string;
  hours: string;
};

type Props = {
  staffingHeatmap: StaffingHeatmapItem[];
};

export default function AiStaffingHeatmap({ staffingHeatmap }: Props) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="text-xl">🔥</div>

        <h3 className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
          AI Staffing Heatmap
        </h3>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {staffingHeatmap.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-4 ${
              item.risk === "LOW"
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                : item.risk === "MEDIUM"
                  ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
                  : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{item.employee}</div>

                <div className="mt-1 text-sm opacity-80">{item.workType}</div>
              </div>

              <div
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  item.risk === "LOW"
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : item.risk === "MEDIUM"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                }`}
              >
                {item.risk}
              </div>
            </div>

            <div className="mt-3 text-sm">Shift længde: {item.hours} timer</div>
          </div>
        ))}
      </div>
    </div>
  );
}
