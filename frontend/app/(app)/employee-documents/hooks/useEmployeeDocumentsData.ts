"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import {
  appendCinemaId,
  getCurrentUserFromStorage,
  getErrorMessage,
  getSelectedMasterCinemaId,
  readErrorMessage,
} from "../helpers/employeeDocumentHelpers";
import type {
  CurrentUser,
  EmployeeDocument,
  User,
} from "../helpers/employeeDocumentTypes";

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

type UseEmployeeDocumentsDataParams = {
  infoDialog: InfoDialog;
};

export function useEmployeeDocumentsData({
  infoDialog,
}: UseEmployeeDocumentsDataParams) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const activeCinemaId = useMemo(() => {
    if (!currentUser) return null;

    if (currentUser.role === "MASTER" && !currentUser.cinemaId) {
      return selectedMasterCinemaId;
    }

    return currentUser.cinemaId;
  }, [currentUser, selectedMasterCinemaId]);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" &&
    !currentUser.cinemaId &&
    !selectedMasterCinemaId;

  useEffect(() => {
    function updateUserContext() {
      setCurrentUser(getCurrentUserFromStorage());
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    }

    updateUserContext();

    window.addEventListener("storage", updateUserContext);
    window.addEventListener("masterSelectedCinemaChanged", updateUserContext);

    return () => {
      window.removeEventListener("storage", updateUserContext);
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateUserContext,
      );
    };
  }, []);

  async function fetchDocuments(userId: number, cinemaId: number | null) {
    try {
      setLoading(true);

      const response = await apiFetch(
        appendCinemaId(`/employee-documents/user/${userId}`, cinemaId),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente dokumenter"),
        );
      }

      const data = await response.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      setDocuments([]);

      infoDialog.showError(
        "Kunne ikke hente dokumenter",
        getErrorMessage(error, "Dokumenterne kunne ikke hentes. Prøv igen."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers(
    cinemaId: number | null,
    masterCinemaSelectionMissing: boolean,
  ) {
    if (masterCinemaSelectionMissing) {
      setUsers([]);
      setSelectedUserId(null);
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch(appendCinemaId("/users", cinemaId));

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente medarbejdere"),
        );
      }

      const data = await response.json();
      const nextUsers = Array.isArray(data) ? data : [];

      setUsers(nextUsers);

      setSelectedUserId(null);
      setDocuments([]);
      setLoading(false);
    } catch (error) {
      setUsers([]);
      setSelectedUserId(null);
      setDocuments([]);
      setLoading(false);

      infoDialog.showError(
        "Kunne ikke hente medarbejdere",
        getErrorMessage(error, "Medarbejderne kunne ikke hentes. Prøv igen."),
      );
    }
  }

  useEffect(() => {
    if (!currentUser) return;

    fetchUsers(activeCinemaId, needsMasterCinemaSelection);
  }, [currentUser, activeCinemaId, needsMasterCinemaSelection]);

  useEffect(() => {
    if (!selectedUserId || needsMasterCinemaSelection) return;

    fetchDocuments(selectedUserId, activeCinemaId);
  }, [activeCinemaId, needsMasterCinemaSelection, selectedUserId]);

  return {
    users,
    documents,
    selectedUserId,
    setSelectedUserId,
    loading,
    activeCinemaId,
    needsMasterCinemaSelection,
    fetchDocuments,
  };
}
