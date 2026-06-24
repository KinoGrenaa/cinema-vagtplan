import { useEffect, useState } from "react";

type PayrollUser = {
  role?: string | null;
  cinemaId?: number | string | null;
};

export function usePayrollMasterCinema(user?: PayrollUser | null) {
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    string | null
  >(null);

  useEffect(() => {
    function updateSelectedMasterCinema() {
      setSelectedMasterCinemaId(
        window.localStorage.getItem("masterSelectedCinemaId"),
      );
    }

    updateSelectedMasterCinema();

    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedMasterCinema,
    );
    window.addEventListener("storage", updateSelectedMasterCinema);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedMasterCinema,
      );
      window.removeEventListener("storage", updateSelectedMasterCinema);
    };
  }, []);

  const isMasterWithoutActiveCinema =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  return {
    isMasterWithoutActiveCinema,
  };
}
