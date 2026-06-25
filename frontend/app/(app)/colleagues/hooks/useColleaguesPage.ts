"use client";

import { useCallback, useEffect, useState } from "react";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { readErrorMessage, type User } from "../helpers/colleagueHelpers";

export function useColleaguesPage() {
  const infoDialog = useInfoModal();

  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await apiFetch("/users");

      if (!response.ok) {
        setUsers([]);

        infoDialog.showError(
          "Kollegaer kunne ikke hentes",
          await readErrorMessage(
            response,
            "Der opstod en fejl, da kollegaer skulle hentes.",
          ),
        );

        return;
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setUsers([]);

      infoDialog.showError(
        "Kollegaer kunne ikke hentes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da kollegaer skulle hentes.",
      );
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    infoDialog,
  };
}
