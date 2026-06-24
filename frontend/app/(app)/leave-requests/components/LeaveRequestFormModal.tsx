import { FormEvent, useRef } from "react";
import { Calendar } from "lucide-react";
import BaseModal from "@/app/components/modals/BaseModal";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

type LeaveRequestFormModalProps = {
  allDay: boolean;
  endDate: string;
  endTime: string;
  minDate: string;
  open: boolean;
  reason: string;
  startDate: string;
  startTime: string;
  onClose: () => void;
  onSetAllDay: (value: boolean) => void;
  onSetEndDate: (value: string) => void;
  onSetEndTime: (value: string) => void;
  onSetReason: (value: string) => void;
  onSetStartDate: (value: string) => void;
  onSetStartTime: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;

  input.focus();

  if (typeof input.showPicker === "function") {
    input.showPicker();
  }
}

export default function LeaveRequestFormModal({
  allDay,
  endDate,
  endTime,
  minDate,
  open,
  reason,
  startDate,
  startTime,
  onClose,
  onSetAllDay,
  onSetEndDate,
  onSetEndTime,
  onSetReason,
  onSetStartDate,
  onSetStartTime,
  onSubmit,
}: LeaveRequestFormModalProps) {
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <BaseModal open={open} onClose={onClose} title="Ansøg om fravær">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Fra dato</label>
            <div className="relative">
              <input
                ref={startDateInputRef}
                type="date"
                min={minDate}
                className={`${inputClass} pr-11 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                value={startDate}
                onChange={(event) => onSetStartDate(event.target.value)}
              />

              <button
                type="button"
                aria-label="Åbn kalender for fra dato"
                onClick={() => openDatePicker(startDateInputRef.current)}
                className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-xl text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <Calendar size={18} />
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Til dato</label>
            <div className="relative">
              <input
                ref={endDateInputRef}
                type="date"
                min={minDate}
                className={`${inputClass} pr-11 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                value={endDate}
                onChange={(event) => onSetEndDate(event.target.value)}
              />

              <button
                type="button"
                aria-label="Åbn kalender for til dato"
                onClick={() => openDatePicker(endDateInputRef.current)}
                className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-xl text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <Calendar size={18} />
              </button>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(event) => onSetAllDay(event.target.checked)}
          />
          Hele dagen
        </label>

        {!allDay && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Fra tidspunkt</label>
              <input
                type="time"
                className={inputClass}
                value={startTime}
                onChange={(event) => onSetStartTime(event.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Til tidspunkt</label>
              <input
                type="time"
                className={inputClass}
                value={endTime}
                onChange={(event) => onSetEndTime(event.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Årsag</label>
          <input
            className={inputClass}
            value={reason}
            onChange={(event) => onSetReason(event.target.value)}
            placeholder="Valgfrit"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Annullér
          </button>

          <button
            type="submit"
            className="rounded-xl bg-black px-4 py-2 font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Send ansøgning
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
