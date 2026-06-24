"use client";

import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

import {
  CINEMA_DEFAULTS,
  MASTER_SELECTED_CINEMA_ID_KEY,
} from "./helpers/cinemaSettingsTypes";
import type { Cinema, CurrentUser } from "./helpers/cinemaSettingsTypes";
import {
  calculatePeriodExample,
  clampDay,
  getLogoSrc,
  readErrorMessage,
  syncMasterSelectedCinemaStorage,
  toIsoDate,
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

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-2xl font-bold">Branding</h2>

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Upload biografens logo. Logoet vises for MASTER, når biografen er
              valgt som aktiv biograf.
            </p>

            <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
                {cinema.logoUrl ? (
                  <img
                    src={getLogoSrc(cinema.logoUrl)}
                    alt={`${cinema.name} logo`}
                    className="h-full w-full object-contain p-3"
                  />
                ) : (
                  <span className="px-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    Intet logo
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <label className="inline-flex cursor-pointer rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800">
                  Upload logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={saving}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      uploadCinemaLogo(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>

                {cinema.logoUrl ? (
                  <button
                    type="button"
                    onClick={removeCinemaLogo}
                    disabled={saving}
                    className="ml-0 inline-flex rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40 md:ml-3"
                  >
                    Fjern logo
                  </button>
                ) : null}

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tilladte filtyper: JPG, PNG og WEBP. Maks. 2 MB.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-6 text-2xl font-bold">Vagtbytte-funktioner</h2>

            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div>
                  <div className="font-semibold">Tillad vagtpulje</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Medarbejdere kan sende vagter ud i den åbne vagtpulje.
                  </div>
                </div>

                <button
                  onClick={() =>
                    updateCinemaSettings({
                      ...cinema,
                      allowShiftTradePool: !cinema.allowShiftTradePool,
                    })
                  }
                  disabled={saving}
                  className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    cinema.allowShiftTradePool
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  {cinema.allowShiftTradePool ? "Aktiveret" : "Deaktiveret"}
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div>
                  <div className="font-semibold">Tillad direkte vagtbytter</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Medarbejdere kan tilbyde vagter direkte til specifikke
                    brugere.
                  </div>
                </div>

                <button
                  onClick={() =>
                    updateCinemaSettings({
                      ...cinema,
                      allowShiftTradeDirect: !cinema.allowShiftTradeDirect,
                    })
                  }
                  disabled={saving}
                  className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    cinema.allowShiftTradeDirect
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  {cinema.allowShiftTradeDirect ? "Aktiveret" : "Deaktiveret"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-6 text-2xl font-bold">AI-funktioner</h2>

            <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div>
                <div className="font-semibold">Aktivér AI</div>

                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Aktiverer AI-dashboard, AI-analyser og fremtidige
                  AI-funktioner for denne biograf.
                </div>
              </div>

              <button
                onClick={() =>
                  updateCinemaSettings({
                    ...cinema,
                    aiEnabled: !cinema.aiEnabled,
                  })
                }
                disabled={saving}
                className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  cinema.aiEnabled
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                {cinema.aiEnabled ? "Aktiveret" : "Deaktiveret"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-6 text-2xl font-bold">
              Lønregler & timeregistrering
            </h2>

            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div>
                  <div className="font-semibold">Brug avancerede lønregler</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Splitter automatisk timer i weekend, aften og nat.
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <h3 className="mb-4 text-lg font-semibold">
                    Afvigelsestolerance
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Mødetid (minutter)
                      </label>

                      <input
                        type="number"
                        min={0}
                        value={cinema.clockInDeviationToleranceMinutes ?? 0}
                        onChange={(e) =>
                          setCinema((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  clockInDeviationToleranceMinutes: Number(
                                    e.target.value,
                                  ),
                                }
                              : prev,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Fyraften (minutter)
                      </label>

                      <input
                        type="number"
                        min={0}
                        value={cinema.clockOutDeviationToleranceMinutes ?? 0}
                        onChange={(e) =>
                          setCinema((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  clockOutDeviationToleranceMinutes: Number(
                                    e.target.value,
                                  ),
                                }
                              : prev,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                      />
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Afvigelser mindre end tolerancen ignoreres.
                  </div>
                </div>

                <button
                  onClick={() =>
                    updateCinemaSettings({
                      ...cinema,
                      payrollRulesEnabled: !cinema.payrollRulesEnabled,
                    })
                  }
                  disabled={saving}
                  className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    cinema.payrollRulesEnabled
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  {cinema.payrollRulesEnabled ? "Aktiveret" : "Deaktiveret"}
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div>
                  <div className="font-semibold">Brug overarbejdsregler</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Aktiverer overtime regler i løneksport.
                  </div>
                </div>

                <button
                  onClick={() =>
                    updateCinemaSettings({
                      ...cinema,
                      payrollOvertimeEnabled: !cinema.payrollOvertimeEnabled,
                    })
                  }
                  disabled={saving}
                  className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    cinema.payrollOvertimeEnabled
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  {cinema.payrollOvertimeEnabled ? "Aktiveret" : "Deaktiveret"}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="font-semibold">Planned overtime</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Over planlagt vagt.
                  </div>

                  <input
                    type="checkbox"
                    checked={cinema.plannedOvertimeEnabled}
                    onChange={(event) =>
                      updateCinemaSettings({
                        ...cinema,
                        plannedOvertimeEnabled: event.target.checked,
                      })
                    }
                    className="mt-4 h-5 w-5"
                  />
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="font-semibold">Daily overtime</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Mere end X timer pr dag.
                  </div>

                  <input
                    type="checkbox"
                    checked={cinema.dailyOvertimeEnabled}
                    onChange={(event) =>
                      updateCinemaSettings({
                        ...cinema,
                        dailyOvertimeEnabled: event.target.checked,
                      })
                    }
                    className="mt-4 h-5 w-5"
                  />
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="font-semibold">Weekly overtime</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Mere end X timer pr uge.
                  </div>

                  <input
                    type="checkbox"
                    checked={cinema.weeklyOvertimeEnabled}
                    onChange={(event) =>
                      updateCinemaSettings({
                        ...cinema,
                        weeklyOvertimeEnabled: event.target.checked,
                      })
                    }
                    className="mt-4 h-5 w-5"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="font-semibold">Daglig overtime grænse</div>

                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={cinema.dailyOvertimeThreshold}
                    onChange={(event) =>
                      setCinema({
                        ...cinema,
                        dailyOvertimeThreshold: Number(event.target.value),
                      })
                    }
                    onBlur={() => updateCinemaSettings(cinema)}
                    className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="font-semibold">Ugentlig overtime grænse</div>

                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={cinema.weeklyOvertimeThreshold}
                    onChange={(event) =>
                      setCinema({
                        ...cinema,
                        weeklyOvertimeThreshold: Number(event.target.value),
                      })
                    }
                    onBlur={() => updateCinemaSettings(cinema)}
                    className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h3 className="text-lg font-bold">Lønperiode</h3>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Vælg hvordan biografens lønperioder beregnes. Indstillingen
                bruges senere på /my-time og /payroll.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <input
                    type="radio"
                    name="payrollPeriodModel"
                    checked={cinema.payrollPeriodModel === "CALENDAR_MONTH"}
                    onChange={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPeriodModel: "CALENDAR_MONTH",
                        payrollPeriodStartDay: 1,
                        payrollPeriodEndDay: 31,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="font-semibold">Kalendermåned</span>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Perioden følger månedens første og sidste dag.
                  </div>
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <input
                    type="radio"
                    name="payrollPeriodModel"
                    checked={cinema.payrollPeriodModel === "FIXED_DAY_TO_DAY"}
                    onChange={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPeriodModel: "FIXED_DAY_TO_DAY",
                        payrollPeriodStartDay:
                          cinema.payrollPeriodStartDay || 21,
                        payrollPeriodEndDay: cinema.payrollPeriodEndDay || 20,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="font-semibold">Fast lønperiode</span>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Vælg selv hvilken dag perioden starter og slutter.
                  </div>
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <input
                    type="radio"
                    name="payrollPeriodModel"
                    checked={cinema.payrollPeriodModel === "BIWEEKLY"}
                    onChange={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPeriodModel: "BIWEEKLY",
                        payrollPeriodAnchorDate:
                          cinema.payrollPeriodAnchorDate ||
                          toIsoDate(new Date()),
                      })
                    }
                    className="mr-2"
                  />
                  <span className="font-semibold">14-dages løn</span>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Perioder beregnes i 14-dages intervaller fra en anchor-dato.
                  </div>
                </label>
              </div>

              {cinema.payrollPeriodModel === "FIXED_DAY_TO_DAY" && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label>
                    <div className="font-semibold">Fra dag</div>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={cinema.payrollPeriodStartDay}
                      onChange={(event) =>
                        setCinema({
                          ...cinema,
                          payrollPeriodStartDay: Number(event.target.value),
                        })
                      }
                      onBlur={() =>
                        updateCinemaSettings({
                          ...cinema,
                          payrollPeriodStartDay: clampDay(
                            cinema.payrollPeriodStartDay,
                          ),
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                    />
                  </label>

                  <label>
                    <div className="font-semibold">Til dag</div>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={cinema.payrollPeriodEndDay}
                      onChange={(event) =>
                        setCinema({
                          ...cinema,
                          payrollPeriodEndDay: Number(event.target.value),
                        })
                      }
                      onBlur={() =>
                        updateCinemaSettings({
                          ...cinema,
                          payrollPeriodEndDay: clampDay(
                            cinema.payrollPeriodEndDay,
                          ),
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                    />
                  </label>
                </div>
              )}

              {cinema.payrollPeriodModel === "BIWEEKLY" && (
                <label className="mt-5 block">
                  <div className="font-semibold">Anchor-dato</div>
                  <input
                    type="date"
                    value={cinema.payrollPeriodAnchorDate || ""}
                    onChange={(event) =>
                      setCinema({
                        ...cinema,
                        payrollPeriodAnchorDate: event.target.value || null,
                      })
                    }
                    onBlur={() => updateCinemaSettings(cinema)}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950 md:w-auto"
                  />
                </label>
              )}

              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                <div className="font-semibold">Periodeeksempel</div>
                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {periodExample.text}
                </div>

                {periodExample.warning && (
                  <div className="mt-3 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
                    ⚠️ {periodExample.warning}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h3 className="text-lg font-bold">Udbetaling</h3>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Vælg hvordan udbetalingsdatoen beregnes.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <input
                    type="radio"
                    name="payrollPayoutRule"
                    checked={
                      cinema.payrollPayoutRule === "LAST_WEEKDAY_OF_MONTH"
                    }
                    onChange={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPayoutRule: "LAST_WEEKDAY_OF_MONTH",
                        payrollPayoutDay: 0,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="font-semibold">
                    Sidste hverdag i måneden
                  </span>
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <input
                    type="radio"
                    name="payrollPayoutRule"
                    checked={cinema.payrollPayoutRule === "FIXED_DAY_OF_MONTH"}
                    onChange={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPayoutRule: "FIXED_DAY_OF_MONTH",
                        payrollPayoutDay: cinema.payrollPayoutDay || 31,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="font-semibold">Fast dato i måneden</span>
                </label>
              </div>

              {cinema.payrollPayoutRule === "FIXED_DAY_OF_MONTH" && (
                <label className="mt-5 block md:w-64">
                  <div className="font-semibold">Udbetalingsdag</div>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={cinema.payrollPayoutDay || 31}
                    onChange={(event) =>
                      setCinema({
                        ...cinema,
                        payrollPayoutDay: Number(event.target.value),
                      })
                    }
                    onBlur={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPayoutDay: clampDay(cinema.payrollPayoutDay),
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>
              )}
            </div>

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
