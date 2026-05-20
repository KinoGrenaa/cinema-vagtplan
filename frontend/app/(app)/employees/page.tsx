"use client";

import { useCallback, useEffect, useState } from "react";

import AdminGuard from "@/app/components/AdminGuard";

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchUsers = useCallback(async () => {
    const response = await fetch(
      "http://localhost:3001/users",
      {
        headers: getHeaders(),
      }
    );

    const data = await response.json();

    setUsers(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <AdminGuard>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Medarbejdere
          </h1>

          <p className="text-gray-600">
            Oversigt over medarbejdere
          </p>
        </div>

        <section className="bg-white border rounded-xl p-4 shadow-sm overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">
                  Navn
                </th>

                <th className="text-left p-3">
                  Email
                </th>

                <th className="text-left p-3">
                  Rolle
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-3">
                    {user.firstName}{" "}
                    {user.lastName}
                  </td>

                  <td className="p-3">
                    {user.email}
                  </td>

                  <td className="p-3">
                    {user.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <p className="p-4 text-gray-500">
              Ingen medarbejdere fundet.
            </p>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}