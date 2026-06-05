"use client";

import { useCallback, useEffect, useState } from "react";

import AdminGuard from "@/app/components/AdminGuard";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;

  canManageSchedule?: boolean;
  canManageUsers?: boolean;
  canManagePayroll?: boolean;
  canManageLeaveRequests?: boolean;
  canManageCinemaSettings?: boolean;
  canSendBroadcastMessages?: boolean;
};

type PermissionKey =
  | "canManageSchedule"
  | "canManageUsers"
  | "canManagePayroll"
  | "canManageLeaveRequests"
  | "canManageCinemaSettings"
  | "canSendBroadcastMessages";

const permissionLabels: { key: PermissionKey; label: string }[] = [
  { key: "canManageSchedule", label: "Vagtplan" },
  { key: "canManageUsers", label: "Brugere" },
  { key: "canManagePayroll", label: "Payroll" },
  { key: "canManageLeaveRequests", label: "Fravær" },
  { key: "canManageCinemaSettings", label: "Biograf" },
  { key: "canSendBroadcastMessages", label: "Broadcast" },
];

function getRoleLabel(role: string) {
  if (role === "MASTER") return "Master";
  if (role === "ADMIN") return "Administrator";
  return "Medarbejder";
}

function getRoleBadge(role: string) {
  if (role === "MASTER") {
    return "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200";
  }

  if (role === "ADMIN") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200";
  }

  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/users`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        setUsers([]);
        return;
      }

      const data = await response.json();

      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  async function updatePermission(
    userId: number,
    permission: PermissionKey,
    value: boolean,
  ) {
    try {
      const user = users.find((u) => u.id === userId);

      if (!user) return;

      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          ...user,
          [permission]: value,
        }),
      });

      if (!response.ok) {
        throw new Error();
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                [permission]: value,
              }
            : u,
        ),
      );
    } catch {
      toast.error("Kunne ikke opdatere permission");
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <h1 className="text-3xl font-bold">Medarbejdere</h1>

            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Oversigt over medarbejdere i biografen.
            </p>
          </div>

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            {loading && (
              <div className="p-6 text-gray-500 dark:text-gray-400">
                Henter medarbejdere...
              </div>
            )}

            {!loading && users.length > 0 && (
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
                                      permissionsDisabled ||
                                      !!user[permission.key]
                                    }
                                    onChange={(event) =>
                                      updatePermission(
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
            )}

            {!loading && users.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="mb-2 text-4xl">👥</div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Ingen medarbejdere fundet
                </h2>

                <p className="mt-2">Der blev ikke fundet nogen medarbejdere.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}
