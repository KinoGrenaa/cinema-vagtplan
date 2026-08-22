import { type FormEvent, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/app/lib/api";
import {
  localDateTimeToISOString,
} from "@/app/utils/dateTime";
import { readErrorMessage } from "../../helpers/core/leaveRequestHelpers";
import {
  DEFAULT_LEAVE_REQUEST_MINIMUM_NOTICE_DAYS,
  getLeaveRequestMinimumDate,
  normalizeLeaveRequestMinimumNoticeDays,
} from "../../helpers/core/leaveRequestMinimumNotice";

import type { LeaveRequestEmployeeOption } from "./useLeaveRequestEmployeeOptions";

type UseLeaveRequestFormOptions = {
  activeCinemaId: number | null;
  canCreateForEmployees: boolean;
  currentUserId: number | null;
  employeeOptions: LeaveRequestEmployeeOption[];
  fetchRequests: () => Promise<void>;
  isMasterWithoutOwnCinema: boolean;
  showError: (title: string, description?: string) => void;
  showInfo: (title: string, description: string) => void;
};

function formatLocalDate(value: string) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

function formatLeavePeriod(params: {
  allDay: boolean;
  endDate: string;
  endTime: string;
  startDate: string;
  startTime: string;
}) {
  const start = formatLocalDate(params.startDate);
  const end = formatLocalDate(params.endDate);

  if (params.allDay) {
    return start === end ? `${start} · Hele dagen` : `${start} - ${end}`;
  }

  if (start === end) {
    return `${start} · kl. ${params.startTime}-${params.endTime}`;
  }

  return `${start} kl. ${params.startTime} - ${end} kl. ${params.endTime}`;
}

function getPreferredSelectedUserId(
  employeeOptions: LeaveRequestEmployeeOption[],
  currentUserId: number | null,
) {
  const currentUserOption = employeeOptions.find(
    (option) => option.id === currentUserId,
  );

  return currentUserOption ?? employeeOptions[0] ?? null;
}

export function useLeaveRequestForm({
  activeCinemaId,
  canCreateForEmployees,
  currentUserId,
  employeeOptions,
  fetchRequests,
  isMasterWithoutOwnCinema,
  showError,
  showInfo,
}: UseLeaveRequestFormOptions) {
  const defaultMinDate =
    getLeaveRequestMinimumDate(
      DEFAULT_LEAVE_REQUEST_MINIMUM_NOTICE_DAYS,
    );
  const [
    minimumNoticeDays,
    setMinimumNoticeDays,
  ] =
    useState<number | null>(
      null,
    );
  const minDate =
    getLeaveRequestMinimumDate(
      minimumNoticeDays ??
        DEFAULT_LEAVE_REQUEST_MINIMUM_NOTICE_DAYS,
    );
  const [startDate, setStartDate] =
    useState(defaultMinDate);
  const [endDate, setEndDate] =
    useState(defaultMinDate);
  const [reason, setReason] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [success, setSuccess] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);

  const preferredSelectedUser = useMemo(
    () => getPreferredSelectedUserId(employeeOptions, currentUserId),
    [currentUserId, employeeOptions],
  );

  useEffect(() => {
    let cancelled = false;

    if (!activeCinemaId) {
      setMinimumNoticeDays(
        null,
      );
      return () => {
        cancelled = true;
      };
    }

    setMinimumNoticeDays(
      null,
    );

    void (async () => {
      try {
        const response =
          await apiFetch(
            `/cinemas/${activeCinemaId}`,
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Fraværsindstillinger kunne ikke hentes.",
            ),
          );
        }

        const cinema =
          (await response.json()) as {
            leaveRequestMinimumNoticeDays?:
              unknown;
          };

        if (!cancelled) {
          setMinimumNoticeDays(
            normalizeLeaveRequestMinimumNoticeDays(
              cinema.leaveRequestMinimumNoticeDays,
            ),
          );
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setMinimumNoticeDays(
          null,
        );
        showError(
          "Fraværsindstillinger kunne ikke hentes",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl ved hentning af fraværsindstillinger.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeCinemaId,
    showError,
  ]);

  useEffect(() => {
    if (
      minimumNoticeDays ===
      null
    ) {
      return;
    }

    setStartDate(
      minDate,
    );
    setEndDate(
      minDate,
    );
  }, [
    minDate,
    minimumNoticeDays,
  ]);

  useEffect(() => {
    if (!canCreateForEmployees) {
      setSelectedUserId("");
      return;
    }

    if (employeeOptions.length === 0) {
      setSelectedUserId("");
      return;
    }

    const selectedStillExists = employeeOptions.some(
      (option) => option.id.toString() === selectedUserId,
    );

    if (!selectedStillExists && preferredSelectedUser) {
      setSelectedUserId(preferredSelectedUser.id.toString());
    }
  }, [
    canCreateForEmployees,
    employeeOptions,
    preferredSelectedUser,
    selectedUserId,
  ]);

  function resetForm() {
    setStartDate(minDate);
    setEndDate(minDate);
    setReason("");
    setAllDay(false);
    setStartTime("08:00");
    setEndTime("16:00");

    if (canCreateForEmployees && preferredSelectedUser) {
      setSelectedUserId(preferredSelectedUser.id.toString());
    }
  }

  function openRequestModal() {
    setSuccess("");

    if (
      activeCinemaId &&
      minimumNoticeDays ===
        null
    ) {
      showError(
        "Fraværsindstillinger indlæses",
        "Vent et øjeblik, og prøv igen.",
      );
      return;
    }

    setShowRequestModal(true);
  }

  async function createLeaveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");

    if (isMasterWithoutOwnCinema) {
      showError(
        "Ingen aktiv biograf valgt",
        "Vælg en biograf i MASTER-panelet, før du opretter fravær.",
      );
      return;
    }

    const targetUserId = Number(selectedUserId);

    if (
      canCreateForEmployees &&
      (!Number.isInteger(targetUserId) || targetUserId <= 0)
    ) {
      showError(
        "Vælg medarbejder",
        "Vælg hvilken medarbejder fraværet skal oprettes for.",
      );
      return;
    }

    const selectedEmployee = employeeOptions.find(
      (employee) => employee.id === targetUserId,
    );

    const createdForOther =
      canCreateForEmployees && targetUserId !== currentUserId;
    const createdForName = selectedEmployee?.label ?? `Bruger #${targetUserId}`;
    const period = formatLeavePeriod({
      allDay,
      endDate,
      endTime,
      startDate,
      startTime,
    });

    try {
      const response = await apiFetch("/leave-requests", {
        method: "POST",
        body: JSON.stringify({
          startDate: allDay
            ? localDateTimeToISOString(`${startDate}T00:00`)
            : localDateTimeToISOString(`${startDate}T${startTime}`),
          endDate: allDay
            ? localDateTimeToISOString(`${endDate}T23:59`)
            : localDateTimeToISOString(`${endDate}T${endTime}`),
          reason,
          ...(canCreateForEmployees ? { userId: targetUserId } : {}),
          ...(activeCinemaId ? { cinemaId: activeCinemaId } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Fraværsansøgningen kunne ikke oprettes.",
          ),
        );
      }

      resetForm();
      setShowRequestModal(false);

      if (createdForOther) {
        showInfo(
          "Fravær oprettet",
          `Fraværet er oprettet for ${createdForName}. Periode: ${period}. Ansøgningen kan ses og behandles under Fraværsgodkendelse.`,
        );
      } else {
        showInfo(
          "Fraværsansøgning sendt",
          `Din fraværsansøgning for ${period} er sendt og afventer behandling.`,
        );
      }

      await fetchRequests();
    } catch (error) {
      showError(
        "Fraværsansøgningen kunne ikke oprettes",
        error instanceof Error ? error.message : "Der opstod en fejl.",
      );
    }
  }

  return {
    allDay,
    endDate,
    endTime,
    minDate,
    reason,
    selectedUserId,
    showRequestModal,
    startDate,
    startTime,
    success,
    createLeaveRequest,
    openRequestModal,
    setAllDay,
    setEndDate,
    setEndTime,
    setReason,
    setSelectedUserId,
    setShowRequestModal,
    setStartDate,
    setStartTime,
    setSuccess,
  };
}
