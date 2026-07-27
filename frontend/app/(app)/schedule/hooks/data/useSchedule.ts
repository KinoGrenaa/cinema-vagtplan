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
  useAuth,
} from "@/app/providers/AuthProvider";
import {
  localDateTimeToISOString,
} from "@/app/utils/dateTime";

import type {
  Shift,
  User,
  WorkType,
} from "../../../../../../shared/types";

type CreateShiftInput = {
  startTime: string;
  endTime: string;
  note?: string;
  userId?: number | null;
  workTypeId: number;
};

type UpdateShiftInput = {
  startTime: string;
  endTime: string;
  note?: string | null;
  userId?: number | null;
  workTypeId: number;
};

type ManualTimeInput = {
  shiftId?: number | null;
  clockIn: string;
  clockOut: string;
  note: string;
};

type StaffingRequestType =
  | "EXTRA_SHIFT"
  | "EMERGENCY"
  | "REPLACEMENT"
  | "OVERTIME";

type CreateStaffingRequestInput = {
  shiftId?: number | null;
  targetUserId?: number | null;
  type: StaffingRequestType;
  priority: number;
  message: string;
  requestStartTime?: string | null;
  requestEndTime?: string | null;
  workTypeId?: number | null;
};

type OpenTimeEntry = {
  shift?: {
    id: number;
    startTime: string;
    endTime: string;
    workType?: {
      name: string;
    };
  } | null;
  id: number;
  clockIn: string;
  clockOut?: string | null;
  shiftId?: number | null;
  userId: number;
  cinemaId: number;
};

type ScheduleTimeEntry = {
  id: number;
  shiftId?: number | null;
  status:
    | "PENDING"
    | "APPROVED"
    | "NEEDS_CHANGES"
    | "VOIDED";
  clockIn: string;
  clockOut?: string | null;
};

type ScheduleStaticDataResponse = {
  users?: User[];
  workTypes?: WorkType[];
};

type ScheduleErrorHandler = (
  title: string,
  description: string,
) => void;

type UseScheduleOptions = {
  onError?: ScheduleErrorHandler;
};

type BackgroundFetchOptions = {
  reportError?: boolean;
};

type RefreshDayDataOptions = {
  showErrors?: boolean;
  showLoading?: boolean;
};

const MASTER_SELECTED_CINEMA_ID_KEY =
  "masterSelectedCinemaId";

function getSelectedMasterCinemaId() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const cinemaId =
    Number(
      localStorage.getItem(
        MASTER_SELECTED_CINEMA_ID_KEY,
      ),
    );

  if (
    !Number.isInteger(
      cinemaId,
    ) ||
    cinemaId <= 0
  ) {
    return null;
  }

  return cinemaId;
}

function appendCinemaId(
  endpoint: string,
  cinemaId: number | null,
) {
  if (!cinemaId) {
    return endpoint;
  }

  const separator =
    endpoint.includes("?")
      ? "&"
      : "?";

  return `${endpoint}${separator}cinemaId=${cinemaId}`;
}

async function readErrorMessage(
  response: Response,
  fallback: string,
) {
  const payload =
    await response
      .json()
      .catch(() => null);

  if (
    typeof payload?.message ===
    "string"
  ) {
    return payload.message;
  }

  return fallback;
}

export function useSchedule(
  selectedDate: string,
  options:
    UseScheduleOptions = {},
) {
  const {
    apiFetch,
  } = useApi();
  const onErrorRef =
    useRef<
      | ScheduleErrorHandler
      | undefined
    >(options.onError);

  useEffect(() => {
    onErrorRef.current =
      options.onError;
  }, [options.onError]);

  const reportBackgroundError =
    useCallback(
      (
        title: string,
        description: string,
      ) => {
        onErrorRef.current?.(
          title,
          description,
        );
      },
      [],
    );

  const {
    user,
    loading: authLoading,
    isAdmin,
  } = useAuth();
  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] =
    useState<number | null>(
      null,
    );

  useEffect(() => {
    function updateSelectedCinema() {
      setSelectedMasterCinemaId(
        getSelectedMasterCinemaId(),
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

  const needsMasterCinemaSelection =
    user?.role ===
      "MASTER" &&
    !user.cinemaId &&
    !selectedMasterCinemaId;

  const isGlobalMaster =
    user?.role ===
      "MASTER" &&
    !user.cinemaId;

  const appendActiveCinemaId =
    useCallback(
      (
        endpoint: string,
      ) => {
        if (
          user?.role ===
            "MASTER" &&
          !user.cinemaId
        ) {
          return appendCinemaId(
            endpoint,
            activeCinemaId,
          );
        }

        return endpoint;
      },
      [
        activeCinemaId,
        user,
      ],
    );

  const [
    shifts,
    setShifts,
  ] =
    useState<Shift[]>([]);
  const [
    users,
    setUsers,
  ] =
    useState<User[]>([]);
  const [
    workTypes,
    setWorkTypes,
  ] =
    useState<WorkType[]>(
      [],
    );
  const [
    openTimeEntry,
    setOpenTimeEntry,
  ] =
    useState<
      OpenTimeEntry | null
    >(null);
  const [
    timeEntries,
    setTimeEntries,
  ] =
    useState<
      ScheduleTimeEntry[]
    >([]);
  const [
    loading,
    setLoading,
  ] = useState(true);

  const canManageShifts =
    isAdmin;

  const fetchStaticData =
    useCallback(
      async ({
        reportError = true,
      }: BackgroundFetchOptions = {}) => {
        if (
          needsMasterCinemaSelection
        ) {
          setUsers([]);
          setWorkTypes([]);
          return true;
        }

        try {
          const response =
            await apiFetch(
              appendActiveCinemaId(
                "/shifts/schedule-static-data",
              ),
            );

          if (!response.ok) {
            setUsers([]);
            setWorkTypes([]);

            if (reportError) {
              reportBackgroundError(
                "Vagtplanens stamdata kunne ikke hentes",
                await readErrorMessage(
                  response,
                  "Kunne ikke hente medarbejdere og vagttyper.",
                ),
              );
            }

            return false;
          }

          const data =
            (await response.json()) as
              ScheduleStaticDataResponse;

          setUsers(
            Array.isArray(
              data.users,
            )
              ? data.users
              : [],
          );
          setWorkTypes(
            Array.isArray(
              data.workTypes,
            )
              ? data.workTypes
              : [],
          );

          return true;
        } catch {
          setUsers([]);
          setWorkTypes([]);

          if (reportError) {
            reportBackgroundError(
              "Vagtplanens stamdata kunne ikke hentes",
              "Der opstod en fejl, da medarbejdere og vagttyper skulle hentes.",
            );
          }

          return false;
        }
      },
      [
        apiFetch,
        appendActiveCinemaId,
        needsMasterCinemaSelection,
        reportBackgroundError,
      ],
    );

  const fetchShifts =
    useCallback(
      async ({
        reportError = true,
      }: BackgroundFetchOptions = {}) => {
        if (
          needsMasterCinemaSelection
        ) {
          setShifts([]);
          return true;
        }

        try {
          const response =
            await apiFetch(
              appendActiveCinemaId(
                `/shifts?date=${selectedDate}`,
              ),
            );

          if (!response.ok) {
            setShifts([]);

            if (reportError) {
              reportBackgroundError(
                "Vagter kunne ikke hentes",
                await readErrorMessage(
                  response,
                  "Kunne ikke hente vagter.",
                ),
              );
            }

            return false;
          }

          const data =
            await response.json();
          const shiftsArray:
            Shift[] =
            Array.isArray(data)
              ? data
              : [];

          setShifts(
            shiftsArray,
          );
          return true;
        } catch {
          setShifts([]);

          if (reportError) {
            reportBackgroundError(
              "Vagter kunne ikke hentes",
              "Der opstod en fejl, da vagter skulle hentes.",
            );
          }

          return false;
        }
      },
      [
        apiFetch,
        appendActiveCinemaId,
        needsMasterCinemaSelection,
        reportBackgroundError,
        selectedDate,
      ],
    );

  const fetchOpenTimeEntry =
    useCallback(
      async ({
        reportError = true,
      }: BackgroundFetchOptions = {}) => {
        if (
          !user ||
          isGlobalMaster
        ) {
          setOpenTimeEntry(
            null,
          );
          return true;
        }

        try {
          const response =
            await apiFetch(
              appendActiveCinemaId(
                `/time-entries/open?userId=${user.id}`,
              ),
            );

          if (
            response.status ===
              404 ||
            response.status ===
              204
          ) {
            setOpenTimeEntry(
              null,
            );
            return true;
          }

          if (!response.ok) {
            setOpenTimeEntry(
              null,
            );

            if (reportError) {
              reportBackgroundError(
                "Åben tidsregistrering kunne ikke hentes",
                await readErrorMessage(
                  response,
                  "Kunne ikke hente åben tidsregistrering.",
                ),
              );
            }

            return false;
          }

          const text =
            await response.text();

          if (!text.trim()) {
            setOpenTimeEntry(
              null,
            );
            return true;
          }

          const data =
            JSON.parse(
              text,
            );

          setOpenTimeEntry(
            data ?? null,
          );
          return true;
        } catch {
          setOpenTimeEntry(
            null,
          );

          if (reportError) {
            reportBackgroundError(
              "Åben tidsregistrering kunne ikke hentes",
              "Der opstod en fejl, da åben tidsregistrering skulle hentes.",
            );
          }

          return false;
        }
      },
      [
        apiFetch,
        appendActiveCinemaId,
        isGlobalMaster,
        reportBackgroundError,
        user,
      ],
    );

  const fetchMyTimeEntries =
    useCallback(
      async ({
        reportError = true,
      }: BackgroundFetchOptions = {}) => {
        if (
          !user ||
          isGlobalMaster
        ) {
          setTimeEntries(
            [],
          );
          return true;
        }

        try {
          const response =
            await apiFetch(
              appendActiveCinemaId(
                "/time-entries/me",
              ),
            );

          if (!response.ok) {
            setTimeEntries(
              [],
            );

            if (reportError) {
              reportBackgroundError(
                "Tidsregistreringer kunne ikke hentes",
                await readErrorMessage(
                  response,
                  "Kunne ikke hente tidsregistreringer.",
                ),
              );
            }

            return false;
          }

          const data =
            await response.json();
          const entriesArray:
            ScheduleTimeEntry[] =
            Array.isArray(data)
              ? data
              : [];

          setTimeEntries(
            entriesArray,
          );
          return true;
        } catch {
          setTimeEntries(
            [],
          );

          if (reportError) {
            reportBackgroundError(
              "Tidsregistreringer kunne ikke hentes",
              "Der opstod en fejl, da tidsregistreringer skulle hentes.",
            );
          }

          return false;
        }
      },
      [
        apiFetch,
        appendActiveCinemaId,
        isGlobalMaster,
        reportBackgroundError,
        user,
      ],
    );

  const refreshShifts =
    useCallback(
      async ({
        reportError = true,
      }: BackgroundFetchOptions = {}) =>
        fetchShifts({
          reportError,
        }),
      [fetchShifts],
    );

  const refreshTimeData =
    useCallback(
      async ({
        reportError = true,
      }: BackgroundFetchOptions = {}) => {
        const results =
          await Promise.all([
            fetchOpenTimeEntry({
              reportError: false,
            }),
            fetchMyTimeEntries({
              reportError: false,
            }),
          ]);

        const success =
          results.every(
            Boolean,
          );

        if (
          reportError &&
          !success
        ) {
          reportBackgroundError(
            "Tidsregistreringsdata kunne ikke hentes",
            "Åben tidsregistrering eller dine tidsregistreringer kunne ikke hentes.",
          );
        }

        return success;
      },
      [
        fetchMyTimeEntries,
        fetchOpenTimeEntry,
        reportBackgroundError,
      ],
    );

  const refreshDayData =
    useCallback(
      async ({
        showErrors = true,
        showLoading = true,
      }: RefreshDayDataOptions = {}) => {
        if (showLoading) {
          setLoading(true);
        }

        try {
          const [
            shiftsOk,
            timeDataOk,
          ] =
            await Promise.all([
              refreshShifts({
                reportError:
                  false,
              }),
              refreshTimeData({
                reportError:
                  false,
              }),
            ]);

          if (
            showErrors &&
            (!shiftsOk ||
              !timeDataOk)
          ) {
            const failed =
              [
                !shiftsOk
                  ? "vagter"
                  : null,
                !timeDataOk
                  ? "tidsregistreringer"
                  : null,
              ].filter(
                (
                  value,
                ): value is string =>
                  Boolean(
                    value,
                  ),
              );

            reportBackgroundError(
              "Vagtplandata kunne ikke hentes",
              `Følgende data kunne ikke hentes: ${failed.join(
                ", ",
              )}. Prøv at opdatere siden.`,
            );
          }
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [
        refreshShifts,
        refreshTimeData,
        reportBackgroundError,
      ],
    );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      window.location.href =
        "/";
      return;
    }

    void fetchStaticData();
  }, [
    authLoading,
    fetchStaticData,
    user,
  ]);

  useEffect(() => {
    if (
      authLoading ||
      !user
    ) {
      return;
    }

    void refreshDayData();
  }, [
    authLoading,
    refreshDayData,
    user,
  ]);

  const createShift =
    useCallback(
      async (
        input:
          CreateShiftInput,
      ) => {
        if (
          needsMasterCinemaSelection ||
          !activeCinemaId
        ) {
          throw new Error(
            "Vælg en biograf, før du opretter vagter.",
          );
        }

        const response =
          await apiFetch(
            "/shifts",
            {
              method:
                "POST",
              body:
                JSON.stringify(
                  {
                    ...input,
                    ...(user?.role ===
                      "MASTER" &&
                    !user.cinemaId
                      ? {
                          cinemaId:
                            activeCinemaId,
                        }
                      : {}),
                  },
                ),
            },
          );

        if (!response.ok) {
          const data =
            await response.json();

          throw new Error(
            data.message ||
              "Kunne ikke oprette vagt",
          );
        }

        await refreshShifts();
      },
      [
        activeCinemaId,
        apiFetch,
        needsMasterCinemaSelection,
        refreshShifts,
        user,
      ],
    );

  const updateShift =
    useCallback(
      async (
        shiftId: number,
        input:
          UpdateShiftInput,
      ) => {
        if (
          needsMasterCinemaSelection ||
          !activeCinemaId
        ) {
          throw new Error(
            "Vælg en biograf, før du redigerer vagter.",
          );
        }

        const response =
          await apiFetch(
            `/shifts/${shiftId}`,
            {
              method:
                "PATCH",
              body:
                JSON.stringify(
                  {
                    ...input,
                    ...(user?.role ===
                      "MASTER" &&
                    !user.cinemaId
                      ? {
                          cinemaId:
                            activeCinemaId,
                        }
                      : {}),
                  },
                ),
            },
          );

        if (!response.ok) {
          const data =
            await response.json();

          throw new Error(
            data.message ||
              "Kunne ikke opdatere vagt",
          );
        }

        await refreshShifts();
      },
      [
        activeCinemaId,
        apiFetch,
        needsMasterCinemaSelection,
        refreshShifts,
        user,
      ],
    );

  const deleteShift =
    useCallback(
      async (
        shiftId: number,
      ) => {
        if (
          needsMasterCinemaSelection ||
          !activeCinemaId
        ) {
          throw new Error(
            "Vælg en biograf, før du sletter vagter.",
          );
        }

        const response =
          await apiFetch(
            user?.role ===
                "MASTER" &&
              !user.cinemaId
              ? appendCinemaId(
                  `/shifts/${shiftId}`,
                  activeCinemaId,
                )
              : `/shifts/${shiftId}`,
            {
              method:
                "DELETE",
            },
          );

        if (!response.ok) {
          throw new Error(
            "Kunne ikke slette vagt",
          );
        }

        await refreshShifts();
      },
      [
        activeCinemaId,
        apiFetch,
        needsMasterCinemaSelection,
        refreshShifts,
        user,
      ],
    );

  const offerShiftTrade =
    useCallback(
      async (
        shift: Shift,
      ) => {
        if (!user) {
          return;
        }

        if (!activeCinemaId) {
          throw new Error(
            "Vælg en biograf, før du sender vagten i byttepuljen.",
          );
        }

        const shiftUserId =
          (
            shift as
              Shift & {
                userId?:
                  | number
                  | null;
              }
          ).userId;

        if (!shiftUserId) {
          throw new Error(
            "Vagten er ikke tildelt en medarbejder endnu.",
          );
        }

        const response =
          await apiFetch(
            "/shift-trades",
            {
              method:
                "POST",
              body:
                JSON.stringify(
                  {
                    shiftId:
                      shift.id,
                    offeredByUserId:
                      shiftUserId,
                    cinemaId:
                      activeCinemaId,
                    message: "",
                  },
                ),
            },
          );

        if (!response.ok) {
          throw new Error(
            "Kunne ikke sende vagten i byttepuljen",
          );
        }

        await refreshShifts();
      },
      [
        activeCinemaId,
        apiFetch,
        refreshShifts,
        user,
      ],
    );

  const createStaffingRequest =
    useCallback(
      async (
        input:
          CreateStaffingRequestInput,
      ) => {
        if (
          needsMasterCinemaSelection ||
          !activeCinemaId
        ) {
          throw new Error(
            "Vælg en biograf, før du sender bemandingsforespørgsler.",
          );
        }

        const response =
          await apiFetch(
            "/staffing-requests",
            {
              method:
                "POST",
              body:
                JSON.stringify(
                  {
                    shiftId:
                      input.shiftId ??
                      null,
                    targetUserId:
                      input.targetUserId ??
                      null,
                    type:
                      input.type,
                    priority:
                      input.priority,
                    message:
                      input.message.trim(),
                    requestStartTime:
                      input.requestStartTime ??
                      null,
                    requestEndTime:
                      input.requestEndTime ??
                      null,
                    workTypeId:
                      input.workTypeId ??
                      null,
                    cinemaId:
                      activeCinemaId,
                  },
                ),
            },
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Kunne ikke sende bemandingsforespørgsel.",
            ),
          );
        }
      },
      [
        activeCinemaId,
        apiFetch,
        needsMasterCinemaSelection,
      ],
    );

  const clockIn =
    useCallback(
      async (
        shiftId?:
          | number
          | null,
        clockInTime?:
          string,
        note?:
          string,
      ) => {
        if (!user) {
          return;
        }

        if (!activeCinemaId) {
          throw new Error(
            "Vælg en biograf, før du registrerer tid.",
          );
        }

        const response =
          await apiFetch(
            "/time-entries/clock-in",
            {
              method:
                "POST",
              body:
                JSON.stringify(
                  {
                    userId:
                      user.id,
                    cinemaId:
                      activeCinemaId,
                    shiftId:
                      shiftId ??
                      null,
                    clockIn:
                      clockInTime
                        ? localDateTimeToISOString(
                            clockInTime,
                          )
                        : undefined,
                    note,
                  },
                ),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Kunne ikke clocke ind",
          );
        }

        setOpenTimeEntry(
          data ?? null,
        );
        await refreshTimeData();
      },
      [
        activeCinemaId,
        apiFetch,
        refreshTimeData,
        user,
      ],
    );

  const clockOut =
    useCallback(
      async (
        clockOutTime?:
          string,
        note?:
          string,
      ) => {
        if (!openTimeEntry) {
          throw new Error(
            "Der er ingen åben tidsregistrering",
          );
        }

        const response =
          await apiFetch(
            `/time-entries/${openTimeEntry.id}/clock-out`,
            {
              method:
                "PATCH",
              body:
                JSON.stringify(
                  {
                    clockOut:
                      clockOutTime
                        ? localDateTimeToISOString(
                            clockOutTime,
                          )
                        : undefined,
                    note,
                  },
                ),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Kunne ikke clocke ud",
          );
        }

        setOpenTimeEntry(
          null,
        );
        await refreshTimeData();
      },
      [
        apiFetch,
        openTimeEntry,
        refreshTimeData,
      ],
    );

  const submitManualTime =
    useCallback(
      async (
        input:
          ManualTimeInput,
      ) => {
        if (!user) {
          return;
        }

        if (!activeCinemaId) {
          throw new Error(
            "Vælg en biograf, før du registrerer tid.",
          );
        }

        const response =
          await apiFetch(
            "/time-entries/manual",
            {
              method:
                "POST",
              body:
                JSON.stringify(
                  {
                    userId:
                      user.id,
                    cinemaId:
                      activeCinemaId,
                    shiftId:
                      input.shiftId ??
                      null,
                    clockIn:
                      localDateTimeToISOString(
                        input.clockIn,
                      ),
                    clockOut:
                      localDateTimeToISOString(
                        input.clockOut,
                      ),
                    note:
                      input.note,
                  },
                ),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Kunne ikke registrere timer",
          );
        }

        await refreshTimeData();
      },
      [
        activeCinemaId,
        apiFetch,
        refreshTimeData,
        user,
      ],
    );

  return {
    user,
    loading,
    canManageShifts,
    needsMasterCinemaSelection,

    shifts,
    users,
    workTypes,

    setUsers,
    setWorkTypes,

    refreshDayData,
    refreshShifts,
    refreshTimeData,

    createShift,
    updateShift,
    deleteShift,
    offerShiftTrade,
    createStaffingRequest,

    openTimeEntry,
    timeEntries,
    clockIn,
    clockOut,

    submitManualTime,
  };
}
