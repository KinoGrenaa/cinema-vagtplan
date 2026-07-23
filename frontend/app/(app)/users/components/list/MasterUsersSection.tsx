"use client";

import type { User } from "../../helpers/core/userTypes";

type MasterUsersSectionProps = {
  users: User[];
  loading: boolean;
  currentUserId: number | null;
  showInactive: boolean;
  onCreate: () => void;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
  onReactivate: (user: User) => void;
};

export default function MasterUsersSection({
  users,
  loading,
  currentUserId,
  showInactive,
  onCreate,
  onEdit,
  onDeactivate,
  onReactivate,
}: MasterUsersSectionProps) {
  const visibleUsers = showInactive
    ? users
    : users.filter((user) => user.isActive !== false);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm dark:border-purple-900 dark:bg-gray-900">
      <div className="border-b border-purple-200 bg-purple-50 p-5 dark:border-purple-900 dark:bg-purple-950/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">
              MASTER-brugere
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Globale administratorer, som kan arbejde på
              tværs af biografer.
            </p>
          </div>

          <button
            type="button"
            onClick={onCreate}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            Opret MASTER-bruger
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-5 text-sm text-gray-600 dark:text-gray-400">
          Henter MASTER-brugere...
        </div>
      ) : visibleUsers.length === 0 ? (
        <div className="p-5 text-sm text-gray-600 dark:text-gray-400">
          {showInactive
            ? "Ingen MASTER-brugere fundet."
            : "Ingen aktive MASTER-brugere fundet."}
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {visibleUsers.map((user) => {
            const isCurrentUser = user.id === currentUserId;
            const isInactive = user.isActive === false;

            return (
              <article
                key={user.id}
                className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">
                      {user.firstName} {user.lastName}
                    </h3>

                    {isCurrentUser && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                        Dig
                      </span>
                    )}

                    {isInactive ? (
                      <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        Deaktiveret
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-300">
                        Aktiv
                      </span>
                    )}
                  </div>

                  <p className="mt-1 break-all text-sm text-gray-600 dark:text-gray-400">
                    {user.email}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Bruger-ID {user.id}
                    {user.phone ? ` · ${user.phone}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => onEdit(user)}
                    className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-300 active:bg-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
                  >
                    Rediger
                  </button>

                  {isInactive ? (
                    <button
                      type="button"
                      onClick={() => onReactivate(user)}
                      className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 active:bg-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:bg-green-600 dark:hover:bg-green-500 dark:active:bg-green-400 dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-gray-900"
                    >
                      Genaktivér
                    </button>
                  ) : isCurrentUser ? (
                    <span className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      Din egen bruger kan ikke deaktiveres her
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDeactivate(user)}
                      className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 active:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900"
                    >
                      Deaktivér
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="border-t border-purple-100 px-5 py-3 text-xs text-gray-500 dark:border-purple-950 dark:text-gray-400">
        MASTER-brugere er uafhængige af den valgte biograf
        og bruger ikke almindelige biograftilknytninger.
      </div>
    </section>
  );
}
