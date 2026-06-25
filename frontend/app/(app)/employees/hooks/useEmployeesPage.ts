import { useCallback, useEffect, useMemo, useState } from "react";

import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

import {
  appendCinemaId,
  getSelectedMasterCinemaId,
  getStoredUser,
  readErrorMessage,
} from "../helpers/employeeHelpers";
import type { PermissionKey, StoredUser, User } from "../helpers/employeeTypes";

export function useEmployeesPage() {
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

  return {
    users,
    loading,
    needsMasterCinemaSelection,
    updatePermission,
    infoDialog,
  };
}
