"use client";

import { useCallback, useEffect, useState } from "react";
import ShiftForm from "./components/ShiftForm";
import ShiftTimeline from "./components/ShiftTimeline";
import MovieProgram from "./components/MovieProgram";
import { useApi } from "../../hooks/useApi";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import type { Shift, User, WorkType } from "../../../../shared/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getToken() {
  return localStorage.getItem("token") || "";
}

type MovieShowing = {
  id: number;
  title: string;
  hall: string;
  startTime: string;
  endTime: string;
  soldSeats: number;
  freeSeats: number;
};

type LeaveRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user: {
    firstName: string;
    lastName: string;
  };
};

type LoggedInUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  cinemaId: number;
};

export default function SchedulePage() {
  const { apiFetch } = useApi();
  const todayDefault = new Date().toISOString().slice(0, 10);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [movieShowings, setMovieShowings] = useState<MovieShowing[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayDefault);
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const [startTime, setStartTime] = useState(`${todayDefault}T14:00`);
  const [endTime, setEndTime] = useState(`${todayDefault}T22:00`);
  const [note, setNote] = useState("");
  const [userId, setUserId] = useState(1);
  const [workTypeId, setWorkTypeId] = useState(1);
  const [formError, setFormError] = useState("");

  const [showClockModal, setShowClockModal] = useState(false);
  const [staffingWarnings, setStaffingWarnings] = useState<string[]>([]);
  const [staffingSuggestions, setStaffingSuggestions] = useState<string[]>([]);
  const [recommendedEmployees, setRecommendedEmployees] = useState<
    Record<number, string[]>
  >({});
  const [aiScheduleSuggestions, setAiScheduleSuggestions] = useState<string[]>(
    [],
  );
  const [creatingAiShift, setCreatingAiShift] = useState<number | null>(null);
  const [generatingAiSchedule, setGeneratingAiSchedule] = useState(false);
  const [liveStaffingAlerts, setLiveStaffingAlerts] = useState<string[]>([]);
  const [emergencyAiActions, setEmergencyAiActions] = useState<string[]>([]);
  const [autoCreatingEmergencyShift, setAutoCreatingEmergencyShift] =
    useState(false);
  const [autoStaffingNotifications, setAutoStaffingNotifications] = useState<
    string[]
  >([]);
  const [suggestedEmergencyReplacements, setSuggestedEmergencyReplacements] =
    useState<
      Array<{
        name: string;
        score: number;
        fatigue: string;
      }>
    >([]);
  const [sendingEmergencyRequest, setSendingEmergencyRequest] = useState<
    string | null
  >(null);
  const [autoEscalationQueue, setAutoEscalationQueue] = useState<string[]>([]);
  const [sendingRealStaffingMessage, setSendingRealStaffingMessage] = useState<
    string | null
  >(null);
  const [staffingLoopStatus, setStaffingLoopStatus] = useState<
    "IDLE" | "WAITING" | "ACCEPTED" | "DECLINED"
  >("IDLE");
  const [autonomousStaffingStatus, setAutonomousStaffingStatus] = useState<
    "IDLE" | "EXECUTING" | "COMPLETED"
  >("IDLE");
  const [clockShiftId, setClockShiftId] = useState<number | null>(null);
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [clockNote, setClockNote] = useState("");

  function getLoggedInUser(): LoggedInUser | null {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  }

  function toInputDateTime(value: string) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60 * 1000)
      .toISOString()
      .slice(0, 16);
  }

  function localDateTimeToISOString(value: string) {
    return new Date(value).toISOString();
  }

  const fetchUsers = useCallback(async () => {
    try {
      const response = await apiFetch("/users");

      if (!response.ok) {
        setUsers([]);
        return;
      }

      const data = await response.json();
      const usersArray = Array.isArray(data)
        ? data
        : Array.isArray(data.users)
          ? data.users
          : [];

      setUsers(usersArray);

      if (usersArray.length > 0) {
        setUserId(usersArray[0].id);
      }
    } catch {
      setUsers([]);
    }
  }, [apiFetch]);

  const fetchWorkTypes = useCallback(async () => {
    try {
      const response = await apiFetch("/work-types");

      if (!response.ok) {
        setWorkTypes([]);
        return;
      }

      const data = await response.json();
      const workTypesArray = Array.isArray(data)
        ? data
        : Array.isArray(data.workTypes)
          ? data.workTypes
          : [];

      setWorkTypes(workTypesArray);

      if (workTypesArray.length > 0) {
        setWorkTypeId(workTypesArray[0].id);
      }
    } catch {
      setWorkTypes([]);
    }
  }, [apiFetch]);

  const fetchShifts = useCallback(async () => {
    try {
      const response = await apiFetch(`/shifts?date=${selectedDate}`);

      if (!response.ok) {
        setShifts([]);
        return;
      }

      const data = await response.json();
      setShifts(Array.isArray(data) ? data : []);
    } catch {
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, selectedDate]);

  const fetchMovieShowings = useCallback(async () => {
    try {
      const response = await apiFetch(`/movie-showings?date=${selectedDate}`);

      if (!response.ok) {
        setMovieShowings([]);
        return;
      }

      const data = await response.json();
      setMovieShowings(Array.isArray(data) ? data : []);
    } catch {
      setMovieShowings([]);
    }
  }, [apiFetch, selectedDate]);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      const response = await apiFetch("/leave-requests");

      if (!response.ok) {
        setLeaveRequests([]);
        return;
      }

      const data = await response.json();
      setLeaveRequests(Array.isArray(data) ? data : []);
    } catch {
      setLeaveRequests([]);
    }
  }, [apiFetch]);

  const refreshDayData = useCallback(async () => {
    await Promise.all([
      fetchShifts(),
      fetchMovieShowings(),
      fetchLeaveRequests(),
    ]);
  }, [fetchShifts, fetchMovieShowings, fetchLeaveRequests]);

  const generateAiScheduleSuggestions = useCallback(() => {
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

    const longShifts = shifts.filter((shift) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

      return hours >= 8;
    });

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

    setAiScheduleSuggestions(suggestions);
  }, [movieShowings, shifts]);

  const createAiSuggestedShift = useCallback(
    async (suggestion: string, index: number) => {
      try {
        setCreatingAiShift(index);

        const today = selectedDate;

        let startHour = 18;
        let endHour = 22;

        if (suggestion.includes("22:00")) {
          startHour = 22;
          endHour = 23;
        }

        const startTime = new Date(today);
        startTime.setHours(startHour, 0, 0, 0);

        const endTime = new Date(today);
        endTime.setHours(endHour, 0, 0, 0);

        const response = await fetch(`${API_URL}/shifts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            workTypeId: workTypes[0]?.id,
            userId: users[0]?.id,
          }),
        });

        if (!response.ok) {
          alert("Kunne ikke oprette AI-vagt.");
          return;
        }

        await refreshDayData();

        alert("AI-oprettet vagt blev oprettet.");
      } catch (error) {
        console.error(error);
        alert("AI-oprettelse fejlede.");
      } finally {
        setCreatingAiShift(null);
      }
    },
    [refreshDayData, selectedDate, users, workTypes],
  );

  const generateAiDaySchedule = useCallback(async () => {
    try {
      setGeneratingAiSchedule(true);

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

        await fetch(`${API_URL}/shifts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            workTypeId: workTypes[0]?.id,
            userId: users[0]?.id,
          }),
        });
      }

      await refreshDayData();

      alert("AI dagsplan blev genereret.");
    } catch (error) {
      console.error(error);

      alert("AI dagsplan kunne ikke genereres.");
    } finally {
      setGeneratingAiSchedule(false);
    }
  }, [movieShowings, refreshDayData, selectedDate, users, workTypes]);

  const generateLiveStaffingAlerts = useCallback(() => {
    const alerts: string[] = [];

    const currentHour = new Date().getHours();

    const activeShifts = shifts.filter((shift) => {
      const start = new Date(shift.startTime).getHours();

      const end = new Date(shift.endTime).getHours();

      return currentHour >= start && currentHour <= end;
    });

    const activeMovies = movieShowings.filter((movie) => {
      const start = new Date(movie.startTime).getHours();

      return currentHour >= start - 1 && currentHour <= start + 2;
    });

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

    const overtimeRisk = activeShifts.filter((shift) => {
      const start = new Date(shift.startTime);

      const end = new Date(shift.endTime);

      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

      return hours >= 8;
    });

    if (overtimeRisk.length >= 2) {
      alerts.push("🔴 LIVE: Flere medarbejdere nærmer sig overtime.");
    }

    if (activeMovies.length >= 4) {
      alerts.push("🔴 LIVE: Peak-hour movie pressure registreret.");
    }

    setLiveStaffingAlerts(alerts);
  }, [movieShowings, shifts]);

  const generateEmergencyAiActions = useCallback(() => {
    const actions: string[] = [];

    const currentHour = new Date().getHours();

    const activeShifts = shifts.filter((shift) => {
      const start = new Date(shift.startTime).getHours();

      const end = new Date(shift.endTime).getHours();

      return currentHour >= start && currentHour <= end;
    });

    const activeMovies = movieShowings.filter((movie) => {
      const start = new Date(movie.startTime).getHours();

      return currentHour >= start - 1 && currentHour <= start + 2;
    });

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

    const overtimeRisk = activeShifts.filter((shift) => {
      const start = new Date(shift.startTime);

      const end = new Date(shift.endTime);

      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

      return hours >= 8;
    });

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

    setEmergencyAiActions(actions);
  }, [movieShowings, shifts]);

  const autoCreateEmergencyShift = useCallback(async () => {
    try {
      setAutoCreatingEmergencyShift(true);

      const currentHour = new Date().getHours();

      const startTime = new Date(selectedDate);

      startTime.setHours(currentHour, 0, 0, 0);

      const endTime = new Date(selectedDate);

      endTime.setHours(currentHour + 2, 0, 0, 0);

      const response = await fetch(`${API_URL}/shifts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          cinemaId: currentUser?.cinemaId,
          userId: users[0]?.id,
          workTypeId: workTypes[0]?.id,
          note: "AI Emergency Staffing Shift",
        }),
      });

      if (!response.ok) {
        alert("Kunne ikke oprette emergency shift.");

        return;
      }

      await refreshDayData();

      alert("🚨 AI emergency shift blev automatisk oprettet.");
    } catch (error) {
      console.error(error);

      alert("Emergency staffing action fejlede.");
    } finally {
      setAutoCreatingEmergencyShift(false);
    }
  }, [refreshDayData, selectedDate, users, workTypes]);

  const generateAutoStaffingNotifications = useCallback(() => {
    const notifications: string[] = [];

    const currentHour = new Date().getHours();

    const activeMovies = movieShowings.filter((movie) => {
      const startHour = new Date(movie.startTime).getHours();

      return currentHour >= startHour - 1 && currentHour <= startHour + 2;
    });

    const activeShifts = shifts.filter((shift) => {
      const startHour = new Date(shift.startTime).getHours();

      const endHour = new Date(shift.endTime).getHours();

      return currentHour >= startHour && currentHour <= endHour;
    });

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

    const overtimeRisk = activeShifts.filter((shift) => {
      const start = new Date(shift.startTime);

      const end = new Date(shift.endTime);

      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

      return hours >= 8;
    });

    if (overtimeRisk.length >= 2) {
      notifications.push("🚨 Flere medarbejdere nærmer sig overtime.");
    }

    if (activeMovies.length >= 5) {
      notifications.push("🚨 Peak-hour staffing intervention anbefales.");
    }

    setAutoStaffingNotifications(notifications);
  }, [movieShowings, shifts]);

  const generateSuggestedEmergencyReplacements = useCallback(() => {
    const replacements: Array<{
      name: string;
      score: number;
      fatigue: string;
    }> = [];

    users.forEach((user) => {
      const userShifts = shifts.filter((shift) => shift.userId === user.id);

      let staffingScore = 100;

      staffingScore -= userShifts.length * 8;

      const longShifts = userShifts.filter((shift) => {
        const start = new Date(shift.startTime);

        const end = new Date(shift.endTime);

        const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

        return hours >= 8;
      });

      staffingScore -= longShifts.length * 10;

      let fatigue = "LOW";

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

    replacements.sort((a, b) => b.score - a.score);

    setSuggestedEmergencyReplacements(replacements.slice(0, 5));
  }, [users, shifts]);

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

  const startAutoEscalation = useCallback(async () => {
    try {
      const queue = suggestedEmergencyReplacements.map(
        (replacement) => replacement.name,
      );

      setAutoEscalationQueue(queue);

      for (const employeeName of queue) {
        setSendingEmergencyRequest(employeeName);

        await new Promise((resolve) => setTimeout(resolve, 1500));

        const accepted = Math.random() > 0.65;

        if (accepted) {
          alert(`✅ ${employeeName} accepterede emergency staffing request.`);

          setAutoEscalationQueue([]);
          const accepted = await autoHandleStaffingResponse(employeeName);

          if (accepted) {
            await autoAssignEmergencyShift(employeeName);

            setAutoEscalationQueue([]);

            return;
          }
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
  }, [suggestedEmergencyReplacements]);

  const sendRealStaffingMessage = useCallback(async (employeeName: string) => {
    try {
      setSendingRealStaffingMessage(employeeName);

      const response = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientName: employeeName,
          subject: "🚨 Emergency Staffing Request",
          content: `Der er akut behov for bemanding i biografen. Kontakt venligst administrationen hurtigst muligt.`,
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
  }, []);

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

        const currentHour = new Date().getHours();

        const startTime = new Date(selectedDate);

        startTime.setHours(currentHour, 0, 0, 0);

        const endTime = new Date(selectedDate);

        endTime.setHours(currentHour + 2, 0, 0, 0);

        const response = await fetch(`${API_URL}/shifts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            cinemaId: currentUser?.cinemaId,
            userId: employee.id,
            workTypeId: workTypes[0]?.id,
            note: "Autonomous AI Emergency Shift",
          }),
        });

        if (!response.ok) {
          throw new Error("Kunne ikke oprette emergency shift.");
        }

        await refreshDayData();

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
    [currentUser, refreshDayData, selectedDate, users, workTypes],
  );

  const generateStaffingWarnings = useCallback(() => {
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

      const overtimeRisk = overlappingShifts.some((shift) => {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);

        const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

        return hours >= 8;
      });

      if (overtimeRisk) {
        warnings.push(
          `${showing.title} (${showing.hall}) indeholder vagter med overtime-risiko.`,
        );
      }
    });

    setStaffingWarnings(warnings);
  }, [movieShowings, shifts]);

  const generateStaffingSuggestions = useCallback(() => {
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

      const overtimeRisk = overlappingShifts.some((shift) => {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);

        const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

        return hours >= 8;
      });

      if (overtimeRisk) {
        suggestions.push(
          `🤖 Overvej ekstra bemanding for at reducere overtime-risiko omkring ${showing.title}.`,
        );
      }
    });

    setStaffingSuggestions(suggestions);
  }, [movieShowings, shifts]);

  const generateRecommendedEmployees = useCallback(() => {
    const recommendations: Record<number, string[]> = {};

    shifts.forEach((shift) => {
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);

      const shiftHours =
        (shiftEnd.getTime() - shiftStart.getTime()) / 1000 / 60 / 60;

      const availableUsers = users
        .filter((user) => user.id !== shift.userId)
        .map((user) => {
          const userShifts = shifts.filter((s) => s.userId === user.id);

          const totalHours = userShifts.reduce((sum, s) => {
            const start = new Date(s.startTime);
            const end = new Date(s.endTime);

            return sum + (end.getTime() - start.getTime()) / 1000 / 60 / 60;
          }, 0);

          const matchingSkill = workTypes.some(
            (wt) => wt.id === shift.workTypeId,
          );

          return {
            name: `${user.firstName} ${user.lastName}`,
            totalHours,
            matchingSkill,
          };
        })
        .sort((a, b) => a.totalHours - b.totalHours)
        .slice(0, 3);

      const suggestions = availableUsers.map((user) => {
        if (user.totalHours >= 35) {
          return `${user.name} (overtime-risiko)`;
        }

        if (shiftHours >= 8) {
          return `${user.name} (lang vagt anbefalet)`;
        }

        return `${user.name} (lav belastning)`;
      });

      recommendations[shift.id] = suggestions;
    });

    setRecommendedEmployees(recommendations);
  }, [shifts, users, workTypes]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/";
      return;
    }

    setCurrentUser(JSON.parse(savedUser));
    fetchUsers();
    fetchWorkTypes();
  }, [fetchUsers, fetchWorkTypes]);

  useEffect(() => {
    refreshDayData();
  }, [refreshDayData]);

  useEffect(() => {
    generateStaffingWarnings();
  }, [generateStaffingWarnings]);

  useEffect(() => {
    generateStaffingSuggestions();
  }, [generateStaffingSuggestions]);

  useEffect(() => {
    generateAiScheduleSuggestions();
  }, [generateAiScheduleSuggestions]);

  useEffect(() => {
    generateLiveStaffingAlerts();

    const interval = setInterval(() => {
      generateLiveStaffingAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, [generateLiveStaffingAlerts]);

  useEffect(() => {
    generateEmergencyAiActions();

    const interval = setInterval(() => {
      generateEmergencyAiActions();
    }, 30000);

    return () => clearInterval(interval);
  }, [generateEmergencyAiActions]);

  useEffect(() => {
    generateAutoStaffingNotifications();

    const interval = setInterval(() => {
      generateAutoStaffingNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [generateAutoStaffingNotifications]);

  useEffect(() => {
    generateSuggestedEmergencyReplacements();
  }, [generateSuggestedEmergencyReplacements]);

  useEffect(() => {
    generateRecommendedEmployees();
  }, [generateRecommendedEmployees]);

  useRealtimeShifts({
    onShiftsUpdated: refreshDayData,
    onShiftTradesUpdated: refreshDayData,
    enableToasts: false,
  });

  function leaveIsOnSelectedDate(request: LeaveRequest) {
    const current = new Date(`${selectedDate}T12:00:00`);
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);

    return current >= start && current <= end;
  }

  function getLeaveStyle(status: LeaveRequest["status"]) {
    if (status === "APPROVED") {
      return "border-green-300 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200";
    }

    if (status === "REJECTED") {
      return "border-red-300 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
    }

    return "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200";
  }

  const selectedDateLeaveRequests = leaveRequests.filter(leaveIsOnSelectedDate);

  function clearForm() {
    setSelectedShift(null);
    setStartTime(`${selectedDate}T14:00`);
    setEndTime(`${selectedDate}T22:00`);
    setNote("");
    setFormError("");
  }

  function resetClockModal() {
    setShowClockModal(false);
    setClockShiftId(null);
    setClockInTime("");
    setClockOutTime("");
    setClockNote("");
  }

  async function submitManualTime() {
    const shift = shifts.find((s) => s.id === clockShiftId);

    if (!shift || !currentUser) {
      alert("Vælg en vagt først");
      return;
    }

    const plannedStart = toInputDateTime(shift.startTime);
    const plannedEnd = toInputDateTime(shift.endTime);

    const hasDeviation =
      plannedStart !== clockInTime || plannedEnd !== clockOutTime;

    if (hasDeviation && !clockNote.trim()) {
      alert("Du skal skrive en note ved afvigelse fra vagtplanen");
      return;
    }

    const response = await apiFetch("/time-entries/manual", {
      method: "POST",
      body: JSON.stringify({
        userId: currentUser.id,
        cinemaId: currentUser.cinemaId,
        shiftId: clockShiftId,
        clockIn: clockInTime,
        clockOut: clockOutTime,
        note: clockNote,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Kunne ikke registrere timer");
      return;
    }

    alert("Timer sendt til godkendelse");
    resetClockModal();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedUser = getLoggedInUser();

    const body = {
      startTime: localDateTimeToISOString(startTime),
      endTime: localDateTimeToISOString(endTime),
      note,
      userId,
      workTypeId,
    };

    const response = await apiFetch(
      selectedShift ? `/shifts/${selectedShift.id}` : "/shifts",
      {
        method: selectedShift ? "PATCH" : "POST",
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      setFormError(data.message || "Der opstod en fejl");
      return;
    }

    clearForm();
    await refreshDayData();
  }

  async function handleDelete() {
    if (!selectedShift) return;

    await apiFetch(`/shifts/${selectedShift.id}`, {
      method: "DELETE",
    });

    clearForm();
    await refreshDayData();
  }

  function handleSelectShift(shift: Shift) {
    setSelectedShift(shift);
    setStartTime(toInputDateTime(shift.startTime));
    setEndTime(toInputDateTime(shift.endTime));
    setNote(shift.note || "");
    setUserId(shift.userId);
    setWorkTypeId(shift.workTypeId);
    setFormError("");
  }

  function changeDate(days: number) {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);

    const nextDate = date.toISOString().slice(0, 10);

    setSelectedDate(nextDate);
    setStartTime(`${nextDate}T14:00`);
    setEndTime(`${nextDate}T22:00`);
    setSelectedShift(null);
    setFormError("");
    setLoading(true);
  }

  function goToToday() {
    const today = new Date().toISOString().slice(0, 10);

    setSelectedDate(today);
    setStartTime(`${today}T14:00`);
    setEndTime(`${today}T22:00`);
    setSelectedShift(null);
    setFormError("");
    setLoading(true);
  }

  async function handleMoveShift(
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
  ) {
    const oldStart = new Date(shift.startTime);
    const oldEnd = new Date(shift.endTime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(oldStart);
    newStart.setHours(newStartHour, newStartMinute, 0, 0);

    const newEnd = new Date(newStart.getTime() + durationMs);

    await apiFetch(`/shifts/${shift.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        note: shift.note,
        userId: shift.userId,
        workTypeId: shift.workTypeId,
      }),
    });

    await refreshDayData();
  }

  async function handleChangeShiftUser(shift: Shift, newUserId: number) {
    await apiFetch(`/shifts/${shift.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        startTime: shift.startTime,
        endTime: shift.endTime,
        note: shift.note,
        userId: newUserId,
        workTypeId: shift.workTypeId,
      }),
    });

    await refreshDayData();
  }

  async function handleResizeShift(
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
    newEndHour: number,
    newEndMinute: number,
  ) {
    const oldStart = new Date(shift.startTime);

    const newStart = new Date(oldStart);
    newStart.setHours(newStartHour, newStartMinute, 0, 0);

    const newEnd = new Date(oldStart);
    newEnd.setHours(newEndHour, newEndMinute, 0, 0);

    await apiFetch(`/shifts/${shift.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        note: shift.note,
        userId: shift.userId,
        workTypeId: shift.workTypeId,
      }),
    });

    await refreshDayData();
  }

  async function handleOfferTrade() {
    if (!selectedShift) return;

    const parsedUser = getLoggedInUser();
    if (!parsedUser) return;

    await apiFetch("/shift-trades", {
      method: "POST",
      body: JSON.stringify({
        shiftId: selectedShift.id,
        offeredByUserId: selectedShift.userId,
        cinemaId: parsedUser.cinemaId,
        message: "",
      }),
    });

    alert("Vagten er sendt i byttepuljen");
    await refreshDayData();
  }

  const canManageShifts =
    currentUser?.role === "ADMIN" || currentUser?.role === "MASTER";

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-10 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        Indlæser vagter...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Vagtplan</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Valgt dato: {selectedDate}
              </p>
              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  onClick={generateAiDaySchedule}
                  disabled={generatingAiSchedule}
                  className="rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
                >
                  {generatingAiSchedule
                    ? "Genererer AI dagsplan..."
                    : "🤖 Generate AI Day Schedule"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowClockModal(true)}
                className="rounded-xl bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
              >
                Registrer tid
              </button>

              <button
                onClick={() => changeDate(-1)}
                className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Forrige dag
              </button>

              <button
                onClick={goToToday}
                className="rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                I dag
              </button>

              <button
                onClick={() => changeDate(1)}
                className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Næste dag
              </button>
            </div>
          </div>
        </div>

        {canManageShifts && (
          <>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-2xl font-bold">Fravær denne dag</h2>

              <div className="space-y-2">
                {selectedDateLeaveRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`rounded-xl border p-3 ${getLeaveStyle(
                      request.status,
                    )}`}
                  >
                    <div className="font-bold">
                      {request.user.firstName} {request.user.lastName}
                    </div>

                    <div className="text-sm">Status: {request.status}</div>

                    {request.reason && (
                      <div className="mt-1 text-sm">
                        Årsag: {request.reason}
                      </div>
                    )}
                  </div>
                ))}

                {selectedDateLeaveRequests.length === 0 && (
                  <div className="text-gray-500 dark:text-gray-400">
                    Ingen fravær denne dag.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <ShiftForm
                users={users}
                workTypes={workTypes}
                startTime={startTime}
                setStartTime={setStartTime}
                endTime={endTime}
                setEndTime={setEndTime}
                note={note}
                setNote={setNote}
                userId={userId}
                setUserId={setUserId}
                workTypeId={workTypeId}
                setWorkTypeId={setWorkTypeId}
                selectedShift={selectedShift}
                onSubmit={handleSubmit}
                onDelete={handleDelete}
                onCancel={clearForm}
                onOfferTrade={handleOfferTrade}
              />
            </div>
          </>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6">
            <h2 className="text-3xl font-bold">Dagens vagter</h2>
            <p className="text-gray-500 dark:text-gray-400">
              {canManageShifts
                ? "Administrer, flyt og resize vagter"
                : "Se dagens vagtplan"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950">
            <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm dark:border-green-900 dark:bg-green-950">
              <div className="mb-3 flex items-center gap-2">
                <div className="text-2xl">🤖</div>

                <div>
                  <h2 className="text-xl font-bold text-green-700 dark:text-green-300">
                    AI Staffing Optimization
                  </h2>

                  <p className="text-sm text-green-600 dark:text-green-400">
                    Systemet foreslår automatisk medarbejdere med lav
                    belastning.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {shifts.slice(0, 5).map((shift) => (
                  <div
                    key={shift.id}
                    className="rounded-xl border border-green-200 bg-white p-4 dark:border-green-900 dark:bg-gray-900"
                  >
                    <div className="mb-2 text-sm font-semibold">
                      Vagt #{shift.id}
                    </div>

                    <div className="space-y-2">
                      {(recommendedEmployees[shift.id] || []).map(
                        (recommendation, index) => (
                          <div
                            key={index}
                            className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300"
                          >
                            {recommendation}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {true && (
              <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-5 shadow-sm dark:border-red-900 dark:bg-red-950">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-2xl">🔴</div>

                  <div>
                    <h2 className="text-xl font-bold text-red-700 dark:text-red-300">
                      LIVE Staffing Alerts
                    </h2>

                    <p className="text-sm text-red-600 dark:text-red-400">
                      Realtidsanalyse af biografens aktuelle staffing pressure.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(liveStaffingAlerts.length > 0
                    ? liveStaffingAlerts
                    : ["Ingen LIVE staffing alerts lige nu."]
                  ).map((alert, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-red-200 bg-white p-4 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-gray-900 dark:text-red-300"
                    >
                      {alert}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {true && (
              <div className="mb-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-5 shadow-sm dark:border-yellow-900 dark:bg-yellow-950">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-2xl">🚨</div>

                  <div>
                    <h2 className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                      Emergency AI Staffing Actions
                    </h2>

                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Systemet anbefaler akut staffing intervention.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(emergencyAiActions.length > 0
                    ? emergencyAiActions
                    : ["Ingen emergency AI actions lige nu."]
                  ).map((action, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-yellow-200 bg-white p-4 text-sm font-medium text-yellow-700 dark:border-yellow-900 dark:bg-gray-900 dark:text-yellow-300"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>{action}</div>

                        <button
                          onClick={autoCreateEmergencyShift}
                          disabled={
                            autoCreatingEmergencyShift ||
                            emergencyAiActions.length === 0
                          }
                          className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
                        >
                          {autoCreatingEmergencyShift
                            ? "Opretter emergency shift..."
                            : emergencyAiActions.length === 0
                              ? "Ingen AI handling nødvendig"
                              : "🚨 Aktivér AI handling"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {true && (
              <div className="mb-6 rounded-2xl border border-blue-300 bg-blue-50 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-2xl">🤖</div>

                  <div>
                    <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      Autonomous Staffing Notifications
                    </h2>

                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      AI-systemet overvåger og reagerer automatisk på
                      driftsbelastning.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(autoStaffingNotifications.length > 0
                    ? autoStaffingNotifications
                    : ["Ingen autonomous staffing notifications lige nu."]
                  ).map((notification, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-blue-200 bg-white p-4 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-gray-900 dark:text-blue-300"
                    >
                      {notification}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {true && (
              <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900 dark:bg-emerald-950">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-2xl">🤖</div>

                  <div>
                    <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      Suggested Emergency Replacements
                    </h2>

                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      AI-systemet foreslår bedst egnede medarbejdere til akut
                      bemanding.
                      <button
                        onClick={startAutoEscalation}
                        disabled={
                          suggestedEmergencyReplacements.length === 0 ||
                          sendingEmergencyRequest !== null
                        }
                        className="mt-4 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {sendingEmergencyRequest
                          ? `Kontakter ${sendingEmergencyRequest}...`
                          : "🤖 Start Auto Escalation"}
                      </button>
                    </p>
                  </div>
                </div>

                {autoEscalationQueue.length > 0 && (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-900 dark:bg-gray-900">
                    <div className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      AI escalation queue
                      <div className="mb-3">
                        <span
                          className={`rounded-full px-4 py-2 text-xs font-bold ${
                            staffingLoopStatus === "WAITING"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                              : staffingLoopStatus === "ACCEPTED"
                                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : staffingLoopStatus === "DECLINED"
                                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                          }`}
                        >
                          Staffing loop: {staffingLoopStatus}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span
                        className={`rounded-full px-4 py-2 text-xs font-bold ${
                          autonomousStaffingStatus === "EXECUTING"
                            ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                            : autonomousStaffingStatus === "COMPLETED"
                              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        }`}
                      >
                        Autonomous staffing: {autonomousStaffingStatus}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {autoEscalationQueue.map((employee, index) => (
                        <div
                          key={index}
                          className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          {employee}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {(suggestedEmergencyReplacements.length > 0
                    ? suggestedEmergencyReplacements
                    : [
                        {
                          name: "Ingen replacements nødvendige",
                          score: 100,
                          fatigue: "LOW",
                        },
                      ]
                  ).map((replacement, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-900 dark:bg-gray-900"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                            {replacement.name}
                          </div>

                          <div className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                            Staffing score: {replacement.score}
                          </div>
                        </div>

                        <div
                          className={`rounded-full px-4 py-2 text-xs font-bold ${
                            replacement.fatigue === "LOW"
                              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : replacement.fatigue === "MEDIUM"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          Fatigue: {replacement.fatigue}
                        </div>
                        <button
                          onClick={() =>
                            sendRealStaffingMessage(replacement.name)
                          }
                          disabled={
                            sendingRealStaffingMessage === replacement.name
                          }
                          className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {sendingRealStaffingMessage === replacement.name
                            ? "Sender staffing request..."
                            : "📨 Send Staffing Request"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ShiftTimeline
              shifts={shifts}
              users={users}
              selectedDate={selectedDate}
              onSelectShift={canManageShifts ? handleSelectShift : () => {}}
              onMoveShift={canManageShifts ? handleMoveShift : () => {}}
              onChangeShiftUser={
                canManageShifts ? handleChangeShiftUser : () => {}
              }
              onResizeShift={canManageShifts ? handleResizeShift : () => {}}
            />
          </div>
        </div>

        {staffingWarnings.length > 0 && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-900 dark:bg-red-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-2xl">⚠️</div>

              <div>
                <h2 className="text-xl font-bold text-red-700 dark:text-red-300">
                  Smart Staffing Warnings
                </h2>

                <p className="text-sm text-red-600 dark:text-red-400">
                  Systemet har fundet potentielle bemandingsproblemer.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {staffingWarnings.map((warning, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-900 dark:bg-gray-900 dark:text-red-300"
                >
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}

        {staffingSuggestions.length > 0 && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900 dark:bg-blue-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-2xl">🤖</div>

              <div>
                <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  AI Staffing Suggestions
                </h2>

                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Systemet foreslår optimeringer af bemandingen.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {staffingSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-blue-200 bg-white p-4 text-sm text-blue-700 dark:border-blue-900 dark:bg-gray-900 dark:text-blue-300"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {aiScheduleSuggestions.length > 0 && (
          <div className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm dark:border-cyan-900 dark:bg-cyan-950">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-2xl">🤖</div>

              <div>
                <h2 className="text-xl font-bold text-cyan-700 dark:text-cyan-300">
                  AI Suggested Schedule Blocks
                </h2>

                <p className="text-sm text-cyan-600 dark:text-cyan-400">
                  Systemet foreslår automatiske optimeringer af dagens
                  bemanding.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {aiScheduleSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-cyan-200 bg-white p-4 text-sm text-cyan-700 dark:border-cyan-900 dark:bg-gray-900 dark:text-cyan-300"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>{suggestion}</div>

                    <button
                      onClick={() => createAiSuggestedShift(suggestion, index)}
                      disabled={creatingAiShift === index}
                      className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {creatingAiShift === index
                        ? "Opretter..."
                        : "🤖 Opret anbefalet vagt"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <MovieProgram movieShowings={movieShowings} />
      </div>

      {showClockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Registrer møde- og fyraftstid
              </h2>

              <button onClick={resetClockModal} className="text-2xl">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <select
                value={clockShiftId || ""}
                onChange={(event) => {
                  const shiftId = Number(event.target.value);
                  setClockShiftId(shiftId);

                  const shift = shifts.find((s) => s.id === shiftId);
                  if (!shift) return;

                  setClockInTime(toInputDateTime(shift.startTime));
                  setClockOutTime(toInputDateTime(shift.endTime));
                  setClockNote("");
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="">Vælg vagt</option>

                {shifts
                  .filter((shift) => shift.userId === currentUser?.id)
                  .map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.workType.name}
                    </option>
                  ))}
              </select>

              {clockShiftId && (
                <>
                  <input
                    type="datetime-local"
                    value={clockInTime}
                    onChange={(event) => setClockInTime(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                  />

                  <input
                    type="datetime-local"
                    value={clockOutTime}
                    onChange={(event) => setClockOutTime(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                  />

                  <textarea
                    value={clockNote}
                    onChange={(event) => setClockNote(event.target.value)}
                    className="min-h-24 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                    placeholder="Note ved afvigelse"
                  />

                  <button
                    onClick={submitManualTime}
                    className="w-full rounded-xl bg-black py-3 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                  >
                    Send til godkendelse
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {formError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">
              Konflikt fundet
            </h2>

            <p className="mb-6 text-gray-700 dark:text-gray-300">{formError}</p>

            <button
              onClick={() => setFormError("")}
              className="w-full rounded-xl bg-black py-3 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
