"use client";

import { useState } from "react";
import type {
  Dispatch,
  SetStateAction,
} from "react";

import { apiFetch } from "@/app/lib/api";

import {
  MASTER_SELECTED_CINEMA_LOGO_URL_KEY,
  MASTER_SELECTED_CINEMA_NAME_KEY,
  notifyMasterSelectedCinemaChanged,
  readErrorMessage,
  sortCinemas,
} from "../../helpers/core/masterHelpers";
import type { Cinema } from "../../helpers/core/masterTypes";

type UseMasterCinemaActionsOptions = {
  saveSelectedCinema: (cinema: Cinema) => void;
  selectedCinemaId: number | null;
  setCinemas: Dispatch<SetStateAction<Cinema[]>>;
  setMessage: Dispatch<SetStateAction<string>>;
  showError: (title: string, description: string) => void;
};

export function useMasterCinemaActions({
  saveSelectedCinema,
  selectedCinemaId,
  setCinemas,
  setMessage,
  showError,
}: UseMasterCinemaActionsOptions) {
  const [creating, setCreating] = useState(false);
  const [savingCinemaId, setSavingCinemaId] = useState<number | null>(null);
  const [newCinemaName, setNewCinemaName] = useState("");
  const [editingCinemaId, setEditingCinemaId] = useState<number | null>(null);
  const [editingCinemaName, setEditingCinemaName] = useState("");

  async function createCinema() {
    const name = newCinemaName.trim();

    if (!name) {
      showError("Biograf kunne ikke oprettes", "Biografnavn mangler.");
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
      showError(
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
      showError("Biograf kunne ikke gemmes", "Biografnavn mangler.");
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
      showError(
        "Biograf kunne ikke gemmes",
        error instanceof Error ? error.message : "Kunne ikke gemme biograf.",
      );
    } finally {
      setSavingCinemaId(null);
    }
  }

  return {
    cancelEditingCinema,
    createCinema,
    creating,
    editingCinemaId,
    editingCinemaName,
    newCinemaName,
    saveCinemaName,
    savingCinemaId,
    setEditingCinemaName,
    setNewCinemaName,
    startEditingCinema,
  };
}
