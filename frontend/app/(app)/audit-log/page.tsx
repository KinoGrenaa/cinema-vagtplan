"use client";

import { useEffect, useMemo, useState } from "react";

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

const actionLabels: Record<string, string> = {
  UPDATE_TIME_ENTRY: "Tidsregistrering rettet",
  UPDATE_TIME_ENTRY_FIELD: "Felt ændret",
  APPROVE_TIME_ENTRY: "Tidsregistrering godkendt",
  UNAPPROVE_TIME_ENTRY: "Godkendelse fjernet",
  REJECT_TIME_ENTRY: "Tidsregistrering afvist",
  LOCK_PAYROLL_PERIOD: "Lønperiode låst",
  UNLOCK_PAYROLL_PERIOD: "Lønperiode låst op",
};

function getActionLabel(action: string) {
  return actionLabels[action] || action.replaceAll("_", " ");
}

function getUserName(log: AuditLog) {
  if (!log.user) return "-";
  return `${log.user.firstName} ${log.user.lastName}`;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");

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

  const entityTypes = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.entityType))).sort();
  }, [logs]);

  const visibleLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      if (entityFilter !== "ALL" && log.entityType !== entityFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        log.action,
        getActionLabel(log.action),
        log.entityType,
        log.entityId?.toString(),
        log.description,
        getUserName(log),
        log.user?.email,
        log.cinema?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [logs, search, entityFilter]);

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
            Historik over administrative handlinger og ændringer i systemet.
          </p>
        </div>

        <div className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800 md:grid-cols-[1fr_240px]">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Søg
            </label>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Søg i handling, beskrivelse, bruger eller biograf..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type
            </label>

            <select
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
              <option value="ALL">Alle typer</option>

              {entityTypes.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {entityType}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            Viser {visibleLogs.length} af {logs.length} audit logs
          </div>

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
                {visibleLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-gray-200 align-top dark:border-gray-800"
                  >
                    <td className="whitespace-nowrap p-4 text-sm text-gray-700 dark:text-gray-300">
                      {new Date(log.createdAt).toLocaleString("da-DK")}
                    </td>

                    <td className="p-4">
                      <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {getActionLabel(log.action)}
                      </span>

                      <div className="mt-1 text-xs text-gray-400">
                        {log.action}
                      </div>
                    </td>

                    <td className="whitespace-nowrap p-4 text-sm text-gray-700 dark:text-gray-300">
                      <div>{log.entityType}</div>

                      {log.entityId && (
                        <div className="mt-1 text-xs text-gray-400">
                          ID: {log.entityId}
                        </div>
                      )}
                    </td>

                    <td className="min-w-[320px] p-4 text-gray-700 dark:text-gray-300">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {log.description || "-"}
                      </div>
                    </td>

                    <td className="whitespace-nowrap p-4 text-sm text-gray-700 dark:text-gray-300">
                      <div>{getUserName(log)}</div>

                      {log.user?.email && (
                        <div className="mt-1 text-xs text-gray-400">
                          {log.user.email}
                        </div>
                      )}
                    </td>

                    <td className="whitespace-nowrap p-4 text-sm text-gray-700 dark:text-gray-300">
                      {log.cinema?.name || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visibleLogs.length === 0 && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              Ingen audit logs fundet
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
