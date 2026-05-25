"use client";

import { useEffect, useState } from "react";

import PermissionGuard from "@/app/components/PermissionGuard";

type AuditLog = {
  id: number;
  action: string;
  entityType: string;
  entityId?: number;
  description?: string;
  createdAt: string;

  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };

  cinema?: {
    name: string;
  };
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/audit-logs`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Kunne ikke hente audit logs");
      }

      const data = await response.json();

      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PermissionGuard permission="canManageUsers">
        <div className="p-6 text-gray-600 dark:text-gray-300">
          Indlæser audit log...
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="canManageUsers">
      <div className="p-6 text-gray-900 dark:text-gray-100">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Audit log
          </h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Historik over administrative handlinger.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-gray-900 dark:text-gray-100">
              <thead className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <tr className="text-left">
                  <th className="p-4">Tidspunkt</th>
                  <th className="p-4">Handling</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Beskrivelse</th>
                  <th className="p-4">Bruger</th>
                  <th className="p-4">Biograf</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-gray-200 dark:border-gray-800"
                  >
                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                      {new Date(log.createdAt).toLocaleString("da-DK")}
                    </td>

                    <td className="p-4">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {log.action}
                      </span>
                    </td>

                    <td className="p-4">{log.entityType}</td>

                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {log.description || "-"}
                    </td>

                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {log.user
                        ? `${log.user.firstName} ${log.user.lastName}`
                        : "-"}
                    </td>

                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {log.cinema?.name || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              Ingen audit logs fundet
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
