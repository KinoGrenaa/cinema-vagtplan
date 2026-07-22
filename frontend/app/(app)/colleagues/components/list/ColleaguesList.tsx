import type { User } from "../../helpers/colleagueHelpers";

type ColleaguesListProps = {
  users: User[];
};

export function ColleaguesList({
  users,
}: ColleaguesListProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
        Ingen medarbejdere fundet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {users.map((user) => (
        <article
          key={user.id}
          className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-100"
        >
          <h2 className="text-xl font-bold">
            {user.firstName} {user.lastName}
          </h2>

          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="inline font-semibold text-gray-700 dark:text-gray-300">
                Email:
              </dt>{" "}
              <dd className="inline break-all text-gray-900 dark:text-gray-100">
                {user.email}
              </dd>
            </div>

            <div>
              <dt className="inline font-semibold text-gray-700 dark:text-gray-300">
                Telefon:
              </dt>{" "}
              <dd className="inline text-gray-900 dark:text-gray-100">
                {user.phone || "-"}
              </dd>
            </div>

            <div>
              <dt className="inline font-semibold text-gray-700 dark:text-gray-300">
                Rolle:
              </dt>{" "}
              <dd className="inline text-gray-900 dark:text-gray-100">
                {user.role}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
