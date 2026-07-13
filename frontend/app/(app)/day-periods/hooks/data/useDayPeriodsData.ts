"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import {
  appendCinemaId,
  getCurrentUserFromToken,
  getSelectedMasterCinemaId,
  readErrorMessage,
} from "../../helpers/core/dayPeriodHelpers";
import type {
  CurrentUser,
  DayPeriod,
} from "../../helpers/core/dayPeriodTypes";

type UseDayPeriodsDataOptions = {
  showError: (title: string, description: string) => void;
};

export function useDayPeriodsData({
  showError,
}: UseDayPeriodsDataOptions) {
  const showErrorRef = useRef(showError);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);
  const [dayPeriods, setDayPeriods] = useState<DayPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const activeCinemaId = useMemo(() => {
    if (currentUser?.role === "MASTER" && !currentUser.cinemaId) {
      return selectedMasterCinemaId;
    }

    return currentUser?.cinemaId ?? null;
  }, [currentUser, selectedMasterCinemaId]);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" && !currentUser.cinemaId && !activeCinemaId;

  const activeCount = dayPeriods.filter((dayPeriod) => dayPeriod.isActive).length;
  const archivedCount = dayPeriods.length - activeCount;

  useEffect(() => {
    setCurrentUser(getCurrentUserFromToken());

    const updateSelectedCinema = () => {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    };

    updateSelectedCinema();
    window.addEventListener("masterSelectedCinemaChanged", updateSelectedCinema);
    window.addEventListener("storage", updateSelectedCinema);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedCinema,
      );
      window.removeEventListener("storage", updateSelectedCinema);
    };
  }, []);

  const fetchDayPeriods = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch(
        appendCinemaId(
          `/day-periods?includeArchived=${showArchived}`,
          activeCinemaId,
        ),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente dagsperioder"),
        );
      }

      const data = await response.json();
      setDayPeriods(Array.isArray(data) ? data : []);
    } catch (error) {
      setDayPeriods([]);
      showErrorRef.current(
        "Kunne ikke hente dagsperioder",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da dagsperioder skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeCinemaId, showArchived]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (needsMasterCinemaSelection) {
      setDayPeriods([]);
      setLoading(false);
      return;
    }

    fetchDayPeriods();
  }, [currentUser, fetchDayPeriods, needsMasterCinemaSelection]);

  return {
    activeCinemaId,
    activeCount,
    archivedCount,
    dayPeriods,
    fetchDayPeriods,
    loading,
    needsMasterCinemaSelection,
    setShowArchived,
    showArchived,
  };
}
