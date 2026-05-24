"use client";

type ClockModalProps = {
  open: boolean;
  onClose: () => void;

  clockShiftId: number | null;
  setClockShiftId: (value: number | null) => void;

  clockInTime: string;
  setClockInTime: (value: string) => void;

  clockOutTime: string;
  setClockOutTime: (value: string) => void;

  clockNote: string;
  setClockNote: (value: string) => void;

  submitManualTimeEntry: () => Promise<void>;
};

export default function ClockModal({
  open,
  onClose,
  clockShiftId,
  setClockShiftId,
  clockInTime,
  setClockInTime,
  clockOutTime,
  setClockOutTime,
  clockNote,
  setClockNote,
  submitManualTimeEntry,
}: ClockModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Manuel tidsregistrering</h2>

          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Luk
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Shift ID</label>

            <input
              type="number"
              value={clockShiftId ?? ""}
              onChange={(e) => setClockShiftId(Number(e.target.value))}
              className="w-full rounded-xl border p-3 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Clock in</label>

            <input
              type="datetime-local"
              value={clockInTime}
              onChange={(e) => setClockInTime(e.target.value)}
              className="w-full rounded-xl border p-3 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Clock out</label>

            <input
              type="datetime-local"
              value={clockOutTime}
              onChange={(e) => setClockOutTime(e.target.value)}
              className="w-full rounded-xl border p-3 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Note</label>

            <textarea
              value={clockNote}
              onChange={(e) => setClockNote(e.target.value)}
              rows={4}
              className="w-full rounded-xl border p-3 dark:bg-gray-800"
            />
          </div>

          <button
            onClick={submitManualTimeEntry}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Gem tidsregistrering
          </button>
        </div>
      </div>
    </div>
  );
}
