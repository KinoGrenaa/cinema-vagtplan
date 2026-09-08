"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import EmployeeAvatar from "@/app/components/employees/EmployeeAvatar";
import BaseModal from "@/app/components/modals/BaseModal";

import type {
  User,
} from "../../helpers/core/sendMessageTypes";

type MessageRecipientPickerModalProps = {
  open: boolean;
  options: User[];
  selectedEmployeeIds: number[];
  onClose: () => void;
  onConfirm: (employeeIds: number[]) => void;
};

export default function MessageRecipientPickerModal({
  open,
  options,
  selectedEmployeeIds,
  onClose,
  onConfirm,
}: MessageRecipientPickerModalProps) {
  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");
  const [
    draftIds,
    setDraftIds,
  ] = useState<number[]>(
    selectedEmployeeIds,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setSearchQuery("");
    setDraftIds(
      selectedEmployeeIds,
    );
  }, [
    open,
    selectedEmployeeIds,
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
          `${option.firstName} ${option.lastName}`
            .toLocaleLowerCase(
              "da-DK",
            )
            .includes(query),
      );
    }, [
      options,
      searchQuery,
    ]);

  function toggleRecipient(
    recipientId: number,
  ) {
    setDraftIds(
      (current) =>
        current.includes(
          recipientId,
        )
          ? current.filter(
              (id) =>
                id !==
                recipientId,
            )
          : [
              ...current,
              recipientId,
            ],
    );
  }

  return (
    <BaseModal
      open={open}
      title="Vælg modtagere"
      width="xl"
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 dark:bg-gray-950/55 dark:text-gray-300">
          Vælg én eller flere personer.
        </p>

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
            placeholder="Søg modtager"
            aria-label="Søg modtager"
            autoFocus
            className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/25 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/30"
          />

          <span className="shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {filteredOptions.length ===
            options.length
              ? `${options.length} modtagere`
              : `${filteredOptions.length} af ${options.length}`}
          </span>
        </div>

        <div
          className="max-h-[48vh] overflow-y-auto pr-1"
          role="listbox"
          aria-label="Modtagere"
          aria-multiselectable="true"
        >
          {filteredOptions.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400">
              Ingen modtagere matcher søgningen.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOptions.map(
                (option) => {
                  const isSelected =
                    draftIds.includes(
                      option.id,
                    );
                  const name =
                    `${option.firstName} ${option.lastName}`.trim();

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
                      onClick={() =>
                        toggleRecipient(
                          option.id,
                        )
                      }
                      className={`relative min-h-20 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500/20 dark:border-blue-400 dark:bg-blue-950/35"
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
                          name={name}
                          profileImage={
                            option.profileImage ??
                            null
                          }
                          selected={
                            isSelected
                          }
                        />

                        <span className="min-w-0 pt-0.5">
                          <span className="block font-bold leading-5 text-gray-950 dark:text-gray-100">
                            {name}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {draftIds.length} valgt
          </span>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-800 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              Annuller
            </button>

            <button
              type="button"
              onClick={() => {
                onConfirm(
                  draftIds,
                );
                onClose();
              }}
              disabled={
                draftIds.length ===
                0
              }
              className="rounded-xl bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Brug valgte
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
