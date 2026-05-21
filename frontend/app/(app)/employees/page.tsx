"use client";

import { useCallback, useEffect, useState } from "react";

import AdminGuard from "@/app/components/AdminGuard";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

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
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
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
                        </td>
                      </tr>
                    ))}
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

                <p className="mt-2">
                  Der blev ikke fundet nogen medarbejdere.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}