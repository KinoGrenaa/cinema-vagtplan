"use client";

import { useEffect, useMemo, useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

type CurrentUser = {
  id?: number;
  sub?: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

type Cinema = {
  id: number;
  name: string;
  createdAt?: string;
  _count?: {
    users?: number;
    shifts?: number;
    workTypes?: number;
  };
};

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";
const MASTER_SELECTED_CINEMA_NAME_KEY = "masterSelectedCinemaName";

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }

    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {}

  return fallback;
}

function formatDateDK(value?: string) {
  if (!value) return "Ukendt";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Ukendt";

  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function sortCinemas(cinemas: Cinema[]) {
  return [...cinemas].sort((a, b) => a.name.localeCompare(b.name, "da"));
}

export default function MasterPage() {
  const infoDialog = useInfoModal();
  const [checkedAccess, setCheckedAccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingCinemaId, setSavingCinemaId] = useState<number | null>(null);
  const [newCinemaName, setNewCinemaName] = useState("");
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
  const [editingCinemaId, setEditingCinemaId] = useState<number | null>(null);
  const [editingCinemaName, setEditingCinemaName] = useState("");
  const [message, setMessage] = useState("");

  const selectedCinema = useMemo(
    () => cinemas.find((cinema) => cinema.id === selectedCinemaId) || null,
    [cinemas, selectedCinemaId],
  );

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      setCurrentUser(null);
      setCheckedAccess(true);
      setLoading(false);
      return;
    }

    try {
      const user = JSON.parse(savedUser) as CurrentUser;
      setCurrentUser(user);

      const savedCinemaId = Number(
        localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
      );

      if (Number.isInteger(savedCinemaId) && savedCinemaId > 0) {
        setSelectedCinemaId(savedCinemaId);
      }

      setCheckedAccess(true);

      if (user.role === "MASTER") {
        fetchCinemas();
      } else {
        setLoading(false);
      }
    } catch {
      setCurrentUser(null);
      setCheckedAccess(true);
      setLoading(false);
    }
  }, []);

  async function fetchCinemas() {
    try {
      setLoading(true);
      setMessage("");

      const response = await apiFetch("/cinemas");

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente biografer."),
        );
      }

      const data = (await response.json()) as Cinema[];
      const nextCinemas = sortCinemas(Array.isArray(data) ? data : []);
      setCinemas(nextCinemas);

      const savedCinemaId = Number(
        localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
      );

      if (
        Number.isInteger(savedCinemaId) &&
        savedCinemaId > 0 &&
        !nextCinemas.some((cinema) => cinema.id === savedCinemaId)
      ) {
        clearSelectedCinema();
      }
    } catch (error) {
      setCinemas([]);
      infoDialog.showError(
        "Biografer kunne ikke hentes",
        error instanceof Error ? error.message : "Kunne ikke hente biografer.",
      );
    } finally {
      setLoading(false);
    }
  }

  function saveSelectedCinema(cinema: Cinema) {
    localStorage.setItem(MASTER_SELECTED_CINEMA_ID_KEY, String(cinema.id));
    localStorage.setItem(MASTER_SELECTED_CINEMA_NAME_KEY, cinema.name);
    setSelectedCinemaId(cinema.id);
    setMessage(`${cinema.name} er valgt som aktiv biograf for MASTER-panelet.`);
  }

  function clearSelectedCinema() {
    localStorage.removeItem(MASTER_SELECTED_CINEMA_ID_KEY);
    localStorage.removeItem(MASTER_SELECTED_CINEMA_NAME_KEY);
    setSelectedCinemaId(null);
  }

  async function createCinema() {
    const name = newCinemaName.trim();

    if (!name) {
      infoDialog.showError(
        "Biograf kunne ikke oprettes",
        "Biografnavn mangler.",
      );
      return;
    }

    try {
      setCreating(true);
      setMessage("");

      const response = await apiFetch("/cinemas", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke oprette biograf."),
        );
      }

      const createdCinema = (await response.json()) as Cinema;
      setCinemas((current) => sortCinemas([...current, createdCinema]));
      setNewCinemaName("");
      saveSelectedCinema(createdCinema);
      setMessage(`${createdCinema.name} er oprettet og valgt.`);
    } catch (error) {
      infoDialog.showError(
        "Biograf kunne ikke oprettes",
        error instanceof Error ? error.message : "Kunne ikke oprette biograf.",
      );
    } finally {
      setCreating(false);
    }
  }

  function startEditingCinema(cinema: Cinema) {
    setEditingCinemaId(cinema.id);
    setEditingCinemaName(cinema.name);
  }

  function cancelEditingCinema() {
    setEditingCinemaId(null);
    setEditingCinemaName("");
  }

  async function saveCinemaName(cinema: Cinema) {
    const name = editingCinemaName.trim();

    if (!name) {
      infoDialog.showError("Biograf kunne ikke gemmes", "Biografnavn mangler.");
      return;
    }

    try {
      setSavingCinemaId(cinema.id);
      setMessage("");

      const response = await apiFetch(`/cinemas/${cinema.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke gemme biograf."),
        );
      }

      const updatedCinema = (await response.json()) as Cinema;

      setCinemas((current) =>
        sortCinemas(
          current.map((item) =>
            item.id === updatedCinema.id
              ? {
                  ...item,
                  ...updatedCinema,
                  _count: item._count,
                }
              : item,
          ),
        ),
      );

      if (selectedCinemaId === updatedCinema.id) {
        localStorage.setItem(
          MASTER_SELECTED_CINEMA_NAME_KEY,
          updatedCinema.name,
        );
      }

      cancelEditingCinema();
      setMessage(`${updatedCinema.name} er gemt.`);
    } catch (error) {
      infoDialog.showError(
        "Biograf kunne ikke gemmes",
        error instanceof Error ? error.message : "Kunne ikke gemme biograf.",
      );
    } finally {
      setSavingCinemaId(null);
    }
  }

  if (!checkedAccess || loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          Indlæser MASTER-panel...
        </div>
      </main>
    );
  }

  if (!currentUser || currentUser.role !== "MASTER") {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <h1 className="text-2xl font-bold">Ingen adgang</h1>
          <p className="mt-2">Denne side er kun for globale MASTER-brugere.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
                Global administration
              </p>
              <h1 className="mt-1 text-3xl font-bold">MASTER-panel</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
                Administrer biografer på tværs af systemet. MASTER-brugeren er
                stadig global og bliver ikke bundet til en fast biograf.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchCinemas}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              Opdater liste
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Biografer
            </div>
            <div className="mt-2 text-3xl font-bold">{cinemas.length}</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Valgt biograf
            </div>
            <div className="mt-2 text-xl font-bold">
              {selectedCinema ? selectedCinema.name : "Ingen valgt"}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Valget gemmes lokalt i denne browser.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold">Opret biograf</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Opretter en ny biograf med standardindstillinger. Admins og
            medarbejdere kan tilknyttes senere.
          </p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              value={newCinemaName}
              onChange={(event) => setNewCinemaName(event.target.value)}
              placeholder="Biografnavn"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
            />
            <button
              type="button"
              onClick={createCinema}
              disabled={creating}
              className="rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Opretter..." : "Opret biograf"}
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
            {message}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-6 dark:border-gray-800">
            <h2 className="text-xl font-bold">Biografer</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Vælg hvilken biograf MASTER-panelet skal arbejde videre med.
            </p>
          </div>

          {cinemas.length === 0 ? (
            <div className="p-6 text-sm text-gray-600 dark:text-gray-400">
              Der er ingen biografer endnu.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {cinemas.map((cinema) => {
                const isSelected = selectedCinemaId === cinema.id;
                const isEditing = editingCinemaId === cinema.id;

                return (
                  <div
                    key={cinema.id}
                    className={`p-6 ${
                      isSelected
                        ? "bg-purple-50 dark:bg-purple-950/20"
                        : "bg-white dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex flex-col gap-3 md:flex-row">
                            <input
                              value={editingCinemaName}
                              onChange={(event) =>
                                setEditingCinemaName(event.target.value)
                              }
                              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                            />
                            <button
                              type="button"
                              onClick={() => saveCinemaName(cinema)}
                              disabled={savingCinemaId === cinema.id}
                              className="rounded-xl bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Gem
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingCinema}
                              disabled={savingCinemaId === cinema.id}
                              className="rounded-xl border border-gray-300 px-4 py-3 font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                            >
                              Annuller
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold">
                                {cinema.name}
                              </h3>
                              {isSelected && (
                                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                                  Valgt
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                              <span>ID: {cinema.id}</span>
                              <span>
                                Oprettet: {formatDateDK(cinema.createdAt)}
                              </span>
                              <span>Brugere: {cinema._count?.users ?? 0}</span>
                              <span>Vagter: {cinema._count?.shifts ?? 0}</span>
                              <span>
                                Jobfunktioner: {cinema._count?.workTypes ?? 0}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => saveSelectedCinema(cinema)}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                              isSelected
                                ? "bg-purple-700 text-white hover:bg-purple-800"
                                : "border border-purple-300 bg-white text-purple-800 hover:bg-purple-50 dark:border-purple-800 dark:bg-gray-950 dark:text-purple-200 dark:hover:bg-purple-950/40"
                            }`}
                          >
                            {isSelected ? "Valgt" : "Vælg"}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditingCinema(cinema)}
                            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
                          >
                            Rediger navn
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </main>
  );
}
