"use client";

import {
  getEmploymentTypeLabel,
  getRoleLabel,
} from "../../helpers/core/userHelpers";
import type { User } from "../../helpers/core/userTypes";

type UsersTableProps = {
  visibleUsers: User[];
  needsMasterCinemaSelection: boolean;
  canManageCinemaMemberships: boolean;
  onEdit: (user: User) => void;
  onManageCinemaMemberships: (user: User) => void;
  onDeactivate: (user: User) => void;
  onReactivate: (user: User) => void;
};

export default function UsersTable({
  visibleUsers,
  needsMasterCinemaSelection,
  canManageCinemaMemberships,
  onEdit,
  onManageCinemaMemberships,
  onDeactivate,
  onReactivate,
}: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <table className="w-full border-collapse text-left">
        <thead className="bg-gray-50 text-sm text-gray-500 dark:bg-gray-950 dark:text-gray-400">
          <tr>
            <th className="p-4">Navn</th>
            <th className="p-4">Email</th>
            <th className="p-4">Telefon</th>
            <th className="p-4">Rolle</th>
            <th className="p-4">Ansættelse</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Handlinger</th>
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
                user.canManageAccount !== false;

              return (
                <tr
                  key={user.id}
                  className={`border-t border-gray-200 dark:border-gray-800 ${
                    user.isActive === false
                      ? "bg-gray-50 dark:bg-gray-950"
                      : ""
                  }`}
                >
                  <td className="p-4 font-medium">
                    <div>
                      {user.firstName} {user.lastName}
                    </div>

                    {canManageCinemaMemberships && (
                      <div className="mt-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                        Bruger-ID {user.id}
                      </div>
                    )}

                    {!user.isHomeCinema && (
                      <div className="mt-1 text-xs font-normal text-purple-700 dark:text-purple-300">
                        Tilknyttet denne biograf
                        {user.cinema?.name
                          ? ` · Hjemmebiograf: ${user.cinema.name}`
                          : ""}
                      </div>
                    )}
                  </td>

                  <td className="p-4">{user.email}</td>
                  <td className="p-4">
                    {user.phone || "-"}
                  </td>
                  <td className="p-4">
                    {getRoleLabel(user.role)}
                  </td>
                  <td className="p-4">
                    {getEmploymentTypeLabel(
                      user.employmentType,
                    )}
                  </td>
                  <td className="p-4">
                    {user.isActive === false ? (
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
                            onClick={() => onEdit(user)}
                            className="rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                          >
                            Rediger
                          </button>

                          {user.isActive === false ? (
                            <button
                              type="button"
                              onClick={() =>
                                onReactivate(user)
                              }
                              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                            >
                              Genaktivér
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                onDeactivate(user)
                              }
                              className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white hover:bg-orange-700"
                            >
                              Deaktivér
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                          Administreres af hjemmebiografen
                        </span>
                      )}

                      {canManageCinemaMemberships &&
                        user.role !== "MASTER" && (
                          <button
                            type="button"
                            onClick={() =>
                              onManageCinemaMemberships(user)
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
  );
}
