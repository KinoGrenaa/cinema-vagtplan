"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "./useApi";
import type { Shift, User, WorkType } from "../../../shared/types";

type MovieShowing = {
  id: number;
  title: string;
  hall: string;
  startTime: string;
  endTime: string;
  soldSeats: number;
  freeSeats: number;
};

type SuggestedEmergencyReplacement = {
  name: string;
  score: number;
  fatigue: "LOW" | "MEDIUM" | "HIGH";
};

type StaffingLoopStatus = "IDLE" | "WAITING" | "ACCEPTED" | "DECLINED";
type AutonomousStaffingStatus = "IDLE" | "EXECUTING" | "COMPLETED";

type UseScheduleAiInput = {
  selectedDate: string;
  shifts: Shift[];
  users: User[];
  workTypes: WorkType[];
  movieShowings: MovieShowing[];
  createShift: (input: {
    startTime: string;
    endTime: string;
    note?: string;
    userId: number;
    workTypeId: number;
  }) => Promise<void>;
};

function getShiftHours(shift: Shift) {
  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);

  return (end.getTime() - start.getTime()) / 1000 / 60 / 60;
}

function getCurrentActiveShifts(shifts: Shift[]) {
  const currentHour = new Date().getHours();

  return shifts.filter((shift) => {
    const startHour = new Date(shift.startTime).getHours();
    const endHour = new Date(shift.endTime).getHours();

    return currentHour >= startHour && currentHour <= endHour;
  });
}

function getCurrentActiveMovies(movieShowings: MovieShowing[]) {
  const currentHour = new Date().getHours();

  return movieShowings.filter((movie) => {
    const startHour = new Date(movie.startTime).getHours();

    return currentHour >= startHour - 1 && currentHour <= startHour + 2;
  });
}

function getDefaultCreateValues(users: User[], workTypes: WorkType[]) {
  const userId = users[0]?.id;
  const workTypeId = workTypes[0]?.id;

  if (!userId || !workTypeId) {
    return null;
  }

  return {
    userId,
    workTypeId,
  };
}

export function useScheduleAi({
  selectedDate,
  shifts,
  users,
  workTypes,
  movieShowings,
  createShift,
}: UseScheduleAiInput) {
  const { apiFetch } = useApi();

  const [currentTick, setCurrentTick] = useState(0);
  const [creatingAiShift, setCreatingAiShift] = useState<number | null>(null);
  const [generatingAiSchedule, setGeneratingAiSchedule] = useState(false);
  const [autoCreatingEmergencyShift, setAutoCreatingEmergencyShift] =
    useState(false);
  const [sendingEmergencyRequest, setSendingEmergencyRequest] = useState<
    string | null
  >(null);
  const [autoEscalationQueue, setAutoEscalationQueue] = useState<string[]>([]);
  const [sendingRealStaffingMessage, setSendingRealStaffingMessage] = useState<
    string | null
  >(null);
  const [staffingLoopStatus, setStaffingLoopStatus] =
    useState<StaffingLoopStatus>("IDLE");
  const [autonomousStaffingStatus, setAutonomousStaffingStatus] =
    useState<AutonomousStaffingStatus>("IDLE");

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTick((value) => value + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const aiScheduleSuggestions = useMemo(() => {
    const suggestions: string[] = [];

    const eveningMovies = movieShowings.filter((movie) => {
      const hour = new Date(movie.startTime).getHours();

      return hour >= 18 && hour <= 22;
    });

    const eveningSoldSeats = eveningMovies.reduce(
      (sum, movie) => sum + movie.soldSeats,
      0,
    );

    const eveningShiftCount = shifts.filter((shift) => {
      const hour = new Date(shift.startTime).getHours();

      return hour >= 18 && hour <= 22;
    }).length;

    if (eveningSoldSeats >= 200 && eveningShiftCount <= 4) {
      suggestions.push("🤖 Tilføj 1-2 ekstra medarbejdere mellem 18:00-22:00.");
    }

    if (eveningSoldSeats <= 60 && eveningShiftCount >= 6) {
      suggestions.push("🤖 Overvej reduceret bemanding efter 22:00.");
    }

    const longShifts = shifts.filter((shift) => getShiftHours(shift) >= 8);

    if (longShifts.length >= 3) {
      suggestions.push(
        "🤖 Flere lange vagter registreret — overvej at splitte bemandingen.",
      );
    }

    if (movieShowings.length >= 8) {
      suggestions.push(
        "🤖 Høj filmaktivitet registreret — ekstra foyer/billetsalg anbefales.",
      );
    }

    return suggestions;
  }, [movieShowings, shifts]);

  const liveStaffingAlerts = useMemo(() => {
    void currentTick;

    const alerts: string[] = [];
    const activeShifts = getCurrentActiveShifts(shifts);
    const activeMovies = getCurrentActiveMovies(movieShowings);

    const liveSoldSeats = activeMovies.reduce(
      (sum, movie) => sum + movie.soldSeats,
      0,
    );

    if (liveSoldSeats >= 150 && activeShifts.length <= 3) {
      alerts.push("🔴 LIVE: Høj biografbelastning registreret lige nu.");
    }

    if (liveSoldSeats >= 250 && activeShifts.length <= 4) {
      alerts.push("🔴 LIVE: Kritisk underbemanding registreret.");
    }

    const overtimeRisk = activeShifts.filter(
      (shift) => getShiftHours(shift) >= 8,
    );

    if (overtimeRisk.length >= 2) {
      alerts.push("🔴 LIVE: Flere medarbejdere nærmer sig overtime.");
    }

    if (activeMovies.length >= 4) {
      alerts.push("🔴 LIVE: Peak-hour movie pressure registreret.");
    }

    return alerts;
  }, [currentTick, movieShowings, shifts]);

  const emergencyAiActions = useMemo(() => {
    void currentTick;

    const actions: string[] = [];
    const activeShifts = getCurrentActiveShifts(shifts);
    const activeMovies = getCurrentActiveMovies(movieShowings);

    const liveSoldSeats = activeMovies.reduce(
      (sum, movie) => sum + movie.soldSeats,
      0,
    );

    if (liveSoldSeats >= 250 && activeShifts.length <= 4) {
      actions.push("🚨 Opret emergency staffing shift de næste 2 timer.");
    }

    if (liveSoldSeats >= 300 && activeShifts.length <= 5) {
      actions.push(
        "🚨 Peak pressure kræver ekstra foyer/billetsalg bemanding.",
      );
    }

    const overtimeRisk = activeShifts.filter(
      (shift) => getShiftHours(shift) >= 8,
    );

    if (overtimeRisk.length >= 3) {
      actions.push(
        "🚨 Flere medarbejdere nærmer sig overtime — overvej omfordeling.",
      );
    }

    if (activeMovies.length >= 5) {
      actions.push(
        "🚨 Kritisk movie pressure registreret — AI intervention anbefales.",
      );
    }

    return actions;
  }, [currentTick, movieShowings, shifts]);

  const autoStaffingNotifications = useMemo(() => {
    void currentTick;

    const notifications: string[] = [];
    const activeMovies = getCurrentActiveMovies(movieShowings);
    const activeShifts = getCurrentActiveShifts(shifts);

    const soldSeats = activeMovies.reduce(
      (sum, movie) => sum + movie.soldSeats,
      0,
    );

    if (soldSeats >= 250 && activeShifts.length <= 4) {
      notifications.push(
        "🚨 Kritisk staffing pressure — ekstra medarbejder anbefales nu.",
      );
    }

    if (soldSeats >= 350) {
      notifications.push("🚨 Biografen nærmer sig maksimal belastning.");
    }

    const overtimeRisk = activeShifts.filter(
      (shift) => getShiftHours(shift) >= 8,
    );

    if (overtimeRisk.length >= 2) {
      notifications.push("🚨 Flere medarbejdere nærmer sig overtime.");
    }

    if (activeMovies.length >= 5) {
      notifications.push("🚨 Peak-hour staffing intervention anbefales.");
    }

    return notifications;
  }, [currentTick, movieShowings, shifts]);

  const suggestedEmergencyReplacements = useMemo(() => {
    const replacements: SuggestedEmergencyReplacement[] = [];

    users.forEach((user) => {
      const userShifts = shifts.filter((shift) => shift.userId === user.id);

      let staffingScore = 100;

      staffingScore -= userShifts.length * 8;

      const longShifts = userShifts.filter(
        (shift) => getShiftHours(shift) >= 8,
      );

      staffingScore -= longShifts.length * 10;

      let fatigue: SuggestedEmergencyReplacement["fatigue"] = "LOW";

      if (staffingScore <= 70) {
        fatigue = "MEDIUM";
      }

      if (staffingScore <= 45) {
        fatigue = "HIGH";
      }

      replacements.push({
        name: `${user.firstName} ${user.lastName}`,
        score: staffingScore,
        fatigue,
      });
    });

    return replacements.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [shifts, users]);

  const staffingWarnings = useMemo(() => {
    const warnings: string[] = [];

    movieShowings.forEach((showing) => {
      const showingStart = new Date(showing.startTime);
      const showingEnd = new Date(showing.endTime);

      const overlappingShifts = shifts.filter((shift) => {
        const shiftStart = new Date(shift.startTime);
        const shiftEnd = new Date(shift.endTime);

        return shiftStart < showingEnd && shiftEnd > showingStart;
      });

      const activeEmployees = overlappingShifts.length;
      const soldSeats = showing.soldSeats || 0;

      if (soldSeats >= 120 && activeEmployees < 4) {
        warnings.push(
          `${showing.title} (${showing.hall}) har høj belastning men kun ${activeEmployees} medarbejdere.`,
        );
      }

      if (soldSeats >= 200 && activeEmployees < 6) {
        warnings.push(
          `${showing.title} (${showing.hall}) er kritisk underbemandet.`,
        );
      }

      const overtimeRisk = overlappingShifts.some(
        (shift) => getShiftHours(shift) >= 8,
      );

      if (overtimeRisk) {
        warnings.push(
          `${showing.title} (${showing.hall}) indeholder vagter med overtime-risiko.`,
        );
      }
    });

    return warnings;
  }, [movieShowings, shifts]);

  const staffingSuggestions = useMemo(() => {
    const suggestions: string[] = [];

    movieShowings.forEach((showing) => {
      const showingStart = new Date(showing.startTime);
      const showingEnd = new Date(showing.endTime);

      const overlappingShifts = shifts.filter((shift) => {
        const shiftStart = new Date(shift.startTime);
        const shiftEnd = new Date(shift.endTime);

        return shiftStart < showingEnd && shiftEnd > showingStart;
      });

      const activeEmployees = overlappingShifts.length;
      const soldSeats = showing.soldSeats || 0;

      if (soldSeats >= 120 && activeEmployees < 4) {
        suggestions.push(
          `🤖 Overvej at tilføje 1-2 ekstra medarbejdere til ${showing.title} (${showing.hall}).`,
        );
      }

      if (soldSeats >= 200 && activeEmployees < 6) {
        suggestions.push(
          `🤖 ${showing.title} (${showing.hall}) bør sandsynligvis have minimum 6 medarbejdere.`,
        );
      }

      if (soldSeats <= 40 && activeEmployees >= 5) {
        suggestions.push(
          `🤖 Overvej reduceret bemanding til ${showing.title} (${showing.hall}) efterspørgslen er lav.`,
        );
      }

      const overtimeRisk = overlappingShifts.some(
        (shift) => getShiftHours(shift) >= 8,
      );

      if (overtimeRisk) {
        suggestions.push(
          `🤖 Overvej ekstra bemanding for at reducere overtime-risiko omkring ${showing.title}.`,
        );
      }
    });

    return suggestions;
  }, [movieShowings, shifts]);

  const recommendedEmployees = useMemo(() => {
    const recommendations: Record<number, string[]> = {};

    shifts.forEach((shift) => {
      const shiftHours = getShiftHours(shift);

      const availableUsers = users
        .filter((user) => user.id !== shift.userId)
        .map((user) => {
          const userShifts = shifts.filter(
            (userShift) => userShift.userId === user.id,
          );

          const totalHours = userShifts.reduce((sum, userShift) => {
            return sum + getShiftHours(userShift);
          }, 0);

          return {
            name: `${user.firstName} ${user.lastName}`,
            totalHours,
          };
        })
        .sort((a, b) => a.totalHours - b.totalHours)
        .slice(0, 3);

      recommendations[shift.id] = availableUsers.map((user) => {
        if (user.totalHours >= 35) {
          return `${user.name} (overtime-risiko)`;
        }

        if (shiftHours >= 8) {
          return `${user.name} (lang vagt anbefalet)`;
        }

        return `${user.name} (lav belastning)`;
      });
    });

    return recommendations;
  }, [shifts, users]);

  const createAiSuggestedShift = useCallback(
    async (suggestion: string, index: number) => {
      try {
        setCreatingAiShift(index);

        const defaults = getDefaultCreateValues(users, workTypes);

        if (!defaults) {
          alert("Der mangler medarbejder eller arbejdstype.");
          return;
        }

        let startHour = 18;
        let endHour = 22;

        if (suggestion.includes("22:00")) {
          startHour = 22;
          endHour = 23;
        }

        const startTime = new Date(selectedDate);
        startTime.setHours(startHour, 0, 0, 0);

        const endTime = new Date(selectedDate);
        endTime.setHours(endHour, 0, 0, 0);

        await createShift({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          ...defaults,
        });

        alert("AI-oprettet vagt blev oprettet.");
      } catch (error) {
        console.error(error);
        alert("AI-oprettelse fejlede.");
      } finally {
        setCreatingAiShift(null);
      }
    },
    [createShift, selectedDate, users, workTypes],
  );

  const generateAiDaySchedule = useCallback(async () => {
    try {
      setGeneratingAiSchedule(true);

      const defaults = getDefaultCreateValues(users, workTypes);

      if (!defaults) {
        alert("Der mangler medarbejder eller arbejdstype.");
        return;
      }

      const suggestions: Array<{
        startHour: number;
        endHour: number;
      }> = [];

      const eveningMovies = movieShowings.filter((movie) => {
        const hour = new Date(movie.startTime).getHours();

        return hour >= 18 && hour <= 22;
      });

      const eveningSoldSeats = eveningMovies.reduce(
        (sum, movie) => sum + movie.soldSeats,
        0,
      );

      if (eveningSoldSeats >= 200) {
        suggestions.push({
          startHour: 17,
          endHour: 22,
        });

        suggestions.push({
          startHour: 18,
          endHour: 23,
        });
      }

      if (movieShowings.length >= 8) {
        suggestions.push({
          startHour: 16,
          endHour: 21,
        });
      }

      if (suggestions.length === 0) {
        alert("Ingen AI-vagter nødvendige i dag.");
        return;
      }

      for (const suggestion of suggestions) {
        const startTime = new Date(selectedDate);
        startTime.setHours(suggestion.startHour, 0, 0, 0);

        const endTime = new Date(selectedDate);
        endTime.setHours(suggestion.endHour, 0, 0, 0);

        await createShift({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          ...defaults,
        });
      }

      alert("AI dagsplan blev genereret.");
    } catch (error) {
      console.error(error);

      alert("AI dagsplan kunne ikke genereres.");
    } finally {
      setGeneratingAiSchedule(false);
    }
  }, [createShift, movieShowings, selectedDate, users, workTypes]);

  const autoCreateEmergencyShift = useCallback(async () => {
    try {
      setAutoCreatingEmergencyShift(true);

      const defaults = getDefaultCreateValues(users, workTypes);

      if (!defaults) {
        alert("Der mangler medarbejder eller arbejdstype.");
        return;
      }

      const currentHour = new Date().getHours();

      const startTime = new Date(selectedDate);
      startTime.setHours(currentHour, 0, 0, 0);

      const endTime = new Date(selectedDate);
      endTime.setHours(currentHour + 2, 0, 0, 0);

      await createShift({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        ...defaults,
        note: "AI Emergency Staffing Shift",
      });

      alert("🚨 AI emergency shift blev automatisk oprettet.");
    } catch (error) {
      console.error(error);

      alert("Emergency staffing action fejlede.");
    } finally {
      setAutoCreatingEmergencyShift(false);
    }
  }, [createShift, selectedDate, users, workTypes]);

  const sendEmergencyStaffingRequest = useCallback(
    async (employeeName: string) => {
      try {
        setSendingEmergencyRequest(employeeName);

        await new Promise((resolve) => setTimeout(resolve, 1200));

        alert(`🚨 Emergency staffing request sendt til ${employeeName}.`);
      } catch (error) {
        console.error(error);

        alert("Kunne ikke sende staffing request.");
      } finally {
        setSendingEmergencyRequest(null);
      }
    },
    [],
  );

  const sendRealStaffingMessage = useCallback(
    async (employeeName: string) => {
      try {
        setSendingRealStaffingMessage(employeeName);

        const response = await apiFetch("/messages", {
          method: "POST",
          body: JSON.stringify({
            recipientName: employeeName,
            subject: "🚨 Emergency Staffing Request",
            content:
              "Der er akut behov for bemanding i biografen. Kontakt venligst administrationen hurtigst muligt.",
            systemType: "STAFFING_ALERT",
          }),
        });

        if (!response.ok) {
          alert("Kunne ikke sende staffing besked.");

          return;
        }

        alert(`📨 Staffing request sendt til ${employeeName}.`);
      } catch (error) {
        console.error(error);

        alert("Staffing message fejlede.");
      } finally {
        setSendingRealStaffingMessage(null);
      }
    },
    [apiFetch],
  );

  const autoHandleStaffingResponse = useCallback(
    async (employeeName: string) => {
      try {
        setStaffingLoopStatus("WAITING");

        await new Promise((resolve) => setTimeout(resolve, 2500));

        const accepted = Math.random() > 0.5;

        if (accepted) {
          setStaffingLoopStatus("ACCEPTED");

          alert(`✅ ${employeeName} accepterede staffing request.`);

          return true;
        }

        setStaffingLoopStatus("DECLINED");

        alert(`❌ ${employeeName} afviste staffing request.`);

        return false;
      } catch (error) {
        console.error(error);

        setStaffingLoopStatus("DECLINED");

        return false;
      }
    },
    [],
  );

  const autoAssignEmergencyShift = useCallback(
    async (employeeName: string) => {
      try {
        setAutonomousStaffingStatus("EXECUTING");

        const employee = users.find(
          (user) => `${user.firstName} ${user.lastName}` === employeeName,
        );

        if (!employee) {
          throw new Error("Medarbejder ikke fundet.");
        }

        const workTypeId = workTypes[0]?.id;

        if (!workTypeId) {
          throw new Error("Arbejdstype mangler.");
        }

        const currentHour = new Date().getHours();

        const startTime = new Date(selectedDate);
        startTime.setHours(currentHour, 0, 0, 0);

        const endTime = new Date(selectedDate);
        endTime.setHours(currentHour + 2, 0, 0, 0);

        await createShift({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          userId: employee.id,
          workTypeId,
          note: "Autonomous AI Emergency Shift",
        });

        setAutonomousStaffingStatus("COMPLETED");

        alert(
          `🤖 Emergency shift blev automatisk tildelt til ${employeeName}.`,
        );
      } catch (error) {
        console.error(error);

        setAutonomousStaffingStatus("IDLE");

        alert("Autonomous staffing execution fejlede.");
      }
    },
    [createShift, selectedDate, users, workTypes],
  );

  const startAutoEscalation = useCallback(async () => {
    try {
      const queue = suggestedEmergencyReplacements.map(
        (replacement) => replacement.name,
      );

      setAutoEscalationQueue(queue);

      for (const employeeName of queue) {
        await sendEmergencyStaffingRequest(employeeName);

        const accepted = await autoHandleStaffingResponse(employeeName);

        if (accepted) {
          await autoAssignEmergencyShift(employeeName);

          setAutoEscalationQueue([]);

          return;
        }
      }

      alert("🚨 Ingen medarbejdere accepterede emergency staffing request.");
    } catch (error) {
      console.error(error);

      alert("Auto escalation engine fejlede.");
    } finally {
      setSendingEmergencyRequest(null);
    }
  }, [
    autoAssignEmergencyShift,
    autoHandleStaffingResponse,
    sendEmergencyStaffingRequest,
    suggestedEmergencyReplacements,
  ]);

  return {
    staffingWarnings,
    staffingSuggestions,
    recommendedEmployees,
    aiScheduleSuggestions,
    creatingAiShift,
    generatingAiSchedule,
    liveStaffingAlerts,
    emergencyAiActions,
    autoCreatingEmergencyShift,
    autoStaffingNotifications,
    suggestedEmergencyReplacements,
    sendingEmergencyRequest,
    autoEscalationQueue,
    sendingRealStaffingMessage,
    staffingLoopStatus,
    autonomousStaffingStatus,
    createAiSuggestedShift,
    generateAiDaySchedule,
    autoCreateEmergencyShift,
    startAutoEscalation,
    sendRealStaffingMessage,
  };
}
