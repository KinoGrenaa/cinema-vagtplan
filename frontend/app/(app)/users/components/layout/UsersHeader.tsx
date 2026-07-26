"use client";

import type {
  Dispatch,
  SetStateAction,
} from "react";
import type { UserListSort } from "../../helpers/core/userTypes";

type UsersHeaderProps = {
  showInactive: boolean;
  setShowInactive:
    Dispatch<SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  sort: UserListSort;
  setSort: (value: UserListSort) => void;
  total: number;
  needsMasterCinemaSelection: boolean;
  onCreateClick: () => void;
};

const controlClassName =
  "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm outline-none transition hover:border-gray-400 focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/25 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-gray-600 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/30";

export default function UsersHeader({
  showInactive,
  setShowInactive,
  searchQuery,
  setSearchQuery,
  sort,
  setSort,
  total,
  needsMasterCinemaSelection,
  onCreateClick,
}: UsersHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Brugere
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {total} brugere matcher den aktuelle visning
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateClick}
          className={`rounded-lg px-4 py-2 text-white ${
            needsMasterCinemaSelection
              ? "cursor-not-allowed bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          disabled={
            needsMasterCinemaSelection
          }
        >
          Opret bruger
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_auto] md:items-end dark:border-gray-800 dark:bg-gray-900">
        <label>
          <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Søg
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value,
              )
            }
            placeholder="Navn, email, telefon eller medarbejdernummer"
            className={`${controlClassName} w-full`}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Sortering
          </span>
          <select
            value={sort}
            onChange={(event) =>
              setSort(
                event.target
                  .value as UserListSort,
              )
            }
            className={`${controlClassName} w-full`}
          >
            <option value="NAME">
              Navn A–Å
            </option>
            <option value="NEWEST">
              Nyeste først
            </option>
            <option value="OLDEST">
              Ældste først
            </option>
          </select>
        </label>

        <label className="flex min-h-10 items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) =>
              setShowInactive(
                event.target.checked,
              )
            }
          />
          Vis deaktiverede
        </label>
      </div>
    </div>
  );
}
