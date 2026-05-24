"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

type User = {
  id: number;
  firstName: string;
  lastName: string;
};

type ShiftTrade = {
  id: number;
  status: "OPEN" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  type: "POOL" | "DIRECT";
  message?: string | null;
  offeredByUserId: number;
  acceptedByUserId?: number | null;
  targetUserId?: number | null;
  offeredByUser: User;
  targetUser?: User | null;
  acceptedByUser?: User | null;
  shift: {
    id: number;
    startTime: string;
    endTime: string;
    userId: number;
    user: User;
    workType: {
      name: string;
      color: string;
    };
  };
};

type CinemaSettings = {
  allowShiftTradePool: boolean;
  allowShiftTradeDirect: boolean;
};

type FatigueScore = {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
};

export default function ShiftTradesPage() {
  const [trades, setTrades] = useState<ShiftTrade[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [message, setMessage] = useState("");

  const [autoFillSuggestions, setAutoFillSuggestions] = useState<
    Record<number, string[]>
  >({});

  const [autoAssignLoading, setAutoAssignLoading] = useState<number | null>(
    null,
  );

  const [staffingScores, setStaffingScores] = useState<Record<number, number>>(
    {},
  );

  const [fatigueWarnings, setFatigueWarnings] = useState<
    Record<number, string[]>
  >({});

  const [fatigueScores, setFatigueScores] = useState<
    Record<number, FatigueScore>
  >({});

  const [recoveryWarnings, setRecoveryWarnings] = useState<
    Record<number, string[]>
  >({});

  const [cinemaSettings, setCinemaSettings] = useState<CinemaSettings | null>(
    null,
  );

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const tradeUsers = useMemo(() => {
    const allUsers = trades
      .flatMap((trade) => [
        trade.offeredByUser,
        trade.targetUser,
        trade.acceptedByUser,
      ])
      .filter(Boolean) as User[];

    return allUsers.filter(
      (user, index, self) =>
        index === self.findIndex((item) => item.id === user.id),
    );
  }, [trades]);

  const fetchTrades = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/shift-trades`, {
        headers: getHeaders(),
      });

      const data = await response.json();

      const savedUser = localStorage.getItem("user");

      if (savedUser) {
        const user = JSON.parse(savedUser);

        const cinemaResponse = await fetch(
          `${API_URL}/cinemas/${user.cinemaId}`,
          {
            headers: getHeaders(),
          },
        );

        if (cinemaResponse.ok) {
          const cinemaData = await cinemaResponse.json();
          setCinemaSettings(cinemaData);
        }
      }

      setTrades(Array.isArray(data) ? data : []);
    } catch {
      setTrades([]);
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchTrades();
  }, [fetchTrades]);

  useRealtimeShifts({
    onShiftTradesUpdated: fetchTrades,
  });

  async function acceptTrade(tradeId: number) {
    if (!currentUser) return;

    if (!window.confirm("Er du sikker på, at du vil acceptere denne vagt?")) {
      return;
    }

    const response = await fetch(`${API_URL}/shift-trades/${tradeId}/accept`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        acceptedByUserId: currentUser.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Kunne ikke acceptere vagten");
      return;
    }

    setMessage("Vagten er accepteret.");
    await fetchTrades();
  }

  async function rejectTrade(tradeId: number) {
    if (!window.confirm("Er du sikker på, at du vil afvise denne vagt?")) {
      return;
    }

    const response = await fetch(`${API_URL}/shift-trades/${tradeId}/reject`, {
      method: "PATCH",
      headers: getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Kunne ikke afvise vagten");
      return;
    }

    setMessage("Vagten er afvist.");
    await fetchTrades();
  }

  const openTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (trade.status !== "OPEN") return false;

      if (
        trade.type === "POOL" &&
        cinemaSettings &&
        !cinemaSettings.allowShiftTradePool
      ) {
        return false;
      }

      if (
        trade.type === "DIRECT" &&
        cinemaSettings &&
        !cinemaSettings.allowShiftTradeDirect
      ) {
        return false;
      }

      return true;
    });
  }, [trades, cinemaSettings]);

  const historyTrades = useMemo(() => {
    return trades.filter((trade) => trade.status !== "OPEN");
  }, [trades]);

  const generateAutoFillSuggestions = useCallback(() => {
    const suggestions: Record<number, string[]> = {};

    openTrades.forEach((trade) => {
      const recommended = tradeUsers
        .filter(
          (user) =>
            user.id !== trade.offeredByUserId && user.id !== trade.shift.userId,
        )
        .slice(0, 3)
        .map((user) => {
          return `${user.firstName} ${user.lastName} (lav belastning anbefalet)`;
        });

      suggestions[trade.id] = recommended;
    });

    setAutoFillSuggestions(suggestions);
  }, [openTrades, tradeUsers]);

  const calculateStaffingScores = useCallback(() => {
    const scores: Record<number, number> = {};

    tradeUsers.forEach((user) => {
      const userTrades = trades.filter(
        (trade) =>
          trade.offeredByUserId === user.id ||
          trade.acceptedByUserId === user.id,
      );

      const loadPenalty = userTrades.length * 8;
      const overtimePenalty = userTrades.length >= 5 ? 20 : 0;

      const score = 100 - loadPenalty - overtimePenalty;

      scores[user.id] = Math.max(score, 1);
    });

    setStaffingScores(scores);
  }, [trades, tradeUsers]);

  const calculateFatigueWarnings = useCallback(() => {
    const warnings: Record<number, string[]> = {};

    tradeUsers.forEach((user) => {
      const userTrades = trades.filter(
        (trade) =>
          trade.offeredByUserId === user.id ||
          trade.acceptedByUserId === user.id,
      );

      const userWarnings: string[] = [];

      if (userTrades.length >= 5) {
        userWarnings.push("Høj samlet belastning registreret.");
      }

      if (userTrades.length >= 3) {
        userWarnings.push("Risiko for for mange vagter i træk.");
      }

      const lateShifts = userTrades.filter((trade) => {
        const endHour = new Date(trade.shift.endTime).getHours();

        return endHour >= 22;
      });

      if (lateShifts.length >= 2) {
        userWarnings.push("Mange sene/aften vagter registreret.");
      }

      warnings[user.id] = userWarnings;
    });

    setFatigueWarnings(warnings);
  }, [trades, tradeUsers]);

  const calculateFatigueScores = useCallback(() => {
    const scores: Record<number, FatigueScore> = {};

    tradeUsers.forEach((user) => {
      const userTrades = trades.filter(
        (trade) =>
          trade.offeredByUserId === user.id ||
          trade.acceptedByUserId === user.id,
      );

      let fatigueScore = 0;

      fatigueScore += userTrades.length * 10;

      const lateShifts = userTrades.filter((trade) => {
        const endHour = new Date(trade.shift.endTime).getHours();

        return endHour >= 22;
      });

      fatigueScore += lateShifts.length * 12;

      const weekendShifts = userTrades.filter((trade) => {
        const day = new Date(trade.shift.startTime).getDay();

        return day === 0 || day === 6;
      });

      fatigueScore += weekendShifts.length * 8;

      if (userTrades.length >= 5) {
        fatigueScore += 25;
      }

      let level: "LOW" | "MEDIUM" | "HIGH" = "LOW";

      if (fatigueScore >= 70) {
        level = "HIGH";
      } else if (fatigueScore >= 35) {
        level = "MEDIUM";
      }

      scores[user.id] = {
        score: fatigueScore,
        level,
      };
    });

    setFatigueScores(scores);
  }, [trades, tradeUsers]);

  const calculateRecoveryWarnings = useCallback(() => {
    const warnings: Record<number, string[]> = {};

    tradeUsers.forEach((user) => {
      const userTrades = trades
        .filter(
          (trade) =>
            trade.offeredByUserId === user.id ||
            trade.acceptedByUserId === user.id,
        )
        .sort(
          (a, b) =>
            new Date(a.shift.startTime).getTime() -
            new Date(b.shift.startTime).getTime(),
        );

      const userWarnings: string[] = [];

      for (let index = 1; index < userTrades.length; index++) {
        const previousShift = userTrades[index - 1];
        const currentShift = userTrades[index];

        const previousEnd = new Date(previousShift.shift.endTime);
        const currentStart = new Date(currentShift.shift.startTime);

        const restHours =
          (currentStart.getTime() - previousEnd.getTime()) / 1000 / 60 / 60;

        if (restHours < 11) {
          userWarnings.push(
            `Kun ${restHours.toFixed(1)} timers hvile mellem vagter.`,
          );
        }

        if (previousEnd.getHours() >= 22 && currentStart.getHours() <= 8) {
          userWarnings.push(
            "Lukkevagt efterfulgt af tidlig åbnevagt registreret.",
          );
        }
      }

      if (userTrades.length >= 6) {
        userWarnings.push("Mange vagter i træk registreret.");
      }

      warnings[user.id] = userWarnings;
    });

    setRecoveryWarnings(warnings);
  }, [trades, tradeUsers]);

  const autoAssignBestEmployee = useCallback(
    async (trade: ShiftTrade) => {
      try {
        setAutoAssignLoading(trade.id);

        const candidates = tradeUsers
          .filter(
            (user) =>
              user.id !== trade.offeredByUserId &&
              user.id !== trade.shift.userId,
          )
          .sort((a, b) => {
            const scoreA = staffingScores[a.id] || 0;
            const scoreB = staffingScores[b.id] || 0;

            return scoreB - scoreA;
          });

        const bestUser = candidates[0];

        if (!bestUser) {
          alert("Ingen egnet medarbejder fundet.");
          return;
        }

        const response = await fetch(
          `${API_URL}/shift-trades/${trade.id}/accept`,
          {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify({
              acceptedByUserId: bestUser.id,
            }),
          },
        );

        if (!response.ok) {
          alert("Auto assign fejlede.");
          return;
        }

        await fetchTrades();

        alert(
          `${bestUser.firstName} ${bestUser.lastName} blev automatisk valgt.`,
        );
      } catch (error) {
        console.error(error);
        alert("Auto assign fejlede.");
      } finally {
        setAutoAssignLoading(null);
      }
    },
    [fetchTrades, staffingScores, tradeUsers],
  );

  useEffect(() => {
    generateAutoFillSuggestions();
  }, [generateAutoFillSuggestions]);

  useEffect(() => {
    calculateStaffingScores();
  }, [calculateStaffingScores]);

  useEffect(() => {
    calculateFatigueWarnings();
  }, [calculateFatigueWarnings]);

  useEffect(() => {
    calculateFatigueScores();
  }, [calculateFatigueScores]);

  useEffect(() => {
    calculateRecoveryWarnings();
  }, [calculateRecoveryWarnings]);

  function getStatusBadge(status: string) {
    if (status === "ACCEPTED") {
      return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
    }

    if (status === "REJECTED") {
      return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
    }

    if (status === "CANCELLED") {
      return "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }

    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
  }

  function getStatusText(status: string) {
    if (status === "ACCEPTED") return "Accepteret";
    if (status === "REJECTED") return "Afvist";
    if (status === "CANCELLED") return "Annulleret";

    return "Åben";
  }

  function canAcceptTrade(trade: ShiftTrade) {
    if (!currentUser) return false;
    if (trade.offeredByUserId === currentUser.id) return false;

    if (trade.type === "DIRECT" && trade.targetUserId !== currentUser.id) {
      return false;
    }

    return true;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Vagtbytter</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Se åbne vagter og håndter bytteaftaler.
          </p>
        </div>

        {message && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            {message}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Åbne vagter</h2>

            <span className="rounded-full bg-yellow-500 px-3 py-1 text-sm font-semibold text-white">
              {openTrades.length}
            </span>
          </div>

          {openTrades.map((trade) => (
            <div
              key={trade.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
            >
              <div
                className="h-2 w-full"
                style={{
                  backgroundColor: trade.shift.workType.color,
                }}
              />

              <div className="space-y-5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                          trade.status,
                        )}`}
                      >
                        {getStatusText(trade.status)}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${
                          trade.type === "POOL" ? "bg-green-600" : "bg-blue-600"
                        }`}
                      >
                        {trade.type === "POOL"
                          ? "Fælles pulje"
                          : "Direkte bytte"}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold">
                      {trade.shift.workType.name}
                    </h3>

                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                      {new Date(trade.shift.startTime).toLocaleDateString(
                        "da-DK",
                        {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                        },
                      )}
                    </p>

                    <p className="text-gray-600 dark:text-gray-400">
                      {new Date(trade.shift.startTime).toLocaleTimeString(
                        "da-DK",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                      {" - "}
                      {new Date(trade.shift.endTime).toLocaleTimeString(
                        "da-DK",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm dark:bg-gray-950">
                    <div>
                      Fra:{" "}
                      <strong>
                        {trade.offeredByUser.firstName}{" "}
                        {trade.offeredByUser.lastName}
                      </strong>
                    </div>

                    {trade.type === "DIRECT" && trade.targetUser && (
                      <div className="mt-1">
                        Til:{" "}
                        <strong>
                          {trade.targetUser.firstName}{" "}
                          {trade.targetUser.lastName}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {trade.message && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-950">
                    {trade.message}
                  </div>
                )}

                <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="text-lg">🤖</div>

                    <div className="text-sm font-semibold text-green-700 dark:text-green-300">
                      Auto-fill forslag
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(autoFillSuggestions[trade.id] || []).map(
                      (suggestion, index) => {
                        const matchedUser = tradeUsers.find((user) =>
                          suggestion.includes(
                            `${user.firstName} ${user.lastName}`,
                          ),
                        );

                        const score = matchedUser
                          ? staffingScores[matchedUser.id]
                          : null;

                        const fatigueScore = matchedUser
                          ? fatigueScores[matchedUser.id]
                          : null;

                        return (
                          <div
                            key={index}
                            className="rounded-lg bg-white px-3 py-2 text-sm text-green-700 dark:bg-gray-900 dark:text-green-300"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <span>{suggestion}</span>

                              <div className="flex flex-wrap gap-2">
                                {score && (
                                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-300">
                                    Score: {score}
                                  </span>
                                )}

                                {fatigueScore && (
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                                      fatigueScore.level === "LOW"
                                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                        : fatigueScore.level === "MEDIUM"
                                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                                          : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                    }`}
                                  >
                                    Fatigue: {fatigueScore.level} •{" "}
                                    {fatigueScore.score}
                                  </span>
                                )}
                              </div>
                            </div>

                            {matchedUser &&
                              fatigueWarnings[matchedUser.id]?.length > 0 && (
                                <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950">
                                  <div className="mb-2 text-xs font-bold text-orange-700 dark:text-orange-300">
                                    ⚠️ Fatigue warnings
                                  </div>

                                  <div className="space-y-1">
                                    {fatigueWarnings[matchedUser.id].map(
                                      (warning, warningIndex) => (
                                        <div
                                          key={warningIndex}
                                          className="text-xs text-orange-700 dark:text-orange-300"
                                        >
                                          • {warning}
                                        </div>
                                      ),
                                    )}
                                  </div>

                                  <button
                                    className="mt-3 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700"
                                    onClick={() => {
                                      alert(
                                        "Fatigue warning ignoreret af admin.",
                                      );
                                    }}
                                  >
                                    Ignorer og fortsæt
                                  </button>
                                </div>
                              )}

                            {matchedUser &&
                              recoveryWarnings[matchedUser.id]?.length > 0 && (
                                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                                  <div className="mb-2 text-xs font-bold text-red-700 dark:text-red-300">
                                    🛌 Recovery warnings
                                  </div>

                                  <div className="space-y-1">
                                    {recoveryWarnings[matchedUser.id].map(
                                      (warning, warningIndex) => (
                                        <div
                                          key={warningIndex}
                                          className="text-xs text-red-700 dark:text-red-300"
                                        >
                                          • {warning}
                                        </div>
                                      ),
                                    )}
                                  </div>

                                  <button
                                    className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                                    onClick={() => {
                                      alert(
                                        "Recovery warning ignoreret af admin.",
                                      );
                                    }}
                                  >
                                    Ignorer og fortsæt
                                  </button>
                                </div>
                              )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {canAcceptTrade(trade) && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => acceptTrade(trade.id)}
                      className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white transition hover:bg-green-700"
                    >
                      Accepter vagt
                    </button>

                    <button
                      onClick={() => rejectTrade(trade.id)}
                      className="rounded-xl bg-red-600 px-5 py-3 font-medium text-white transition hover:bg-red-700"
                    >
                      Afvis vagt
                    </button>
                  </div>
                )}

                <button
                  onClick={() => autoAssignBestEmployee(trade)}
                  disabled={autoAssignLoading === trade.id}
                  className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {autoAssignLoading === trade.id
                    ? "Auto assigning..."
                    : "🤖 Auto assign bedste medarbejder"}
                </button>
              </div>
            </div>
          ))}

          {openTrades.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Ingen åbne vagter lige nu.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Historik</h2>

            <span className="rounded-full bg-gray-600 px-3 py-1 text-sm font-semibold text-white">
              {historyTrades.length}
            </span>
          </div>

          {historyTrades.map((trade) => (
            <div
              key={trade.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                        trade.status,
                      )}`}
                    >
                      {getStatusText(trade.status)}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold">
                    {trade.shift.workType.name}
                  </h3>

                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {new Date(trade.shift.startTime).toLocaleDateString(
                      "da-DK",
                    )}
                  </p>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Fra {trade.offeredByUser.firstName}{" "}
                  {trade.offeredByUser.lastName}
                </div>
              </div>
            </div>
          ))}

          {historyTrades.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Ingen historik endnu.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
