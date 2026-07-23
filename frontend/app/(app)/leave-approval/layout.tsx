import type {
  ReactNode,
} from "react";

import styles from "./LeaveApprovalTheme.module.css";

export default function LeaveApprovalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={
        styles.leaveApprovalTheme
      }
      data-leave-approval-theme
    >
      {children}
    </div>
  );
}
