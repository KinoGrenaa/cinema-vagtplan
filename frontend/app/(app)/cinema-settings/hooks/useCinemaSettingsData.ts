import { useCallback, useEffect, useState } from "react";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

import {
  CINEMA_DEFAULTS,
  MASTER_SELECTED_CINEMA_ID_KEY,
} from "../helpers/cinemaSettingsTypes";
import type { Cinema, CurrentUser } from "../helpers/cinemaSettingsTypes";
import {
  readErrorMessage,
  syncMasterSelectedCinemaStorage,
} from "../helpers/cinemaSettingsHelpers";

export function useCinemaSettingsData() {
  const infoDialog = useInfoModal();

  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchCinema = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        setCinema(null);
        return;
      }

      const user: CurrentUser = JSON.parse(savedUser);
      const savedMasterCinemaId = Number(
        localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
      );

      const cinemaId =
        user.role === "MASTER" &&
        !user.cinemaId &&
        Number.isInteger(savedMasterCinemaId) &&
        savedMasterCinemaId > 0
          ? savedMasterCinemaId
          : user.cinemaId;

      if (!cinemaId) {
        setCinema(null);
        infoDialog.showError(
          "Biograf skal vælges",
          user.role === "MASTER"
            ? "Gå til MASTER-panelet og vælg hvilken biograf du vil administrere."
            : "Din bruger er ikke tilknyttet en biograf. Kontakt en administrator.",
        );
        return;
      }

      const response = await apiFetch(`/cinemas/${cinemaId}`);

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke hente biografindstillinger.",
          ),
        );
      }

      const data = await response.json();

      const nextCinema = {
        ...CINEMA_DEFAULTS,
        ...data,
      };

      setCinema(nextCinema);
      syncMasterSelectedCinemaStorage(nextCinema);
    } catch (error) {
      const description =
        error instanceof Error
          ? error.message
          : "Kunne ikke hente biografindstillinger.";

      setMessage("");
      setCinema(null);
      infoDialog.showError("Indstillinger kunne ikke hentes", description);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCinema();
  }, [fetchCinema]);

  async function updateCinemaSettings(updatedCinema: Cinema) {
    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(`/cinemas/${updatedCinema.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          allowShiftTradePool: updatedCinema.allowShiftTradePool,
          allowShiftTradeDirect: updatedCinema.allowShiftTradeDirect,
          aiEnabled: updatedCinema.aiEnabled,

          payrollRulesEnabled: updatedCinema.payrollRulesEnabled,

          clockInDeviationToleranceMinutes:
            updatedCinema.clockInDeviationToleranceMinutes,

          clockOutDeviationToleranceMinutes:
            updatedCinema.clockOutDeviationToleranceMinutes,

          requireNoteForClockInDeviation:
            updatedCinema.requireNoteForClockInDeviation,

          requireNoteForClockOutDeviation:
            updatedCinema.requireNoteForClockOutDeviation,

          requireNoteForManualEntry: updatedCinema.requireNoteForManualEntry,
          payrollOvertimeEnabled: updatedCinema.payrollOvertimeEnabled,
          plannedOvertimeEnabled: updatedCinema.plannedOvertimeEnabled,
          dailyOvertimeEnabled: updatedCinema.dailyOvertimeEnabled,
          weeklyOvertimeEnabled: updatedCinema.weeklyOvertimeEnabled,
          dailyOvertimeThreshold: updatedCinema.dailyOvertimeThreshold,
          weeklyOvertimeThreshold: updatedCinema.weeklyOvertimeThreshold,

          payrollPeriodModel: updatedCinema.payrollPeriodModel,
          payrollPeriodStartDay: updatedCinema.payrollPeriodStartDay,
          payrollPeriodEndDay: updatedCinema.payrollPeriodEndDay,
          payrollPeriodAnchorDate: updatedCinema.payrollPeriodAnchorDate,
          payrollPayoutRule: updatedCinema.payrollPayoutRule,
          payrollPayoutDay: updatedCinema.payrollPayoutDay,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke gemme indstillinger."),
        );
      }

      const savedCinema = await response.json();

      const nextCinema = {
        ...CINEMA_DEFAULTS,
        ...savedCinema,
      };

      setCinema(nextCinema);
      syncMasterSelectedCinemaStorage(nextCinema);

      setMessage("Biografindstillinger gemt.");
    } catch (error) {
      const description =
        error instanceof Error
          ? error.message
          : "Kunne ikke gemme indstillinger.";

      setMessage("");
      infoDialog.showError("Indstillinger kunne ikke gemmes", description);
    } finally {
      setSaving(false);
    }
  }

  async function uploadCinemaLogo(file: File | null) {
    if (!cinema || !file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      infoDialog.showError(
        "Logo kunne ikke uploades",
        "Kun JPG, PNG og WEBP er tilladt.",
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      infoDialog.showError(
        "Logo kunne ikke uploades",
        "Logoet må højst være 2 MB.",
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await apiFetch(`/cinemas/${cinema.id}/logo`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke uploade logo."),
        );
      }

      const savedCinema = await response.json();
      const nextCinema = {
        ...CINEMA_DEFAULTS,
        ...savedCinema,
      };

      setCinema(nextCinema);
      syncMasterSelectedCinemaStorage(nextCinema);
      setMessage("Logo gemt.");
    } catch (error) {
      infoDialog.showError(
        "Logo kunne ikke uploades",
        error instanceof Error ? error.message : "Kunne ikke uploade logo.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeCinemaLogo() {
    if (!cinema) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await apiFetch(`/cinemas/${cinema.id}/logo`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke fjerne logo."),
        );
      }

      const savedCinema = await response.json();
      const nextCinema = {
        ...CINEMA_DEFAULTS,
        ...savedCinema,
      };

      setCinema(nextCinema);
      syncMasterSelectedCinemaStorage(nextCinema);
      setMessage("Logo fjernet.");
    } catch (error) {
      infoDialog.showError(
        "Logo kunne ikke fjernes",
        error instanceof Error ? error.message : "Kunne ikke fjerne logo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    cinema,
    setCinema,
    loading,
    saving,
    message,
    infoDialog,
    updateCinemaSettings,
    uploadCinemaLogo,
    removeCinemaLogo,
  };
}
