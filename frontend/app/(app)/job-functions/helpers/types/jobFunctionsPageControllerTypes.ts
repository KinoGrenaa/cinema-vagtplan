import type { JobFunctionsFeedbackModalsProps } from "../../components/page/JobFunctionsFeedbackModals";
import type { JobFunctionsPageContentProps } from "../../components/page/JobFunctionsPageContent";
import type { JobFunctionsPageModalsProps } from "../../components/page/JobFunctionsPageModals";

export type JobFunctionsPageControllerResult = {
  contentProps: JobFunctionsPageContentProps;
  feedbackModalProps: JobFunctionsFeedbackModalsProps;
  pageModalProps: JobFunctionsPageModalsProps;
};
