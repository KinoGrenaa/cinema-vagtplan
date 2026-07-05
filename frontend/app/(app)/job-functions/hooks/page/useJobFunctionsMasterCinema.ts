import { useEffect, useMemo, useState } from "react";

import {
  getCurrentUserFromToken,
  getSelectedMasterCinemaId,
} from "../../helpers/page/jobFunctionHelpers";
import type { CurrentUser } from "../../helpers/types/jobFunctionTypes";

export function useJobFunctionsMasterCinema() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);

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

  const activeCinemaId = useMemo(() => {
    if (currentUser?.role === "MASTER" && !currentUser.cinemaId) {
      return selectedMasterCinemaId;
    }

    return currentUser?.cinemaId ?? null;
  }, [currentUser, selectedMasterCinemaId]);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" && !currentUser.cinemaId && !activeCinemaId;

  return {
    activeCinemaId,
    currentUser,
    needsMasterCinemaSelection,
  };
}
