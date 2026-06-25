"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";

import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

import { EmployeesEmptyState, EmployeesMasterCinemaPlaceholder } from "./components/EmployeesEmptyState";
import EmployeesHeader from "./components/EmployeesHeader";
import EmployeesMasterCinemaNotice from "./components/EmployeesMasterCinemaNotice";
import EmployeesTable from "./components/EmployeesTable";
import {
  appendCinemaId,
  getSelectedMasterCinemaId,
  getStoredUser,
  readErrorMessage,
} from "./helpers/employeeHelpers";
import type { PermissionKey, StoredUser, User } from "./helpers/employeeTypes";

export default function EmployeesPage() {
  const infoDialog = useInfoModal();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);

  const activeCinemaId = useMemo(() => {
    if (!currentUser) {
      return null;
    }

    if (currentUser.role === "MASTER" && !currentUser.cinemaId) {
      return selectedMasterCinemaId;
    }

    return currentUser.cinemaId ?? null;
  }, [currentUser, selectedMasterCinemaId]);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" &&
    !currentUser.cinemaId &&
    !selectedMasterCinemaId;

  const appendActiveCinemaId = useCallback(
    (endpoint: string) => {
      if (currentUser?.role === "MASTER" && !currentUser.cinemaId) {
        return appendCinemaId(endpoint, activeCinemaId);
      }

      return endpoint;
    },
    [activeCinemaId, currentUser],
  );

  const fetchUsers = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    if (needsMasterCinemaSelection) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch(appendActiveCinemaId("/users"));

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Medarbejdere kunne ikke hentes."),
        );
      }

      const data = await response.json();

      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setUsers([]);
      infoDialog.showError(
        "Medarbejdere kunne ikke hentes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl ved hentning af medarbejdere.",
      );
    } finally {
      setLoading(false);
    }
  }, [appendActiveCinemaId, currentUser, needsMasterCinemaSelection]);

  async function updatePermission(
    userId: number,
    permission: PermissionKey,
    value: boolean,
  ) {
    if (needsMasterCinemaSelection) {
      infoDialog.showError(
        "Ingen aktiv biograf valgt",
        "Vælg en biograf i MASTER-panelet, før du ændrer medarbejderrettigheder.",
      );
      return;
    }

    try {
      const user = users.find((u) => u.id === userId);

      if (!user) return;

      const response = await apiFetch(
        appendActiveCinemaId(`/users/${userId}`),
        {
          method: "PATCH",
          body: JSON.stringify({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            canManageSchedule: user.canManageSchedule ?? false,
            canManageUsers: user.canManageUsers ?? false,
            canManagePayroll: user.canManagePayroll ?? false,
            canManageLeaveRequests: user.canManageLeaveRequests ?? false,
            canManageCinemaSettings: user.canManageCinemaSettings ?? false,
            canSendBroadcastMessages: user.canSendBroadcastMessages ?? false,
            [permission]: value,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Permission kunne ikke opdateres."),
        );
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
    } catch (error) {
      infoDialog.showError(
        "Permission kunne ikke opdateres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da permission skulle opdateres. Prøv igen.",
      );
    }
  }

  useEffect(() => {
    function syncActiveCinemaContext() {
      setCurrentUser(getStoredUser());
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    }

    syncActiveCinemaContext();

    window.addEventListener(
      "masterSelectedCinemaChanged",
      syncActiveCinemaContext,
    );
    window.addEventListener("storage", syncActiveCinemaContext);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        syncActiveCinemaContext,
      );
      window.removeEventListener("storage", syncActiveCinemaContext);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    fetchUsers();
  }, [currentUser, fetchUsers, selectedMasterCinemaId]);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <EmployeesHeader />

          {needsMasterCinemaSelection && <EmployeesMasterCinemaNotice />}

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            {!needsMasterCinemaSelection && loading && (
              <div className="p-6 text-gray-500 dark:text-gray-400">
                Henter medarbejdere...
              </div>
            )}

            {!needsMasterCinemaSelection && !loading && users.length > 0 && (
              <EmployeesTable
                users={users}
                onPermissionChange={updatePermission}
              />
            )}

            {!needsMasterCinemaSelection && !loading && users.length === 0 && (
              <EmployeesEmptyState />
            )}

            {needsMasterCinemaSelection && <EmployeesMasterCinemaPlaceholder />}
          </section>
        </div>
      </main>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </AdminGuard>
  );
}
