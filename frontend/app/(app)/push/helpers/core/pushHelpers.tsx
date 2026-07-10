import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

export type PushStatus = {
  title: string;
  text: string;
  icon: ReactNode;
  className: string;
};

export function getPushStatus(
  permission: NotificationPermission,
  pushEnabled: boolean,
): PushStatus {
  if (permission === "granted" && pushEnabled) {
    return {
      title: "Aktiveret",
      text: "Push-notifikationer er aktiveret på denne browser.",
      icon: <CheckCircle2 className="h-10 w-10 text-green-600" />,
      className:
        "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40",
    };
  }

  if (permission === "granted" && !pushEnabled) {
    return {
      title: "Tilladelse givet",
      text: "Browseren tillader notifikationer, men push er ikke aktiveret på denne browser.",
      icon: <Bell className="h-10 w-10 text-yellow-600" />,
      className:
        "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40",
    };
  }

  if (permission === "denied") {
    return {
      title: "Blokeret",
      text: "Notifikationer er blokeret i browseren.",
      icon: <BellOff className="h-10 w-10 text-red-600" />,
      className:
        "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
    };
  }

  return {
    title: "Ikke aktiveret",
    text: "Du har endnu ikke aktiveret notifikationer.",
    icon: <Bell className="h-10 w-10 text-yellow-600" />,
    className:
      "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40",
  };
}
