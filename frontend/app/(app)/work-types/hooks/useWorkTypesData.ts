import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import {
  appendCinemaId,
  getCurrentUserFromToken,
  getSelectedMasterCinemaId,
  readErrorMessage,
} from "../helpers/workTypeHelpers";
import type { CurrentUser, PayrollType, WorkType } from "../helpers/workTypeTypes";

type InfoDialog = {
  showError: (title: string, description: string) => void;
};

export function useWorkTypesData(infoDialog: InfoDialog) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);

  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [payrollTypes, setPayrollTypes] = useState<PayrollType[]>([]);

  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const isMaster = currentUser?.role === "MASTER";

  const activeCinemaId =
    currentUser?.role === "MASTER" && !currentUser.cinemaId
      ? selectedMasterCinemaId
      : (currentUser?.cinemaId ?? null);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" && !currentUser.cinemaId && !activeCinemaId;

  useEffect(() => {
    setCurrentUser(getCurrentUserFromToken());

    const updateSelectedCinema = () => {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    };

    updateSelectedCinema();

    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedCinema,
    );
    window.addEventListener("storage", updateSelectedCinema);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedCinema,
      );
      window.removeEventListener("storage", updateSelectedCinema);
    };
  }, []);

  useEffect(() => {
    if (!isMaster && showArchived) {
      setShowArchived(false);
    }
  }, [isMaster, showArchived]);

  const fetchWorkTypes = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiFetch(
        appendCinemaId(
          `/work-types?includeArchived=${showArchived}`,
          activeCinemaId,
        ),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente vagttyper"),
        );
      }

      const data = await response.json();

      setWorkTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      setWorkTypes([]);

      infoDialog.showError(
        "Kunne ikke hente vagttyper",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagttyper skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeCinemaId, showArchived]);

  const fetchPayrollTypes = useCallback(async () => {
    try {
      const response = await apiFetch(
        appendCinemaId("/payroll-types", activeCinemaId),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente lønarter"),
        );
      }

      const data = await response.json();

      setPayrollTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      setPayrollTypes([]);

      infoDialog.showError(
        "Kunne ikke hente lønarter",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da lønarter skulle hentes. Prøv igen.",
      );
    }
  }, [activeCinemaId]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (needsMasterCinemaSelection) {
      setWorkTypes([]);
      setPayrollTypes([]);
      setLoading(false);
      return;
    }

    fetchWorkTypes();
    fetchPayrollTypes();
  }, [
    currentUser,
    fetchPayrollTypes,
    fetchWorkTypes,
    needsMasterCinemaSelection,
  ]);

  return {
    currentUser,
    activeCinemaId,
    needsMasterCinemaSelection,
    workTypes,
    payrollTypes,
    loading,
    isMaster,
    showArchived,
    setShowArchived,
    fetchWorkTypes,
  };
}
