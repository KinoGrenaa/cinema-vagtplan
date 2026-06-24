"use client";

import { useEffect, useMemo, useState } from "react";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import {
  MASTER_SELECTED_CINEMA_ID_KEY,
  MASTER_SELECTED_CINEMA_LOGO_URL_KEY,
  MASTER_SELECTED_CINEMA_NAME_KEY,
  notifyMasterSelectedCinemaChanged,
  readErrorMessage,
  sortCinemas,
} from "../helpers/masterHelpers";
import type { Cinema, CurrentUser } from "../helpers/masterTypes";

export function useMasterPanel() {
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

  return {
    infoDialog,
    checkedAccess,
    currentUser,
    cinemas,
    loading,
    creating,
    savingCinemaId,
    newCinemaName,
    selectedCinemaId,
    editingCinemaId,
    editingCinemaName,
    message,
    selectedCinema,
    fetchCinemas,
    saveSelectedCinema,
    createCinema,
    startEditingCinema,
    cancelEditingCinema,
    saveCinemaName,
    setNewCinemaName,
    setEditingCinemaName,
  };
}
