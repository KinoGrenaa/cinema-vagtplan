import type {
  Dispatch,
  SetStateAction,
} from "react";

import {
  formatTemplateCopyOpenShiftText,
  formatTemplateCopyWeekdayCountText,
} from "../../helpers/copy/scheduleTemplateCopyModalText";

type ScheduleTemplateCopyOptionsProps = {
  inactiveDayCount: number;
  includeInactiveDays: boolean;
  setIncludeInactiveDays: Dispatch<
    SetStateAction<boolean>
  >;
  includeNotes: boolean;
  setIncludeNotes: Dispatch<
    SetStateAction<boolean>
  >;
  includeAssignments: boolean;
  setIncludeAssignments: Dispatch<
    SetStateAction<boolean>
  >;
  copiedOpenShiftCount: number;
  copying: boolean;
};

const checkboxClass =
  "mt-1 h-4 w-4 rounded border-gray-300 accent-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-gray-600 dark:accent-blue-400 dark:focus-visible:ring-blue-400";

export default function ScheduleTemplateCopyOptions({
  inactiveDayCount,
  includeInactiveDays,
  setIncludeInactiveDays,
  includeNotes,
  setIncludeNotes,
  includeAssignments,
  setIncludeAssignments,
  copiedOpenShiftCount,
  copying,
}: ScheduleTemplateCopyOptionsProps) {
  return (
    <>
      {inactiveDayCount > 0 && (
        <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 transition-colors dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100">
          <label className="flex cursor-pointer items-start gap-3 font-semibold">
            <input
              type="checkbox"
              checked={
                includeInactiveDays
              }
              onChange={(event) =>
                setIncludeInactiveDays(
                  event.target.checked,
                )
              }
              className={
                checkboxClass
              }
              disabled={copying}
            />

            <span>
              <span className="block font-black">
                Kopiér inaktive ugedage
              </span>

              <span className="mt-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Slå fra hvis kopien kun
                skal indeholde aktive
                ugedage.
              </span>
            </span>
          </label>

          {!includeInactiveDays && (
            <p className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 text-xs font-bold text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
              {formatTemplateCopyWeekdayCountText(
                inactiveDayCount,
              )}{" "}
              springes over i kopien.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 transition-colors dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100">
        <label className="flex cursor-pointer items-start gap-3 font-semibold">
          <input
            type="checkbox"
            checked={includeNotes}
            onChange={(event) =>
              setIncludeNotes(
                event.target.checked,
              )
            }
            className={checkboxClass}
            disabled={copying}
          />

          <span>
            <span className="block font-black">
              Kopiér noter
            </span>

            <span className="mt-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Slå fra hvis kopien skal
              starte uden beskrivelse,
              ugedagsnoter og
              jobfunktionsnoter.
            </span>
          </span>
        </label>

        {!includeNotes && (
          <p className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 text-xs font-bold text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
            Beskrivelse og noter
            udelades i kopien.
          </p>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 transition-colors dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <label className="flex cursor-pointer items-start gap-3 font-semibold">
          <input
            type="checkbox"
            checked={
              includeAssignments
            }
            onChange={(event) =>
              setIncludeAssignments(
                event.target.checked,
              )
            }
            className={checkboxClass}
            disabled={copying}
          />

          <span>
            <span className="block font-black">
              Kopiér faste medarbejdere
            </span>

            <span className="mt-1 block text-xs font-semibold text-blue-900 dark:text-blue-200">
              Slå fra hvis kopien skal
              starte med åbne vagter,
              som medarbejderne kan
              ønske.
            </span>
          </span>
        </label>

        {!includeAssignments &&
          copiedOpenShiftCount > 0 && (
            <p className="mt-3 rounded-2xl border border-blue-200 bg-white p-3 text-xs font-bold text-blue-950 dark:border-blue-900 dark:bg-gray-950 dark:text-blue-100">
              {formatTemplateCopyOpenShiftText(
                copiedOpenShiftCount,
              )}{" "}
              oprettes som åbne vagter
              i kopien.
            </p>
          )}
      </div>
    </>
  );
}
