'use client';

import { useCallback, useEffect, useState } from 'react';

type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  user: {
    firstName: string;
    lastName: string;
  };
};

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [startDate, setStartDate] = useState('2026-05-15');
  const [endDate, setEndDate] = useState('2026-05-15');
  const [reason, setReason] = useState('');

  function getToken() {
    return localStorage.getItem('token');
  }

  const fetchRequests = useCallback(async () => {
    const response = await fetch('http://localhost:3001/leave-requests', {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data: LeaveRequest[] = await response.json();
    setRequests(data);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchRequests();
  }, [fetchRequests]);

  async function createLeaveRequest(event: React.FormEvent) {
    event.preventDefault();

    if (!currentUser) return;

    await fetch('http://localhost:3001/leave-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        startDate: `${startDate}T00:00:00.000Z`,
        endDate: `${endDate}T23:59:59.999Z`,
        reason,
        cinemaId: currentUser.cinemaId,
        userId: currentUser.id,
      }),
    });

    setReason('');
    await fetchRequests();
  }

  async function updateStatus(
    requestId: number,
    status: 'APPROVED' | 'REJECTED',
  ) {
    await fetch(`http://localhost:3001/leave-requests/${requestId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status }),
    });

    await fetchRequests();
  }

  const canApprove =
    currentUser?.role === 'ADMIN' || currentUser?.role === 'MASTER';

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Fridagsansøgninger</h1>
            <p className="text-gray-500">
              Ansøg om fri og se status på ansøgninger
            </p>
          </div>

          <a
            href="/dashboard"
            className="bg-black text-white px-4 py-2 rounded-lg"
          >
            Dashboard
          </a>
        </div>

        <form
          onSubmit={createLeaveRequest}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div>
            <label className="block mb-1 font-medium">Fra dato</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Til dato</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Årsag</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Valgfrit"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-lg"
            >
              Send ansøgning
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Ansøgninger</h2>

        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-6 bg-gray-50 font-medium text-sm">
            <div className="p-3 border-r">Medarbejder</div>
            <div className="p-3 border-r">Fra</div>
            <div className="p-3 border-r">Til</div>
            <div className="p-3 border-r">Årsag</div>
            <div className="p-3 border-r">Status</div>
            <div className="p-3">Handling</div>
          </div>

          {requests.map((request) => (
            <div key={request.id} className="grid grid-cols-6 border-t text-sm">
              <div className="p-3 border-r">
                {request.user.firstName} {request.user.lastName}
              </div>

              <div className="p-3 border-r">
                {new Date(request.startDate).toLocaleDateString('da-DK')}
              </div>

              <div className="p-3 border-r">
                {new Date(request.endDate).toLocaleDateString('da-DK')}
              </div>

              <div className="p-3 border-r">{request.reason || '-'}</div>

              <div className="p-3 border-r">{request.status}</div>

              <div className="p-3 flex gap-2">
                {canApprove && request.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => updateStatus(request.id, 'APPROVED')}
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      Godkend
                    </button>

                    <button
                      onClick={() => updateStatus(request.id, 'REJECTED')}
                      className="bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Afvis
                    </button>
                  </>
                ) : (
                  <span className="text-gray-400">Ingen</span>
                )}
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <div className="p-4 text-gray-500">
              Ingen fridagsansøgninger endnu
            </div>
          )}
        </div>
      </div>
    </main>
  );
}