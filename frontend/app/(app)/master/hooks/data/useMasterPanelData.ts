"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Dispatch,
  SetStateAction,
} from "react";

import { apiFetch } from "@/app/lib/api";

import {
  MASTER_SELECTED_CINEMA_ID_KEY,
  MASTER_SELECTED_CINEMA_LOGO_URL_KEY,
  MASTER_SELECTED_CINEMA_NAME_KEY,
  notifyMasterSelectedCinemaChanged,
  readErrorMessage,
  sortCinemas,
} from "../../helpers/core/masterHelpers";
import type {
  Cinema,
  CurrentUser,
} from "../../helpers/core/masterTypes";

type UseMasterPanelDataOptions = {
  showError: (title: string, description: string) => void;
};

type MasterPanelDataResult = {
  checkedAccess: boolean;
  cinemas: Cinema[];
  currentUser: CurrentUser | null;
  fetchCinemas: () => Promise<void>;
  loading: boolean;
  message: string;
  saveSelectedCinema: (cinema: Cinema) => void;
  selectedCinema: Cinema | null;
  selectedCinemaId: number | null;
  setCinemas: Dispatch<SetStateAction<Cinema[]>>;
  setMessage: Dispatch<SetStateAction<string>>;
};

export function useMasterPanelData({
  showError,
}: UseMasterPanelDataOptions): MasterPanelDataResult {
  const showErrorRef = useRef(showError);

  const [checkedAccess, setCheckedAccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const selectedCinema = useMemo(
    () => cinemas.find((cinema) => cinema.id === selectedCinemaId) || null,
    [cinemas, selectedCinemaId],
  );

  const clearSelectedCinema = useCallback(() => {
    localStorage.removeItem(MASTER_SELECTED_CINEMA_ID_KEY);
    localStorage.removeItem(MASTER_SELECTED_CINEMA_NAME_KEY);
    localStorage.removeItem(MASTER_SELECTED_CINEMA_LOGO_URL_KEY);

    setSelectedCinemaId(null);
    notifyMasterSelectedCinemaChanged();
  }, []);

  const fetchCinemas = useCallback(async () => {
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
      showErrorRef.current(
        "Biografer kunne ikke hentes",
        error instanceof Error ? error.message : "Kunne ikke hente biografer.",
      );
    } finally {
      setLoading(false);
    }
  }, [clearSelectedCinema]);

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
        void fetchCinemas();
      } else {
        setLoading(false);
      }
    } catch {
      setCurrentUser(null);
      setCheckedAccess(true);
      setLoading(false);
    }
  }, [fetchCinemas]);

  const saveSelectedCinema = useCallback((cinema: Cinema) => {
    localStorage.setItem(MASTER_SELECTED_CINEMA_ID_KEY, String(cinema.id));
    localStorage.setItem(MASTER_SELECTED_CINEMA_NAME_KEY, cinema.name);

    if (cinema.logoUrl) {
      localStorage.setItem(
        MASTER_SELECTED_CINEMA_LOGO_URL_KEY,
        cinema.logoUrl,
      );
    } else {
      localStorage.removeItem(MASTER_SELECTED_CINEMA_LOGO_URL_KEY);
    }

    setSelectedCinemaId(cinema.id);
    notifyMasterSelectedCinemaChanged();
    setMessage(`${cinema.name} er valgt som aktiv biograf for MASTER-panelet.`);
  }, []);

  return {
    checkedAccess,
    cinemas,
    currentUser,
    fetchCinemas,
    loading,
    message,
    saveSelectedCinema,
    selectedCinema,
    selectedCinemaId,
    setCinemas,
    setMessage,
  };
}
