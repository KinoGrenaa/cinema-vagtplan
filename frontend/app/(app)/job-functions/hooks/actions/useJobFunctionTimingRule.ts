import { useCallback, useState } from "react";

import { apiFetch } from "@/app/lib/api";

import type {
  JobFunctionConfirm,
  JobFunctionShowError,
} from "../../helpers/types/jobFunctionDialogTypes";
import {
  appendCinemaId,
  readErrorMessage,
} from "../../helpers/page/jobFunctionHelpers";
import type { JobFunctionWithWorkType } from "../../helpers/payroll/jobFunctionPayrollHelpers";
import {
  buildJobFunctionDayPeriodPayload,
  buildTimingRulePayload,
  parseTimingRuleResponseText,
} from "../../helpers/actions/jobFunctionTimingRuleApiHelpers";
import {
  emptyTimingRuleForm,
  toTimingRuleForm,
  type TimingRuleFormState,
} from "../../helpers/form/jobFunctionTimingRuleFormHelpers";
import type { JobFunctionTimingRule } from "../../helpers/types/jobFunctionTypes";

type UseJobFunctionTimingRuleOptions = {
  activeCinemaId: number | null;
  confirm: JobFunctionConfirm;
  refreshData: () => Promise<void>;
  showError: JobFunctionShowError;
};

export function useJobFunctionTimingRule({
  activeCinemaId,
  confirm,
  refreshData,
  showError,
}: UseJobFunctionTimingRuleOptions) {
  const [timingModalJobFunction, setTimingModalJobFunction] =
    useState<JobFunctionWithWorkType | null>(null);
  const [timingRule, setTimingRule] = useState<JobFunctionTimingRule | null>(
    null,
  );
  const [timingRuleForm, setTimingRuleForm] =
    useState<TimingRuleFormState>(emptyTimingRuleForm);
  const [timingRuleLoading, setTimingRuleLoading] = useState(false);
  const [timingRuleSaving, setTimingRuleSaving] = useState(false);

  const fetchTimingRule = useCallback(
    async (jobFunction: JobFunctionWithWorkType) => {
      try {
        setTimingRuleLoading(true);
        const response = await apiFetch(
          appendCinemaId(
            `/job-functions/${jobFunction.id}/timing-rule?includeInactive=true`,
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
        const data = parseTimingRuleResponseText(rawText);
        setTimingRule(data);
        setTimingRuleForm(toTimingRuleForm(data, jobFunction));
      } catch (error) {
        setTimingRule(null);
        setTimingRuleForm(toTimingRuleForm(null, jobFunction));
        showError(
          "Kunne ikke hente møde- og fyraftensregel",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl, da timingreglen skulle hentes.",
        );
      } finally {
        setTimingRuleLoading(false);
      }
    },
    [activeCinemaId, showError],
  );

  const openTimingRuleModal = useCallback(
    async (jobFunction: JobFunctionWithWorkType) => {
      setTimingModalJobFunction(jobFunction);
      setTimingRule(jobFunction.timingRule ?? null);
      setTimingRuleForm(toTimingRuleForm(jobFunction.timingRule, jobFunction));
      await fetchTimingRule(jobFunction);
    },
    [fetchTimingRule],
  );

  const closeTimingRuleModal = useCallback(() => {
    if (timingRuleSaving) {
      return;
    }

    setTimingModalJobFunction(null);
    setTimingRule(null);
    setTimingRuleForm(emptyTimingRuleForm);
  }, [timingRuleSaving]);

  const saveTimingRule = useCallback(async () => {
    if (!timingModalJobFunction) {
      return;
    }

    try {
      setTimingRuleSaving(true);
      const dayPeriodPayload = buildJobFunctionDayPeriodPayload(
        timingRuleForm,
        activeCinemaId,
      );
      const payload = buildTimingRulePayload(timingRuleForm, activeCinemaId);

      const dayPeriodResponse = await apiFetch(
        appendCinemaId(
          `/job-functions/${timingModalJobFunction.id}`,
          activeCinemaId,
        ),
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
          `/job-functions/${timingModalJobFunction.id}/timing-rule`,
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

      const savedRawText = await response.text();
      if (savedRawText.trim()) {
        setTimingRule(JSON.parse(savedRawText) as JobFunctionTimingRule);
      }
      await refreshData();
      setTimingModalJobFunction(null);
      setTimingRule(null);
      setTimingRuleForm(emptyTimingRuleForm);
    } catch (error) {
      showError(
        "Kunne ikke gemme møde- og fyraftensregel",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da reglen skulle gemmes.",
      );
    } finally {
      setTimingRuleSaving(false);
    }
  }, [activeCinemaId, refreshData, showError, timingModalJobFunction, timingRuleForm]);

  const archiveTimingRule = useCallback(() => {
    if (!timingModalJobFunction) {
      return;
    }

    confirm({
      title: "Arkivér møde- og fyraftensregel",
      description:
        `Vil du arkivere reglen for "${timingModalJobFunction.name}"?\n\n` +
        "Reglen kan oprettes igen ved at gemme en ny regel.",
      confirmText: "Arkivér",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const response = await apiFetch(
            appendCinemaId(
              `/job-functions/${timingModalJobFunction.id}/timing-rule`,
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

          const data = (await response.json()) as JobFunctionTimingRule;
          setTimingRule(data);
          setTimingRuleForm(toTimingRuleForm(data, timingModalJobFunction));
          await refreshData();
        } catch (error) {
          showError(
            "Kunne ikke arkivere møde- og fyraftensregel",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da timingreglen skulle arkiveres.",
          );
        }
      },
    });
  }, [activeCinemaId, confirm, refreshData, showError, timingModalJobFunction]);

  return {
    archiveTimingRule,
    closeTimingRuleModal,
    openTimingRuleModal,
    saveTimingRule,
    setTimingRuleForm,
    timingModalJobFunction,
    timingRule,
    timingRuleForm,
    timingRuleLoading,
    timingRuleSaving,
  };
}
