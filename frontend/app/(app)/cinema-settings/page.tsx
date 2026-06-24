"use client";

import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

import CinemaSettingsBrandingSection from "./components/CinemaSettingsBrandingSection";
import CinemaSettingsFeatureTogglesSection from "./components/CinemaSettingsFeatureTogglesSection";
import CinemaSettingsPayrollPeriodSection from "./components/CinemaSettingsPayrollPeriodSection";
import CinemaSettingsPayrollRulesSection from "./components/CinemaSettingsPayrollRulesSection";
import {
  CINEMA_DEFAULTS,
  MASTER_SELECTED_CINEMA_ID_KEY,
} from "./helpers/cinemaSettingsTypes";
import type { Cinema, CurrentUser } from "./helpers/cinemaSettingsTypes";
import {
  calculatePeriodExample,
  readErrorMessage,
  syncMasterSelectedCinemaStorage,
} from "./helpers/cinemaSettingsHelpers";

export default function CinemaSettingsPage() {
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

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-gray-100 p-4 dark:bg-gray-950 md:p-8">
          <div className="mx-auto max-w-4xl text-gray-900 dark:text-gray-100">
            Indlæser...
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!cinema) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-gray-100 p-4 dark:bg-gray-950 md:p-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-900 shadow-sm dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100">
            <div className="font-semibold">Biograf skal vælges</div>
            <p className="mt-2 text-sm">
              MASTER-brugere skal først vælge en biograf i MASTER-panelet.
            </p>
            <a
              href="/master"
              className="mt-4 inline-flex rounded-xl bg-yellow-700 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-800"
            >
              Gå til MASTER-panel
            </a>
          </div>
        </main>

        <InfoModal
          open={infoDialog.open}
          title={infoDialog.title}
          description={infoDialog.description}
          buttonText={infoDialog.buttonText}
          variant={infoDialog.variant}
          onClose={infoDialog.close}
        />
      </AdminGuard>
    );
  }

  const periodExample = calculatePeriodExample(cinema);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h1 className="text-3xl font-bold">Biograf indstillinger</h1>

            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Administrer funktioner og regler for hele biografen.
            </p>

            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {cinema.name}
            </p>
          </div>

          <CinemaSettingsBrandingSection
            cinema={cinema}
            saving={saving}
            uploadCinemaLogo={uploadCinemaLogo}
            removeCinemaLogo={removeCinemaLogo}
          />

          <CinemaSettingsFeatureTogglesSection
            cinema={cinema}
            saving={saving}
            updateCinemaSettings={updateCinemaSettings}
          />

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-6 text-2xl font-bold">
              Lønregler & timeregistrering
            </h2>

            <CinemaSettingsPayrollRulesSection
              cinema={cinema}
              saving={saving}
              setCinema={setCinema}
              updateCinemaSettings={updateCinemaSettings}
            />

            <CinemaSettingsPayrollPeriodSection
              cinema={cinema}
              periodExample={periodExample}
              setCinema={setCinema}
              updateCinemaSettings={updateCinemaSettings}
            />

            {message && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                {message}
              </div>
            )}
          </section>
        </div>
      </main>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </AdminGuard>
  );
}
