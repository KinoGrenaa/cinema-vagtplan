import {
  getRoleBadge,
  getRoleLabel,
  permissionLabels,
} from "../../helpers/employeeHelpers";
import type { PermissionKey, User } from "../../helpers/employeeTypes";

type EmployeesTableProps = {
  users: User[];
  onPermissionChange: (
    userId: number,
    permission: PermissionKey,
    value: boolean,
  ) => void;
};

export default function EmployeesTable({
  users,
  onPermissionChange,
}: EmployeesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-50 dark:bg-gray-950">
          <tr className="text-left text-sm text-gray-600 dark:text-gray-400">
            <th className="px-4 py-3">Navn</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Rolle</th>
            <th className="px-4 py-3">Permissions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => {
            const permissionsDisabled =
              user.role === "MASTER" || user.role === "ADMIN";

            return (
              <tr
                key={user.id}
                className="border-t border-gray-200 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
              >
                <td className="px-4 py-4 font-medium">
                  {user.firstName} {user.lastName}
                </td>

                <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                  {user.email}
                </td>

                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadge(
                      user.role,
                    )}`}
                  >
                    {getRoleLabel(user.role)}
                  </span>

                  {permissionsDisabled && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Har adgang via rolle.
                    </p>
                  )}
                </td>

                <td className="px-4 py-4">
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    {permissionLabels.map((permission) => (
                      <label
                        key={permission.key}
                        className={`flex items-center gap-2 ${
                          permissionsDisabled
                            ? "text-gray-400"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={permissionsDisabled}
                          checked={
                            permissionsDisabled || !!user[permission.key]
                          }
                          onChange={(event) =>
                            onPermissionChange(
                              user.id,
                              permission.key,
                              event.target.checked,
                            )
                          }
                        />
                        {permission.label}
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
