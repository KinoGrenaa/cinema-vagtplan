"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { getErrorMessage } from "../helpers/myTimeErrors";
import { toInputDateTime } from "../helpers/myTimeDate";
import type { TimeEntry } from "../helpers/myTimeTypes";

type ShowError = (title: string, description: string) => void;

type UseMyTimeEditOptions = {
  onSaved: () => Promise<void>;
  onError: ShowError;
};

export function useMyTimeEdit({ onSaved, onError }: UseMyTimeEditOptions) {
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editClockInNote, setEditClockInNote] = useState("");
  const [editClockOutNote, setEditClockOutNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function openEdit(entry: TimeEntry) {
    setEditingEntry(entry);
    setEditClockIn(toInputDateTime(entry.clockIn));
    setEditClockOut(toInputDateTime(entry.clockOut));
    setEditClockInNote(entry.clockInNote ?? "");
    setEditClockOutNote(entry.clockOutNote ?? "");
  }

  function closeEdit() {
    if (savingEdit) return;

    setEditingEntry(null);
    setEditClockIn("");
    setEditClockOut("");
    setEditClockInNote("");
    setEditClockOutNote("");
  }

  async function saveEdit() {
    if (!editingEntry) return;

    const parsedClockIn = new Date(editClockIn);
    const parsedClockOut = editClockOut ? new Date(editClockOut) : null;

    if (Number.isNaN(parsedClockIn.getTime())) {
      onError("Ugyldig mødetid", "Mødetiden er ikke en gyldig dato eller tid.");

      return;
    }

    if (parsedClockOut && Number.isNaN(parsedClockOut.getTime())) {
      onError("Ugyldig fyraften", "Fyraften er ikke en gyldig dato eller tid.");

      return;
    }

    if (parsedClockOut && parsedClockOut <= parsedClockIn) {
      onError("Ugyldigt tidsrum", "Fyraften skal være efter mødetid.");

      return;
    }

    try {
      setSavingEdit(true);

      const response = await apiFetch(`/time-entries/me/${editingEntry.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          clockIn: parsedClockIn.toISOString(),
          clockOut: parsedClockOut ? parsedClockOut.toISOString() : null,
          clockInNote: editClockInNote,
          clockOutNote: editClockOutNote,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        onError("Timeregistreringen kunne ikke rettes", getErrorMessage(errorText));

        return;
      }

      await onSaved();
      closeEdit();
      toast.success("Timeregistrering rettet");
    } catch {
      onError(
        "Timeregistreringen kunne ikke rettes",
        "Der opstod en fejl, da timeregistreringen skulle rettes. Prøv igen.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  return {
    editingEntry,
    editClockIn,
    editClockOut,
    editClockInNote,
    editClockOutNote,
    savingEdit,
    openEdit,
    closeEdit,
    saveEdit,
    setEditClockIn,
    setEditClockOut,
    setEditClockInNote,
    setEditClockOutNote,
  };
}
