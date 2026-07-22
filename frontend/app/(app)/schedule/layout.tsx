import type {
  ReactNode,
} from "react";

import styles from "./ScheduleTheme.module.css";

export default function ScheduleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={styles.scheduleTheme}
      data-schedule-theme
    >
      {children}
    </div>
  );
}
