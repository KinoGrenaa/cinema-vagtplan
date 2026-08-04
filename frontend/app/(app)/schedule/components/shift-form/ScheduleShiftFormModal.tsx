"use client";

import type { ComponentProps, Dispatch, FormEvent, SetStateAction } from "react";

import BaseModal from "@/app/components/modals/BaseModal";
import type { Shift, User, JobFunction } from "../../../../../../shared/types";
import ShiftForm from "./ShiftForm";

type ShiftFormProps = ComponentProps<typeof ShiftForm>;

type ScheduleShiftFormModalProps = {
  open: boolean;
  selectedShift: Shift | null;
  users: User[];
  jobFunctions: JobFunction[];
  startTime: string;
  setStartTime: Dispatch<SetStateAction<string>>;
  endTime: string;
  setEndTime: Dispatch<SetStateAction<string>>;
  note: string;
  setNote: Dispatch<SetStateAction<string>>;
  userId: number;
  setUserId: Dispatch<SetStateAction<number>>;
  jobFunctionId: number;
  setJobFunctionId: Dispatch<SetStateAction<number>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onDelete: () => void;
  onCancel: () => void;
  onOfferTrade: () => void;
  onSendStaffingRequest: () => void;
  leaveRequests: ShiftFormProps["leaveRequests"];
};

export default function ScheduleShiftFormModal({
  open,
  selectedShift,
  users,
  jobFunctions,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  note,
  setNote,
  userId,
  setUserId,
  jobFunctionId,
  setJobFunctionId,
  onSubmit,
  onDelete,
  onCancel,
  onOfferTrade,
  onSendStaffingRequest,
  leaveRequests,
}: ScheduleShiftFormModalProps) {
  return (
    <BaseModal
      open={open}
      title={selectedShift ? "Rediger vagt" : "Opret vagt"}
      width="xl"
      onClose={onCancel}
    >
      <ShiftForm
        users={users}
        jobFunctions={jobFunctions}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        note={note}
        setNote={setNote}
        userId={userId}
        setUserId={setUserId}
        jobFunctionId={jobFunctionId}
        setJobFunctionId={setJobFunctionId}
        selectedShift={selectedShift}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onCancel={onCancel}
        onOfferTrade={onOfferTrade}
        onSendStaffingRequest={onSendStaffingRequest}
        leaveRequests={leaveRequests}
        showHeader={false}
      />
    </BaseModal>
  );
}
