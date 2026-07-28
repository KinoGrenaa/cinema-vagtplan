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

function formatRisk(risk: string) {
  if (risk === "LOW") return "Lav";
  if (risk === "MEDIUM") return "Mellem";
  if (risk === "HIGH") return "Høj";
  return "Ukendt";
}

export default function AiStaffingHeatmap({
  staffingHeatmap,
}: Props) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center gap-2">
        <div className="text-xl" aria-hidden="true">🔥</div>
        <div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
            Belastning pr. vagt
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Lange vagter markeres, så de er nemme at få øje på.
          </p>
        </div>
      </div>

      {staffingHeatmap.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          Der er ingen vagter at vurdere i dag.
        </p>
      ) : (
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
                  <div className="font-semibold">
                    {item.employee || "Ikke tildelt"}
                  </div>
                  <div className="mt-1 text-sm opacity-80">
                    {item.workType}
                  </div>
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
                  {formatRisk(item.risk)}
                </div>
              </div>
              <div className="mt-3 text-sm">
                Vagtlængde: {item.hours} timer
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
