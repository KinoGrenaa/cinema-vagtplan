"use client";

import AdminGuard from "@/app/components/AdminGuard";
import JobFunctionsFeedbackModals from "./components/JobFunctionsFeedbackModals";
import JobFunctionsPageContent from "./components/JobFunctionsPageContent";
import JobFunctionsPageModals from "./components/JobFunctionsPageModals";
import { useJobFunctionsPageController } from "./hooks/useJobFunctionsPageController";

export default function JobFunctionsPage() {
  const { contentProps, feedbackModalProps, pageModalProps } =
    useJobFunctionsPageController();

  return (
    <AdminGuard>
      <JobFunctionsPageContent {...contentProps} />
      <JobFunctionsPageModals {...pageModalProps} />
      <JobFunctionsFeedbackModals {...feedbackModalProps} />
    </AdminGuard>
  );
}
