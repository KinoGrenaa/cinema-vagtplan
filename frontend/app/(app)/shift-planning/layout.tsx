import type {
  ReactNode,
} from "react";

import styles from "./ShiftPlanningTheme.module.css";

export default function ShiftPlanningLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={
        styles.shiftPlanningTheme
      }
      data-shift-planning-theme
    >
      {children}
    </div>
  );
}
