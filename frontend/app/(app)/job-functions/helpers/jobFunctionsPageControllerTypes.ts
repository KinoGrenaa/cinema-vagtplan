import type { JobFunctionsFeedbackModalsProps } from "../components/JobFunctionsFeedbackModals";
import type { JobFunctionsPageContentProps } from "../components/JobFunctionsPageContent";
import type { JobFunctionsPageModalsProps } from "../components/JobFunctionsPageModals";

export type JobFunctionsPageControllerResult = {
  contentProps: JobFunctionsPageContentProps;
  feedbackModalProps: JobFunctionsFeedbackModalsProps;
  pageModalProps: JobFunctionsPageModalsProps;
};
