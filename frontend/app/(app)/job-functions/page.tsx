"use client";

import AdminGuard from "@/app/components/access/AdminGuard";

import JobFunctionsFeedbackModals from "./components/page/JobFunctionsFeedbackModals";
import JobFunctionsPageContent from "./components/page/JobFunctionsPageContent";
import JobFunctionsPageModals from "./components/page/JobFunctionsPageModals";
import styles from "./JobFunctionsPage.module.css";

import { useJobFunctionsPageController } from "./hooks/page/useJobFunctionsPageController";

export default function JobFunctionsPage() {
  const { contentProps, feedbackModalProps, pageModalProps } =
    useJobFunctionsPageController();

  return (
    <AdminGuard>
      <div className={styles.scope}>
        <JobFunctionsPageContent {...contentProps} />
        <JobFunctionsPageModals {...pageModalProps} />
        <JobFunctionsFeedbackModals {...feedbackModalProps} />
      </div>
    </AdminGuard>
  );
}
