import { apiFetch } from "@/app/lib/api";

import { appendCinemaId, readErrorMessage } from "../page/scheduleTemplatePageHelpers";
import type {
  JobFunction,
  ScheduleTemplate,
  ScheduleTemplateUser,
} from "../page/scheduleTemplatePageTypes";

export type ScheduleTemplatePageData = {
  templates: ScheduleTemplate[];
  jobFunctions: JobFunction[];
  employees: ScheduleTemplateUser[];
};

type FetchScheduleTemplatePageDataOptions = {
  activeCinemaId: number | null;
  showArchived: boolean;
};

export async function fetchScheduleTemplatePageData({
  activeCinemaId,
  showArchived,
}: FetchScheduleTemplatePageDataOptions): Promise<ScheduleTemplatePageData> {
  const [templatesResponse, jobFunctionsResponse, usersResponse] =
    await Promise.all([
      apiFetch(
        appendCinemaId(
          `/schedule-templates?includeArchived=${showArchived}`,
          activeCinemaId,
        ),
      ),
      apiFetch(
        appendCinemaId("/job-functions?includeArchived=false", activeCinemaId),
      ),
      apiFetch(appendCinemaId("/users", activeCinemaId)),
    ]);

  if (!templatesResponse.ok) {
    throw new Error(
      await readErrorMessage(
        templatesResponse,
        "Kunne ikke hente vagtsskabeloner",
      ),
    );
  }

  if (!jobFunctionsResponse.ok) {
    throw new Error(
      await readErrorMessage(
        jobFunctionsResponse,
        "Kunne ikke hente jobfunktioner",
      ),
    );
  }

  if (!usersResponse.ok) {
    throw new Error(
      await readErrorMessage(usersResponse, "Kunne ikke hente medarbejdere"),
    );
  }

  const [templatesData, jobFunctionsData, usersData] = await Promise.all([
    templatesResponse.json(),
    jobFunctionsResponse.json(),
    usersResponse.json(),
  ]);

  return {
    templates: Array.isArray(templatesData)
      ? (templatesData as ScheduleTemplate[])
      : [],
    jobFunctions: Array.isArray(jobFunctionsData)
      ? (jobFunctionsData as JobFunction[]).filter(
          (jobFunction) => jobFunction.isActive,
        )
      : [],
    employees: Array.isArray(usersData)
      ? (usersData as ScheduleTemplateUser[]).filter(
          (employee) =>
            employee.isActive !== false && employee.role !== "MASTER",
        )
      : [],
  };
}
