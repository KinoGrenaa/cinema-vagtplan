"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";

import { apiFetch } from "@/app/lib/api";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

type PayrollType = {
  id: number;
  name: string;
  payrollCode: string;
};

type WorkType = {
  id: number;
  name: string;
  color?: string | null;
  isActive: boolean;
  archivedAt?: string | null;
  payrollTypeId?: number | null;
  payrollType?: PayrollType | null;
};

type CurrentUser = {
  sub: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

function getCurrentUserFromToken(): CurrentUser | null {
  const token = localStorage.getItem("token");

  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));

    return decoded;
  } catch {
    return null;
  }
}

function getSelectedMasterCinemaId() {
  const selectedCinemaId = Number(
    localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
  );

  if (!Number.isFinite(selectedCinemaId) || selectedCinemaId <= 0) {
    return null;
  }

  return selectedCinemaId;
}

function appendCinemaId(path: string, cinemaId: number | null) {
  if (!cinemaId) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}cinemaId=${cinemaId}`;
}

async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (Array.isArray(data?.message)) {
    return data.message.join("\n");
  }

  return fallback;
}

export default function WorkTypesPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);

  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [payrollTypes, setPayrollTypes] = useState<PayrollType[]>([]);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [payrollTypeId, setPayrollTypeId] = useState("");

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
  }, [currentUser, activeCinemaId, needsMasterCinemaSelection, showArchived]);

  async function fetchWorkTypes() {
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
  }

  async function fetchPayrollTypes() {
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
  }

  async function createWorkType() {
    if (needsMasterCinemaSelection) {
      infoDialog.showError(
        "Biograf mangler",
        "Vælg først en biograf i MASTER-panelet, før du opretter vagttyper.",
      );
      return;
    }

    if (!name.trim()) {
      infoDialog.showError(
        "Navn mangler",
        "Indtast et navn på vagttypen, før du opretter den.",
      );
      return;
    }

    try {
      const response = await apiFetch("/work-types", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          color,
          payrollTypeId: payrollTypeId ? Number(payrollTypeId) : null,
          cinemaId: activeCinemaId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke oprette vagttype"),
        );
      }

      setName("");
      setColor("#2563eb");
      setPayrollTypeId("");

      await fetchWorkTypes();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke oprette vagttype",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagttypen skulle oprettes. Prøv igen.",
      );
    }
  }

  function removeWorkType(id: number) {
    confirmDialog.confirm({
      title: "Arkivér vagttype",
      description:
        "Er du sikker på, at du vil arkivere denne vagttype?\n\n" +
        "Historiske vagter, løndata og rapporter bevares.\n\n" +
        "Vagttypen kan genaktiveres senere.",
      confirmText: "Arkivér",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(`/work-types/${id}`, activeCinemaId),
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(response, "Kunne ikke arkivere vagttype"),
            );
          }

          await fetchWorkTypes();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke arkivere vagttype",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da vagttypen skulle arkiveres. Prøv igen.",
          );
        }
      },
    });
  }

  function reactivateWorkType(id: number) {
    confirmDialog.confirm({
      title: "Genaktivér vagttype",
      description:
        "Vil du genaktivere denne vagttype?\n\n" +
        "Vagttypen kan igen bruges ved oprettelse og redigering af vagter.",
      confirmText: "Genaktivér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(`/work-types/${id}/reactivate`, activeCinemaId),
            {
              method: "PATCH",
            },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Kunne ikke genaktivere vagttype",
              ),
            );
          }

          await fetchWorkTypes();
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke genaktivere vagttype",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da vagttypen skulle genaktiveres. Prøv igen.",
          );
        }
      },
    });
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-2xl bg-white p-6 text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100">
            <h1 className="text-3xl font-bold">Vagttyper</h1>

            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Administrer vagttyper og kobling til lønarter.
            </p>
          </section>

          {needsMasterCinemaSelection && (
            <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-900 shadow-sm dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100">
              <div className="text-sm font-medium uppercase tracking-wide">
                Biograf mangler
              </div>

              <p className="mt-2 text-sm">
                Vælg først en biograf i MASTER-panelet, før du administrerer
                vagttyper og lønarter.
              </p>

              <a
                href="/master"
                className="mt-4 inline-flex rounded-xl bg-yellow-700 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-800"
              >
                Gå til MASTER-panel
              </a>
            </section>
          )}

          <section className="rounded-2xl bg-white p-6 text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100">
            <h2 className="mb-4 text-2xl font-bold">Opret vagttype</h2>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="text"
                placeholder="Navn"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-xl border p-3 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                disabled={needsMasterCinemaSelection}
              />

              <label className="flex items-center gap-3 rounded-xl border p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <span>Farve</span>

                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  disabled={needsMasterCinemaSelection}
                />
              </label>

              <select
                value={payrollTypeId}
                onChange={(event) => setPayrollTypeId(event.target.value)}
                className="rounded-xl border p-3 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                disabled={needsMasterCinemaSelection}
              >
                <option value="">Ingen lønart</option>

                {payrollTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.payrollCode})
                  </option>
                ))}
              </select>

              <button
                onClick={createWorkType}
                className={`rounded-xl px-4 py-3 font-semibold text-white ${
                  needsMasterCinemaSelection
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-black hover:bg-gray-800"
                }`}
                disabled={needsMasterCinemaSelection}
              >
                Opret
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold">Eksisterende vagttyper</h2>

              {isMaster && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(event) => setShowArchived(event.target.checked)}
                    className="h-4 w-4"
                    disabled={needsMasterCinemaSelection}
                  />
                  Vis arkiverede typer
                </label>
              )}
            </div>

            {loading ? (
              <div className="text-gray-700 dark:text-gray-200">
                Indlæser...
              </div>
            ) : workTypes.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Ingen vagttyper endnu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm dark:text-gray-100">
                  <thead className="text-gray-500 dark:text-gray-400">
                    <tr className="border-b">
                      <th className="p-3">Farve</th>
                      <th className="p-3">Navn</th>
                      <th className="p-3">Løntype</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Handlinger</th>
                    </tr>
                  </thead>

                  <tbody>
                    {workTypes.map((workType) => (
                      <tr
                        key={workType.id}
                        className={`border-b dark:border-gray-700 ${
                          workType.isActive
                            ? ""
                            : "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        <td className="p-3">
                          <div
                            className="h-6 w-6 rounded-full border"
                            style={{
                              backgroundColor: workType.color || "#2563eb",
                            }}
                          />
                        </td>

                        <td className="p-3 font-semibold">{workType.name}</td>

                        <td className="p-3">
                          {workType.payrollType
                            ? `${workType.payrollType.name} (${workType.payrollType.payrollCode})`
                            : "-"}
                        </td>

                        <td className="p-3">
                          {workType.isActive ? (
                            <span className="font-semibold text-green-600">
                              Aktiv
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-500">
                              Arkiveret
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          {workType.isActive ? (
                            <button
                              onClick={() => removeWorkType(workType.id)}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Arkivér
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivateWorkType(workType.id)}
                              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              Genaktivér
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />

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
