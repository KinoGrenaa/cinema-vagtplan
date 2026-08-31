"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import EmployeeAvatar from "@/app/components/employees/EmployeeAvatar";
import BaseModal from "@/app/components/modals/BaseModal";

export type EmployeePickerOption = {
  id: number;
  name: string;
  profileImage?: string | null;
  detail?: string;
  warning?: string;
  warningTone?:
    | "info"
    | "warning"
    | "danger";
  disabled?: boolean;
};

type EmployeePickerModalProps = {
  open: boolean;
  title: string;
  options: EmployeePickerOption[];
  onClose: () => void;
  onConfirm:
    (
      employeeId: number,
    ) =>
      | void
      | Promise<void>;
  selectedEmployeeId?:
    | number
    | null;
  description?: string;
  confirmLabel?: string;
  searchPlaceholder?: string;
  emptyText?: string;
};

const warningClasses = {
  info:
    "text-blue-700 dark:text-blue-300",
  warning:
    "text-amber-700 dark:text-amber-300",
  danger:
    "text-red-700 dark:text-red-300",
};

export default function EmployeePickerModal({
  open,
  title,
  options,
  onClose,
  onConfirm,
  selectedEmployeeId = null,
  description,
  confirmLabel = "Vælg medarbejder",
  searchPlaceholder = "Søg medarbejder",
  emptyText = "Ingen medarbejdere matcher søgningen.",
}: EmployeePickerModalProps) {
  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");
  const [
    draftEmployeeId,
    setDraftEmployeeId,
  ] = useState<
    number | null
  >(selectedEmployeeId);
  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSearchQuery("");
    setDraftEmployeeId(
      selectedEmployeeId,
    );
    setSubmitting(false);
  }, [
    open,
    selectedEmployeeId,
  ]);

  const filteredOptions =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLocaleLowerCase(
            "da-DK",
          );

      if (!query) {
        return options;
      }

      return options.filter(
        (option) =>
          [
            option.name,
            option.detail,
            option.warning,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase(
              "da-DK",
            )
            .includes(query),
      );
    }, [
      options,
      searchQuery,
    ]);

  const selectedOption =
    options.find(
      (option) =>
        option.id ===
        draftEmployeeId,
    ) ?? null;

  async function handleConfirm() {
    if (
      !selectedOption ||
      selectedOption.disabled ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);

    try {
      await onConfirm(
        selectedOption.id,
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BaseModal
      open={open}
      title={title}
      width="xl"
      onClose={() => {
        if (!submitting) {
          onClose();
        }
      }}
    >
      <div className="space-y-4">
        {description && (
          <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 dark:bg-gray-950/55 dark:text-gray-300">
            {description}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={
              searchQuery
            }
            onChange={(
              event,
            ) =>
              setSearchQuery(
                event.target.value,
              )
            }
            placeholder={
              searchPlaceholder
            }
            aria-label={
              searchPlaceholder
            }
            autoFocus
            className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/25 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/30"
          />

          <span className="shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {filteredOptions.length ===
            options.length
              ? `${options.length} medarbejdere`
              : `${filteredOptions.length} af ${options.length}`}
          </span>
        </div>

        <div
          className="max-h-[48vh] overflow-y-auto pr-1"
          role="listbox"
          aria-label="Medarbejdere"
        >
          {filteredOptions.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400">
              {emptyText}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOptions.map(
                (option) => {
                  const isSelected =
                    option.id ===
                    draftEmployeeId;
                  const warningTone =
                    option.warningTone ??
                    "warning";

                  return (
                    <button
                      key={
                        option.id
                      }
                      type="button"
                      role="option"
                      aria-selected={
                        isSelected
                      }
                      disabled={
                        option.disabled ||
                        submitting
                      }
                      onClick={() =>
                        setDraftEmployeeId(
                          option.id,
                        )
                      }
                      className={`relative min-h-20 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500/20 dark:border-blue-400 dark:bg-blue-950/35"
                          : option.disabled
                            ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-60 dark:border-gray-800 dark:bg-gray-950/40"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-950/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
                      }`}
                    >
                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white dark:bg-blue-500"
                        >
                          ✓
                        </span>
                      )}

                      <span className="flex items-start gap-3 pr-6">
                        <EmployeeAvatar
                          name={
                            option.name
                          }
                          profileImage={
                            option.profileImage
                          }
                          selected={
                            isSelected
                          }
                        />

                        <span className="min-w-0 pt-0.5">
                          <span className="block font-bold leading-5 text-gray-950 dark:text-gray-100">
                            {
                              option.name
                            }
                          </span>

                          {option.detail && (
                            <span className="mt-1 block text-xs leading-5 text-gray-600 dark:text-gray-400">
                              {
                                option.detail
                              }
                            </span>
                          )}

                          {option.warning && (
                            <span
                              className={`mt-1 block text-xs font-semibold leading-5 ${warningClasses[warningTone]}`}
                            >
                              {
                                option.warning
                              }
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-end dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={
              submitting
            }
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-800 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Annuller
          </button>

          <button
            type="button"
            onClick={
              handleConfirm
            }
            disabled={
              !selectedOption ||
              selectedOption.disabled ||
              submitting
            }
            className="rounded-xl bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {submitting
              ? "Gemmer..."
              : confirmLabel}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
