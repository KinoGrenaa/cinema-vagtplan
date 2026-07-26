"use client";

import {
  getEmploymentTypeLabel,
  getRoleLabel,
} from "../../helpers/core/userHelpers";
import type { User } from "../../helpers/core/userTypes";

type UsersTableProps = {
  visibleUsers: User[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  needsMasterCinemaSelection: boolean;
  canManageCinemaMemberships: boolean;
  onEdit: (user: User) => void;
  onManageCinemaMemberships: (
    user: User,
  ) => void;
  onDeactivate: (user: User) => void;
  onReactivate: (user: User) => void;
  onLoadMore: () => void;
};

export default function UsersTable({
  visibleUsers,
  total,
  hasMore,
  loadingMore,
  needsMasterCinemaSelection,
  canManageCinemaMemberships,
  onEdit,
  onManageCinemaMemberships,
  onDeactivate,
  onReactivate,
  onLoadMore,
}: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="bg-gray-50 text-sm text-gray-500 dark:bg-gray-950 dark:text-gray-400">
            <tr>
              <th className="p-4">Navn</th>
              <th className="p-4">Email</th>
              <th className="p-4">Telefon</th>
              <th className="p-4">Rolle</th>
              <th className="p-4">
                Ansættelse
              </th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">
                Handlinger
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-gray-500 dark:text-gray-400"
                >
                  {needsMasterCinemaSelection
                    ? "Vælg en biograf i MASTER-panelet."
                    : "Ingen brugere fundet."}
                </td>
              </tr>
            ) : (
              visibleUsers.map((user) => {
                const canManageAccount =
                  user.canManageAccount !==
                  false;

                return (
                  <tr
                    key={user.id}
                    className={`border-t border-gray-200 dark:border-gray-800 ${
                      user.isActive ===
                      false
                        ? "bg-gray-50 dark:bg-gray-950"
                        : ""
                    }`}
                  >
                    <td className="p-4 font-medium">
                      <div>
                        {user.firstName}{" "}
                        {user.lastName}
                      </div>
                      {canManageCinemaMemberships && (
                        <div className="mt-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                          Bruger-ID {user.id}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {user.email}
                    </td>
                    <td className="p-4">
                      {user.phone || "-"}
                    </td>
                    <td className="p-4">
                      {getRoleLabel(
                        user.role,
                      )}
                    </td>
                    <td className="p-4">
                      {getEmploymentTypeLabel(
                        user.employmentType,
                      )}
                    </td>
                    <td className="p-4">
                      {user.isActive ===
                      false ? (
                        <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          Deaktiveret
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                          Aktiv
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {canManageAccount ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onEdit(user)
                              }
                              className="rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                            >
                              Rediger
                            </button>
                            {user.isActive ===
                            false ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onReactivate(
                                    user,
                                  )
                                }
                                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                              >
                                Genaktivér
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onDeactivate(
                                    user,
                                  )
                                }
                                className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white hover:bg-orange-700"
                              >
                                Deaktivér
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                            Kontooplysninger
                            administreres af en
                            anden biograf
                          </span>
                        )}
                        {canManageCinemaMemberships &&
                          user.role !==
                            "MASTER" && (
                            <button
                              type="button"
                              onClick={() =>
                                onManageCinemaMemberships(
                                  user,
                                )
                              }
                              className="rounded-lg bg-purple-700 px-3 py-2 text-sm text-white hover:bg-purple-800"
                            >
                              Biograftilknytninger
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!needsMasterCinemaSelection &&
        visibleUsers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Viser {visibleUsers.length} af{" "}
              {total} brugere
            </p>
            {hasMore ? (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 active:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/45 dark:text-blue-200 dark:hover:bg-blue-950/70 dark:active:bg-blue-900"
              >
                {loadingMore
                  ? "Henter brugere..."
                  : "Hent flere brugere"}
              </button>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Alle matchende brugere er
                vist
              </span>
            )}
          </div>
        )}
    </div>
  );
}
