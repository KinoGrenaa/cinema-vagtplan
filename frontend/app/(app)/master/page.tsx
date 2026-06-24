"use client";

import { useEffect, useMemo, useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import MasterCinemasListSection from "./components/MasterCinemasListSection";
import MasterCreateCinemaSection from "./components/MasterCreateCinemaSection";
import MasterHeader from "./components/MasterHeader";
import MasterSummaryCards from "./components/MasterSummaryCards";
import {
  MASTER_SELECTED_CINEMA_ID_KEY,
  MASTER_SELECTED_CINEMA_LOGO_URL_KEY,
  MASTER_SELECTED_CINEMA_NAME_KEY,
  notifyMasterSelectedCinemaChanged,
  readErrorMessage,
  sortCinemas,
} from "./helpers/masterHelpers";
import type { Cinema, CurrentUser } from "./helpers/masterTypes";

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

    if (cinema.logoUrl) {
      localStorage.setItem(MASTER_SELECTED_CINEMA_LOGO_URL_KEY, cinema.logoUrl);
    } else {
      localStorage.removeItem(MASTER_SELECTED_CINEMA_LOGO_URL_KEY);
    }

    setSelectedCinemaId(cinema.id);
    notifyMasterSelectedCinemaChanged();
    setMessage(`${cinema.name} er valgt som aktiv biograf for MASTER-panelet.`);
  }

  function clearSelectedCinema() {
    localStorage.removeItem(MASTER_SELECTED_CINEMA_ID_KEY);
    localStorage.removeItem(MASTER_SELECTED_CINEMA_NAME_KEY);
    localStorage.removeItem(MASTER_SELECTED_CINEMA_LOGO_URL_KEY);
    setSelectedCinemaId(null);
    notifyMasterSelectedCinemaChanged();
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

        if (updatedCinema.logoUrl) {
          localStorage.setItem(
            MASTER_SELECTED_CINEMA_LOGO_URL_KEY,
            updatedCinema.logoUrl,
          );
        } else {
          localStorage.removeItem(MASTER_SELECTED_CINEMA_LOGO_URL_KEY);
        }

        notifyMasterSelectedCinemaChanged();
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
        <MasterHeader onRefresh={fetchCinemas} />

        <MasterSummaryCards cinemas={cinemas} selectedCinema={selectedCinema} />

        <MasterCreateCinemaSection
          newCinemaName={newCinemaName}
          creating={creating}
          onNewCinemaNameChange={setNewCinemaName}
          onCreateCinema={createCinema}
        />

        {message && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
            {message}
          </div>
        )}

        <MasterCinemasListSection
          cinemas={cinemas}
          selectedCinemaId={selectedCinemaId}
          editingCinemaId={editingCinemaId}
          editingCinemaName={editingCinemaName}
          savingCinemaId={savingCinemaId}
          onEditingCinemaNameChange={setEditingCinemaName}
          onSaveSelectedCinema={saveSelectedCinema}
          onStartEditingCinema={startEditingCinema}
          onCancelEditingCinema={cancelEditingCinema}
          onSaveCinemaName={saveCinemaName}
        />
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
