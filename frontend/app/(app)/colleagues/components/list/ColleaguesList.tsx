import type { User } from "../../helpers/colleagueHelpers";

type ColleaguesListProps = {
  users: User[];
};

export function ColleaguesList({ users }: ColleaguesListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {users.map((user) => (
        <div key={user.id} className="border rounded-xl p-5 bg-gray-50">
          <div className="text-xl font-bold">
            {user.firstName} {user.lastName}
          </div>

          <div className="mt-3 space-y-2 text-sm">
            <div>
              <span className="font-semibold">Email:</span> {user.email}
            </div>

            <div>
              <span className="font-semibold">Telefon:</span>{" "}
              {user.phone || "-"}
            </div>

            <div>
              <span className="font-semibold">Rolle:</span> {user.role}
            </div>
          </div>
        </div>
      ))}

      {users.length === 0 && (
        <div className="text-gray-500">Ingen medarbejdere fundet</div>
      )}
    </div>
  );
}
