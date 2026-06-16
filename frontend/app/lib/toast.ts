import { toast } from "sonner";

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showInfo = (message: string) => {
  toast.info(message);
};

export const showWarning = (message: string) => {
  toast.warning(message);
};
