import { apiFetch } from "@/app/lib/api";

import {
  appendCinemaId,
  readErrorMessage,
} from "../page/jobFunctionHelpers";
import type { UserJobFunction } from "../types/jobFunctionTypes";

export async function fetchJobFunctionAssignments(
  jobFunctionId: number,
  activeCinemaId: number | null,
): Promise<UserJobFunction[]> {
  const response = await apiFetch(
    appendCinemaId(`/job-functions/${jobFunctionId}/users`, activeCinemaId),
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke hente medarbejdere for jobfunktion",
      ),
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function assignJobFunctionUser(
  jobFunctionId: number,
  userId: number,
  activeCinemaId: number | null,
): Promise<void> {
  const response = await apiFetch(
    appendCinemaId(`/job-functions/${jobFunctionId}/users`, activeCinemaId),
    {
      method: "POST",
      body: JSON.stringify({ userId, cinemaId: activeCinemaId }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke tilføje medarbejder"),
    );
  }
}

export async function removeJobFunctionUser(
  jobFunctionId: number,
  userId: number,
  activeCinemaId: number | null,
): Promise<void> {
  const response = await apiFetch(
    appendCinemaId(
      `/job-functions/${jobFunctionId}/users/${userId}`,
      activeCinemaId,
    ),
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke fjerne medarbejder"),
    );
  }
}
