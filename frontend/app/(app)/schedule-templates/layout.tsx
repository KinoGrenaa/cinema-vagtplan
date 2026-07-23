import type {
  ReactNode,
} from "react";

import styles from "./ScheduleTemplatesTheme.module.css";

export default function ScheduleTemplatesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={
        styles.scheduleTemplatesTheme
      }
      data-schedule-templates-theme
    >
      {children}
    </div>
  );
}
