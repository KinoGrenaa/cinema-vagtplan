"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { TimeEntry, TimeEntryStatus } from "../../../../shared/types";

export default function TimeApprovalPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editAdminNote, setEditAdminNote] = useState("");

  function getToken() {
    return localStorage.getItem("token");
  }

  const fetchEntries = useCallback(async () => {
    const response = await apiFetch("/time-entries", {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data = await response.json();
    setEntries(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function toInputDateTime(value?: string | null) {
    if (!value) return "";

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);

    return localDate.toISOString().slice(0, 16);
  }

  function getHours(entry: TimeEntry) {
    if (!entry.clockOut) return "-";

    const start = new Date(entry.clockIn);
    const end = new Date(entry.clockOut);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours.toFixed(2);
  }

  function getStatusLabel(status: TimeEntryStatus) {
    if (status === "APPROVED") return "Godkendt";
    if (status === "REJECTED") return "Afvist";

    return "Afventer";
  }

  function getStatusClass(status: TimeEntryStatus) {
    if (status === "APPROVED") return "bg-green-100 text-green-800";
    if (status === "REJECTED") return "bg-red-100 text-red-800";

    return "bg-yellow-100 text-yellow-800";
  }

  function startEdit(entry: TimeEntry) {
    setEditingId(entry.id);
    setEditClockIn(toInputDateTime(entry.clockIn));
    setEditClockOut(toInputDateTime(entry.clockOut));
    setEditAdminNote(entry.adminNote || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditClockIn("");
    setEditClockOut("");
    setEditAdminNote("");
  }

  async function approve(id: number) {
    await apiFetch(`/time-entries/${id}/approve`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    await fetchEntries();
  }

  async function unapprove(id: number) {
    await fetch(`http://localhost:3001/time-entries/${id}/unapprove`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    await fetchEntries();
  }

  async function reject(id: number) {
    const adminNote = window.prompt("Skriv evt. årsag til afvisning") || "";

    await fetch(`http://localhost:3001/time-entries/${id}/reject`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        adminNote,
      }),
    });

    await fetchEntries();
  }

  async function saveEdit(id: number) {
    if (!editAdminNote.trim()) {
      alert("Du skal skrive en admin-note for at rette timer.");
      return;
    }

    await fetch(`http://localhost:3001/time-entries/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        clockIn: editClockIn,
        clockOut: editClockOut || null,
        adminNote: editAdminNote,
      }),
    });

    cancelEdit();
    await fetchEntries();
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold">Godkend timer</h1>
        <p className="text-gray-500">
          Gennemgå, ret, godkend eller afvis clock ind/ud.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="border rounded-xl p-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="font-bold">
                    {entry.user.firstName} {entry.user.lastName}
                  </div>

                  <div className="text-sm text-gray-500">
                    {entry.user.email}
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    Type: {entry.shift?.workType?.name || "-"}
                  </div>

                  {editingId === entry.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Clock ind
                        </label>
                        <input
                          type="datetime-local"
                          className="border rounded-lg px-3 py-2 w-full"
                          value={editClockIn}
                          onChange={(e) => setEditClockIn(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Clock ud
                        </label>
                        <input
                          type="datetime-local"
                          className="border rounded-lg px-3 py-2 w-full"
                          value={editClockOut}
                          onChange={(e) => setEditClockOut(e.target.value)}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Admin-note
                        </label>
                        <textarea
                          className="border rounded-lg px-3 py-2 w-full min-h-20"
                          value={editAdminNote}
                          onChange={(e) => setEditAdminNote(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-gray-500 mt-2">
                        Ind: {new Date(entry.clockIn).toLocaleString("da-DK")}
                      </div>

                      <div className="text-sm text-gray-500">
                        Ud:{" "}
                        {entry.clockOut
                          ? new Date(entry.clockOut).toLocaleString("da-DK")
                          : "Mangler clock ud"}
                      </div>

                      <div className="text-sm font-medium mt-1">
                        Timer: {getHours(entry)}
                      </div>

                      {entry.adminNote && (
                        <div className="text-sm text-gray-600 mt-2">
                          Note: {entry.adminNote}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-col md:items-end gap-2">
                  <div
                    className={`px-3 py-2 rounded-lg text-sm ${getStatusClass(
                      entry.status,
                    )}`}
                  >
                    {getStatusLabel(entry.status)}
                  </div>

                  {editingId === entry.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(entry.id)}
                        className="bg-black text-white px-4 py-2 rounded-lg"
                      >
                        Gem rettelse
                      </button>

                      <button
                        onClick={cancelEdit}
                        className="bg-gray-200 px-4 py-2 rounded-lg"
                      >
                        Annuller
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(entry)}
                        className="bg-gray-200 px-4 py-2 rounded-lg"
                      >
                        Ret
                      </button>

                      {entry.status === "APPROVED" ? (
                        <button
                          onClick={() => unapprove(entry.id)}
                          className="bg-gray-200 px-4 py-2 rounded-lg"
                        >
                          Fjern godkendelse
                        </button>
                      ) : (
                        <button
                          onClick={() => approve(entry.id)}
                          disabled={!entry.clockOut}
                          className="bg-green-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                        >
                          Godkend
                        </button>
                      )}

                      {entry.status !== "REJECTED" && (
                        <button
                          onClick={() => reject(entry.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg"
                        >
                          Afvis
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="text-gray-500">Ingen tidsregistreringer endnu.</div>
          )}
        </div>
      </div>
    </>
  );
}
