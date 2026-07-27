"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useApi,
} from "@/app/hooks/useApi";
import {
  useRealtimeCore,
} from "@/app/hooks/useRealtimeCore";
import {
  useAuth,
} from "@/app/providers/AuthProvider";

const MASTER_SELECTED_CINEMA_ID_KEY =
  "masterSelectedCinemaId";

export type ScheduleMovieShowing = {
  id: number;
  title: string;
  hall: string;
  startTime: string;
  endTime: string;
  soldSeats: number;
  freeSeats: number;
};

type Params = {
  selectedDate: string;
  onError:
    (
      title: string,
      description: string,
    ) => void;
};

function readSelectedMasterCinemaId() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const value =
    Number(
      window.localStorage.getItem(
        MASTER_SELECTED_CINEMA_ID_KEY,
      ),
    );

  return Number.isInteger(
    value,
  ) &&
    value > 0
    ? value
    : null;
}

async function readErrorMessage(
  response: Response,
) {
  const payload =
    await response
      .json()
      .catch(() => null);

  return typeof payload?.message ===
    "string"
    ? payload.message
    : "Filmprogrammet kunne ikke hentes.";
}

export function useScheduleMovieOverlay({
  selectedDate,
  onError,
}: Params) {
  const {
    apiFetch,
  } = useApi();
  const {
    user,
    loading: authLoading,
  } = useAuth();
  const onErrorRef =
    useRef(onError);

  useEffect(() => {
    onErrorRef.current =
      onError;
  }, [onError]);

  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] =
    useState<number | null>(
      null,
    );
  const [
    movieShowings,
    setMovieShowings,
  ] =
    useState<
      ScheduleMovieShowing[]
    >([]);

  useEffect(() => {
    function updateSelectedCinema() {
      setSelectedMasterCinemaId(
        readSelectedMasterCinemaId(),
      );
    }

    updateSelectedCinema();
    window.addEventListener(
      "storage",
      updateSelectedCinema,
    );
    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedCinema,
    );

    return () => {
      window.removeEventListener(
        "storage",
        updateSelectedCinema,
      );
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedCinema,
      );
    };
  }, []);

  const activeCinemaId =
    useMemo(() => {
      if (!user) {
        return null;
      }

      if (
        user.role ===
          "MASTER" &&
        !user.cinemaId
      ) {
        return selectedMasterCinemaId;
      }

      return (
        user.cinemaId ??
        null
      );
    }, [
      selectedMasterCinemaId,
      user,
    ]);

  const fetchMovieShowings =
    useCallback(
      async (
        reportError = true,
      ) => {
        if (
          !user ||
          !activeCinemaId
        ) {
          setMovieShowings(
            [],
          );
          return;
        }

        const params =
          new URLSearchParams({
            date:
              selectedDate,
          });

        if (
          user.role ===
            "MASTER" &&
          !user.cinemaId
        ) {
          params.set(
            "cinemaId",
            String(
              activeCinemaId,
            ),
          );
        }

        try {
          const response =
            await apiFetch(
              `/movie-showings?${params.toString()}`,
            );

          if (
            !response.ok
          ) {
            throw new Error(
              await readErrorMessage(
                response,
              ),
            );
          }

          const data =
            await response.json();

          setMovieShowings(
            Array.isArray(
              data,
            )
              ? data
              : [],
          );
        } catch (error) {
          setMovieShowings(
            [],
          );

          if (reportError) {
            onErrorRef.current(
              "Filmprogram kunne ikke hentes",
              error instanceof Error
                ? error.message
                : "Filmprogrammet kunne ikke hentes.",
            );
          }
        }
      },
      [
        activeCinemaId,
        apiFetch,
        selectedDate,
        user,
      ],
    );

  useEffect(() => {
    if (
      authLoading
    ) {
      return;
    }

    void fetchMovieShowings(
      true,
    );
  }, [
    authLoading,
    fetchMovieShowings,
  ]);

  useRealtimeCore({
    enabled:
      Boolean(
        user &&
        activeCinemaId,
      ),
    onMovieShowingUpdated:
      () => {
        void fetchMovieShowings(
          false,
        );
      },
  });

  return {
    movieShowings,
    refreshMovieShowings:
      fetchMovieShowings,
  };
}
