import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  localDateTimeToISOString,
  toInputDateTime,
} from "@/app/utils/dateTime";
import type { Shift, User, JobFunction } from "../../../../../../shared/types";
import type {
  StaffingRequestType,
  StaffingTargetMode,
} from "../../components/staffing/StaffingRequestModal";
import { getDefaultStaffingMessage } from "../../helpers/text/scheduleShiftText";
import { getScheduleStaffingTargetUsers } from "../../helpers/derived/scheduleDerivedData";

type InfoDialog = {
  showError: (title: string, description: string) => void;
  showSuccess: (title: string, description: string) => void;
};

type CreateStaffingRequest = (payload: {
  shiftId: number | null;
  targetUserId: number | null;
  type: StaffingRequestType;
  priority: number;
  message: string;
  requestStartTime: string | null;
  requestEndTime: string | null;
  jobFunctionId: number | null;
}) => Promise<void>;

function formatStaffingSuccessDescription(
  shift: Shift | null,
  jobFunctions: JobFunction[],
) {
  if (!shift) {
    return "Bemandingsforespørgslen er sendt.";
  }

  const jobFunctionName =
    (
      shift as Shift & {
        jobFunction?: {
          name?: string;
        } | null;
      }
    ).jobFunction?.name ??
    jobFunctions.find(
      (jobFunction) =>
        jobFunction.id ===
        shift.jobFunctionId,
    )?.name ??
    "Vagt";
  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);
  const dateLabel = start.toLocaleDateString(
    "da-DK",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
  const startLabel = start.toLocaleTimeString(
    "da-DK",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  const endLabel = end.toLocaleTimeString(
    "da-DK",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return `${jobFunctionName} · ${dateLabel} · ${startLabel}–${endLabel}`;
}

type UseScheduleStaffingRequestOptions = {
  selectedDate: string;
  shifts: Shift[];
  users: User[];
  jobFunctions: JobFunction[];
  needsMasterCinemaSelection: boolean;
  showMissingActiveCinemaMessage: () => void;
  hideShiftFormModal: () => void;
  infoDialog: InfoDialog;
  createStaffingRequest: CreateStaffingRequest;
  commitLinkedShiftDraft?: () => Promise<{
    shift: Shift;
    rollback: null | (() => Promise<void>);
  } | null>;
};

export function useScheduleStaffingRequest({
  selectedDate,
  shifts,
  users,
  jobFunctions,
  needsMasterCinemaSelection,
  showMissingActiveCinemaMessage,
  hideShiftFormModal,
  infoDialog,
  createStaffingRequest,
  commitLinkedShiftDraft,
}: UseScheduleStaffingRequestOptions) {
  const [showStaffingRequestModal, setShowStaffingRequestModal] =
    useState(false);
  const [staffingRequestShiftId, setStaffingRequestShiftId] = useState<
    number | null
  >(null);
  const [staffingRequestTargetMode, setStaffingRequestTargetMode] =
    useState<StaffingTargetMode>("ALL");
  const [staffingRequestTargetUserId, setStaffingRequestTargetUserId] =
    useState(0);
  const [staffingRequestType, setStaffingRequestType] =
    useState<StaffingRequestType>("EXTRA_SHIFT");
  const [staffingRequestPriority, setStaffingRequestPriority] = useState(2);
  const [staffingRequestMessage, setStaffingRequestMessage] = useState("");
  const [staffingRequestStartTime, setStaffingRequestStartTime] = useState(
    `${selectedDate}T14:00`,
  );
  const [staffingRequestEndTime, setStaffingRequestEndTime] = useState(
    `${selectedDate}T22:00`,
  );
  const [staffingRequestJobFunctionId, setStaffingRequestJobFunctionId] =
    useState(0);

  const selectedStaffingRequestShift = useMemo(() => {
    if (!staffingRequestShiftId) return null;
    return shifts.find((shift) => shift.id === staffingRequestShiftId) ?? null;
  }, [shifts, staffingRequestShiftId]);

  const staffingTargetJobFunctionId =
    selectedStaffingRequestShift?.jobFunctionId ??
    staffingRequestJobFunctionId;

  const staffingTargetUsers = useMemo(
    () =>
      getScheduleStaffingTargetUsers(
        users,
        staffingTargetJobFunctionId,
      ),
    [users, staffingTargetJobFunctionId],
  );

  useEffect(() => {
    if (
      staffingRequestTargetUserId !== 0 &&
      !staffingTargetUsers.some(
        (targetUser) => targetUser.id === staffingRequestTargetUserId,
      )
    ) {
      setStaffingRequestTargetUserId(0);
    }
  }, [staffingRequestTargetUserId, staffingTargetUsers]);

  function resetStaffingRequestModal() {
    setShowStaffingRequestModal(false);
    setStaffingRequestShiftId(null);
    setStaffingRequestTargetMode("ALL");
    setStaffingRequestTargetUserId(0);
    setStaffingRequestType("EXTRA_SHIFT");
    setStaffingRequestPriority(2);
    setStaffingRequestMessage("");
    setStaffingRequestStartTime(`${selectedDate}T14:00`);
    setStaffingRequestEndTime(`${selectedDate}T22:00`);
    setStaffingRequestJobFunctionId(0);
  }

  function applyStaffingRequestShift(shift: Shift | null) {
    setStaffingRequestShiftId(shift?.id ?? null);

    if (shift) {
      setStaffingRequestStartTime(toInputDateTime(shift.startTime));
      setStaffingRequestEndTime(toInputDateTime(shift.endTime));
      setStaffingRequestJobFunctionId(shift.jobFunctionId ?? 0);
      return;
    }

    setStaffingRequestStartTime(`${selectedDate}T14:00`);
    setStaffingRequestEndTime(`${selectedDate}T22:00`);
    setStaffingRequestJobFunctionId(jobFunctions[0]?.id ?? 0);
  }

  function openStaffingRequestModal(shift: Shift | null = null) {
    if (needsMasterCinemaSelection) {
      showMissingActiveCinemaMessage();
      return;
    }

    const defaultType: StaffingRequestType = shift ? "REPLACEMENT" : "EXTRA_SHIFT";

    applyStaffingRequestShift(shift);
    setStaffingRequestTargetMode("ALL");
    setStaffingRequestTargetUserId(0);
    setStaffingRequestType(defaultType);
    setStaffingRequestPriority(shift ? 3 : 2);
    setStaffingRequestMessage(getDefaultStaffingMessage(shift, defaultType));
    hideShiftFormModal();
    setShowStaffingRequestModal(true);
  }

  function handleStaffingRequestShiftChange(nextShift: Shift | null) {
    applyStaffingRequestShift(nextShift);
    setStaffingRequestMessage(
      getDefaultStaffingMessage(nextShift, staffingRequestType),
    );
  }

  function handleStaffingRequestTargetModeChange(nextMode: StaffingTargetMode) {
    setStaffingRequestTargetMode(nextMode);
    if (nextMode === "ALL") {
      setStaffingRequestTargetUserId(0);
    }
  }

  async function handleSubmitStaffingRequest(event: FormEvent) {
    event.preventDefault();

    if (needsMasterCinemaSelection) {
      showMissingActiveCinemaMessage();
      return;
    }

    if (
      staffingRequestTargetMode === "USER" &&
      (!staffingRequestTargetUserId || staffingRequestTargetUserId <= 0)
    ) {
      infoDialog.showError(
        "Vælg medarbejder",
        "Vælg hvilken medarbejder forespørgslen skal sendes til.",
      );
      return;
    }

    if (!staffingRequestShiftId) {
      if (!staffingRequestStartTime || !staffingRequestEndTime) {
        infoDialog.showError(
          "Vælg tidsinterval",
          "Vælg hvornår bemandingsbehovet starter og slutter.",
        );
        return;
      }

      const requestStart = new Date(staffingRequestStartTime);
      const requestEnd = new Date(staffingRequestEndTime);

      if (requestEnd <= requestStart) {
        infoDialog.showError(
          "Tidsintervallet er ikke gyldigt",
          "Sluttidspunktet skal være efter starttidspunktet.",
        );
        return;
      }

      if (!staffingRequestJobFunctionId || staffingRequestJobFunctionId <= 0) {
        infoDialog.showError(
          "Vælg jobfunktion",
          "Vælg hvilken jobfunktion bemandingsbehovet gælder.",
        );
        return;
      }
    }

    if (!staffingRequestMessage.trim()) {
      infoDialog.showError(
        "Skriv en besked",
        "Skriv hvad medarbejderne skal svare på.",
      );
      return;
    }

    let committed:
      | {
          shift: Shift;
          rollback: null | (() => Promise<void>);
        }
      | null = null;

    try {
      committed =
        staffingRequestShiftId && commitLinkedShiftDraft
          ? await commitLinkedShiftDraft()
          : null;

      if (
        staffingRequestShiftId &&
        commitLinkedShiftDraft &&
        !committed
      ) {
        return;
      }

      const successDescription =
        formatStaffingSuccessDescription(
          committed?.shift ?? selectedStaffingRequestShift,
          jobFunctions,
        );

      await createStaffingRequest({
        shiftId: staffingRequestShiftId,
        targetUserId:
          staffingRequestTargetMode === "USER"
            ? staffingRequestTargetUserId
            : null,
        type: staffingRequestType,
        priority: staffingRequestPriority,
        message: staffingRequestMessage,
        requestStartTime: staffingRequestShiftId
          ? null
          : localDateTimeToISOString(staffingRequestStartTime),
        requestEndTime: staffingRequestShiftId
          ? null
          : localDateTimeToISOString(staffingRequestEndTime),
        jobFunctionId: staffingRequestShiftId
          ? null
          : staffingRequestJobFunctionId || null,
      });
      resetStaffingRequestModal();
      infoDialog.showSuccess(
        "Bemandingsforespørgslen er sendt",
        successDescription,
      );
    } catch (error) {
      if (committed?.rollback) {
        try {
          await committed.rollback();
        } catch {
          infoDialog.showError(
            "Vagten kunne ikke gendannes automatisk",
            "Bemandingsforespørgslen fejlede, og den tidligere vagttildeling kunne ikke gendannes automatisk. Genindlæs vagtplanen og kontrollér vagten.",
          );
          return;
        }
      }

      infoDialog.showError(
        "Bemandingsforespørgslen kunne ikke sendes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da bemandingsforespørgslen skulle sendes. Prøv igen.",
      );
    }
  }

  return {
    showStaffingRequestModal,
    resetStaffingRequestModal,
    staffingTargetUsers,
    selectedStaffingRequestShift,
    staffingRequestShiftId,
    staffingRequestTargetMode,
    staffingRequestTargetUserId,
    setStaffingRequestTargetUserId,
    staffingRequestType,
    setStaffingRequestType,
    staffingRequestPriority,
    setStaffingRequestPriority,
    staffingRequestMessage,
    setStaffingRequestMessage,
    staffingRequestStartTime,
    setStaffingRequestStartTime,
    staffingRequestEndTime,
    setStaffingRequestEndTime,
    staffingRequestJobFunctionId,
    setStaffingRequestJobFunctionId,
    openStaffingRequestModal,
    handleStaffingRequestShiftChange,
    handleStaffingRequestTargetModeChange,
    handleSubmitStaffingRequest,
  };
}
