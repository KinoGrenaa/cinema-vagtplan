"use client";

import {
  Clock3,
  Minus,
  Plus,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type ProjectTimePickerMinuteStep =
  | 1
  | 5
  | 15;

type ProjectTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
  minuteStep?: ProjectTimePickerMinuteStep;
  pickerOnly?: boolean;
  ariaLabel?: string;
  className?: string;
};

type PickerPosition = {
  top: number;
  left: number;
};

const PICKER_WIDTH = 300;
const VIEWPORT_PADDING = 12;
const PICKER_GAP = 8;

function normalizeTime(
  value: string,
) {
  const match =
    /^(\d{1,2}):(\d{1,2})$/.exec(
      value.trim(),
    );

  if (!match) {
    return null;
  }

  const hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return (
    String(hour).padStart(2, "0") +
    ":" +
    String(minute).padStart(2, "0")
  );
}

function timeToMinutes(
  value: string,
) {
  const normalized =
    normalizeTime(value);

  if (!normalized) {
    return null;
  }

  return (
    Number(
      normalized.slice(0, 2),
    ) *
      60 +
    Number(
      normalized.slice(3, 5),
    )
  );
}

function minutesToTime(
  value: number,
) {
  const dayMinutes =
    24 * 60;

  const normalized =
    (
      (
        value %
        dayMinutes
      ) +
      dayMinutes
    ) %
    dayMinutes;

  return (
    String(
      Math.floor(
        normalized / 60,
      ),
    ).padStart(2, "0") +
    ":" +
    String(
      normalized % 60,
    ).padStart(2, "0")
  );
}

function normalizeMinuteStep(
  value: ProjectTimePickerMinuteStep,
) {
  return value === 5 || value === 15
    ? value
    : 1;
}

function roundTimeToStep(
  value: string,
  minuteStep: ProjectTimePickerMinuteStep,
) {
  const minutes =
    timeToMinutes(value);

  if (minutes === null) {
    return value;
  }

  const step =
    normalizeMinuteStep(
      minuteStep,
    );

  return minutesToTime(
    Math.round(
      minutes / step,
    ) * step,
  );
}

function isOnMinuteStep(
  value: string,
  minuteStep: ProjectTimePickerMinuteStep,
) {
  const minutes =
    timeToMinutes(value);

  if (minutes === null) {
    return false;
  }

  return (
    minutes %
      normalizeMinuteStep(
        minuteStep,
      ) ===
    0
  );
}

function nowTime() {
  const now =
    new Date();

  return (
    String(
      now.getHours(),
    ).padStart(2, "0") +
    ":" +
    String(
      now.getMinutes(),
    ).padStart(2, "0")
  );
}

function isAllowed(
  value: string,
  min?: string,
  max?: string,
) {
  if (
    min &&
    value < min
  ) {
    return false;
  }

  if (
    max &&
    value > max
  ) {
    return false;
  }

  return true;
}

export default function ProjectTimePicker({
  value,
  onChange,
  min,
  max,
  disabled = false,
  clearable = false,
  minuteStep = 1,
  pickerOnly = false,
  ariaLabel =
    "V\u00e6lg klokkesl\u00e6t",
  className = "",
}: ProjectTimePickerProps) {
  const normalizedMinuteStep =
    normalizeMinuteStep(
      minuteStep,
    );

  const rootRef =
    useRef<HTMLDivElement>(null);

  const triggerRef =
    useRef<HTMLButtonElement>(null);

  const panelRef =
    useRef<HTMLDivElement>(null);

  const [open, setOpen] =
    useState(false);

  const [
    textValue,
    setTextValue,
  ] =
    useState(value);

  const [
    candidate,
    setCandidate,
  ] =
    useState(
      roundTimeToStep(
        normalizeTime(value) ??
          nowTime(),
        normalizedMinuteStep,
      ),
    );

  const [
    position,
    setPosition,
  ] =
    useState<PickerPosition>({
      top: 0,
      left: 0,
    });

  useEffect(() => {
    setTextValue(value);

    const normalized =
      normalizeTime(value);

    if (normalized) {
      setCandidate(
        roundTimeToStep(
          normalized,
          normalizedMinuteStep,
        ),
      );
    }
  }, [
    normalizedMinuteStep,
    value,
  ]);

  const updatePosition =
    useCallback(() => {
      const trigger =
        triggerRef.current;

      if (!trigger) {
        return;
      }

      const rect =
        trigger.getBoundingClientRect();

      const width =
        Math.min(
          PICKER_WIDTH,
          window.innerWidth -
            VIEWPORT_PADDING * 2,
        );

      let left =
        rect.right - width;

      left =
        Math.max(
          VIEWPORT_PADDING,
          Math.min(
            left,
            window.innerWidth -
              width -
              VIEWPORT_PADDING,
          ),
        );

      const panelHeight =
        panelRef.current
          ?.offsetHeight ??
        220;

      const below =
        rect.bottom +
        PICKER_GAP;

      const above =
        rect.top -
        panelHeight -
        PICKER_GAP;

      setPosition({
        left,
        top:
          below +
              panelHeight <=
            window.innerHeight -
              VIEWPORT_PADDING
            ? below
            : Math.max(
                VIEWPORT_PADDING,
                above,
              ),
      });
    }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    updatePosition();

    const frame =
      requestAnimationFrame(
        updatePosition,
      );

    function handleMouseDown(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node;

      if (
        rootRef.current?.contains(
          target,
        ) ||
        panelRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape"
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleMouseDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    window.addEventListener(
      "resize",
      updatePosition,
    );

    window.addEventListener(
      "scroll",
      updatePosition,
      true,
    );

    return () => {
      cancelAnimationFrame(
        frame,
      );

      document.removeEventListener(
        "mousedown",
        handleMouseDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      window.removeEventListener(
        "resize",
        updatePosition,
      );

      window.removeEventListener(
        "scroll",
        updatePosition,
        true,
      );
    };
  }, [
    open,
    updatePosition,
  ]);

  function changeCandidate(
    deltaMinutes: number,
  ) {
    const current =
      timeToMinutes(
        candidate,
      );

    if (current === null) {
      return;
    }

    const next =
      minutesToTime(
        current +
          deltaMinutes,
      );

    if (
      !isAllowed(
        next,
        min,
        max,
      )
    ) {
      return;
    }

    setCandidate(next);
  }

  function selectTimeSegment(
    input: HTMLInputElement,
    caretPosition:
      number | null,
  ) {
    if (
      !/^\d{2}:\d{2}$/.test(
        input.value,
      )
    ) {
      return;
    }

    const caret =
      caretPosition ?? 0;

    if (caret <= 2) {
      input.setSelectionRange(
        0,
        2,
      );

      return;
    }

    input.setSelectionRange(
      3,
      5,
    );
  }

  function handleTextChange(
    input: HTMLInputElement,
  ) {
    const nextValue =
      input.value;

    const caretPosition =
      input.selectionStart ??
      nextValue.length;

    let formatted = "";
    let hourDigits = "";
    let minuteDigits = "";
    let editingHours = false;

    const hasSeparator =
      nextValue.includes(":");

    if (hasSeparator) {
      const separatorIndex =
        nextValue.indexOf(":");

      editingHours =
        caretPosition <=
        separatorIndex;

      hourDigits =
        nextValue
          .slice(
            0,
            separatorIndex,
          )
          .replace(
            /\D/g,
            "",
          )
          .slice(
            0,
            2,
          );

      minuteDigits =
        nextValue
          .slice(
            separatorIndex + 1,
          )
          .replace(
            /\D/g,
            "",
          )
          .slice(
            0,
            2,
          );

      formatted =
        hourDigits +
        ":" +
        minuteDigits;
    } else {
      const digits =
        nextValue
          .replace(
            /\D/g,
            "",
          )
          .slice(
            0,
            4,
          );

      hourDigits =
        digits.slice(
          0,
          2,
        );

      minuteDigits =
        digits.slice(
          2,
          4,
        );

      formatted =
        digits.length <= 2
          ? digits
          : hourDigits +
            ":" +
            minuteDigits;
    }

    setTextValue(
      formatted,
    );

    const restoreSelection = (
      start: number,
      end: number = start,
    ) => {
      requestAnimationFrame(
        () => {
          if (
            document.activeElement !==
              input
          ) {
            return;
          }

          input.setSelectionRange(
            start,
            end,
          );
        },
      );
    };

    if (hasSeparator) {
      if (editingHours) {
        const hourNumber =
          Number(hourDigits);

        if (
          hourDigits.length === 2 &&
          Number.isInteger(
            hourNumber,
          ) &&
          hourNumber >= 0 &&
          hourNumber <= 23
        ) {
          /*
           * Hour segment completed.
           * Select minutes for the next input.
           */
          restoreSelection(
            3,
            5,
          );
        } else {
          restoreSelection(
            Math.min(
              hourDigits.length,
              2,
            ),
          );
        }
      } else {
        restoreSelection(
          Math.min(
            3 +
              minuteDigits.length,
            formatted.length,
          ),
        );
      }
    } else {
      restoreSelection(
        formatted.length,
      );
    }

    if (!formatted) {
      if (clearable) {
        onChange("");
      }

      return;
    }

    if (
      !/^\d{2}:\d{2}$/.test(
        formatted,
      )
    ) {
      return;
    }

    const normalized =
      normalizeTime(
        formatted,
      );

    if (
      normalized &&
      isAllowed(
        normalized,
        min,
        max,
      ) &&
      isOnMinuteStep(
        normalized,
        normalizedMinuteStep,
      )
    ) {
      onChange(
        normalized,
      );

      setCandidate(
        normalized,
      );
    }
  }

  function handleBlur() {
    if (!textValue) {
      if (clearable) {
        onChange("");
      } else {
        setTextValue(
          value,
        );
      }

      return;
    }

    if (
      !/^\d{2}:\d{2}$/.test(
        textValue,
      )
    ) {
      setTextValue(
        value,
      );

      return;
    }

    const normalized =
      normalizeTime(
        textValue,
      );
    const rounded =
      normalized
        ? roundTimeToStep(
            normalized,
            normalizedMinuteStep,
          )
        : null;

    if (
      rounded &&
      isAllowed(
        rounded,
        min,
        max,
      )
    ) {
      setTextValue(
        rounded,
      );

      onChange(
        rounded,
      );

      setCandidate(
        rounded,
      );

      return;
    }

    setTextValue(
      value,
    );
  }

  function apply() {
    if (
      !isAllowed(
        candidate,
        min,
        max,
      )
    ) {
      return;
    }

    onChange(candidate);
    setTextValue(candidate);
    setOpen(false);
  }

  function useNow() {
    const next =
      roundTimeToStep(
        nowTime(),
        normalizedMinuteStep,
      );

    if (
      !isAllowed(
        next,
        min,
        max,
      )
    ) {
      return;
    }

    onChange(next);
    setTextValue(next);
    setCandidate(next);
    setOpen(false);
  }

  const hour =
    candidate.slice(0, 2);

  const minute =
    candidate.slice(3, 5);

  const panel =
    open &&
    typeof document !==
      "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={
              "V\u00e6lg klokkesl\u00e6t"
            }
            className="fixed z-[310] w-[300px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            style={{
              top:
                position.top,
              left:
                position.left,
            }}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="text-sm font-extrabold text-gray-950 dark:text-white">
                {"V\u00e6lg klokkesl\u00e6t"}
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Luk"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <X
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Timer
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        changeCandidate(-60)
                      }
                      aria-label="En time tilbage"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 text-gray-800 transition hover:bg-gray-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-blue-300"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <div className="min-w-10 text-center text-2xl font-extrabold tabular-nums text-gray-950 dark:text-white">
                      {hour}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        changeCandidate(60)
                      }
                      aria-label="En time frem"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 text-gray-800 transition hover:bg-gray-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-blue-300"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Minutter
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        changeCandidate(
                          -normalizedMinuteStep,
                        )
                      }
                      aria-label={`${normalizedMinuteStep} ${
                        normalizedMinuteStep === 1
                          ? "minut"
                          : "minutter"
                      } tilbage`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 text-gray-800 transition hover:bg-gray-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-blue-300"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <div className="min-w-10 text-center text-2xl font-extrabold tabular-nums text-gray-950 dark:text-white">
                      {minute}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        changeCandidate(
                          normalizedMinuteStep,
                        )
                      }
                      aria-label={`${normalizedMinuteStep} ${
                        normalizedMinuteStep === 1
                          ? "minut"
                          : "minutter"
                      } frem`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 text-gray-800 transition hover:bg-gray-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-blue-300"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-2">
                <div>
                  {clearable &&
                  value ? (
                    <button
                      type="button"
                      onClick={() => {
                        onChange("");
                        setTextValue("");
                        setOpen(false);
                      }}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Ryd
                    </button>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={useNow}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-blue-300"
                  >
                    Nu
                  </button>

                  <button
                    type="button"
                    onClick={apply}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500"
                  >
                    Anvend
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={
        `relative flex min-w-0 ${className}`
      }
    >
      <input
        type="text"
        inputMode="numeric"
        value={textValue}
        disabled={disabled}
        readOnly={pickerOnly}
        placeholder="--:--"
        onClick={(event) => {
          if (pickerOnly) {
            setCandidate(
              roundTimeToStep(
                normalizeTime(value) ??
                  nowTime(),
                normalizedMinuteStep,
              ),
            );

            updatePosition();
            setOpen(true);
            return;
          }

          selectTimeSegment(
            event.currentTarget,
            event.currentTarget.selectionStart,
          );
        }}
        onChange={(event) => {
          handleTextChange(
            event.currentTarget,
          );
        }}
        onBlur={handleBlur}
        aria-label={ariaLabel}
        className="min-h-10 min-w-0 flex-1 rounded-l-xl border border-r-0 border-gray-300 bg-white px-3 py-2 text-sm font-semibold tabular-nums text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
      />

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!open) {
            setCandidate(
              roundTimeToStep(
                normalizeTime(value) ??
                  nowTime(),
                normalizedMinuteStep,
              ),
            );

            updatePosition();
          }

          setOpen(
            (current) =>
              !current,
          );
        }}
        aria-label={
          "?bn klokkesl?tsv?lger"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex min-h-10 w-11 shrink-0 items-center justify-center rounded-r-xl border border-gray-300 bg-white text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
      >
        <Clock3 className="h-4 w-4" />
      </button>

      {panel}
    </div>
  );
}
