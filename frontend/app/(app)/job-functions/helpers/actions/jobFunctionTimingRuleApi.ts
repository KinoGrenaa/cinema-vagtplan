import { apiFetch } from "@/app/lib/api";

import type { JobFunctionWithWorkType } from "../payroll/jobFunctionPayrollHelpers";
import {
  appendCinemaId,
  readErrorMessage,
} from "../page/jobFunctionHelpers";
import type { TimingRuleFormState } from "../form/jobFunctionTimingRuleFormHelpers";
import type { JobFunctionTimingRule } from "../types/jobFunctionTypes";
import {
  buildJobFunctionDayPeriodPayload,
  buildTimingRulePayload,
  parseTimingRuleResponseText,
} from "./jobFunctionTimingRuleApiHelpers";

export async function fetchJobFunctionTimingRule(
  jobFunctionId: number,
  activeCinemaId: number | null,
): Promise<JobFunctionTimingRule | null> {
  const response = await apiFetch(
    appendCinemaId(
      `/job-functions/${jobFunctionId}/timing-rule?includeInactive=true`,
      activeCinemaId,
    ),
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke hente møde- og fyraftensregel",
      ),
    );
  }

  const rawText = await response.text();
  return parseTimingRuleResponseText(rawText);
}

export async function saveJobFunctionTimingRule(
  jobFunction: JobFunctionWithWorkType,
  timingRuleForm: TimingRuleFormState,
  activeCinemaId: number | null,
): Promise<JobFunctionTimingRule | null> {
  const dayPeriodPayload = buildJobFunctionDayPeriodPayload(
    timingRuleForm,
    activeCinemaId,
  );
  const payload = buildTimingRulePayload(timingRuleForm, activeCinemaId);

  const dayPeriodResponse = await apiFetch(
    appendCinemaId(`/job-functions/${jobFunction.id}`, activeCinemaId),
    {
      method: "PATCH",
      body: JSON.stringify(dayPeriodPayload),
    },
  );

  if (!dayPeriodResponse.ok) {
    throw new Error(
      await readErrorMessage(
        dayPeriodResponse,
        "Kunne ikke gemme dagsperiode for jobfunktion",
      ),
    );
  }

  const response = await apiFetch(
    appendCinemaId(
      `/job-functions/${jobFunction.id}/timing-rule`,
      activeCinemaId,
    ),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke gemme møde- og fyraftensregel",
      ),
    );
  }

  const rawText = await response.text();
  return parseTimingRuleResponseText(rawText);
}

export async function archiveJobFunctionTimingRule(
  jobFunctionId: number,
  activeCinemaId: number | null,
): Promise<JobFunctionTimingRule> {
  const response = await apiFetch(
    appendCinemaId(
      `/job-functions/${jobFunctionId}/timing-rule`,
      activeCinemaId,
    ),
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Kunne ikke arkivere møde- og fyraftensregel",
      ),
    );
  }

  return (await response.json()) as JobFunctionTimingRule;
}
