"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/app/lib/api";
import { readErrorMessage } from "../../helpers/core/leaveRequestHelpers";

import type { LeaveRequestCurrentUser } from "../data/useLeaveRequestsData";

type UserOptionSource = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  isActive?: boolean;
};

export type LeaveRequestEmployeeOption = {
  id: number;
  label: string;
};

type UseLeaveRequestEmployeeOptionsOptions = {
  activeCinemaId: number | null;
  currentUser: LeaveRequestCurrentUser | null;
  showError: (title: string, description?: string) => void;
};

function formatUserOption(user: UserOptionSource) {
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return fullName || user.email || `Bruger #${user.id}`;
}

function buildUsersEndpoint(
  currentUser: LeaveRequestCurrentUser | null,
  activeCinemaId: number | null,
) {
  if (!currentUser) {
    return null;
  }

  if (currentUser.role === "MASTER" && !currentUser.cinemaId) {
    if (!activeCinemaId) {
      return null;
    }

    return `/users?cinemaId=${activeCinemaId}`;
  }

  if (currentUser.role === "ADMIN") {
    return "/users";
  }

  return null;
}

export function useLeaveRequestEmployeeOptions({
  activeCinemaId,
  currentUser,
  showError,
}: UseLeaveRequestEmployeeOptionsOptions) {
  const [users, setUsers] = useState<UserOptionSource[]>([]);
  const [loadingEmployeeOptions, setLoadingEmployeeOptions] = useState(false);
  const showErrorRef = useRef(showError);
  const canCreateForEmployees =
    currentUser?.role === "ADMIN" || currentUser?.role === "MASTER";

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  useEffect(() => {
    async function fetchUsers() {
      const endpoint = buildUsersEndpoint(currentUser, activeCinemaId);

      if (!canCreateForEmployees || !endpoint) {
        setUsers([]);
        return;
      }

      try {
        setLoadingEmployeeOptions(true);
        const response = await apiFetch(endpoint);

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response, "Medarbejdere kunne ikke hentes."),
          );
        }

        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        setUsers([]);
        showErrorRef.current(
          "Kunne ikke hente medarbejdere",
          error instanceof Error ? error.message : "Der opstod en fejl.",
        );
      } finally {
        setLoadingEmployeeOptions(false);
      }
    }

    void fetchUsers();
  }, [activeCinemaId, canCreateForEmployees, currentUser]);

  const employeeOptions = useMemo(
    () =>
      users
        .filter((user) => user.role !== "MASTER" && user.isActive !== false)
        .map((user) => ({
          id: user.id,
          label: formatUserOption(user),
        }))
        .sort((left, right) => left.label.localeCompare(right.label, "da-DK")),
    [users],
  );

  return {
    canCreateForEmployees,
    employeeOptions,
    loadingEmployeeOptions,
  };
}
