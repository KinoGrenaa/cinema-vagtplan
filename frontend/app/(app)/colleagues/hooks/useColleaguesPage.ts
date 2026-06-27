"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";

import { readErrorMessage, type User } from "../helpers/colleagueHelpers";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

function getStoredMasterCinemaId() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY);
}

export function useColleaguesPage() {
  const { user, loading: authLoading } = useAuth();
  const infoDialog = useInfoModal();
  const showErrorRef = useRef(infoDialog.showError);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<string | null>(
    () => getStoredMasterCinemaId(),
  );
  const isGlobalMaster = user?.role === "MASTER" && !user.cinemaId;
  const needsMasterCinemaSelection = Boolean(isGlobalMaster && !selectedMasterCinemaId);

  useEffect(() => {
    showErrorRef.current = infoDialog.showError;
  }, [infoDialog.showError]);

  useEffect(() => {
    function handleMasterCinemaChange() {
      setSelectedMasterCinemaId(getStoredMasterCinemaId());
    }

    window.addEventListener("masterSelectedCinemaChanged", handleMasterCinemaChange);
    window.addEventListener("storage", handleMasterCinemaChange);

    return () => {
      window.removeEventListener("masterSelectedCinemaChanged", handleMasterCinemaChange);
      window.removeEventListener("storage", handleMasterCinemaChange);
    };
  }, []);

  const fetchUsers = useCallback(async () => {
    if (authLoading || !user) {
      return;
    }

    if (needsMasterCinemaSelection) {
      setUsers([]);
      return;
    }

    const masterCinemaQuery = selectedMasterCinemaId
      ? `cinemaId=${encodeURIComponent(selectedMasterCinemaId)}`
      : "";

    try {
      const response = await apiFetch(
        masterCinemaQuery ? `/users?${masterCinemaQuery}` : "/users",
      );

      if (!response.ok) {
        setUsers([]);
        showErrorRef.current(
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
      showErrorRef.current(
        "Kollegaer kunne ikke hentes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da kollegaer skulle hentes.",
      );
    }
  }, [authLoading, needsMasterCinemaSelection, selectedMasterCinemaId, user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    needsMasterCinemaSelection,
    infoDialog,
  };
}
