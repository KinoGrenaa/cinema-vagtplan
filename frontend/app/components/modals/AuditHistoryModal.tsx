"use client";

import BaseModal from "./BaseModal";

type AuditLog = {
  id: number;
  action: string;
  description?: string | null;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
};

type Props = {
  open: boolean;
  logs: AuditLog[];
  loading?: boolean;
  onClose: () => void;
};

export default function AuditHistoryModal({
  open,
  logs,
  loading = false,
  onClose,
}: Props) {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Ændringshistorik"
      width="lg"
    >
      {loading && <p className="text-sm text-gray-500">Henter historik...</p>}

      {!loading && logs.length === 0 && (
        <p className="text-sm text-gray-500">
          Der er ingen ændringshistorik for denne registrering.
        </p>
      )}

      {!loading && logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="mb-2 font-semibold">
                {new Date(log.createdAt).toLocaleString("da-DK")}
              </div>

              <div className="mb-2 text-gray-600 dark:text-gray-400">
                {log.user
                  ? `${log.user.firstName} ${log.user.lastName}`
                  : "Ukendt bruger"}
              </div>

              <pre className="whitespace-pre-wrap font-sans">
                {log.description || "-"}
              </pre>
            </div>
          ))}
        </div>
      )}
    </BaseModal>
  );
}
