"use client";

import AdminGuard from "@/app/components/AdminGuard";
import JobFunctionsFeedbackModals from "./components/page/JobFunctionsFeedbackModals";
import JobFunctionsPageContent from "./components/page/JobFunctionsPageContent";
import JobFunctionsPageModals from "./components/page/JobFunctionsPageModals";
import { useJobFunctionsPageController } from "./hooks/page/useJobFunctionsPageController";

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
