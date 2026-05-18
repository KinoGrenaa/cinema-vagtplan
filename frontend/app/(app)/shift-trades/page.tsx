'use client';

import { useCallback, useEffect, useState } from 'react';

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

type ShiftTrade = {
  id: number;
  status: 'OPEN' | 'ACCEPTED' | 'CANCELLED';
  message?: string | null;
  offeredByUser: {
    firstName: string;
    lastName: string;
  };
  acceptedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
  shift: {
    id: number;
    startTime: string;
    endTime: string;
    userId: number;
    user: {
      firstName: string;
      lastName: string;
    };
    workType: {
      name: string;
      color: string;
    };
  };
};

export default function ShiftTradesPage() {
  const [trades, setTrades] = useState<ShiftTrade[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  function getToken() {
    return localStorage.getItem('token');
  }

  const fetchTrades = useCallback(async () => {
    const response = await fetch('http://localhost:3001/shift-trades', {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data: ShiftTrade[] = await response.json();
    setTrades(data);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchTrades();
  }, [fetchTrades]);

  async function acceptTrade(tradeId: number) {
    if (!currentUser) return;

    await fetch(`http://localhost:3001/shift-trades/${tradeId}/accept`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        acceptedByUserId: currentUser.id,
      }),
    });

    await fetchTrades();
  }

  async function cancelTrade(tradeId: number) {
    await fetch(`http://localhost:3001/shift-trades/${tradeId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    await fetchTrades();
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Vagtbytte</h1>
            <p className="text-gray-500">
              Se åbne vagter som andre medarbejdere har lagt i byttepuljen
            </p>
          </div>

          <a
            href="/dashboard"
            className="bg-black text-white px-4 py-2 rounded-lg"
          >
            Dashboard
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Byttepulje</h2>

        <div className="space-y-4">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <div className="font-bold text-lg">
                  {trade.shift.workType.name}
                </div>

                <div className="text-sm text-gray-600">
                  {new Date(trade.shift.startTime).toLocaleDateString('da-DK')}{' '}
                  kl.{' '}
                  {new Date(trade.shift.startTime).toLocaleTimeString('da-DK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' - '}
                  {new Date(trade.shift.endTime).toLocaleTimeString('da-DK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>

                <div className="text-sm mt-1">
                  Udbydes af: {trade.offeredByUser.firstName}{' '}
                  {trade.offeredByUser.lastName}
                </div>

                {trade.message && (
                  <div className="text-sm mt-1 text-gray-600">
                    Besked: {trade.message}
                  </div>
                )}

                <div className="text-sm mt-1">
                  Status:{' '}
                  <span className="font-semibold">
                    {trade.status}
                  </span>
                </div>

                {trade.acceptedByUser && (
                  <div className="text-sm mt-1">
                    Taget af: {trade.acceptedByUser.firstName}{' '}
                    {trade.acceptedByUser.lastName}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {trade.status === 'OPEN' &&
                  currentUser &&
                  trade.offeredByUser.firstName + trade.offeredByUser.lastName !==
                    '' && (
                    <button
                      onClick={() => acceptTrade(trade.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg"
                    >
                      Tag vagt
                    </button>
                  )}

                {trade.status === 'OPEN' && (
                  <button
                    onClick={() => cancelTrade(trade.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg"
                  >
                    Annuller
                  </button>
                )}
              </div>
            </div>
          ))}

          {trades.length === 0 && (
            <div className="text-gray-500">
              Ingen vagter i byttepuljen endnu.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}