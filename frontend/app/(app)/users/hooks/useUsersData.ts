"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import {
  buildUsersEndpoint,
  getErrorMessage,
  getStoredCurrentUser,
  getStoredMasterCinemaId,
  getStoredMasterCinemaName,
  normalizeUsers,
} from "../helpers/userHelpers";
import type { CurrentUser, User } from "../helpers/userTypes";

type UseUsersDataOptions = {
  showError: (title: string, description: string) => void;
};

export function useUsersData({ showError }: UseUsersDataOptions) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);
  const [selectedMasterCinemaName, setSelectedMasterCinemaName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getStoredCurrentUser();
    const storedMasterCinemaId = getStoredMasterCinemaId();
    const storedMasterCinemaName = getStoredMasterCinemaName();

    setCurrentUser(storedUser);
    setSelectedMasterCinemaId(storedMasterCinemaId);
    setSelectedMasterCinemaName(storedMasterCinemaName);

    fetchUsers(storedUser, storedMasterCinemaId);
  }, []);

  async function fetchUsers(
    userForRequest = currentUser,
    masterCinemaIdForRequest = selectedMasterCinemaId,
  ) {
    try {
      setLoading(true);

      const endpoint = buildUsersEndpoint(
        userForRequest,
        masterCinemaIdForRequest,
      );

      if (!endpoint) {
        setUsers([]);
        return;
      }

      const response = await apiFetch(endpoint);

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();

      setUsers(normalizeUsers(data));
    } catch (error) {
      setUsers([]);

      showError(
        "Kunne ikke hente brugere",
        error instanceof Error ? error.message : "Kunne ikke hente brugere.",
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    users,
    setUsers,
    currentUser,
    selectedMasterCinemaId,
    selectedMasterCinemaName,
    loading,
    fetchUsers,
  };
}
