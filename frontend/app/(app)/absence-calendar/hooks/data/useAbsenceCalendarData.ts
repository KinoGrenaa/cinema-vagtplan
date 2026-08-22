"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import { readErrorMessage } from "../../helpers/core/absenceCalendarHelpers";
import type {
  LeaveRequest,
  LeaveRequestStatus,
} from "../../helpers/core/absenceCalendarTypes";

const ABSENCE_CALENDAR_PAGE_SIZE =
  100;

const ABSENCE_CALENDAR_REFRESH_INTERVAL_MS =
  30_000;

function getStatusSuccessMessage(
  status: LeaveRequestStatus,
) {
  if (status === "APPROVED") {
    return "Fraværsansøgningen er godkendt.";
  }

  if (status === "REJECTED") {
    return "Fraværsansøgningen er afvist.";
  }

  if (status === "CANCELLED") {
    return "Fraværsansøgningen er annulleret.";
  }

  return "Fraværsansøgningens status er opdateret.";
}

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return null;
  }

  const value =
    window.localStorage.getItem(
      "masterSelectedCinemaId",
    );

  if (!value) {
    return null;
  }

  const parsedId = Number(value);

  return Number.isInteger(
    parsedId,
  ) && parsedId > 0
    ? String(parsedId)
    : null;
}

function getMonthRange(
  selectedMonth: string,
) {
  const [
    year,
    month,
  ] =
    selectedMonth
      .split("-")
      .map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      "Fraværskalenderens måned er ugyldig.",
    );
  }

  const lastDay =
    new Date(
      year,
      month,
      0,
    ).getDate();

  return {
    startDate:
      `${selectedMonth}-01`,
    endDate:
      `${selectedMonth}-${String(
        lastDay,
      ).padStart(
        2,
        "0",
      )}`,
  };
}

export function useAbsenceCalendarData(
  selectedMonth: string,
) {
  const { user } = useAuth();
  const infoDialog = useInfoModal();

  const showErrorRef =
    useRef(
      infoDialog.showError,
    );
  const fetchSequenceRef =
    useRef(0);

  const [
    requests,
    setRequests,
  ] =
    useState<LeaveRequest[]>(
      [],
    );
  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] = useState<
    string | null
  >(null);
  const [
    successToast,
    setSuccessToast,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    showErrorRef.current =
      infoDialog.showError;
  }, [infoDialog.showError]);

  useEffect(() => {
    if (!successToast) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        () =>
          setSuccessToast(
            null,
          ),
        4000,
      );

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, [
    successToast,
  ]);

  useEffect(() => {
    function syncSelectedCinema() {
      setSelectedMasterCinemaId(
        getSelectedMasterCinemaId(),
      );
    }

    syncSelectedCinema();

    window.addEventListener(
      "masterSelectedCinemaChanged",
      syncSelectedCinema,
    );
    window.addEventListener(
      "storage",
      syncSelectedCinema,
    );

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        syncSelectedCinema,
      );
      window.removeEventListener(
        "storage",
        syncSelectedCinema,
      );
    };
  }, []);

  const needsMasterCinemaSelection =
    user?.role === "MASTER" &&
    !user.cinemaId &&
    !selectedMasterCinemaId;

  const fetchRequests =
    useCallback(
      async () => {
        const fetchSequence =
          ++fetchSequenceRef.current;

        if (
          needsMasterCinemaSelection
        ) {
          setRequests(
            [],
          );
          return;
        }

        try {
          const {
            startDate,
            endDate,
          } =
            getMonthRange(
              selectedMonth,
            );

          const query =
            new URLSearchParams({
              includeAll:
                "true",
              limit:
                String(
                  ABSENCE_CALENDAR_PAGE_SIZE,
                ),
              statuses:
                "PENDING,APPROVED",
              startDate,
              endDate,
            });

          if (
            user?.role ===
              "MASTER" &&
            !user.cinemaId &&
            selectedMasterCinemaId
          ) {
            query.set(
              "cinemaId",
              selectedMasterCinemaId,
            );
          }

          const allRequests:
            LeaveRequest[] =
              [];
          const seenCursors =
            new Set<number>();
          let beforeId:
            number | null =
              null;

          do {
            if (
              beforeId !==
              null
            ) {
              query.set(
                "beforeId",
                String(
                  beforeId,
                ),
              );
            } else {
              query.delete(
                "beforeId",
              );
            }

            const response =
              await apiFetch(
                `/leave-requests/page?${query.toString()}`,
              );

            if (!response.ok) {
              throw new Error(
                await readErrorMessage(
                  response,
                  "Der opstod en fejl, da fraværskalenderen skulle hentes.",
                ),
              );
            }

            const data =
              await response.json();
            const items =
              Array.isArray(
                data?.items,
              )
                ? data.items
                : [];

            allRequests.push(
              ...items,
            );

            if (
              !data?.hasMore
            ) {
              beforeId =
                null;
              continue;
            }

            const nextBeforeId =
              Number(
                data?.nextBeforeId,
              );

            if (
              !Number.isInteger(
                nextBeforeId,
              ) ||
              nextBeforeId <= 0 ||
              seenCursors.has(
                nextBeforeId,
              )
            ) {
              throw new Error(
                "Fraværskalenderens sideindlæsning kunne ikke fortsætte sikkert.",
              );
            }

            seenCursors.add(
              nextBeforeId,
            );
            beforeId =
              nextBeforeId;
          } while (
            beforeId !==
            null
          );

          if (
            fetchSequence !==
            fetchSequenceRef.current
          ) {
            return;
          }

          setRequests(
            allRequests,
          );
        } catch (error) {
          if (
            fetchSequence !==
            fetchSequenceRef.current
          ) {
            return;
          }

          setRequests(
            [],
          );
          showErrorRef.current(
            "Fraværskalenderen kunne ikke hentes",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da fraværskalenderen skulle hentes.",
          );
        }
      },
      [
        needsMasterCinemaSelection,
        selectedMasterCinemaId,
        selectedMonth,
        user,
      ],
    );

  const updateStatus =
    useCallback(
      async (
        requestId: number,
        status:
          LeaveRequestStatus,
        note?: string,
      ) => {
        setSuccessToast(
          null,
        );

        if (
          needsMasterCinemaSelection
        ) {
          showErrorRef.current(
            "Ingen aktiv biograf valgt",
            "Vælg en biograf i MASTER-panelet, før du behandler fravær.",
          );
          return;
        }

        try {
          const query =
            new URLSearchParams();

          if (
            user?.role ===
              "MASTER" &&
            !user.cinemaId &&
            selectedMasterCinemaId
          ) {
            query.set(
              "cinemaId",
              selectedMasterCinemaId,
            );
          }

          const queryString =
            query.toString();

          const response =
            await apiFetch(
              `/leave-requests/${requestId}/status${queryString ? `?${queryString}` : ""}`,
              {
                method:
                  "PATCH",
                body:
                  JSON.stringify({
                    status,
                    ...(note
                      ? {
                          note,
                        }
                      : {}),
                  }),
              },
            );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Status kunne ikke opdateres.",
              ),
            );
          }

          await fetchRequests();

          setSuccessToast(
            getStatusSuccessMessage(
              status,
            ),
          );
        } catch (error) {
          showErrorRef.current(
            "Status kunne ikke opdateres",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl.",
          );
        }
      },
      [
        fetchRequests,
        needsMasterCinemaSelection,
        selectedMasterCinemaId,
        user,
      ],
    );

  const dismissSuccessToast =
    useCallback(
      () =>
        setSuccessToast(
          null,
        ),
      [],
    );

  useEffect(() => {
    if (!user) {
      return;
    }

    fetchRequests();
  }, [
    fetchRequests,
    user,
  ]);

  useEffect(() => {
    if (
      !user ||
      needsMasterCinemaSelection
    ) {
      return;
    }

    function refreshIfVisible() {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      void fetchRequests();
    }

    const intervalId =
      window.setInterval(
        refreshIfVisible,
        ABSENCE_CALENDAR_REFRESH_INTERVAL_MS,
      );

    window.addEventListener(
      "focus",
      refreshIfVisible,
    );
    document.addEventListener(
      "visibilitychange",
      refreshIfVisible,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );
      window.removeEventListener(
        "focus",
        refreshIfVisible,
      );
      document.removeEventListener(
        "visibilitychange",
        refreshIfVisible,
      );
    };
  }, [
    fetchRequests,
    needsMasterCinemaSelection,
    user,
  ]);

  return {
    dismissSuccessToast,
    infoDialog,
    needsMasterCinemaSelection,
    requests,
    successToast,
    updateStatus,
  };
}
