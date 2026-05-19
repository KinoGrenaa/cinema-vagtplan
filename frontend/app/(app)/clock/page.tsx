'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  CurrentUser,
  Shift,
  TimeEntry,
} from '../../../../shared/types';

export default function ClockPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);

  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);

  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [note, setNote] = useState('');

  function getToken() {
    return localStorage.getItem('token');
  }

  function toInputDateTime(value: string) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60 * 1000)
      .toISOString()
      .slice(0, 16);
  }

  const fetchEntries = useCallback(async (userId: number) => {
    const response = await fetch(
      `http://localhost:3001/time-entries?userId=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );

    const data = await response.json();

    setEntries(Array.isArray(data) ? data : []);
  }, []);

  const fetchTodayShifts = useCallback(async (userId: number) => {
    const today = new Date().toISOString().split('T')[0];

    const response = await fetch(
      `http://localhost:3001/shifts?date=${today}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );

    const data = await response.json();

    const myShifts = Array.isArray(data)
      ? data.filter((shift) => shift.user?.id === userId)
      : [];

    setTodayShifts(myShifts);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');

    if (!savedUser) {
      window.location.href = '/';
      return;
    }

    const parsedUser: CurrentUser = JSON.parse(savedUser);

    setCurrentUser(parsedUser);

    fetchEntries(parsedUser.id);
    fetchTodayShifts(parsedUser.id);
  }, [fetchEntries, fetchTodayShifts]);

  function selectShift(id: number) {
    setSelectedShiftId(id);

    const shift = todayShifts.find((s) => s.id === id);

    if (!shift) return;

    setClockIn(toInputDateTime(shift.startTime));
    setClockOut(toInputDateTime(shift.endTime));
    setNote('');
  }

  async function submit() {
    if (!currentUser || !selectedShiftId) {
      alert('Vælg en vagt');
      return;
    }

    const shift = todayShifts.find((s) => s.id === selectedShiftId);

    if (!shift) {
      alert('Vagten blev ikke fundet');
      return;
    }

    const plannedStart = toInputDateTime(shift.startTime);
    const plannedEnd = toInputDateTime(shift.endTime);

    const hasDeviation =
      plannedStart !== clockIn || plannedEnd !== clockOut;

    if (hasDeviation && !note.trim()) {
      alert(
        'Du skal skrive en note, når tiderne afviger fra vagtplanen',
      );
      return;
    }

    const response = await fetch(
      'http://localhost:3001/time-entries/manual',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          cinemaId: currentUser.cinemaId,
          shiftId: selectedShiftId,
          clockIn,
          clockOut,
          note,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || 'Kunne ikke indsende timer');
      return;
    }

    alert('Timer sendt til godkendelse');

    setSelectedShiftId(null);
    setClockIn('');
    setClockOut('');
    setNote('');

    await fetchEntries(currentUser.id);
  }

  function calculateHours(entry: TimeEntry) {
    if (!entry.clockOut) return '-';

    const start = new Date(entry.clockIn);
    const end = new Date(entry.clockOut);

    return ((end.getTime() - start.getTime()) / 1000 / 60 / 60).toFixed(2);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold">Indsend arbejdstid</h1>

        <p className="text-gray-500">
          Indsend dine faktiske møde- og fyraftstider.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Dagens vagter</h2>

        <div className="space-y-3">
          {todayShifts.map((shift) => (
            <button
              key={shift.id}
              onClick={() => selectShift(shift.id)}
              className={`w-full border rounded-xl p-4 text-left ${
                selectedShiftId === shift.id
                  ? 'border-black bg-gray-50'
                  : ''
              }`}
            >
              <div className="font-bold">
                {shift.workType?.name || 'Vagt'}
              </div>

              <div className="text-sm text-gray-500">
                {new Date(shift.startTime).toLocaleString('da-DK')}
              </div>

              <div className="text-sm text-gray-500">
                {new Date(shift.endTime).toLocaleString('da-DK')}
              </div>
            </button>
          ))}

          {todayShifts.length === 0 && (
            <div className="text-gray-500">
              Ingen vagter i dag.
            </div>
          )}
        </div>
      </div>

      {selectedShiftId && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">
            Indsend timer
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Mødetid
              </label>

              <input
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Fyraften
              </label>

              <input
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Note ved afvigelse
            </label>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full min-h-24"
            />
          </div>

          <button
            onClick={submit}
            className="bg-black text-white px-6 py-3 rounded-lg"
          >
            Send til godkendelse
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Historik</h2>

        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border rounded-xl p-4"
            >
              <div className="font-medium">
                {entry.shift?.workType?.name || 'Vagt'}
              </div>

              <div className="text-sm text-gray-500">
                Ind:
                {' '}
                {new Date(entry.clockIn).toLocaleString('da-DK')}
              </div>

              <div className="text-sm text-gray-500">
                Ud:
                {' '}
                {entry.clockOut
                  ? new Date(entry.clockOut).toLocaleString('da-DK')
                  : '-'}
              </div>

              <div className="text-sm mt-1">
                Timer: {calculateHours(entry)}
              </div>

              {entry.note && (
                <div className="text-sm text-gray-600 mt-2">
                  Note: {entry.note}
                </div>
              )}

              <div className="mt-2 text-sm font-medium">
                Status: {entry.status}
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="text-gray-500">
              Ingen registreringer endnu.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}