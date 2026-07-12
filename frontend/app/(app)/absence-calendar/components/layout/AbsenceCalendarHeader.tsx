type AbsenceCalendarHeaderProps = {
  selectedMonth: string;
  onChangeMonth: (direction: number) => void;
};

export default function AbsenceCalendarHeader({
  selectedMonth,
  onChangeMonth,
}: AbsenceCalendarHeaderProps) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ferie/fraværskalender</h1>
          <p className="text-gray-500">
            Overblik over ferie, fridage og afventende ansøgninger.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onChangeMonth(-1)}
            className="bg-gray-200 px-4 py-2 rounded-lg"
          >
            Forrige
          </button>

          <div className="bg-black text-white px-4 py-2 rounded-lg">
            {selectedMonth}
          </div>

          <button
            onClick={() => onChangeMonth(1)}
            className="bg-gray-200 px-4 py-2 rounded-lg"
          >
            Næste
          </button>
        </div>
      </div>
    </div>
  );
}
