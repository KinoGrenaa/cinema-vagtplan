"use client";

import type { Dispatch, SetStateAction } from "react";

type UsersHeaderProps = {
  showInactive: boolean;
  setShowInactive: Dispatch<SetStateAction<boolean>>;
  needsMasterCinemaSelection: boolean;
  onCreateClick: () => void;
};

export default function UsersHeader({
  showInactive,
  setShowInactive,
  needsMasterCinemaSelection,
  onCreateClick,
}: UsersHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold">Brugere</h1>
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Vis deaktiverede brugere
        </label>
      </div>

      <button
        onClick={onCreateClick}
        className={`rounded-lg px-4 py-2 text-white ${
          needsMasterCinemaSelection
            ? "cursor-not-allowed bg-gray-400"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        disabled={needsMasterCinemaSelection}
      >
        Opret bruger
      </button>
    </div>
  );
}
