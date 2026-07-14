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
} from "../../helpers/core/userHelpers";
import type {
  CurrentUser,
  User,
} from "../../helpers/core/userTypes";

type UseUsersDataOptions = {
  showError: (title: string, description: string) => void;
};

export function useUsersData({
  showError,
}: UseUsersDataOptions) {
  const [users, setUsers] = useState<User[]>([]);
  const [masterUsers, setMasterUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] =
    useState<number | null>(null);
  const [
    selectedMasterCinemaName,
    setSelectedMasterCinemaName,
  ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMasterUsers, setLoadingMasterUsers] =
    useState(false);

  useEffect(() => {
    const storedUser = getStoredCurrentUser();
    const storedMasterCinemaId = getStoredMasterCinemaId();
    const storedMasterCinemaName =
      getStoredMasterCinemaName();

    setCurrentUser(storedUser);
    setSelectedMasterCinemaId(storedMasterCinemaId);
    setSelectedMasterCinemaName(storedMasterCinemaName);

    void fetchUsers(storedUser, storedMasterCinemaId);

    if (storedUser?.role === "MASTER") {
      void fetchMasterUsers();
    } else {
      setMasterUsers([]);
    }
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
        error instanceof Error
          ? error.message
          : "Kunne ikke hente brugere.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchMasterUsers() {
    try {
      setLoadingMasterUsers(true);

      const response = await apiFetch("/users");

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = normalizeUsers(await response.json());

      setMasterUsers(
        data
          .filter((user) => user.role === "MASTER")
          .sort((first, second) =>
            `${first.firstName} ${first.lastName}`.localeCompare(
              `${second.firstName} ${second.lastName}`,
              "da",
            ),
          ),
      );
    } catch (error) {
      setMasterUsers([]);
      showError(
        "Kunne ikke hente MASTER-brugere",
        error instanceof Error
          ? error.message
          : "MASTER-brugerne kunne ikke hentes.",
      );
    } finally {
      setLoadingMasterUsers(false);
    }
  }

  return {
    users,
    setUsers,
    masterUsers,
    setMasterUsers,
    currentUser,
    selectedMasterCinemaId,
    selectedMasterCinemaName,
    loading,
    loadingMasterUsers,
    fetchUsers,
    fetchMasterUsers,
  };
}
