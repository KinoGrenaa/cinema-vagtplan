import type {
  ReactNode,
} from "react";

import styles from "./TimeApprovalTheme.module.css";

export default function TimeApprovalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={`${styles.timeApprovalTheme} min-h-screen bg-gray-100 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100`}
      data-time-approval-theme
    >
      {children}
    </div>
  );
}
