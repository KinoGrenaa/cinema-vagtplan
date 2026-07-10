import TimeEntryHistoryModal from "@/app/components/time-entries/TimeEntryHistoryModal";

import type { MyTimeStatusFilters } from "../../helpers/myTimeStatus";

import type { TimeEntry, TimeEntryRevision } from "../../helpers/myTimeTypes";

import MyTimeEditModal from "./MyTimeEditModal";

import MyTimeFilterModal from "./MyTimeFilterModal";

type MyTimeModalsProps = {
  editingEntry: TimeEntry | null;

  editClockIn: string;

  editClockOut: string;

  editClockInNote: string;

  editClockOutNote: string;

  savingEdit: boolean;

  onClockInChange: (value: string) => void;

  onClockOutChange: (value: string) => void;

  onClockInNoteChange: (value: string) => void;

  onClockOutNoteChange: (value: string) => void;

  onCloseEdit: () => void;

  onSaveEdit: () => void;

  filterModalOpen: boolean;

  activeStatusFilterCount: number;

  draftStatusFilters: MyTimeStatusFilters;

  onApplyStatusFilters: () => void;

  onResetStatusFilters: () => void;

  onCloseFilterModal: () => void;

  onStatusFilterChange: (
    key: keyof MyTimeStatusFilters,

    checked: boolean,
  ) => void;

  historyEntry: TimeEntry | null;

  historyItems: TimeEntryRevision[];

  onCloseHistory: () => void;
};

export default function MyTimeModals({
  editingEntry,

  editClockIn,

  editClockOut,

  editClockInNote,

  editClockOutNote,

  savingEdit,

  onClockInChange,

  onClockOutChange,

  onClockInNoteChange,

  onClockOutNoteChange,

  onCloseEdit,

  onSaveEdit,

  filterModalOpen,

  activeStatusFilterCount,

  draftStatusFilters,

  onApplyStatusFilters,

  onResetStatusFilters,

  onCloseFilterModal,

  onStatusFilterChange,

  historyEntry,

  historyItems,

  onCloseHistory,
}: MyTimeModalsProps) {
  return (
    <>
      <MyTimeEditModal
        editingEntry={editingEntry}
        editClockIn={editClockIn}
        editClockOut={editClockOut}
        editClockInNote={editClockInNote}
        editClockOutNote={editClockOutNote}
        savingEdit={savingEdit}
        onClockInChange={onClockInChange}
        onClockOutChange={onClockOutChange}
        onClockInNoteChange={onClockInNoteChange}
        onClockOutNoteChange={onClockOutNoteChange}
        onClose={onCloseEdit}
        onSave={onSaveEdit}
      />

      <MyTimeFilterModal
        open={filterModalOpen}
        activeFilterCount={activeStatusFilterCount}
        draftStatusFilters={draftStatusFilters}
        onApply={onApplyStatusFilters}
        onReset={onResetStatusFilters}
        onClose={onCloseFilterModal}
        onStatusFilterChange={onStatusFilterChange}
      />

      <TimeEntryHistoryModal
        isOpen={!!historyEntry}
        onClose={onCloseHistory}
        revisions={historyItems}
        currentStatus={historyEntry?.status}
      />
    </>
  );
}
