import type { Dispatch, FormEvent, SetStateAction } from "react";

import ScheduleTemplateJobFunctionCard, {
  type ScheduleTemplateAssignment,
  type TemplateJobFunction,
} from "./ScheduleTemplateJobFunctionCard";
import ScheduleTemplateJobFunctionForm from "./ScheduleTemplateJobFunctionForm";

type JobFunction = {
  id: number;
  name: string;
};

type ScheduleTemplateUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role?: "MASTER" | "ADMIN" | "EMPLOYEE";
  isActive?: boolean;
};

type TemplateDay = {
  id: number;
  weekday: number;
  isActive: boolean;
  note: string | null;
  sortOrder: number;
  jobFunctions: TemplateJobFunction[];
};

type JobFunctionFormState = {
  jobFunctionId: string;
  requiredCount: string;
  sortOrder: string;
  note: string;
};

type TemplateJobFunctionUpdates = Partial<
  Pick<TemplateJobFunction, "requiredCount" | "sortOrder" | "note">
>;

type ScheduleTemplateJobFunctionsSectionProps = {
  weekdayLabel: string;
  selectedDay: TemplateDay | null;
  jobFunctions: JobFunction[];
  employees: ScheduleTemplateUser[];
  form: JobFunctionFormState;
  setForm: Dispatch<SetStateAction<JobFunctionFormState>>;
  savingJobFunction: boolean;
  expandedJobFunctionIds: Set<number>;
  savingAssignmentKey: string | null;
  onAddJobFunction: (event: FormEvent) => void | Promise<void>;
  onToggleJobFunctionDetails: (id: number) => void;
  onRemoveTemplateJobFunction: (item: TemplateJobFunction) => void | Promise<void>;
  onAddTemplateAssignment: (
    item: TemplateJobFunction,
    userIdValue: number | string,
  ) => void | Promise<void>;
  onRemoveTemplateAssignment: (
    item: TemplateJobFunction,
    assignment: ScheduleTemplateAssignment,
  ) => void | Promise<void>;
  onUpdateTemplateJobFunction: (
    item: TemplateJobFunction,
    updates: TemplateJobFunctionUpdates,
  ) => void | Promise<void>;
};

export default function ScheduleTemplateJobFunctionsSection({
  weekdayLabel,
  selectedDay,
  jobFunctions,
  employees,
  form,
  setForm,
  savingJobFunction,
  expandedJobFunctionIds,
  savingAssignmentKey,
  onAddJobFunction,
  onToggleJobFunctionDetails,
  onRemoveTemplateJobFunction,
  onAddTemplateAssignment,
  onRemoveTemplateAssignment,
  onUpdateTemplateJobFunction,
}: ScheduleTemplateJobFunctionsSectionProps) {
  const templateJobFunctions = selectedDay?.jobFunctions ?? [];

  return (
    <div className="rounded-3xl border border-gray-200 p-4 dark:border-gray-800">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
          Jobfunktioner på {weekdayLabel.toLowerCase()}
        </p>
        <h3 className="text-xl font-black">Vagter fra skabelonen</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Fast medarbejder er frivilligt. Vagter uden fast medarbejder vises som
          åbne vagter i skabelonen.
        </p>
      </div>

      <ScheduleTemplateJobFunctionForm
        form={form}
        setForm={setForm}
        jobFunctions={jobFunctions}
        saving={savingJobFunction}
        onSubmit={onAddJobFunction}
      />

      <div className="mt-5 flex flex-col gap-3">
        {templateJobFunctions.length === 0 && (
          <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-400">
            Der er ingen jobfunktioner på denne ugedag endnu.
          </p>
        )}

        {templateJobFunctions.map((item) => (
          <ScheduleTemplateJobFunctionCard
            key={item.id}
            item={item}
            employees={employees}
            expanded={expandedJobFunctionIds.has(item.id)}
            savingAssignmentKey={savingAssignmentKey}
            onToggleDetails={onToggleJobFunctionDetails}
            onRemoveJobFunction={onRemoveTemplateJobFunction}
            onAddAssignment={onAddTemplateAssignment}
            onRemoveAssignment={onRemoveTemplateAssignment}
            onUpdateJobFunction={onUpdateTemplateJobFunction}
          />
        ))}
      </div>
    </div>
  );
}
